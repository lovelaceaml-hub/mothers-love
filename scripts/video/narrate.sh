#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
VENV="$ROOT/docs/private/video/.venv"
AUDIO_DIR="$ROOT/docs/private/video/audio"
NARRATION_JSON="$ROOT/docs/video/narration.json"

mkdir -p "$AUDIO_DIR"

# 1. Ensure Python virtual environment and edge-tts
if [ ! -f "$VENV/bin/python" ]; then
  /Library/Frameworks/Python.framework/Versions/3.13/bin/python3 -m venv "$VENV"
fi

if ! "$VENV/bin/python" -c "import edge_tts" >/dev/null 2>&1; then
  "$VENV/bin/pip" install --quiet edge-tts==7.2.8
fi

PYTHON="$VENV/bin/python"
EDGE_TTS="$VENV/bin/edge-tts"

FFPROBE="/opt/homebrew/bin/ffprobe"
if [ ! -x "$FFPROBE" ]; then
  FFPROBE="$(command -v ffprobe)"
fi

FFMPEG="/opt/homebrew/bin/ffmpeg"
if [ ! -x "$FFMPEG" ]; then
  FFMPEG="$(command -v ffmpeg)"
fi

trap 'rm -f "$AUDIO_DIR"/.beat_*.txt "$AUDIO_DIR"/.concat_list.txt' EXIT

# 2. Read configuration and beats from narration.json
VOICE=$("$PYTHON" -c 'import json, sys; print(json.load(open(sys.argv[1]))["voice"])' "$NARRATION_JSON")
RATE=$("$PYTHON" -c 'import json, sys; print(json.load(open(sys.argv[1]))["rate"])' "$NARRATION_JSON")
GAP_SECONDS=$("$PYTHON" -c 'import json, sys; print(json.load(open(sys.argv[1]))["gapSeconds"])' "$NARRATION_JSON")

BEATS_METADATA=$("$PYTHON" - "$NARRATION_JSON" "$AUDIO_DIR" << 'PYEOF'
import json, sys, os

with open(sys.argv[1], "r", encoding="utf-8") as f:
    data = json.load(f)

for b in data.get("beats", []):
    n = b["n"]
    slug = b["slug"]
    text_path = os.path.join(sys.argv[2], f".beat_{n}.txt")
    with open(text_path, "w", encoding="utf-8") as tf:
        tf.write(b["narration"])
    print(f"{n}\t{slug}")
PYEOF
)

# 3. Synthesize beats with edge-tts
ANY_SYNTHESIZED=0
while IFS=$'\t' read -r BEAT_N BEAT_SLUG; do
  [ -z "$BEAT_N" ] && continue
  BEAT_FILE="$AUDIO_DIR/${BEAT_N}-${BEAT_SLUG}.mp3"
  TEXT_FILE="$AUDIO_DIR/.beat_${BEAT_N}.txt"

  if [ "${FORCE:-0}" != "1" ] && [ -f "$BEAT_FILE" ] && [ "$BEAT_FILE" -nt "$NARRATION_JSON" ]; then
    rm -f "$TEXT_FILE"
    continue
  fi

  "$EDGE_TTS" --voice "$VOICE" --rate="$RATE" --file "$TEXT_FILE" --write-media "$BEAT_FILE"
  rm -f "$TEXT_FILE"
  ANY_SYNTHESIZED=1
done <<< "$BEATS_METADATA"

# 4. Measure durations and write timing.json
"$PYTHON" - "$NARRATION_JSON" "$AUDIO_DIR" "$FFPROBE" << 'PYEOF'
import json, sys, os, subprocess

narration_path = sys.argv[1]
audio_dir = sys.argv[2]
ffprobe = sys.argv[3]

with open(narration_path, "r", encoding="utf-8") as f:
    data = json.load(f)

voice = data["voice"]
rate = data["rate"]
gap_seconds = float(data.get("gapSeconds", 0.8))

beats_out = []
for b in data.get("beats", []):
    n = b["n"]
    slug = b["slug"]
    beat_file = os.path.abspath(os.path.join(audio_dir, f"{n}-{slug}.mp3"))
    if not os.path.isfile(beat_file):
        print(f"Error: expected beat file {beat_file} not found", file=sys.stderr)
        sys.exit(1)

    cmd = [ffprobe, "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", beat_file]
    dur_str = subprocess.check_output(cmd, text=True).strip()
    dur = round(float(dur_str), 3)

    beats_out.append({
        "n": n,
        "slug": slug,
        "file": beat_file,
        "durationSeconds": dur
    })

total_speech = round(sum(b["durationSeconds"] for b in beats_out), 3)
num_gaps = max(len(beats_out) - 1, 0)
total_with_gaps = round(total_speech + (num_gaps * gap_seconds), 3)

timing = {
    "voice": voice,
    "rate": rate,
    "gapSeconds": gap_seconds,
    "beats": beats_out,
    "totalSpeechSeconds": total_speech,
    "totalWithGapsSeconds": total_with_gaps
}

timing_path = os.path.join(audio_dir, "timing.json")
with open(timing_path, "w", encoding="utf-8") as f:
    json.dump(timing, f, indent=2)
PYEOF

# 5. Build preview.mp3
PREVIEW_MP3="$AUDIO_DIR/preview.mp3"
GAP_MP3="$AUDIO_DIR/gap.mp3"

BUILD_PREVIEW=0
if [ "${FORCE:-0}" = "1" ] || [ ! -f "$PREVIEW_MP3" ] || [ "$ANY_SYNTHESIZED" -eq 1 ] || [ "$NARRATION_JSON" -nt "$PREVIEW_MP3" ]; then
  BUILD_PREVIEW=1
fi

if [ "$BUILD_PREVIEW" -eq 1 ]; then
  FIRST_BEAT_FILE="$AUDIO_DIR/1-title.mp3"
  SAMPLE_RATE=$("$FFPROBE" -v error -select_streams a:0 -show_entries stream=sample_rate -of csv=p=0 "$FIRST_BEAT_FILE")
  CHANNELS=$("$FFPROBE" -v error -select_streams a:0 -show_entries stream=channels -of csv=p=0 "$FIRST_BEAT_FILE")

  [ -z "$SAMPLE_RATE" ] && SAMPLE_RATE="24000"
  if [ "$CHANNELS" = "1" ]; then
    CL="mono"
  elif [ "$CHANNELS" = "2" ]; then
    CL="stereo"
  else
    CL="mono"
  fi

  "$FFMPEG" -y -v error -f lavfi -i "anullsrc=r=${SAMPLE_RATE}:cl=${CL}" -t "$GAP_SECONDS" -c:a libmp3lame -q:a 4 "$GAP_MP3"

  CONCAT_LIST="$AUDIO_DIR/.concat_list.txt"
  rm -f "$CONCAT_LIST"

  FIRST=1
  while IFS=$'\t' read -r BEAT_N BEAT_SLUG; do
    [ -z "$BEAT_N" ] && continue
    BEAT_FILE="$AUDIO_DIR/${BEAT_N}-${BEAT_SLUG}.mp3"
    if [ "$FIRST" -eq 0 ]; then
      echo "file '$GAP_MP3'" >> "$CONCAT_LIST"
    fi
    echo "file '$BEAT_FILE'" >> "$CONCAT_LIST"
    FIRST=0
  done <<< "$BEATS_METADATA"

  if ! "$FFMPEG" -y -v error -f concat -safe 0 -i "$CONCAT_LIST" -c copy "$PREVIEW_MP3"; then
    "$FFMPEG" -y -v error -f concat -safe 0 -i "$CONCAT_LIST" -c:a libmp3lame -q:a 2 "$PREVIEW_MP3"
  fi
  rm -f "$CONCAT_LIST"
fi

# 6. Self-checks and reporting
"$PYTHON" - "$AUDIO_DIR" << 'PYEOF'
import json, sys, os, glob

audio_dir = sys.argv[1]
timing_path = os.path.join(audio_dir, "timing.json")

if not os.path.isfile(timing_path):
    print("Self-check failure: timing.json not found", file=sys.stderr)
    sys.exit(1)

with open(timing_path, "r", encoding="utf-8") as f:
    timing = json.load(f)

beats = timing.get("beats", [])

beat_files = [f for f in glob.glob(os.path.join(audio_dir, "[0-9]-*.mp3"))]
if len(beat_files) != 7 or len(beats) != 7:
    print(f"Self-check failure: expected 7 beat mp3 files, found {len(beat_files)} files and {len(beats)} beats", file=sys.stderr)
    sys.exit(1)

for b in beats:
    if not os.path.isfile(b["file"]):
        print(f"Self-check failure: beat file {b['file']} not found", file=sys.stderr)
        sys.exit(1)
    if b.get("durationSeconds", 0) > 12.0:
        print(f"Self-check failure: beat {b['n']} ({b['slug']}) duration {b['durationSeconds']}s exceeds 12.0s", file=sys.stderr)
        sys.exit(1)

total_with_gaps = timing.get("totalWithGapsSeconds", 0)
if not (60.0 <= total_with_gaps <= 85.0):
    print(f"Self-check failure: totalWithGapsSeconds {total_with_gaps}s is not between 60 and 85 seconds", file=sys.stderr)
    sys.exit(1)

for b in beats:
    print(f"{b['n']} {b['slug']} {b['durationSeconds']}s")

print(f"NARRATE OK total={total_with_gaps}")
PYEOF
