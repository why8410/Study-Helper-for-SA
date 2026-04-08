#!/bin/zsh

set -eu

BASE_DIR="$(cd "$(dirname "$0")" && pwd)"
RUN_DIR="$BASE_DIR/run"
LOG_DIR="$BASE_DIR/logs"
PID_FILE="$RUN_DIR/study-helper-for-sa-tablet.pid"
LOG_FILE="$LOG_DIR/study-helper-for-sa-tablet.log"
PORT="${PORT:-8010}"
URL="http://127.0.0.1:${PORT}"

mkdir -p "$RUN_DIR" "$LOG_DIR"

if [[ -f "$PID_FILE" ]]; then
  EXISTING_PID="$(cat "$PID_FILE")"
  if kill -0 "$EXISTING_PID" 2>/dev/null; then
    echo "Study Helper for SA Tablet preview is already running."
    echo "Opening ${URL}"
    open "$URL"
    exit 0
  fi
  rm -f "$PID_FILE"
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 is not installed."
  echo "Please install Python 3 and try again."
  exit 1
fi

echo "Starting Study Helper for SA Tablet preview..."
nohup env PYTHONUNBUFFERED=1 python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$BASE_DIR" >> "$LOG_FILE" 2>&1 &
SERVER_PID=$!
echo "$SERVER_PID" > "$PID_FILE"

READY=0
for _ in {1..20}; do
  if curl -s "$URL" >/dev/null 2>&1; then
    READY=1
    break
  fi
  sleep 1
done

if [[ "$READY" -eq 1 ]]; then
  echo "Study Helper for SA Tablet preview started."
  echo "URL: ${URL}"
  echo "Log file: ${LOG_FILE}"
  open "$URL"
  exit 0
fi

echo "Preview server started but did not respond in time."
echo "Please check the log file: ${LOG_FILE}"
exit 1
