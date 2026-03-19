#!/bin/bash
# Setup script: copies the dashboard build into the Go package for embedding.
# Run this after building the dashboard: bun run --filter @reqlog/dashboard build

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DASHBOARD_SRC="$SCRIPT_DIR/../core/dist/dashboard"
DASHBOARD_DST="$SCRIPT_DIR/dashboard_dist"

if [ ! -d "$DASHBOARD_SRC" ]; then
    echo "Error: Dashboard not built. Run 'bun run --filter @reqlog/dashboard build' first."
    exit 1
fi

rm -rf "$DASHBOARD_DST"
cp -r "$DASHBOARD_SRC" "$DASHBOARD_DST"
echo "Dashboard files copied to $DASHBOARD_DST"
