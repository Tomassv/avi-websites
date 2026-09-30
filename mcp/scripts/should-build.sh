#!/bin/sh
# Vercel "Ignored Build Step" for avi-websites-mcp. Runs in mcp/ (the project's root directory).
# Exit 1 = build, exit 0 = skip.
#
# Build when mcp/, any site's lib/, or any site's landing schema changed since the last deployment
# of this branch; those are the server's code and the site rules bundled into it. If the base commit
# is unknown or missing from the clone, build: the failure mode is "build", never "skip".
base="${VERCEL_GIT_PREVIOUS_SHA:-}"
if [ -z "$base" ] || ! git cat-file -e "$base^{commit}" 2>/dev/null; then
  echo "should-build: no previous deployment to compare with; building"
  exit 1
fi
if git diff --quiet "$base" HEAD -- . \
  ':(top,glob)sites/*/lib/**' \
  ':(top,glob)sites/*/content/landing.schema.json'; then
  echo "should-build: no changes to mcp/, site rules or landing schemas; skipping"
  exit 0
fi
echo "should-build: server code or site rules changed; building"
exit 1
