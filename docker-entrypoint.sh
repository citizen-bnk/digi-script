#!/bin/sh
# Apply any pending migrations before serving. `migrate deploy` only replays
# committed migration files -- it never generates or resets anything -- so it
# is safe to run on every boot, including on a database that is already
# up to date.
set -e

echo "==> Applying database migrations"
npx prisma migrate deploy

echo "==> Starting DigiScript API"
exec node dist/index.js
