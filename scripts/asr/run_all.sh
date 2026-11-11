#!/usr/bin/env bash
# 24 讲语音转写批处理（可重复运行 / 断点续跑）
#   用法: bash scripts/asr/run_all.sh            （默认 turbo 模型）
#         MODEL=<模型目录> THREADS=8 bash scripts/asr/run_all.sh
#         ORDER="19 20" bash scripts/asr/run_all.sh   （只跑指定讲次）
# 产物: standards/materials/chenruchun-lectures/sources/asr/lec-NN.json + asr-transcripts.json
#      每转完一讲自动重生成本机桌面的《验证-伤寒论.xlsx》
# 设计要点:
#   · 单实例锁：重复启动不会抢 CPU；上次被中断也能接续（已完成讲直接跳过）
#   · 第 8 讲与第 6 讲是同一份视频（抽帧统计逐位相同），不重复转写
#   · 音频只取 DASH 音频轨（几十 MB），转完即删；视频本体从不入库
set -u
HERE=$(cd "$(dirname "$0")" && pwd)          # 本脚本所在目录（先解析，别等 cd 之后再算）
REPO=$(cygpath -m "$HERE/../..")
SCRIPTS="$REPO/scripts/asr"
cd "$LOCALAPPDATA/Temp" || exit 1

PY=${PY:-"$LOCALAPPDATA/Programs/Python/Python312/python.exe"}
ASRDIR="$REPO/standards/materials/chenruchun-lectures/sources/asr"
mkdir -p "$ASRDIR" asr
MODEL=${MODEL:-models/faster-whisper-turbo}
THREADS=${THREADS:-8}
ORDER=${ORDER:-"24 19 20 9 16 17 5 23 21 22 4 2 1 3 6 7 10 11 12 13 14 15 18"}
# FORCE="1 19"：讲次列表，列出的讲即使已有 lec-NN.json 也重转（用于修半截音频等）
FORCE=${FORCE:-""}
PROMPT='老中医讲授《伤寒论》课堂录音。术语与方名：六经、太阳病、阳明病、少阳病、太阴病、少阴病、厥阴病、亡阳、少阴亡阳、脉微细但欲寐、回阳救逆、温法、理中汤、四逆汤、真武汤、当归四逆汤、吴茱萸汤、乌梅丸、苓桂术甘汤、桂枝加附子汤、五苓散、小柴胡汤、桂枝汤、麻黄汤、半夏泻心汤、甘草泻心汤、四逆散、葛根芩连汤、白头翁汤、阳明腑实、经方、时方、方义、配伍、剂量、条文、加减法。'

echo "仓库 $REPO"
echo "模型 $MODEL · 线程 $THREADS · 共 $(echo $ORDER | wc -w) 讲"

# 单实例锁（用 ps -W 查 WINPID：tasklist //FI 在本机 bash 里不可用，会静默失败 → 误判为「没在跑」）
LOCK="$LOCALAPPDATA/Temp/asr/.lock"
alive() { # $1=Windows PID
  [ -n "${1:-}" ] || return 1
  ps -W 2>/dev/null | awk -v p="$1" '$4 == p { found = 1 } END { exit found ? 0 : 1 }'
}
if [ -f "$LOCK" ]; then
  OLD=$(cat "$LOCK" 2>/dev/null)
  if alive "$OLD"; then echo "已有批处理在跑（PID $OLD），退出"; exit 0; fi
  echo "发现过期锁（PID ${OLD:-空} 已不在），接续"
fi
echo "$(cat /proc/$$/winpid 2>/dev/null || echo $$)" > "$LOCK"
trap 'rm -f "$LOCK"' EXIT

for N in $ORDER; do
  NN=$(printf '%02d' "$N")
  if [ -f "$ASRDIR/lec-$NN.json" ]; then
    case " $FORCE " in
      *" $N "*) echo "[$NN] 已有转写，但 FORCE 指定重转" ;;
      *) echo "[$NN] 已有转写，跳过"; continue ;;
    esac
  fi
  WAV="asr/a$NN.wav"
  if [ -f "$WAV" ]; then echo "[$NN] 已有音频，跳过下载"; else
    echo "===== [$NN] $(date +%H:%M:%S) 取音频 ====="
    bash "$SCRIPTS/fetch_audio.sh" "$N" || { echo "[$NN] 取音频失败"; continue; }
  fi
  [ -f "$WAV" ] || { echo "[$NN] 无音频文件"; continue; }
  echo "===== [$NN] $(date +%H:%M:%S) 转写 ====="
  "$PY" "$SCRIPTS/transcribe.py" "$MODEL" "$WAV" "$ASRDIR/lec-$NN.json" 0 "$PROMPT" "$THREADS" 0 \
    || { echo "[$NN] 转写失败"; continue; }
  node "$SCRIPTS/collect_transcripts.js" "$NN" 2>&1 | tail -2
  rm -f "$WAV" "$LOCALAPPDATA/Temp/asr/playurl-$NN.json"
  # 每转完一讲就重生成交付物：中途停了，桌面那份也已经把这一讲吃进去
  ( cd "$REPO" && node scripts/import_chenruchun_lectures.js 2>&1 | tail -3 )
done
node "$SCRIPTS/collect_transcripts.js" 2>&1 | tail -4
echo "===== 本轮结束 $(date +%H:%M:%S) ====="
