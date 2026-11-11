#!/usr/bin/env bash
# 补采指定时刻的字幕条：抓帧 → 裁底部 → 拼图（供逐图读出）
# 用法: bash gap_frames.sh <目标文件.tsv>   每行: 讲号<TAB>秒
# 产物: $LOCALAPPDATA/Temp/frames/gap/NN-sec-{a,b}.jpg 与 gap-1.jpg/gap-2.jpg 拼图
set -u
LIST="$1"
FFDIR="$LOCALAPPDATA/ffmpeg/ffmpeg-9.0.2-essentials_build/bin"
FF="$FFDIR/ffmpeg"
D="$LOCALAPPDATA/Temp/frames/gap"
mkdir -p "$D"
REPO=$(cygpath -m "$(cd "$(dirname "$0")/../.." && pwd)")

i=0
while IFS=$'\t' read -r NO SEC; do
  [ -z "${NO:-}" ] && continue
  for OFF in 1 3; do
    T=$((SEC + OFF))
    S=$(printf "%s-%04d-%s" "$NO" "$SEC" "ab")
    IMG="$D/$NO-$SEC-$OFF.jpg"
    bash "$REPO/scripts/frames/fetch_frame.sh" "$NO" "$T" "$IMG" >/dev/null 2>&1 || { echo "抓帧失败 $NO $T"; continue; }
    # 底部字幕带：y 84%–100%，放大到 1000 宽
    "$FF" -y -loglevel error -i "$IMG" -vf "crop=iw:ih*0.16:0:ih*0.84,scale=1000:-1" "$D/$NO-$SEC-$OFF-strip.jpg"
    i=$((i + 1))
  done
done < "$LIST"

# 每 4 条拼一张，横向对齐后纵向堆叠
n=0
ls "$D"/*-strip.jpg 2>/dev/null | sort -t- -k1,1n -k2,2n | nl -w3 -s' ' | awk '{print $2}' > "$D/order.txt"
split -l 4 "$D/order.txt" "$D/group-"
g=0
for f in "$D"/group-*; do
  g=$((g + 1))
  args=(); filt=""
  k=0
  while read -r img; do
    [ -z "$img" ] && continue
    args+=(-i "$img")
    filt+="[$k:v]scale=1000:80,setsar=1[v$k];"
    k=$((k + 1))
  done < "$f"
  [ "$k" -eq 0 ] && continue
  stack=""
  for j in $(seq 0 $((k - 1))); do stack+="[v$j]"; done
  "$FF" -y -loglevel error "${args[@]}" -filter_complex "${filt}${stack}vstack=inputs=$k" "$REPO/../gap-strip-$g.jpg" 2>/dev/null || true
  echo "拼图 $g：$(tr '\n' ' ' < "$f")"
done
echo "单条字幕带：$i 张 · 在 $D"
