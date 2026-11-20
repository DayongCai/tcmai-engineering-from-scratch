#!/usr/bin/env bash
# scripts/video_batch_night.sh —— 夜间批量成片（供 cron / 手工长跑用）
#
#   bash scripts/video_batch_night.sh              # 默认上限 120 章
#   BATCH_LIMIT=200 bash scripts/video_batch_night.sh
#
# 为什么要有这一层而不直接写 node 命令：
#   1. 定时任务要能在任意工作目录下跑，必须先 cd 到仓库；
#   2. 跑完必须重算成片台账，否则 LEDGER 与磁盘会分叉（--check 会红）；
#   3. 上限 120 章是有意的：单章 30 秒到 10 分钟不等，按 0.5–1.5 章/分钟算，
#      120 章大约 2–4 小时，一个夜里能跑完，且不会把白天的机器全占住。
#
# 幂等与并发：build_video_batch.js 自带单实例锁（platform/.video-batch.lock），
# 上一轮没跑完时这一轮直接退出，不并行、不在同一章上互相覆盖。

set -u

ROOT="${TCMAI_ROOT:-E:/tcmai-engineering-from-scatch}"
LIMIT="${BATCH_LIMIT:-120}"

cd "$ROOT" || { echo "✗ 找不到仓库: $ROOT"; exit 1; }

echo "═══ 夜间批量成片 · $(date '+%F %H:%M') · 上限 ${LIMIT} 章 ═══"
node scripts/build_video_batch.js --all --resume --limit "$LIMIT"
rc=$?

echo
echo "─── 成片台账（重算）───"
node scripts/build_video_ledger.js | tail -5

exit $rc
