#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
echo "=== vercel whoami ==="
npx vercel whoami
echo "=== vercel prod deploy (no git) ==="
npx vercel --prod --yes --name weavelink | tee vercel-deploy-output.txt
echo "=== done ==="
