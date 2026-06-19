#!/bin/sh
set -e

# Run migrations if enabled
if [ "$EXECUTE_MIGRATIONS" = "true" ]; then
  echo "Running database migrations..."
  # Use the project-level bun to run migrations if available, otherwise assume global
  bun run db:migrate || echo "Migration failed, but continuing..."
fi

# Execute the main command
echo "Starting application..."
exec "$@"
