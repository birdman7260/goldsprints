#!/usr/bin/env zsh

set -e

if [[ $# -lt 1 || $# -gt 2 ]]; then
    echo "Usage: ./autocrop.sh <input_image> [output_image.png]"
    exit 1
fi

INPUT_FILE="$1"

if [[ -n "$2" ]]; then
    OUTPUT_FILE="$2"
else
    OUTPUT_FILE="${INPUT_FILE%.*}_clean.png"
fi

if [[ "${OUTPUT_FILE:l}" != *.png ]]; then
    OUTPUT_FILE="${OUTPUT_FILE}.png"
fi

if ! command -v magick &> /dev/null; then
    echo "⚠️  Error: ImageMagick is not installed."
    exit 1
fi

echo "Processing '${INPUT_FILE}'..."

# Grab the exact maximum X and Y coordinates (width - 1, height - 1)
read MAX_X MAX_Y <<< $(magick "$INPUT_FILE" -format "%[fx:w-1] %[fx:h-1]" info:)

# Independent 4-Corner Floodfill:
# Pours transparency into top-left, top-right, bottom-left, and bottom-right independently.
# Keeps a safe 2% fuzz to prevent bleeding into the subject.
magick "$INPUT_FILE" \
    -fuzz 2% \
    -fill none \
    -draw "color 0,0 floodfill" \
    -draw "color $MAX_X,0 floodfill" \
    -draw "color 0,$MAX_Y floodfill" \
    -draw "color $MAX_X,$MAX_Y floodfill" \
    -trim +repage \
    "$OUTPUT_FILE"

echo "✅ Success! Shrinkwrapped from all 4 corners and saved to: ${OUTPUT_FILE}"