#!/usr/bin/env bash
set -euo pipefail

port=3011
url="http://localhost:$port"
log="${TMPDIR:-/tmp}/madori-worker.log"
state="$(mktemp -d)"
password="$(openssl rand -hex 24)"
session="$(openssl rand -hex 32)"

cleanup() {
  pkill -f "wrangler dev --local --persist-to $state" || true
  rm -rf "$state"
}
trap cleanup EXIT

if ! pnpm build > "$log" 2>&1; then
  tail -40 "$log"
  exit 1
fi
pnpm exec wrangler d1 migrations apply DB --local --persist-to "$state" > /dev/null

WRANGLER_SEND_METRICS=false pnpm exec wrangler dev --local --persist-to "$state" \
  --port "$port" --inspector-port 9239 --log-level warn \
  --var "NUXT_ADMIN_PASSWORD:$password" --var "NUXT_SESSION_PASSWORD:$session" > "$log" 2>&1 &

ready=0
for _ in $(seq 1 90); do
  if [ "$(curl -s -o /dev/null -m 5 -w '%{http_code}' "$url/api/properties" || true)" = 200 ]; then
    ready=1
    break
  fi
  sleep 1
done
if [ "$ready" != 1 ]; then
  tail -40 "$log"
  exit 1
fi

MADORI_TEST_URL="$url" MADORI_TEST_PASSWORD="$password" pnpm test
