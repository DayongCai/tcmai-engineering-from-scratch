#!/usr/bin/env bash
# 精扫：把每个「章末→章首」的 7–13 页窗口逐页扫一遍，好把边界钉到页
set -u
cd "$(dirname "$0")/../.."
run() { python "$(dirname "$0")/scan_headers.py" --vol "$1" --from "$2" --to "$3" --step 1; }

run shang 79 85
run shang 271 277
run shang 403 409
run shang 487 493
run zhong 199 205
run zhong 595 601
run zhong 697 709
run xia 184 190
run xia 310 322
run xia 382 388
