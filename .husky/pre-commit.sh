#!/usr/bin/env sh
if git diff --name-only --staged --diff-filter=ACMRTUXB | grep -Eq '\.tsx?$'; then
  files=$(git diff --name-only --staged --diff-filter=ACMRTUXB | { grep -E '\.tsx?$' || true; })
  npx biome lint --write $files
  npx biome check --write $files
  npx biome format --write $files
  git add $files
fi
