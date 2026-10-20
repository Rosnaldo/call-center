#!/bin/bash

# Builds the prod images (iam, realtime) via
# docker-compose.prod.yml. Unlike the dev images, the prod Dockerfiles copy a
# turbo-pruned workspace (apps/<app>/out), so that must be generated first, or
# `COPY ./apps/<app>/out` fails.
set -e

COMPOSE_FILE="docker-compose.prod.yml"

# Apps whose dockerfile.prod copies apps/<app>/out (see dockerfile.prod).
PRUNE_APPS=(iam realtime)

for APP in "${PRUNE_APPS[@]}"; do
  echo "Pruning workspace for $APP..."
  rm -rf "apps/$APP/out"
  turbo prune "$APP" --docker --out-dir "apps/$APP/out"
done

echo "Building prod images using $COMPOSE_FILE..."
docker compose -f "$COMPOSE_FILE" build --progress=plain "$@"

echo "Prod images built successfully!"
