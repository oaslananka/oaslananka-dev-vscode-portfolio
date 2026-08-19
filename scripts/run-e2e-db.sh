#!/usr/bin/env bash
set -euo pipefail

container_name="portfolio-e2e-postgres"
port="${E2E_POSTGRES_PORT:-55432}"
database_url="postgresql://portfolio@127.0.0.1:${port}/portfolio_test"

cleanup() {
  docker rm -f "${container_name}" >/dev/null 2>&1 || true
}

trap cleanup EXIT INT TERM
cleanup

docker run -d \
  --name "${container_name}" \
  -e POSTGRES_USER=portfolio \
  -e POSTGRES_DB=portfolio_test \
  -e POSTGRES_HOST_AUTH_METHOD=trust \
  -p "127.0.0.1:${port}:5432" \
  postgres:16-alpine >/dev/null

for ((i=1; i<=60; i++)); do
  if docker exec "${container_name}" pg_isready -U portfolio -d portfolio_test >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

if ! docker exec "${container_name}" pg_isready -U portfolio -d portfolio_test >/dev/null 2>&1; then
  echo "Disposable PostgreSQL did not become ready." >&2
  exit 1
fi

export DATABASE_URL="${database_url}"
export DATABASE_URL_UNPOOLED="${database_url}"
export DATABASE_DRIVER="node-postgres"
export RATE_LIMIT_TEST_DATABASE_URL="${database_url}"

npm run db:migrate
npm test
npm run test:e2e
