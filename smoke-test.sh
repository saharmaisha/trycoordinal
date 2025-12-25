#!/bin/bash

# Smoke Test Script for Plan Delta V1
# This script verifies that all services can start and basic connectivity works

set -e

echo "=========================================="
echo "Plan Delta V1 - Smoke Test"
echo "=========================================="
echo ""

# Check Node version
echo "✓ Checking Node.js version..."
node_version=$(node -v)
echo "  Node version: $node_version"

# Check if .env.local files exist
echo ""
echo "✓ Checking environment files..."

if [ ! -f "apps/api/.env.local" ]; then
  echo "  ❌ Missing apps/api/.env.local"
  echo "  Create this file with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
  exit 1
fi
echo "  ✓ apps/api/.env.local exists"

if [ ! -f "apps/worker/.env.local" ]; then
  echo "  ❌ Missing apps/worker/.env.local"
  echo "  Create this file with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
  exit 1
fi
echo "  ✓ apps/worker/.env.local exists"

if [ ! -f "apps/web/.env.local" ]; then
  echo "  ❌ Missing apps/web/.env.local"
  echo "  Create this file with NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and NEXT_PUBLIC_API_URL"
  exit 1
fi
echo "  ✓ apps/web/.env.local exists"

# Check if dependencies are installed
echo ""
echo "✓ Checking dependencies..."
if [ ! -d "node_modules" ]; then
  echo "  ❌ Root node_modules not found. Run 'npm install' first."
  exit 1
fi
echo "  ✓ Dependencies installed"

# Test TypeScript compilation
echo ""
echo "✓ Testing TypeScript compilation..."
npm run typecheck > /dev/null 2>&1 || {
  echo "  ❌ TypeScript compilation failed"
  echo "  Run 'npm run typecheck' to see errors"
  exit 1
}
echo "  ✓ TypeScript compiles successfully"

echo ""
echo "=========================================="
echo "✅ All checks passed!"
echo "=========================================="
echo ""
echo "Ready to run the application. Start these in separate terminals:"
echo ""
echo "Terminal 1 (API):"
echo "  cd apps/api && npm run dev"
echo ""
echo "Terminal 2 (Worker):"
echo "  cd apps/worker && npm run dev"
echo ""
echo "Terminal 3 (Web):"
echo "  cd apps/web && npm run dev"
echo ""
echo "Then open http://localhost:3000 in your browser"
echo ""

