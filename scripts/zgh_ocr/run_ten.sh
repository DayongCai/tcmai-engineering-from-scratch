#!/usr/bin/env bash
# 十门（+复核两门）整门 OCR：按书内章序串行跑，已存在的页自动跳过
set -u
cd "$(dirname "$0")/../.."
python "$(dirname "$0")/run_ocr.py" --vol shang --from 85 --to 274 --workers 2
python "$(dirname "$0")/run_ocr.py" --vol shang --from 275 --to 408 --workers 2
python "$(dirname "$0")/run_ocr.py" --vol shang --from 409 --to 490 --workers 2
python "$(dirname "$0")/run_ocr.py" --vol shang --from 491 --to 787 --workers 2
python "$(dirname "$0")/run_ocr.py" --vol zhong --from 55 --to 204 --workers 2
python "$(dirname "$0")/run_ocr.py" --vol zhong --from 205 --to 598 --workers 2
python "$(dirname "$0")/run_ocr.py" --vol zhong --from 599 --to 704 --workers 2
python "$(dirname "$0")/run_ocr.py" --vol zhong --from 705 --to 853 --workers 2
python "$(dirname "$0")/run_ocr.py" --vol xia --from 10 --to 189 --workers 2
python "$(dirname "$0")/run_ocr.py" --vol xia --from 190 --to 317 --workers 2
python "$(dirname "$0")/run_ocr.py" --vol xia --from 318 --to 383 --workers 2
python "$(dirname "$0")/run_ocr.py" --vol xia --from 384 --to 760 --workers 2
