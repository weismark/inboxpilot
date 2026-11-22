#!/usr/bin/env bash
set -euo pipefail
umask 077

fail() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }

app=$1
case "$app" in bizworthy|inboxpilot|forexluthor) ;; *) fail "Unknown application." ;; esac
[[ "${GITHUB_SHA:-}" =~ ^[0-9a-f]{40}$ && "$(git rev-parse HEAD)" == "$GITHUB_SHA" &&
   "${GITHUB_RUN_ID:-}" =~ ^[0-9]+$ && "${GITHUB_RUN_ATTEMPT:-}" =~ ^[0-9]+$ ]] ||
  fail "Invalid revision or run ID."
[[ "${NETCUP_DEPLOY_HOST:-}" =~ ^[a-zA-Z0-9][a-zA-Z0-9.-]*$ &&
   "${NETCUP_HOST_PUBLIC_KEY:-}" =~ ^ssh-ed25519[[:blank:]][A-Za-z0-9+/]+={0,2}$ &&
   "${NETCUP_TARGET_ID:-}" =~ ^[0-9a-f]{64}$ && -n "${NETCUP_DEPLOY_SSH_KEY:-}" ]] ||
  fail "Invalid Netcup SSH settings."

scratch=$(mktemp -d)
trap 'rm -rf -- "$scratch"' EXIT
printf '%s\n' "$NETCUP_DEPLOY_SSH_KEY" > "$scratch/deploy-key"
unset NETCUP_DEPLOY_SSH_KEY
printf 'netcup-%s %s\n' "$app" "$NETCUP_HOST_PUBLIC_KEY" > "$scratch/known_hosts"
ssh-keygen -y -P '' -f "$scratch/deploy-key" >/dev/null 2>&1 || fail "Invalid deploy key."
ssh-keygen -lf "$scratch/known_hosts" >/dev/null 2>&1 || fail "Invalid host key."

mkdir "$scratch/payload"
if [[ "$app" == forexluthor ]]; then
  git archive "$GITHUB_SHA" -- app components public next.config.mjs jsconfig.json package.json package-lock.json postcss.config.mjs tailwind.config.js |
    tar -xf - -C "$scratch/payload"
  rm -- "$scratch/payload/app/api/rates/ratesCache.json"
else
  [[ -s frontend/out/index.html && -d frontend/out/_next/static ]] || fail "Missing frontend export."
  [[ -z "$(find frontend/out ! -type d ! -type f -print -quit)" ]] || fail "Unexpected file type in frontend export."
  git archive "$GITHUB_SHA" -- backend .github/netcup/requirements.txt | tar -xf - -C "$scratch/payload"
  rm -f -- "$scratch/payload/backend/.env.example"
  cp -R frontend/out "$scratch/payload/frontend"
fi
remote_script=$(git show "$GITHUB_SHA:.github/netcup/release.sh")
printf -v remote_command 'bash -c %q -- %q %q %q' "$remote_script" "$app" "$NETCUP_TARGET_ID"   "$GITHUB_SHA-$GITHUB_RUN_ID-$GITHUB_RUN_ATTEMPT"
COPYFILE_DISABLE=1 tar -cf "$scratch/release.tar" -C "$scratch/payload" .
ssh -T -F /dev/null -p 22 -o BatchMode=yes -o IdentitiesOnly=yes -o IdentityAgent=none \
  -o StrictHostKeyChecking=yes -o HostKeyAlgorithms=ssh-ed25519 \
  -o UserKnownHostsFile="$scratch/known_hosts" -o GlobalKnownHostsFile=/dev/null \
  -o VerifyHostKeyDNS=no -o UpdateHostKeys=no -o ClearAllForwardings=yes \
  -o "HostKeyAlias=netcup-$app" -o ConnectTimeout=10 -o ServerAliveInterval=15 -o ServerAliveCountMax=3 \
  -i "$scratch/deploy-key" -l "$app-deploy" -- "$NETCUP_DEPLOY_HOST" "$remote_command" < "$scratch/release.tar"
