#!/usr/bin/env bash
set -euo pipefail

# Hono project manager
# Usage examples:
#   ./manage.sh install
#   ./manage.sh setup
#   ./manage.sh dev
#   ./manage.sh prisma:generate
#   ./manage.sh db:push
#   ./manage.sh build && ./manage.sh start

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

# Detect package manager (pnpm > yarn > npm)
if command -v pnpm >/dev/null 2>&1; then
  PKG=pnpm
elif command -v yarn >/dev/null 2>&1; then
  PKG=yarn
else
  PKG=npm
fi

run() {
  echo ">>> $*"
  eval "$@"
}

case "${1:-help}" in
  install)
    run "$PKG i"
    ;;

  setup)
    run "$PKG i"
    run npx prisma generate
    ;;

  prisma:generate)
    run npx prisma generate
    ;;

  db:push)
    run npx prisma db push
    ;;

  migrate:deploy)
    run npx prisma migrate deploy
    ;;

  prisma:studio)
    run npx prisma studio
    ;;

  dev)
    run "$PKG run dev"
    ;;

  build)
    run "$PKG run build"
    ;;

  start)
    run "$PKG start"
    ;;

  lint)
    if [ "$PKG" = "yarn" ]; then
      run yarn lint || true
    else
      run "$PKG run lint" || true
    fi
    ;;

  env)
    echo "Using .env at: $ROOT_DIR/.env"
    if [ -f .env ]; then
      cat .env
    else
      echo "(no .env found)"
    fi
    ;;

  *)
    cat <<'USAGE'
Hono project manager

Commands:
  install           Install dependencies (pnpm/yarn/npm)
  setup             Install deps + prisma generate
  prisma:generate   Generate Prisma client
  db:push           Apply schema to DB (create tables)
  migrate:deploy    Run Prisma migrations in production
  prisma:studio     Open Prisma Studio
  dev               Start dev server (tsx watch)
  build             Build TypeScript + generate prisma
  start             Start built server
  lint              Run ESLint (non-fatal)
  env               Print current .env

USAGE
    ;;
 esac
