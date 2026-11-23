#!/usr/bin/env bash
set -euo pipefail
umask 022

fail() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }
app=$1
target=$2
version=$3
case "$app" in bizworthy|inboxpilot|forexluthor) ;; *) fail "Unknown application." ;; esac
account=$app-deploy
base=/srv/netcup/$app
releases=$base/releases
current=$base/current
candidate=$releases/$version
marker=/etc/netcup/$app-production-target
unit=$app-netcup.service

[[ "$(id -un)" == "$account" && "$target" =~ ^[0-9a-f]{64}$ &&
   "$version" =~ ^[0-9a-f]{40}-[0-9]+-[0-9]+$ ]] || fail "Unexpected account or release identity."
for path in /srv/netcup /etc/netcup; do
  [[ "$(realpath -e -- "$path")" == "$path" && "$(stat -c '%U:%G:%a' -- "$path")" == root:root:755 ]] ||
    fail "Unexpected parent directory: $path."
done
[[ -f "$marker" && "$(realpath -e "$marker")" == "$marker" &&
   "$(stat -c '%U:%G:%a' "$marker")" == root:root:644 &&
   "$(cat "$marker")" == "$(printf '%s\n%s\n%s' "$target" "$base" production)" ]] ||
  fail "Netcup target marker is incorrect."
for path in "$base" "$releases"; do
  [[ -d "$path" && "$(realpath -e "$path")" == "$path" &&
     "$(stat -c '%U:%a' "$path")" == "$account:755" ]] || fail "Unexpected path: $path."
done

exec 9<"$base"
flock -n 9 || fail "Another deployment is active."
previous=
if [[ -L "$current" ]]; then
  previous=$(realpath -e "$current")
  [[ -d "$previous" && "${previous%/*}" == "$releases" &&
     "${previous##*/}" =~ ^[0-9a-f]{40}-[0-9]+-[0-9]+$ ]] || fail "Invalid current release."
elif [[ -e "$current" ]]; then
  fail "Current must be a release symlink."
fi
mkdir -m 700 -- "$candidate"
tar -xf - --no-same-owner --no-same-permissions -C "$candidate"
cd "$candidate"

printf 'Building release %s\n' "$version"
if [[ "$app" == forexluthor ]]; then
  npm ci --no-audit --no-fund
  NEXT_TELEMETRY_DISABLED=1 NEXT_PUBLIC_BASE_PATH=/forexluthor npm run build
  test -f .next/BUILD_ID
  ln -s "$base/shared/ratesCache.json" app/api/rates/ratesCache.json
else
  [[ -s frontend/index.html && -d frontend/_next/static ]]
  chmod 700 backend
  python3.12 -m venv backend/venv
  if [[ "$app" == bizworthy ]]; then
    backend/venv/bin/pip --disable-pip-version-check -q install --only-binary=:all: \
      -r backend/requirements.txt -r .github/netcup/requirements.txt
  else
    backend/venv/bin/pip --disable-pip-version-check -q install --only-binary=:all: \
      -r .github/netcup/requirements.txt
  fi
  backend/venv/bin/pip --disable-pip-version-check check
  find frontend -type d -exec chmod 755 {} +
  find frontend -type f -exec chmod 644 {} +
  chmod 755 .
fi

point_current_at() {
  local link="$base/.current-$version"
  ln -s -- "$1" "$link" || return 1
  if ! mv -Tf -- "$link" "$current"; then
    unlink -- "$link"
    return 1
  fi
}

request() {
  curl --fail --silent --show-error --max-time 10 \
    --resolve www.wisemancodes.com:443:127.0.0.1 "https://www.wisemancodes.com$1"
}

health() {
  local release=$1
  for attempt in {1..20}; do
    if systemctl is-active --quiet "$unit"; then
      if [[ "$app" == forexluthor ]]; then
        if request "/forexluthor" | grep -F 'Forex Luthor' >/dev/null &&
           request "/forexluthor/api/rates?base=EUR&symbols=USD" |
           python3 -c 'import json, sys; d=json.load(sys.stdin); assert d["status"]=="ok" and d["base"]=="EUR" and d["rates"]["USD"]>0'; then
          return 0
        fi
      elif request "/$app/" | cmp -s "$release/frontend/index.html" - &&
           request "/$app/api/health" |
           python3 -c 'import json, sys; assert json.load(sys.stdin)["status"]=="ok"'; then
        return 0
      fi
    fi
    sleep 1
  done
  return 1
}

rollback() {
  local code=$?
  trap - EXIT HUP INT TERM
  if (( code != 0 )); then
    printf 'Activation failed. Restoring previous release.\n' >&2
    if [[ -n "$previous" ]]; then
      point_current_at "$previous" && sudo -n /usr/bin/systemctl restart "$unit" && health "$previous" ||
        printf 'ERROR: Previous release failed to recover.\n' >&2
    else
      sudo -n /usr/bin/systemctl stop "$unit" || printf 'ERROR: Candidate failed to stop.\n' >&2
      if [[ -L "$current" && "$(readlink -- "$current")" == "$candidate" ]]; then
        unlink -- "$current" || printf 'ERROR: Candidate link failed to clear.\n' >&2
      fi
    fi
  fi
  exit "$code"
}
trap rollback EXIT
trap 'exit 1' HUP INT TERM
point_current_at "$candidate"
sudo -n /usr/bin/systemctl restart "$unit"
health "$candidate" || fail "HTTPS frontend or API health check failed."
trap - EXIT HUP INT TERM
printf 'Release healthy: %s\n' "$version"
