#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
echo "=== vercel whoami ==="
VERCEL_CMD=(pnpm dlx vercel)

"${VERCEL_CMD[@]}" whoami

echo "=== vercel prod deploy (no git) ==="
"${VERCEL_CMD[@]}" --prod --yes --name weavelink | tee vercel-deploy-output.txt
echo "=== done ==="
