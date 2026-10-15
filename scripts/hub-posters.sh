#!/bin/sh
# Rebuilds the hub's poster images (public/hub/*.jpg) and their manifest (src/hub/posters.json)
# from the QA screenshots in docs/ and the lab posters in public/lab-posters/.
# macOS only (uses the built-in `sips`). Run it after new docs/variants/<id>-*.png screenshots land:
#   sh scripts/hub-posters.sh
# The hub only shows posters listed in the manifest, so a missing screenshot never causes a 404.
set -eu
cd "$(dirname "$0")/.."
out=public/hub
mkdir -p "$out"
rm -f "$out"/*.jpg
keys=""

make() { # make <key> <source image>
  sips -Z 1200 -s format jpeg -s formatOptions 75 "$2" --out "$out/$1.jpg" >/dev/null
  keys="$keys \"$1\""
}

# The original redesign (captured from /original by the integration QA).
[ -f docs/original-hero.png ] && make original docs/original-hero.png

# Variants: an explicit pick where the hero is not the best frame, else <id>-hero.png, else the
# first non-mobile screenshot of that variant.
for dir in src/variants/*/; do
  id=$(basename "$dir")
  case "$id" in v3) pick=docs/variants/v3-04-mercury.png ;; *) pick=docs/variants/$id-hero.png ;; esac
  if [ ! -f "$pick" ]; then
    pick=$(ls docs/variants/"$id"-*.png 2>/dev/null | grep -v mobile | head -n 1 || true)
  fi
  [ -n "$pick" ] && [ -f "$pick" ] && make "$id" "$pick"
done

# Kit sandboxes.
for pair in mercury:mercury-hero ascii:ascii-hero timeline:timeline-teal-mark swarm:swarm-hero archive:archive-wall; do
  name=${pair%%:*}; file=docs/kit/${pair#*:}.png
  [ -f "$file" ] && make "kit-$name" "$file"
done

# Concept lab posters.
for f in public/lab-posters/*.jpg; do
  [ -f "$f" ] && make "lab-$(basename "$f" .jpg)" "$f"
done

# The brand texture behind the hub's mark (src/assests/bg_3.png is a 2 MB PNG).
sips -s format jpeg -s formatOptions 60 src/assests/bg_3.png --out "$out/texture.jpg" >/dev/null

printf '[%s ]\n' "$(echo $keys | sed 's/ /, /g')" > src/hub/posters.json
echo "hub posters: $(ls "$out" | wc -l | tr -d ' ') files, $(du -sh "$out" | cut -f1)"
