#!/usr/bin/env bash
# ============================================================
# تحويل صور المنتجات إلى WebP مضغوط وجاهز للويب
#
#   1) حط الصور الأصلية في assets/products/raw/
#      بأسماء مثل: rocket-1.jpg  tomato-2.png
#   2) شغّل:  bash tools/optimize-images.sh
#   3) الصور المحوّلة بتنحفظ في assets/products/
#      والسكربت بيطبع لك السطور الجاهزة لملف products.js
# ============================================================

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$ROOT/assets/products/raw"
OUT="$ROOT/assets/products"

MAX_WIDTH=1200
QUALITY=82

if [ ! -d "$SRC" ]; then
  echo "المجلد $SRC غير موجود."
  echo "أنشئه وحط فيه الصور الأصلية، ثم أعد تشغيل السكربت:"
  echo "  mkdir -p assets/products/raw"
  exit 1
fi

# اختيار الأداة المتوفّرة
if command -v magick >/dev/null 2>&1; then
  CONVERT=(magick)
elif command -v convert >/dev/null 2>&1; then
  CONVERT=(convert)
elif command -v cwebp >/dev/null 2>&1; then
  CONVERT=()
else
  echo "لازم تثبّت ImageMagick أو webp أولاً:"
  echo "  macOS:  brew install imagemagick"
  echo "  Ubuntu: sudo apt install imagemagick webp"
  exit 1
fi

shopt -s nullglob nocaseglob
FILES=("$SRC"/*.{jpg,jpeg,png,heic,webp,tif,tiff,bmp})
shopt -u nocaseglob

if [ ${#FILES[@]} -eq 0 ]; then
  echo "ما في صور داخل $SRC"
  exit 0
fi

declare -A GROUPS=()
COUNT=0

for f in "${FILES[@]}"; do
  base="$(basename "$f")"
  stem="${base%.*}"
  target="$OUT/$stem.webp"

  if [ ${#CONVERT[@]} -gt 0 ]; then
    "${CONVERT[@]}" "$f" \
      -auto-orient \
      -resize "${MAX_WIDTH}x${MAX_WIDTH}>" \
      -strip \
      -quality "$QUALITY" \
      "$target"
  else
    cwebp -quiet -resize "$MAX_WIDTH" 0 -q "$QUALITY" "$f" -o "$target"
  fi

  size="$(du -h "$target" | cut -f1 | tr -d ' ')"
  echo "✓ $base  →  $stem.webp  ($size)"
  COUNT=$((COUNT + 1))

  # المعرّف = الاسم بدون آخر مقطع رقمي (rocket-2 → rocket)
  id="$(printf '%s' "$stem" | sed -E 's/-[0-9]+$//')"
  GROUPS["$id"]="${GROUPS[$id]:-}${GROUPS[$id]:+, }\"$stem.webp\""
done

echo
echo "تم تحويل $COUNT صورة."
echo "─────────────────────────────────────────────"
echo "الصق هذي القيم داخل assets/products.js:"
echo
for id in "${!GROUPS[@]}"; do
  echo "  $id  →  images: [${GROUPS[$id]}]"
done
echo "─────────────────────────────────────────────"
