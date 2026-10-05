#!/usr/bin/env bash
# Bundle a build3d scene (+ three.js) into one minified ES module served from the site itself.
# usage: build.sh <site>/src/scene.js <site>/assets/scene.js
set -e
CACHE=${BUILD3D_CACHE:-/tmp/build3d-node}
if [ ! -x "$CACHE/node_modules/.bin/esbuild" ] || [ ! -d "$CACHE/node_modules/three" ]; then
  mkdir -p "$CACHE" && (cd "$CACHE" && npm init -y >/dev/null 2>&1 && npm i -s three@0.169.0 esbuild >/dev/null 2>&1)
fi
NODE_PATH="$CACHE/node_modules" "$CACHE/node_modules/.bin/esbuild" "$1" --bundle --minify --format=esm --target=es2022 --legal-comments=none --outfile="$2"
