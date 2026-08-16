#!/bin/sh
# Dump MongoDB and put the archive in S3.
#
# Reads MONGODB_URI (from SSM, the same parameter the backend uses) and
# BACKUP_BUCKET. Nothing is written to disk on the way out: mongodump writes the
# archive to stdout and the AWS CLI reads it from stdin, so the size of the database
# is not also a demand on an instance that has four other containers on it.
set -eu

: "${MONGODB_URI:?MONGODB_URI is not set}"
: "${BACKUP_BUCKET:?BACKUP_BUCKET is not set}"

# Check the tools before anything is written. A verification step that cannot run
# looks exactly like a failed verification, and the response to that is to delete
# the archive — so a missing binary would quietly throw away good backups.
for tool in mongodump aws gzip; do
  command -v "$tool" >/dev/null 2>&1 || { echo "${tool} is not installed" >&2; exit 1; }
done

STAMP=$(date -u +%Y%m%dT%H%M%SZ)
KEY="mongodb/$(date -u +%Y/%m/%d)/card_game-${STAMP}.archive.gz"
TARGET="s3://${BACKUP_BUCKET}/${KEY}"

echo "Dumping to ${TARGET}"

discard() {
  echo "Removing the unusable archive" >&2
  aws s3 rm "$TARGET" || true
}

# pipefail is not in POSIX sh, so a mongodump that died mid-stream would leave a
# truncated archive behind that the pipeline reports as a success. Carry its exit
# status out of the subshell by hand — with errexit off inside the group, or the
# subshell would leave before recording anything.
STATUS_FILE=$(mktemp)
echo 1 > "$STATUS_FILE"
{
  set +e
  mongodump --uri="$MONGODB_URI" --archive --gzip --quiet
  echo $? > "$STATUS_FILE"
} | aws s3 cp - "$TARGET"

STATUS=$(cat "$STATUS_FILE")
if [ "$STATUS" -ne 0 ]; then
  echo "mongodump failed with status ${STATUS}" >&2
  discard
  exit "$STATUS"
fi

SIZE=$(aws s3api head-object --bucket "$BACKUP_BUCKET" --key "$KEY" \
  --query ContentLength --output text)

# Read it back and check the compressed stream runs to a clean end. Truncation is
# the failure this whole pipeline invites, and it is the one a size threshold
# cannot see: a half-written archive of a large database still looks big. Size is
# no guide either way, since a legitimately small database makes a small archive.
if ! aws s3 cp "$TARGET" - | gzip -t 2>/dev/null; then
  echo "Archive does not decompress cleanly, so it is not a backup" >&2
  discard
  exit 1
fi

echo "Wrote and verified ${SIZE} bytes at ${TARGET}"
