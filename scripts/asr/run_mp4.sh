#!/usr/bin/env bash
# 桌面讲课录像（4 段 mp4）→ 分段转写 → 整讲 JSON
#   用法: bash scripts/asr/run_mp4.sh                 # 全部（跳过已完成）
#         ONLY=gainian-lectures bash scripts/asr/run_mp4.sh
#         CHUNK=1800 THREADS=8 BEAM=1 bash scripts/asr/run_mp4.sh
# 产物: $LOCALAPPDATA/Temp/asr/<slug>/chunk-NNN.{wav,json}
#       standards/materials/<slug>/sources/asr/<slug>.json（merge_chunks.js 生成）
# 设计要点:
#   · 单实例锁（ps -W 查 WINPID；本机 tasklist //FI 不可用，会静默失败）
#   · chunk 级断点续跑：已有 chunk-NNN.json 就跳过；中断后重跑接着干
#   · 抽音后核对分段总时长与源时长（曾因 ffmpeg 与转写抢跑，1.5 小时只转出 592 秒）
set -u
HERE=$(cd "$(dirname "$0")" && pwd)
REPO=$(cygpath -m "$HERE/../..")
cd "$LOCALAPPDATA/Temp" || exit 1

PY=${PY:-"$LOCALAPPDATA/Programs/Python/Python312/python.exe"}
MODEL=${MODEL:-"$LOCALAPPDATA/Temp/models/faster-whisper-turbo"}
THREADS=${THREADS:-8}
CHUNK=${CHUNK:-1800}
BEAM=${BEAM:-1}
ONLY=${ONLY:-""}
DESKTOP="J:/Users/user/Desktop"
FFMPEG=${FFMPEG:-ffmpeg}
FFPROBE=${FFPROBE:-ffprobe}

P_JING='《黄帝内经》课堂讲授录音。术语：素问、灵枢、阴阳应象大论、藏象、六节藏象论、经脉别论、病机十九条、诸风掉眩皆属于肝、诊法、脉要精微、平旦、治则、标本、正治反治、运气七篇、天元纪、五运行、六元正纪、司天、在泉、天符、九针、镵针、员针、鍉针、锋针、铍针、员利针、毫针、长针、大针、卫气、营气、宗气、津液、神明、揆度。'
P_SHANGHAN='老中医讲授《伤寒论》课堂录音。术语与方名：六经、太阳病、阳明病、少阳病、太阴病、少阴病、厥阴病、提纲、脉浮头项强痛而恶寒、胃家实、口苦咽干目眩、脉微细但欲寐、亡阳、回阳救逆、桂枝汤、麻黄汤、小柴胡汤、大承气汤、小承气汤、调胃承气汤、理中丸、四逆汤、通脉四逆汤、白通汤、真武汤、附子汤、桃花汤、黄连阿胶汤、麻黄附子细辛汤、乌梅丸、吴茱萸汤、五苓散、半夏泻心汤、葛根芩连汤、白头翁汤、痞满燥实、方证对应、剂量、煎服法。'
P_QQZB='《七情治病》网络课程录音，中西医双轨讲授。术语：七情、喜、怒、忧、思、悲、恐、惊、怒伤肝、喜伤心、思伤脾、忧伤肺、恐伤肾、情志、气机、肝气郁结、心脾两虚、辨证、证候、病症单元、ICD-11、中医病名、分期、治法、方药。'
P_GAINIAN='中医概念与辨证思维课程录音。术语：八纲、阴阳、表里、寒热、虚实、寒邪、热邪、阳气、阴液、能量、活跃度、内涵、外延、概念、定义、证候、病机、脏腑、气血津液、六淫、内生五邪、辨证论治。'

alive() { [ -n "${1:-}" ] || return 1; ps -W 2>/dev/null | awk -v p="$1" '$4 == p { f = 1 } END { exit f ? 0 : 1 }'; }
LOCK="$LOCALAPPDATA/Temp/asr/mp4.lock"
mkdir -p asr
if [ -f "$LOCK" ]; then
  OLD=$(cat "$LOCK" 2>/dev/null)
  if alive "$OLD"; then echo "已有 mp4 批处理在跑（WINPID $OLD），退出"; exit 0; fi
  echo "发现过期锁（WINPID ${OLD:-空}），接续"
fi
echo "$(cat /proc/$$/winpid 2>/dev/null || echo $$)" > "$LOCK"
trap 'rm -f "$LOCK"' EXIT

duration_of() { "$FFPROBE" -v error -show_entries format=duration -of csv=p=0 "$1" 2>/dev/null | cut -d. -f1; }

run_job() { # $1=slug $2=mp4 $3=prompt
  SLUG=$1; FILE=$2; PROMPT=$3
  OUTJ="$REPO/standards/materials/$SLUG/sources/asr/$SLUG.json"
  if [ -f "$OUTJ" ]; then echo "[$SLUG] 已有整讲转写，跳过"; return 0; fi
  WORK="asr/$SLUG"
  mkdir -p "$WORK"
  SRC="$DESKTOP/$FILE"
  NEED=$(duration_of "$SRC")
  [ -n "$NEED" ] || { echo "[$SLUG] 读不到源时长（$SRC）"; return 1; }

  if [ ! -f "$WORK/.segs-ok" ]; then
    rm -f "$WORK"/chunk-*.wav
    echo "===== [$SLUG] $(date +%H:%M:%S) 抽音并分段（源 ${NEED}s）====="
    "$FFMPEG" -hide_banner -loglevel error -y -i "$SRC" \
      -vn -ac 1 -ar 16000 -c:a pcm_s16le -reset_timestamps 1 \
      -f segment -segment_time "$CHUNK" "$WORK/chunk-%03d.wav" \
      || { echo "[$SLUG] 抽音失败"; return 1; }
    SUM=0
    for W in "$WORK"/chunk-*.wav; do
      D=$(duration_of "$W"); SUM=$((SUM + ${D:-0}))
    done
    if [ "$SUM" -lt $((NEED - 60)) ]; then
      echo "[$SLUG] 分段总时长 ${SUM}s < 源 ${NEED}s，拒绝转写（防半截音频）"
      return 1
    fi
    echo "[$SLUG] 分段总时长 ${SUM}s ≈ 源 ${NEED}s"
    touch "$WORK/.segs-ok"
  fi

  for W in "$WORK"/chunk-*.wav; do
    B=$(basename "$W" .wav)
    J="$WORK/$B.json"
    if [ -f "$J" ]; then echo "  [$SLUG/$B] 已有转写，跳过"; continue; fi
    echo "  [$SLUG/$B] $(date +%H:%M:%S) 转写"
    BEAM="$BEAM" "$PY" "$REPO/scripts/asr/transcribe.py" "$MODEL" "$WORK/$B.wav" "$J" 0 "$PROMPT" "$THREADS" 0 2>&1 < /dev/null | tail -1
    [ -f "$J" ] || { echo "  [$SLUG/$B] 转写失败"; return 1; }
    rm -f "$W"
  done
  node "$REPO/scripts/asr/merge_chunks.js" "$SLUG" || { echo "[$SLUG] 合并失败"; return 1; }
  rm -f "$WORK/.segs-ok"
  return 0
}

echo "模型 $MODEL · 线程 $THREADS · 分段 ${CHUNK}s · beam $BEAM"
while IFS='|' read -r SLUG FILE PROMPT <&3; do
  [ -z "${SLUG:-}" ] && continue
  if [ -n "$ONLY" ] && [ "$ONLY" != "$SLUG" ]; then continue; fi
  run_job "$SLUG" "$FILE" "$PROMPT"
done 3<<EOF
gainian-lectures|LYZB.mp4|$P_GAINIAN
qiqing-lectures|QQZB.mp4|$P_QQZB
shanghan-lectures|SHL.mp4|$P_SHANGHAN
neijing-lectures|NJ-MM.mp4|$P_JING
EOF

echo "===== 本轮结束 $(date +%H:%M:%S) ====="
