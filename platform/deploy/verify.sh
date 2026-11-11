#!/usr/bin/env bash
# verify.sh —— 部署后当场验「能不能播」的五个头（由 deploy.sh 推到服务器执行，也可本地跑）
#
#   bash platform/deploy/verify.sh <port> <course-id> <slug> <rendition-uri>
#   bash platform/deploy/verify.sh 8080 09-jichu/12-yaoli-xue 01-introduction 1080p/index.m3u8
#
# 为什么单独成文件：远程脚本用 heredoc 嵌在 deploy.sh 里时，`$` 转义一旦漏一层，
# bash 会在运行期报 "syntax error near unexpected token"（本机踩过）。
# 拆出来就是普通脚本，本地也能直接跑，改起来不会连带 deploy.sh。

set -u

PORT="${1:?port}"
COURSE="${2:?course-id}"
SLUG="${3:?slug}"
REND="${4:-1080p/index.m3u8}"

BASE="http://127.0.0.1:${PORT}"
SEG="${BASE}/${COURSE}/${SLUG}/${REND%index.m3u8}seg_00001.m4s"
fail=0
ok()  { printf '  ✅ %-32s %s\n' "$1" "$2"; }
bad() { printf '  ❌ %-32s %s\n' "$1" "$2"; fail=1; }

# 注意：不要写 `|| echo 000`。curl 在 -o /dev/null 下可能先写出 200 再返回非零，
# 结果拼成 "200000" 这种假失败（本机 msys curl 实测）。
code=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/healthz" 2>/dev/null || true)
[ "$code" = "200" ] && ok healthz 200 || bad healthz "${code:-000}"

code=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/" 2>/dev/null || true)
[ "$code" = "200" ] && ok "GET /（课程总清单）" 200 || bad "GET /" "${code:-000}"

H=$(curl -s -D- -o /dev/null "$BASE/$COURSE/$SLUG/master.m3u8" 2>/dev/null || true)
echo "$H" | head -1 | grep -q 200 \
  && ok "master.m3u8 200（未被 Range 切片）" yes || bad "master" "$(echo "$H" | head -1)"
echo "$H" | grep -qi '^content-type: application/vnd.apple.mpegurl' \
  && ok "m3u8 MIME" application/vnd.apple.mpegurl || bad "m3u8 MIME" "$(echo "$H" | grep -i '^content-type' || echo 缺失)"
echo "$H" | grep -qi '^access-control-allow-origin: \*' \
  && ok CORS '*' || bad CORS 缺失

S=$(curl -s -D- -o /dev/null -H 'Range: bytes=0-99' "$SEG" 2>/dev/null || true)
echo "$S" | head -1 | grep -q 206 \
  && ok "分片 Range" 206 || bad "分片 Range" "$(echo "$S" | head -1)"
echo "$S" | grep -qi '^content-type: video/iso.segment' \
  && ok "分片 MIME" video/iso.segment || bad "分片 MIME" "$(echo "$S" | grep -i '^content-type' || echo 缺失)"

echo
if [ "$fail" = "0" ]; then
  echo "  全部通过：http://127.0.0.1:${PORT}/${COURSE}/${SLUG}/master.m3u8"
else
  echo "  有检查未通过，按 platform/MEDIA-DELIVERY.md 第四·五节逐项对。"
fi
exit "$fail"
