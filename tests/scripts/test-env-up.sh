#!/usr/bin/env bash
set -euo pipefail

COMPOSE_FILES=("docker-compose.yml" "docker-compose.integration.yml")
PROFILE=${1:-core}

function join_by {
  local IFS="$1"; shift; echo "$*";
}

compose_arg=("docker" "compose")
for file in "${COMPOSE_FILES[@]}"; do
  compose_arg+=("-f" "$file")
done

compose_arg+=("--profile" "$PROFILE" "up" "-d" "--wait")

echo "[integration] bringing up stack with profile=${PROFILE}" >&2
"${compose_arg[@]}"

echo "[integration] services started. capturing logs path"
mkdir -p artifacts/logs

echo "[integration] stack ready"
