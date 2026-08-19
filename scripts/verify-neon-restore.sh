#!/usr/bin/env bash
set -euo pipefail

container_name="${RESTORE_DRILL_CONTAINER:-portfolio-neon-restore-drill}"
source_url="${DATABASE_URL_UNPOOLED:-}"
bootstrap_image="${RESTORE_DRILL_BOOTSTRAP_IMAGE:-postgres:18-alpine}"

if [[ -z "${source_url}" ]]; then
  echo "DATABASE_URL_UNPOOLED is required. Run this command through Doppler prod." >&2
  exit 1
fi

for command in docker node mktemp cmp awk; do
  if ! command -v "${command}" >/dev/null 2>&1; then
    echo "Required command is missing: ${command}" >&2
    exit 1
  fi
done

workdir="$(mktemp -d -t portfolio-restore-drill.XXXXXX)"
chmod 700 "${workdir}"
dump_file="${workdir}/production.dump"
manifest_sql="${workdir}/manifest.sql"
pgpass_file="${workdir}/source.pgpass"
source_before="${workdir}/source-before.manifest"
source_after="${workdir}/source-after.manifest"
restored_manifest="${workdir}/restored.manifest"

cleanup() {
  docker rm -fv "${container_name}" >/dev/null 2>&1 || true
  rm -rf "${workdir}"
}

trap cleanup EXIT INT TERM
docker rm -fv "${container_name}" >/dev/null 2>&1 || true

mapfile -t source_connection < <(
  SOURCE_URL="${source_url}" \
    DOCKER_HOST_OVERRIDE="${RESTORE_DRILL_DOCKER_HOST_OVERRIDE:-}" \
    PGPASS_FILE="${pgpass_file}" \
    node <<'NODE'
const fs = require('node:fs');

const url = new URL(process.env.SOURCE_URL);
const host = url.hostname;
const port = url.port || '5432';
const database = decodeURIComponent(url.pathname.replace(/^\//, ''));
const user = decodeURIComponent(url.username);
const password = decodeURIComponent(url.password);
const sslMode =
  url.searchParams.get('sslmode') ||
  (host.endsWith('.neon.tech') ? 'require' : 'prefer');
const channelBinding = url.searchParams.get('channel_binding') || 'prefer';
let dockerHost = process.env.DOCKER_HOST_OVERRIDE || host;

if (dockerHost === 'localhost' || dockerHost === '127.0.0.1') {
  dockerHost = 'host.docker.internal';
}

if (!host || !dockerHost || !database || !user) {
  throw new Error(
    'DATABASE_URL_UNPOOLED is missing host, database, or user.',
  );
}

const escapePgpass = (value) =>
  value.replace(/\\/g, '\\\\').replace(/:/g, '\\:');
const pgpass = [dockerHost, port, database, user, password]
  .map(escapePgpass)
  .join(':');

fs.writeFileSync(process.env.PGPASS_FILE, `${pgpass}\n`, { mode: 0o600 });

for (const value of [
  dockerHost,
  port,
  database,
  user,
  sslMode,
  channelBinding,
]) {
  process.stdout.write(`${value}\n`);
}
NODE
)

if (( ${#source_connection[@]} < 6 )); then
  echo "Failed to parse connection details from DATABASE_URL_UNPOOLED." >&2
  exit 1
fi

docker_source_host="${source_connection[0]}"
source_port="${source_connection[1]}"
source_database="${source_connection[2]}"
source_user="${source_connection[3]}"
source_sslmode="${source_connection[4]}"
source_channel_binding="${source_connection[5]}"

cat >"${manifest_sql}" <<'SQL'
\set ON_ERROR_STOP on
\pset tuples_only on
\pset format unaligned

SELECT 'schema|' || nspname
FROM pg_namespace
WHERE nspname IN ('public', 'drizzle')
ORDER BY nspname;

SELECT 'table|' || schemaname || '.' || tablename
FROM pg_tables
WHERE schemaname IN ('public', 'drizzle')
ORDER BY schemaname, tablename;

SELECT format(
  'SELECT %L || ''|'' || count(*) || ''|'' || coalesce(md5(string_agg(md5(row_to_json(t)::text), %L ORDER BY row_to_json(t)::text)), md5(%L)) FROM %I.%I t;',
  'row|' || schemaname || '.' || tablename,
  '',
  '',
  schemaname,
  tablename
)
FROM pg_tables
WHERE schemaname IN ('public', 'drizzle')
ORDER BY schemaname, tablename
\gexec

SELECT
  'sequence|' || schemaname || '.' || sequencename || '|' ||
  coalesce(last_value::text, '')
FROM pg_sequences
WHERE schemaname IN ('public', 'drizzle')
ORDER BY schemaname, sequencename;
SQL

source_docker_env=(
  -e "PGHOST=${docker_source_host}"
  -e "PGPORT=${source_port}"
  -e "PGDATABASE=${source_database}"
  -e "PGUSER=${source_user}"
  -e "PGPASSFILE=/work/source.pgpass"
  -e "PGSSLMODE=${source_sslmode}"
  -e "PGCHANNELBINDING=${source_channel_binding}"
)

run_source_psql() {
  local image="$1"
  shift

  docker run --rm \
    --user "$(id -u):$(id -g)" \
    --add-host=host.docker.internal:host-gateway \
    -v "${workdir}:/work:ro" \
    "${source_docker_env[@]}" \
    "${image}" \
    psql "$@"
}

docker pull "${bootstrap_image}" >/dev/null

server_version_num="$(
  run_source_psql "${bootstrap_image}" \
    -X -A -t -v ON_ERROR_STOP=1 \
    -c "select current_setting('server_version_num');"
)"

if [[ ! "${server_version_num}" =~ ^[0-9]+$ ]]; then
  echo "Could not determine the source PostgreSQL server version." >&2
  exit 1
fi

server_major="$((10#${server_version_num} / 10000))"
postgres_image="postgres:${server_major}-alpine"

docker pull "${postgres_image}" >/dev/null

schema_args=(--schema=public)
if [[ "$(
  run_source_psql "${postgres_image}" \
    -X -A -t -v ON_ERROR_STOP=1 \
    -c "select 1 from pg_namespace where nspname = 'drizzle';"
)" == "1" ]]; then
  schema_args+=(--schema=drizzle)
fi

run_source_manifest() {
  run_source_psql "${postgres_image}" \
    -X -v ON_ERROR_STOP=1 -f /work/manifest.sql
}

run_source_manifest >"${source_before}"

docker run --rm \
  --user "$(id -u):$(id -g)" \
  --add-host=host.docker.internal:host-gateway \
  -v "${workdir}:/work" \
  "${source_docker_env[@]}" \
  "${postgres_image}" \
  pg_dump \
  --format=custom \
  --compress=6 \
  --no-owner \
  --no-acl \
  "${schema_args[@]}" \
  --file=/work/production.dump

run_source_manifest >"${source_after}"

if ! cmp -s "${source_before}" "${source_after}"; then
  echo "Source data changed while the dump was running; the drill is inconclusive." >&2
  echo "No restore was attempted. Re-run the command during a quieter window." >&2
  exit 2
fi

docker run -d \
  --name "${container_name}" \
  -e POSTGRES_USER=portfolio_restore \
  -e POSTGRES_DB=portfolio_restore \
  -e POSTGRES_HOST_AUTH_METHOD=trust \
  -v "${workdir}:/restore:ro" \
  "${postgres_image}" >/dev/null

restore_ready=false
for ((attempt=1; attempt<=90; attempt++)); do
  if ! docker inspect -f '{{.State.Running}}' "${container_name}" 2>/dev/null | grep -qx true; then
    echo "Disposable PostgreSQL stopped during initialization." >&2
    docker logs "${container_name}" >&2 || true
    exit 1
  fi

  init_process="$(
    docker exec "${container_name}" cat /proc/1/comm 2>/dev/null || true
  )"

  if [[ "${init_process}" == "postgres" ]] && \
    docker exec "${container_name}" \
      psql -X -U portfolio_restore -d portfolio_restore \
      -v ON_ERROR_STOP=1 -A -t -c 'select 1' >/dev/null 2>&1; then
    restore_ready=true
    break
  fi

  sleep 1
done

if [[ "${restore_ready}" != true ]]; then
  echo "Disposable PostgreSQL did not reach its final ready state." >&2
  docker logs "${container_name}" >&2 || true
  exit 1
fi

docker exec "${container_name}" \
  psql \
  -X \
  -U portfolio_restore \
  -d portfolio_restore \
  -v ON_ERROR_STOP=1 \
  -c 'drop schema public cascade' >/dev/null

docker exec "${container_name}" \
  pg_restore \
  -U portfolio_restore \
  -d portfolio_restore \
  --no-owner \
  --no-acl \
  /restore/production.dump

docker exec "${container_name}" \
  psql \
  -X \
  -U portfolio_restore \
  -d portfolio_restore \
  -v ON_ERROR_STOP=1 \
  -f /restore/manifest.sql >"${restored_manifest}"

if ! cmp -s "${source_after}" "${restored_manifest}"; then
  echo "Restored database manifest does not match the source manifest." >&2
  diff -u "${source_after}" "${restored_manifest}" >&2 || true
  exit 1
fi

table_count="$(awk -F'|' '$1 == "table" { count += 1 } END { print count + 0 }' "${restored_manifest}")"
row_count="$(awk -F'|' '$1 == "row" { count += $3 } END { print count + 0 }' "${restored_manifest}")"
read -r dump_bytes dump_sha256 < <(
  DUMP_FILE="${dump_file}" node <<'NODE'
const crypto = require('node:crypto');
const fs = require('node:fs');

const dump = fs.readFileSync(process.env.DUMP_FILE);
const sha256 = crypto.createHash('sha256').update(dump).digest('hex');
process.stdout.write(`${dump.length} ${sha256}\n`);
NODE
)

echo "restore_drill=passed"
echo "postgres_major=${server_major}"
echo "tables_verified=${table_count}"
echo "rows_verified=${row_count}"
echo "dump_bytes=${dump_bytes}"
echo "dump_sha256=${dump_sha256}"
echo "source_manifest_stable=yes"
echo "restored_manifest_match=yes"

cleanup
trap - EXIT INT TERM

echo "temporary_artifacts_removed=yes"
