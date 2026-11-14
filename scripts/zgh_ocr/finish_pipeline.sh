#!/usr/bin/env bash
# 等 OCR 跑满（768 页 = 中册 395 + 下册 373）后，自动跑完整收尾流水线。
# 为什么要有这个脚本：OCR 约 3 小时，人工守着一页页看没有意义；
# 收尾五步是固定的，写成脚本后「跑完即交付」，日志留档可查。
set -u
cd "$(dirname "$0")/../.."
LOG="${ZGH_DATA:-scratch/zgh_ocr}/finish.log"
TARGET=${TARGET:-768}
MAX_WAIT=${MAX_WAIT:-18000}   # 最多等 5 小时
: > "$LOG"
echo "等待 OCR 完成：目标 $TARGET 页，最多等 $((MAX_WAIT/60)) 分" | tee -a "$LOG"

waited=0
last_n=0
last_change=0
while :; do
  n=$(ls "${ZGH_DATA:-scratch/zgh_ocr}"/ocr/*.json 2>/dev/null | grep -v ERR | wc -l)
  if [ "$n" -ge "$TARGET" ]; then
    echo "[$(date +%H:%M)] 页数达标 $n/$TARGET，开始收尾" | tee -a "$LOG"
    break
  fi
  if [ "$n" -ne "$last_n" ]; then last_n=$n; last_change=$waited; fi
  # 失败页会让页数卡住：20 分钟没有新页就按现状收尾，不干等 5 小时
  if [ $((waited - last_change)) -ge 1200 ] && [ "$n" -gt 0 ]; then
    echo "[$(date +%H:%M)] 20 分钟无新页（$n/$TARGET），按现状收尾" | tee -a "$LOG"
    break
  fi
  if [ "$waited" -ge "$MAX_WAIT" ]; then
    echo "[$(date +%H:%M)] 超时：只有 $n/$TARGET 页，按现有页数收尾" | tee -a "$LOG"
    break
  fi
  sleep 60
  waited=$((waited+60))
  if [ $((waited % 600)) -eq 0 ]; then
    echo "[$(date +%H:%M)] 已等 $((waited/60)) 分，$n/$TARGET 页" | tee -a "$LOG"
  fi
done

echo "=== 1. 解析并合并正文层 ===" | tee -a "$LOG"
python "$(dirname "$0")/merge_bodies.py" 2>&1 | tee -a "$LOG"

echo "=== 2. 重出辞典 ===" | tee -a "$LOG"
python scripts/build_zhenghou_cidian.py 2>&1 | tail -6 | tee -a "$LOG"

echo "=== 3. 重出看板与计数 ===" | tee -a "$LOG"
node scripts/build_textbook_board.js 2>&1 | tail -1 | tee -a "$LOG"
node scripts/build_content_board.js 2>&1 | tail -1 | tee -a "$LOG"
node scripts/build_outputs_index.js 2>&1 | tail -1 | tee -a "$LOG"
node scripts/check_readme_counts.js --fix 2>&1 | tail -1 | tee -a "$LOG"

echo "=== 4. 全门禁 ===" | tee -a "$LOG"
npm run check > "${ZGH_DATA:-scratch/zgh_ocr}/check.log" 2>&1
echo "npm run check EXIT=$?" | tee -a "$LOG"
tail -4 "${ZGH_DATA:-scratch/zgh_ocr}/check.log" | tee -a "$LOG"

echo "=== 5. 覆盖数（十二门） ===" | tee -a "$LOG"
# 以前这里写死了「正文-火门.json / 正文-虚证.json」两个文件名，改成 M 码命名后
# 全打印「（无）」—— 直接调 report.py，文件名再变也不用改这里。
python "$(dirname "$0")/report.py" 2>&1 | tee -a "$LOG"
echo "DONE" | tee -a "$LOG"
