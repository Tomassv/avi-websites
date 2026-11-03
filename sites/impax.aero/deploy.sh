#!/usr/bin/env bash
# Deploy impax.aero to the S3 bucket.
#
#   ./deploy.sh                          dry run: lists what would be uploaded, changes nothing
#   ./deploy.sh --go                     uploads new and changed files
#   ./deploy.sh --refresh-headers        dry run of re-uploading EVERY file (to apply cache headers)
#   ./deploy.sh --refresh-headers --go   re-uploads every file
#
# Needs a live AWS SSO session:  export AWS_PROFILE=avilabs-prod && aws sso login
# Never deletes anything in the bucket (no --delete).
#
# CloudFront sits in front of the bucket and our SSO role can't invalidate it, so every file gets a
# Cache-Control header instead: pages refresh within 5 minutes, CSS/JS within an hour, images within a day.
set -euo pipefail
cd "$(dirname "$0")"

export AWS_PROFILE="${AWS_PROFILE:-avilabs-prod}"
BUCKET="s3://impax-aero-prod"
CACHE_PAGES="public, max-age=300"      # .html, .xml, .txt
CACHE_CODE="public, max-age=3600"      # .css, .js
CACHE_MEDIA="public, max-age=86400"    # images, video, everything else

# Files that live in this folder but are not part of the public site. Applied last, so they win.
EXCLUDES=(
  --exclude ".*" --exclude "*/.*"          # .DS_Store, dotfiles
  --exclude "impax-aero-prod/*"            # old local snapshot of the bucket
  --exclude "CLAUDE.md" --exclude "deploy.sh"
  --exclude "test.txt"
  --exclude "report_updater.html"          # internal tool, used locally
  --exclude "*.py" --exclude "*.bak*" --exclude "*.before.html"
  --exclude "llms.txt"                     # uploaded separately below
)

MODE="--dryrun"
UPLOAD=(sync)
for arg in "$@"; do
  case "$arg" in
    --go) MODE="" ;;
    --refresh-headers) UPLOAD=(cp --recursive) ;;
    *) echo "Unknown option: $arg" >&2; exit 2 ;;
  esac
done

if ! aws sts get-caller-identity >/dev/null 2>&1; then
  echo "No AWS session for profile $AWS_PROFILE. Run: aws sso login --profile $AWS_PROFILE" >&2
  exit 1
fi

if [[ -z "$MODE" ]]; then
  echo "Uploading to $BUCKET (${UPLOAD[*]}) ..."
else
  echo "DRY RUN (nothing is uploaded). Re-run with --go to upload."
fi

# shellcheck disable=SC2086
upload() { aws s3 "${UPLOAD[@]}" . "$BUCKET/" $MODE "$@"; }

# Pages
upload --exclude "*" --include "*.html" --include "*.xml" --include "*.txt" "${EXCLUDES[@]}" \
  --cache-control "$CACHE_PAGES"
# CSS and JS
upload --exclude "*" --include "*.css" --include "*.js" "${EXCLUDES[@]}" \
  --cache-control "$CACHE_CODE"
# Everything else (images, video, icons)
upload --exclude "*.html" --exclude "*.xml" --exclude "*.txt" --exclude "*.css" --exclude "*.js" "${EXCLUDES[@]}" \
  --cache-control "$CACHE_MEDIA"
# llms.txt with an explicit UTF-8 content type
# shellcheck disable=SC2086
aws s3 cp llms.txt "$BUCKET/llms.txt" $MODE --content-type "text/plain; charset=utf-8" --cache-control "$CACHE_PAGES"
