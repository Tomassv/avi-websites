#!/bin/sh
# Vercel "Ignored Build Step" for report.avilabs. Runs in sites/avilabs.is/report (the project's root
# directory). Exit 1 = build, exit 0 = skip.
#
# This repo holds several sites, and Vercel notifies every connected project on every push. Build only
# when this folder changed:
# - since the last successful deployment of this branch (VERCEL_GIT_PREVIOUS_SHA), or
# - when there is none yet (a new branch, or only failed builds so far), in the latest commit.
# If neither can be checked, build: the failure mode is "build", never "skip".
base="${VERCEL_GIT_PREVIOUS_SHA:-}"
if [ -n "$base" ] && git cat-file -e "$base^{commit}" 2>/dev/null; then
  label="the last deployment ($base)"
elif git cat-file -e "HEAD^{commit}" 2>/dev/null && git cat-file -e "HEAD^^{commit}" 2>/dev/null; then
  base="HEAD^"
  label="the previous commit"
else
  echo "should-build: nothing to compare with; building"
  exit 1
fi

if git diff --quiet "$base" HEAD -- .; then
  echo "should-build: sites/avilabs.is/report unchanged since $label; skipping"
  exit 0
fi
echo "should-build: sites/avilabs.is/report changed since $label; building"
exit 1
