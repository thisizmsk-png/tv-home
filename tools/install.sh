#!/bin/sh
# Build and install TV Home on the TV.
#   tools/install.sh <tv-ip>
# The TMDB key is read from ~/.config/tv-home/tmdb.key (API key or read access token)
# and only written into the build copy in dist/, never into app/.
set -eu
TV="${1:?usage: tools/install.sh <tv-ip>}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
AEROTIZEN="${AEROTIZEN:-$HOME/aerotizen-venv/bin/aerotizen}"
KEYFILE="$HOME/.config/tv-home/tmdb.key"

rm -rf "$ROOT/dist/app"
mkdir -p "$ROOT/dist"
cp -R "$ROOT/app" "$ROOT/dist/app"
if [ -s "$KEYFILE" ]; then
  KEY="$(tr -d ' \r\n' < "$KEYFILE")"
  printf 'window.TVHOME_TMDB_KEY = "%s";\n' "$KEY" > "$ROOT/dist/app/js/key.js"
  echo "TMDB key: found"
else
  echo "TMDB key: none, using stand-in paintings"
fi
"$AEROTIZEN" --tv "$TV" install "$ROOT/dist/app"
"$AEROTIZEN" --tv "$TV" launch TvHome0001.Home
