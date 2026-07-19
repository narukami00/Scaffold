#!/bin/sh
set -e

php artisan migrate --force
php artisan storage:link >/dev/null 2>&1 || true

# Webhooks and scheduled outbound issue synchronization require workers.
php artisan queue:work --sleep=3 --tries=3 --timeout=90 &
QUEUE_PID=$!

php artisan schedule:work &
SCHEDULE_PID=$!

php artisan reverb:start --host=127.0.0.1 --port=8080 &
REVERB_PID=$!

trap 'kill "$QUEUE_PID" "$SCHEDULE_PID" "$REVERB_PID" 2>/dev/null || true' TERM INT EXIT

apache2-foreground
