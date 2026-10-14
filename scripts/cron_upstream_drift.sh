#!/usr/bin/env bash
# 上游参考项目漂移哨兵 —— 定时任务包装（Hermes 的 cron `script` 只认 .sh/.bash 或 Python，
# .js 会被当成 Python 执行，所以包一层 bash）。
#
# 契约：**没变化就一个字都不输出**（定时任务按空 stdout 判定"不发送"）；
#       有变化则输出报告，由任务原样发出。
set -uo pipefail

REPO="E:/tcmai-engineering-from-scatch"
cd "$REPO" || { echo "⚠ 上游漂移哨兵：进不去仓库 $REPO"; exit 0; }

# 本机 git 不在 PATH（装在 Program Files 下），脚本内部会自己找；
# 显式给一份更稳，环境变量优先。
export HERMES_GIT="${HERMES_GIT:-J:/Program Files/Git/cmd/git.exe}"

exec node scripts/check_upstream_drift.js
