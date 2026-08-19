#!/usr/bin/env bash
set -euo pipefail

source_container="${RESTORE_DRILL_TEST_SOURCE_CONTAINER:-portfolio-restore-source}"
restore_container="${RESTORE_DRILL_CONTAINER:-portfolio-neon-restore-drill}"
postgres_image="postgres:16-alpine"

cleanup() {
  docker rm -f "${source_container}" >/dev/null 2>&1 || true
  docker rm -f "${restore_container}" >/dev/null 2>&1 || true
}

show_source_diagnostics() {
  echo "Disposable source PostgreSQL diagnostics:" >&2
  docker ps -a --filter "name=^/${source_container}$" >&2 || true
  docker logs "${source_container}" >&2 || true
}

trap cleanup EXIT INT TERM
cleanup

docker run -d \
  --name "${source_container}" \
  -e POSTGRES_HOST_AUTH_METHOD=trust \
  --health-cmd "pg_isready -U postgres -d postgres" \
  --health-interval 1s \
  --health-timeout 5s \
  --health-retries 60 \
  "${postgres_image}" >/dev/null

source_ready=false
for ((attempt=1; attempt<=90; attempt++)); do
  if ! docker inspect -f '{{.State.Running}}' "${source_container}" 2>/dev/null | grep -qx true; then
    show_source_diagnostics
    echo "Disposable source PostgreSQL stopped during initialization." >&2
    exit 1
  fi

  init_process="$(
    docker exec "${source_container}" cat /proc/1/comm 2>/dev/null || true
  )"

  if [[ "${init_process}" == "postgres" ]] &&     docker exec "${source_container}"       psql -X -U postgres -d postgres       -v ON_ERROR_STOP=1 -A -t -c 'select 1' >/dev/null 2>&1; then
    source_ready=true
    break
  fi

  sleep 1
done

if [[ "${source_ready}" != true ]]; then
  show_source_diagnostics
  echo "Disposable source PostgreSQL did not reach its final ready state." >&2
  exit 1
fi

if ! docker exec "${source_container}" \
  psql -X -U postgres -d postgres -v ON_ERROR_STOP=1 \
  -c 'CREATE ROLE portfolio_source LOGIN'; then
  show_source_diagnostics
  exit 1
fi

if ! docker exec "${source_container}" \
  createdb -U postgres -O portfolio_source portfolio_source; then
  show_source_diagnostics
  exit 1
fi

if ! docker exec -i "${source_container}" \
  psql -X -U portfolio_source -d portfolio_source -v ON_ERROR_STOP=1 <<'SQL'
CREATE SCHEMA drizzle;

CREATE TABLE public.sample_items (
  id serial PRIMARY KEY,
  name text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.sample_events (
  id serial PRIMARY KEY,
  event_name text NOT NULL,
  active boolean NOT NULL DEFAULT true
);

CREATE TABLE drizzle.__drizzle_migrations (
  id serial PRIMARY KEY,
  hash text NOT NULL,
  created_at bigint
);

INSERT INTO public.sample_items (name, payload) VALUES
  ('alpha', '{"rank":1}'),
  ('beta', '{"rank":2}');

INSERT INTO public.sample_events (event_name, active) VALUES
  ('created', true),
  ('archived', false);

INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES
  ('restore-drill', 1);
SQL
then
  show_source_diagnostics
  exit 1
fi

source_ip="$(
  docker inspect \
    -f '{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}' \
    "${source_container}"
)"

if [[ -z "${source_ip}" ]]; then
  show_source_diagnostics
  echo "Could not determine disposable source PostgreSQL address." >&2
  exit 1
fi

export DATABASE_URL_UNPOOLED="postgresql://portfolio_source@${source_ip}:5432/portfolio_source"
export RESTORE_DRILL_CONTAINER="${restore_container}"

bash scripts/verify-neon-restore.sh
