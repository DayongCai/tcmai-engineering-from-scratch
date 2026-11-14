#!/usr/bin/env bash
# 顺序跑两门 OCR（并发两进程反而更慢：实测 4 进程 3.5 页/分，两进程各 3 线程只有 2 页/分）
set -u
cd "$(dirname "$0")/../.."
echo "=== 火门（中册 205–599）==="
python scratch/zgh_ocr/run_ocr.py --vol zhong --from 205 --to 599 --workers 2 || echo "zhong 部分失败，继续"
echo "=== 虚证门（下册 388–760）==="
python scratch/zgh_ocr/run_ocr.py --vol xia --from 388 --to 760 --workers 2 || echo "xia 部分失败"
echo "=== 统计 ==="
ls scratch/zgh_ocr/ocr/*.json 2>/dev/null | grep -v ERR | wc -l
ls scratch/zgh_ocr/ocr/*ERR.json 2>/dev/null | wc -l
