#!/usr/bin/env bash
# Pulls the latest commit from origin, rebuilds the server and web images, runs
# database migrations, and rolls out server + web without restarting postgres/
# minio. Run this on the VPS after `git push origin master` from your laptop.

set -euo pipefail

cd "$(dirname "$0")/.."

COMPOSE_FILE="docker-compose.prod.yml"

echo "==> fetching latest from origin"
git fetch --prune origin

BEFORE="$(git rev-parse HEAD)"
echo "==> resetting to origin/master (untracked files like .env are preserved)"
git reset --hard origin/master
AFTER="$(git rev-parse HEAD)"

if [ "$BEFORE" = "$AFTER" ]; then
  echo "==> already at $AFTER — nothing new to deploy"
  exit 0
fi

echo "==> $BEFORE -> $AFTER"
git --no-pager log --oneline "$BEFORE..$AFTER" | sed 's/^/    /'

echo "==> building images"
docker compose -f "$COMPOSE_FILE" build server web

echo "==> running migrations"
docker compose -f "$COMPOSE_FILE" run --rm migrate

echo "==> rolling out server + web (postgres/minio stay up)"
docker compose -f "$COMPOSE_FILE" up -d --no-deps --force-recreate server web

echo "==> waiting 20s for healthchecks"
sleep 20

docker ps --filter 'name=crikket' --format 'table {{.Names}}\t{{.Status}}'

echo "==> deploy complete"
