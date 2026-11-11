#!/usr/bin/env bash
# 抓单帧：playurl → 用 ffmpeg 直接对远端 URL 做 HTTP seek，只取目标时刻的一帧（不整段下载）
# 用法: bash fetch_frame.sh <讲号> <秒> <输出图片>
# 说明：B 站 m4s 支持 Range 请求，-ss 放在 -i 之前是 input seek，ffmpeg 只会拉目标附近的字节。
set -u
NO="$1"
SEC="$2"
OUT="$3"
FFDIR="$LOCALAPPDATA/ffmpeg/ffmpeg-9.0.2-essentials_build/bin"
FF="$FFDIR/ffmpeg"
REPO=$(cygpath -m "$(cd "$(dirname "$0")/../.." && pwd)")
EPS="$REPO/standards/materials/chenruchun-lectures/sources/episodes.json"
UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'
TMP="$LOCALAPPDATA/Temp/frames"
mkdir -p "$TMP" "$(dirname "$OUT")"

BVID=$(EPS="$EPS" N="$NO" node -e "const fs=require('fs');const e=JSON.parse(fs.readFileSync(process.env.EPS,'utf8')).episodes.find(x=>x.no==Number(process.env.N));console.log(e.bvid)")
CID=$(EPS="$EPS" N="$NO" node -e "const fs=require('fs');const e=JSON.parse(fs.readFileSync(process.env.EPS,'utf8')).episodes.find(x=>x.no==Number(process.env.N));console.log(e.cid)")
PU="$TMP/playurl-$NO.json"
[ -s "$PU" ] || curl -s -A "$UA" -H "Referer: https://www.bilibili.com/video/$BVID/" -H "Origin: https://www.bilibili.com" \
  "https://api.bilibili.com/x/player/playurl?bvid=$BVID&cid=$CID&qn=32&fnval=16&fnver=0&platform=pc&fourk=0" -o "$PU"
URL=$(P="$PU" node -e "
const fs=require('fs');const j=JSON.parse(fs.readFileSync(process.env.P,'utf8'));const d=j.data||{};
if(d.dash&&Array.isArray(d.dash.video)&&d.dash.video.length){const v=d.dash.video.slice().sort((a,b)=>(a.bandwidth||0)-(b.bandwidth||0))[0];console.log(v.baseUrl||v.base_url);}
else if(d.durl&&d.durl.length)console.log(d.durl[0].url);")
[ -z "$URL" ] && { echo "取链失败"; exit 1; }

"$FF" -y -loglevel error -headers $'Referer: https://www.bilibili.com/video/'"$BVID"$'/\r\nUser-Agent: '"$UA"$'\r\n' \
  -ss "$SEC" -i "$URL" -frames:v 1 -q:v 2 "$OUT" || exit 1
[ -s "$OUT" ] || { echo "抓帧失败"; exit 1; }
echo "$OUT"
