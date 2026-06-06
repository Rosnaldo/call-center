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
  DOCKERFILE="apps/iam/dockerfile.prod"
elif [ "$ENV" = "dev" ]; then
  DOCKERFILE="apps/iam/dockerfile.dev"
else
  echo "Invalid argument: $ENV"
  echo "Use 'prod' or 'dev'"
  exit 1
fi

echo "Building Docker image using $DOCKERFILE..."

# Clean output directory
rm -rf apps/iam/out

# Prune dependencies for Docker
turbo prune iam --docker --out-dir apps/iam/out

# Build Docker image
docker build \
  -f "$DOCKERFILE" \
  -t iam --progress=plain \
  .

echo "Docker image iam built successfully!"