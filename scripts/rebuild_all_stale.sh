#!/usr/bin/env bash
# rebuild_all_stale.sh —— 无人值守把「已过门课程」的薄稿成片按批补实
#
# 为什么要有它：单章 8–20 分钟，24 门课有 300+ 陈旧章，一次跑完要几十小时；
# 期间必须能被锁挡住、被中断、再接着跑。这里只做三件事：
#   1. 反复调用 rebuild_completed_courses.js（--batch-chapters 3，一次推进一门课 3 章）；
#   2. 每次之间 sleep 30 秒，让 TTS/ffmpeg 释放句柄；
#   3. 退出条件 = 连续的调用都没有成片产出（说明队列里已无陈旧章）。
#
# 用法：bash scripts/rebuild_all_stale.sh [批大小] [最大轮数]
set -u
cd "$(dirname "$0")/.." || exit 1
BATCH="${1:-3}"
MAX="${2:-200}"
idle=0
for i in $(seq 1 "$MAX"); do
  out=$(node scripts/rebuild_completed_courses.js --batch-chapters "$BATCH" 2>&1)
  made=$(printf '%s' "$out" | grep -o '本次成片 [0-9]* 章' | grep -o '[0-9]*' | head -1)
  made=${made:-0}
  echo "[轮 $i] 成片 ${made} 章  $(date '+%H:%M')"
  if [ "$made" -eq 0 ]; then
    # 无产出有两种可能：队列清空，或另一批（cron / 手工）正持锁。
    # 锁在就别急着收工 —— 长章一章要 20 分钟以上，5 分钟后再看。
    if [ -f platform/.video-batch.lock ]; then
      echo "锁被占用，5 分钟后再试"; sleep 300; continue
    fi
    idle=$((idle + 1))
    [ "$idle" -ge 2 ] && { echo "连续两轮无产出 → 队列已清空，收工"; break; }
  else
    idle=0
  fi
  sleep 30
done
