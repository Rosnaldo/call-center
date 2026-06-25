#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

npm run build-dev --workspace=apps/web
npm run build-dev --workspace=apps/admin
