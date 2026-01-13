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

compose_arg+=("--profile" "$PROFILE" "logs")

mkdir -p artifacts/logs
LOG_FILE="artifacts/logs/integration-${PROFILE}-$(date +%Y%m%d-%H%M%S).log"

echo "[integration] capturing logs to ${LOG_FILE}"
"${compose_arg[@]}" >"${LOG_FILE}" 2>&1 || true

echo "[integration] shutting down stack"
compose_down=("docker" "compose")
for file in "${COMPOSE_FILES[@]}"; do
  compose_down+=("-f" "$file")
done

compose_down+=("--profile" "$PROFILE" "down" "-v")
"${compose_down[@]}"

echo "[integration] stack stopped"
