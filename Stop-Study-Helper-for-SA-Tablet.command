#!/bin/zsh

set -eu

BASE_DIR="$(cd "$(dirname "$0")" && pwd)"
RUN_DIR="$BASE_DIR/run"
PID_FILE="$RUN_DIR/study-helper-for-sa-tablet.pid"

if [[ ! -f "$PID_FILE" ]]; then
  echo "No running Study Helper for SA Tablet preview was found."
  exit 0
fi

SERVER_PID="$(cat "$PID_FILE")"

if kill -0 "$SERVER_PID" 2>/dev/null; then
  echo "Stopping Study Helper for SA Tablet preview (PID ${SERVER_PID})..."
  kill "$SERVER_PID"
  for _ in {1..10}; do
    if ! kill -0 "$SERVER_PID" 2>/dev/null; then
      break
    fi
    sleep 1
  done
fi

rm -f "$PID_FILE"
echo "Study Helper for SA Tablet preview has been stopped."
