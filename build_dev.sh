#!/bin/bash

# Builds the dev images for iam, realtime, web and admin.
# These dockerfile.dev images install nothing at build time — source,
# node_modules and packages/ all come from docker-compose.dev.yml's volume
# mounts at runtime — so this only needs to run once (or after a Node
# version bump); it does not need to re-run on every code change.
set -e

APPS=(iam realtime web admin)

for APP in "${APPS[@]}"; do
  echo "Building Docker image $APP using apps/$APP/dockerfile.dev..."
  docker build \
    -f "apps/$APP/dockerfile.dev" \
    -t "$APP" --progress=plain \
    .
  echo "Docker image $APP built successfully!"
done
