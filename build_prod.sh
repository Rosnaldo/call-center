#!/bin/bash

# Builds the prod images (iam, realtime, chatbot, executable) via
# docker-compose.prod.yml. Unlike the dev images, the prod Dockerfiles copy a
# turbo-pruned workspace (apps/<app>/out), so that must be generated first, or
# `COPY ./apps/<app>/out` fails.
#
# The executable image also needs the Android signing key, which compose passes
# as BuildKit secrets sourced from ANDROID_KEYSTORE_BASE64 / ANDROID_KEYSTORE_PASSWORD
# in the environment (the project .env is loaded automatically).
set -e

COMPOSE_FILE="docker-compose.prod.yml"

# Apps whose dockerfile.prod copies apps/<app>/out (see dockerfile.prod).
PRUNE_APPS=(iam realtime chatbot)

for APP in "${PRUNE_APPS[@]}"; do
  echo "Pruning workspace for $APP..."
  rm -rf "apps/$APP/out"
  turbo prune "$APP" --docker --out-dir "apps/$APP/out"
done

echo "Building prod images using $COMPOSE_FILE..."
docker compose -f "$COMPOSE_FILE" build --progress=plain "$@"

echo "Prod images built successfully!"
