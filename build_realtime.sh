#!/bin/bash

# Exit immediately if a command fails
set -e

# Check for required argument
if [ -z "$1" ]; then
  echo "Usage: $0 [prod|dev]"
  exit 1
fi

ENV="$1"

# Determine which Dockerfile to use
if [ "$ENV" = "prod" ]; then
  DOCKERFILE="apps/realtime/dockerfile.prod"
elif [ "$ENV" = "dev" ]; then
  DOCKERFILE="apps/realtime/dockerfile.dev"
else
  echo "Invalid argument: $ENV"
  echo "Use 'prod' or 'dev'"
  exit 1
fi

echo "Building Docker image using $DOCKERFILE..."

# Clean output directory
rm -rf apps/realtime/out

# Prune dependencies for Docker
turbo prune realtime --docker --out-dir apps/realtime/out

# Build Docker image
docker build \
  -f "$DOCKERFILE" \
  -t realtime --progress=plain \
  .

echo "Docker image realtime built successfully!"