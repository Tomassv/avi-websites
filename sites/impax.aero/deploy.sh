#!/usr/bin/env bash
# Deploy impax.aero to the S3 bucket.
#
#   ./deploy.sh          dry run: lists what would be uploaded, changes nothing
#   ./deploy.sh --go     uploads for real
#
# Needs a live AWS SSO session:  export AWS_PROFILE=avilabs-prod && aws sso login
# Never deletes anything in the bucket (no --delete).
set -euo pipefail
cd "$(dirname "$0")"

export AWS_PROFILE="${AWS_PROFILE:-avilabs-prod}"
BUCKET="s3://impax-aero-prod"

# Files that live in this folder but are not part of the public site.
EXCLUDES=(
  --exclude ".*" --exclude "*/.*"          # .DS_Store, dotfiles
  --exclude "impax-aero-prod/*"            # old local snapshot of the bucket
  --exclude "CLAUDE.md" --exclude "deploy.sh"
  --exclude "test.txt"
  --exclude "report_updater.html"          # internal tool, used locally
  --exclude "*.py" --exclude "*.bak*" --exclude "*.before.html"
)

if ! aws sts get-caller-identity >/dev/null 2>&1; then
  echo "No AWS session for profile $AWS_PROFILE. Run: aws sso login --profile $AWS_PROFILE" >&2
  exit 1
fi

MODE="--dryrun"
if [[ "${1:-}" == "--go" ]]; then
  MODE=""
  echo "Uploading to $BUCKET ..."
else
  echo "DRY RUN (nothing is uploaded). Re-run with --go to upload."
fi

# llms.txt is sent separately so it gets an explicit UTF-8 content type.
# shellcheck disable=SC2086
aws s3 sync . "$BUCKET/" $MODE "${EXCLUDES[@]}" --exclude "llms.txt"
# shellcheck disable=SC2086
aws s3 cp llms.txt "$BUCKET/llms.txt" $MODE --content-type "text/plain; charset=utf-8"
