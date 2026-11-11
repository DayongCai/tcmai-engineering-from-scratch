#!/usr/bin/env bash
# 取音频：playurl → 下载 mp4 → 抽 16k 单声道 WAV → 删 mp4
# 用法: bash fetch_audio.sh <讲号> [输出目录]
#
# 契约：**抽出的 WAV 时长必须与 episodes.json 的页面时长相差 ≤2%**，否则重取一次，
#       仍不符则 exit 1（不许把半截音频交给转写 —— 第 1 讲就是 2514s / 2892s 被当整讲）。
set -u
NO=$(printf '%02d' "$1")
OUT=$(cygpath -m "${2:-$LOCALAPPDATA/Temp/asr}")
mkdir -p "$OUT"
FFDIR="$LOCALAPPDATA/ffmpeg/ffmpeg-9.0.2-essentials_build/bin"
FF="$FFDIR/ffmpeg"
FP="$FFDIR/ffprobe"
REPO=$(cygpath -m "$(cd "$(dirname "$0")/../.." && pwd)")
EPS="$REPO/standards/materials/chenruchun-lectures/sources/episodes.json"
UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'
# 注意：脚本里的路径一律走「环境变量 + fs.readFileSync」，不把 Windows 反斜杠路径嵌进 node -e 源码
# （嵌进去会被 JS 当成转义序列，路径静默变形 —— 上一版就栽在这上面）
FIELD=$(EPS="$EPS" N="$1" F=bvid node -e "const fs=require('fs');const e=JSON.parse(fs.readFileSync(process.env.EPS,'utf8')).episodes.find(x=>x.no==Number(process.env.N));console.log(e[process.env.F]||'')")
BVID=$FIELD
CID=$(EPS="$EPS" N="$1" F=cid node -e "const fs=require('fs');const e=JSON.parse(fs.readFileSync(process.env.EPS,'utf8')).episodes.find(x=>x.no==Number(process.env.N));console.log(e.cid)")
EPDUR=$(EPS="$EPS" N="$1" node -e "const fs=require('fs');const e=JSON.parse(fs.readFileSync(process.env.EPS,'utf8')).episodes.find(x=>x.no==Number(process.env.N));console.log(e.dur||0)")
echo "[$NO] $BVID cid=$CID · 页面时长 ${EPDUR}s"

attempt=0
while [ "$attempt" -lt 2 ]; do
  attempt=$((attempt + 1))
  curl -s -A "$UA" -H "Referer: https://www.bilibili.com/video/$BVID/" -H "Origin: https://www.bilibili.com" \
    "https://api.bilibili.com/x/player/playurl?bvid=$BVID&cid=$CID&qn=32&fnval=16&fnver=0&platform=pc&fourk=0" -o "$OUT/playurl-$NO.json"
  # 优先只取 DASH 音频轨（几十 MB），拿不到再退回 durl 整段视频
  URL=$(P="$OUT/playurl-$NO.json" node -e "
const fs=require('fs');const j=JSON.parse(fs.readFileSync(process.env.P,'utf8'));const d=j.data||{};
if(d.dash&&Array.isArray(d.dash.audio)&&d.dash.audio.length){const a=d.dash.audio.slice().sort((x,y)=>(x.bandwidth||0)-(y.bandwidth||0))[0];console.log(a.baseUrl||a.base_url);}
else if(d.durl&&d.durl.length)console.log(d.durl[0].url);")
  [ -z "$URL" ] && { echo "[$NO] 取链失败（第 $attempt 次）"; continue; }
  case "$URL" in *m4s*|*.mp4*) EXT=m4s ;; *) EXT=mp4 ;; esac
  curl -s -A "$UA" -e "https://www.bilibili.com/video/$BVID/" --max-time 900 "$URL" -o "$OUT/v$NO.$EXT"
  SZ=$(stat -c%s "$OUT/v$NO.$EXT" 2>/dev/null || echo 0)
  if [ "$SZ" -lt 500000 ]; then echo "[$NO] 下载异常 $SZ 字节（第 $attempt 次）"; rm -f "$OUT/v$NO.$EXT"; continue; fi
  "$FF" -y -loglevel error -i "$OUT/v$NO.$EXT" -vn -ac 1 -ar 16000 -c:a pcm_s16le "$OUT/a$NO.wav"
  rm -f "$OUT/v$NO.$EXT"
  DUR=$("$FP" -v error -show_entries format=duration -of csv=p=0 "$OUT/a$NO.wav" 2>/dev/null)
  echo "[$NO] 音频 $(stat -c%s "$OUT/a$NO.wav") 字节 · ${DUR}s · 已删 mp4"
  if awk -v a="${DUR:-0}" -v b="${EPDUR:-0}" 'BEGIN{d=a-b; if(d<0)d=-d; exit !(b>0 && d <= b*0.02)}'; then
    exit 0
  fi
  echo "[$NO] 时长不符：抽出 ${DUR}s vs 页面 ${EPDUR}s（第 $attempt 次）"
  rm -f "$OUT/a$NO.wav"
done
echo "[$NO] 取音频失败：两次都无法得到完整时长"
exit 1
