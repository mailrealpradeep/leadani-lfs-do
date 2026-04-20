#!/bin/bash
# Run the project's automated tests using Node's built-in test runner via tsx.
# Tests live in server/__tests__/*.test.ts and are designed to run without a
# database (they unset DATABASE_URL so storage falls back to MemStorage and
# never opens a connection).
set -e
cd "$(dirname "$0")/.."
DATABASE_URL="" exec npx tsx --test --test-force-exit --test-timeout=30000 server/__tests__/*.test.ts "$@"
