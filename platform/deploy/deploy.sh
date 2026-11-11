#!/usr/bin/env bash
# deploy.sh —— 把媒体包推到校内/局域网服务器，装好 nginx 站点并当场验证
#
#   ./platform/deploy/deploy.sh --host user@10.0.0.12
#   ./platform/deploy/deploy.sh --host user@10.0.0.12 --remote-root /data/tcm-media --port 8080
#   ./platform/deploy/deploy.sh --host user@10.0.0.12 --dry-run      # 只打印将执行的命令
#   ./platform/deploy/deploy.sh --host user@10.0.0.12 --skip-sync    # 只更新配置
#
# 前提（服务器侧）：nginx 已装、你有 sudo、nginx 配了 conf.d 目录。
# 客户端侧：ssh/scp 可用；有 rsync 就增量，没有就用 tar 走 ssh（全量）。
#
# 设计原则：
#   1) 先同步媒体、再装配置、最后 reload —— 顺序颠倒会让站点短暂 404；
#   2) reload 前必须 `nginx -t` 通过，配置错不许上线；
#   3) 部署完**当场验五个头**（200/MIME/CORS/Range/MIME-分片），不验等于没部署；
#   4) 任何一步失败立即退出（set -e），不留半套配置。

set -euo pipefail

HOST=""
MEDIA_ROOT="${MEDIA_ROOT:-D:/tcm-media}"
REMOTE_ROOT="/srv/tcm-media"
PORT="8080"
CONF_PATH="/etc/nginx/conf.d/tcm-media.conf"
SERVER_NAME="_"
HOST_WEB=""
DRY_RUN=0
SKIP_SYNC=0
SKIP_CONF=0
DELETE_EXTRA=0

usage() {
  sed -n '2,18p' "$0" | sed 's/^# \{0,1\}//'
  exit "${1:-0}"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --host)         HOST="${2:?--host 需要 user@server}"; shift 2 ;;
    --media-root)   MEDIA_ROOT="${2:?}"; shift 2 ;;
    --remote-root)  REMOTE_ROOT="${2:?}"; shift 2 ;;
    --port)         PORT="${2:?}"; shift 2 ;;
    --conf-path)    CONF_PATH="${2:?}"; shift 2 ;;
    --server-name)  SERVER_NAME="${2:?}"; shift 2 ;;
    --host-web)     HOST_WEB="${2:?}"; shift 2 ;;
    --dry-run)      DRY_RUN=1; shift ;;
    --skip-sync)    SKIP_SYNC=1; shift ;;
    --skip-conf)    SKIP_CONF=1; shift ;;
    --delete-extra) DELETE_EXTRA=1; shift ;;
    -h|--help)      usage 0 ;;
    *) echo "未知参数：$1" >&2; usage 2 ;;
  esac
done

[[ -n "$HOST" ]] || { echo "缺 --host user@server" >&2; usage 2; }
[[ -n "$HOST_WEB" ]] || HOST_WEB="${HOST#*@}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONF_SRC="$SCRIPT_DIR/nginx-media.conf"
[[ -f "$CONF_SRC" ]] || { echo "找不到 $CONF_SRC" >&2; exit 2; }

run() {
  if [[ $DRY_RUN -eq 1 ]]; then printf '  [dry-run] %s\n' "$*"; else "$@"; fi
}
say() { printf '\n=== %s ===\n' "$1"; }

# ── 0. 本地预检 ───────────────────────────────────────────────
say "0/4 本地预检"
[[ -f "$MEDIA_ROOT/index.json" ]] || {
  echo "✗ $MEDIA_ROOT/index.json 不存在——先跑 npm run media:hls && npm run media:hls:index" >&2
  exit 3
}

# 抽一章做后面的真实检查（本地算，别在服务器上算 JSON）
FIRST=$(node -e '
const fs=require("fs"),p=require("path");
const root=process.argv[1];
const idx=JSON.parse(fs.readFileSync(p.join(root,"index.json"),"utf8"));
const c=idx.courses[0];
const pub=JSON.parse(fs.readFileSync(p.join(root,c.id,"publish.json"),"utf8"));
const ch=pub.chapters[0];
console.log([c.id,ch.slug,ch.renditions[0].name,ch.renditions[0].uri].join(" "));
' "$MEDIA_ROOT")
read -r C_ID C_SLUG R_NAME R_URI <<<"$FIRST"
CH=$(node -e 'const j=require(process.argv[1]);console.log(j.courses.reduce((a,c)=>a+c.chapterCount,0))' "$MEDIA_ROOT/index.json")
GB=$(du -sm "$MEDIA_ROOT" 2>/dev/null | awk '{printf "%.1f", $1/1024}')
echo "  媒体：$MEDIA_ROOT（$CH 章 · ${GB:-?} GB）"
echo "  抽检章：$C_ID/$C_SLUG"
echo "  目标：$HOST:$REMOTE_ROOT  端口 $PORT  配置 $CONF_PATH"

# ── 1. 同步媒体 ───────────────────────────────────────────────
if [[ $SKIP_SYNC -eq 1 ]]; then
  say "1/4 同步媒体（已跳过）"
else
  say "1/4 同步媒体（${GB:-?} GB；首次慢，之后增量）"
  run ssh "$HOST" "sudo mkdir -p '$REMOTE_ROOT' && sudo chown \$(id -u):\$(id -g) '$REMOTE_ROOT'"
  if command -v rsync >/dev/null 2>&1; then
    RSYNC_ARGS=(-a --info=progress2 --human-readable)
    [[ $DELETE_EXTRA -eq 1 ]] && RSYNC_ARGS+=(--delete)
    run rsync "${RSYNC_ARGS[@]}" "$MEDIA_ROOT/" "$HOST:$REMOTE_ROOT/"
  else
    echo "  （没有 rsync，用 tar 走 ssh：全量传输）"
    if [[ $DRY_RUN -eq 1 ]]; then
      printf '  [dry-run] tar -C %q -cf - . | ssh %s "tar -C %q -xf -"\n' "$MEDIA_ROOT" "$HOST" "$REMOTE_ROOT"
    else
      tar -C "$MEDIA_ROOT" -cf - . | ssh "$HOST" "tar -C '$REMOTE_ROOT' -xf -"
    fi
  fi
fi

# ── 2. 装 nginx 配置 ──────────────────────────────────────────
if [[ $SKIP_CONF -eq 1 ]]; then
  say "2/4 安装 nginx 配置（已跳过）"
else
  say "2/4 安装 nginx 配置"
  TMP_CONF="$(mktemp)"
  sed -e "s#root        /srv/tcm-media;#root        $REMOTE_ROOT;#" \
      -e "s#listen      8080;#listen      $PORT;#" \
      -e "s#server_name _;#server_name $SERVER_NAME;#" \
      "$CONF_SRC" > "$TMP_CONF"
  # 兜底：替换没命中就直接报错，绝不把模板默认值悄悄发上线
  grep -q "root        $REMOTE_ROOT;" "$TMP_CONF" || { echo "✗ 模板替换失败（root）" >&2; rm -f "$TMP_CONF"; exit 4; }
  grep -q "listen      $PORT;" "$TMP_CONF"        || { echo "✗ 模板替换失败（listen）" >&2; rm -f "$TMP_CONF"; exit 4; }

  run scp "$TMP_CONF" "$HOST:/tmp/tcm-media.conf"
  rm -f "$TMP_CONF"
  # 先 -t 再 reload：配置错不许上线（否则整站 5xx）
  run ssh "$HOST" "sudo cp /tmp/tcm-media.conf '$CONF_PATH' && sudo nginx -t && sudo systemctl reload nginx"
fi

# ── 3. 当场验证 ───────────────────────────────────────────────
say "3/4 验证（200 / MIME / CORS / Range）"
VERIFY_SRC="$SCRIPT_DIR/verify.sh"
[[ -f "$VERIFY_SRC" ]] || { echo "找不到 $VERIFY_SRC" >&2; exit 5; }
if [[ $DRY_RUN -eq 1 ]]; then
  echo "  [dry-run] scp verify.sh → $HOST:/tmp/tcm-verify.sh"
  echo "  [dry-run] ssh $HOST \"bash /tmp/tcm-verify.sh $PORT $C_ID $C_SLUG $R_URI\"（7 项检查）"
else
  run scp "$VERIFY_SRC" "$HOST:/tmp/tcm-verify.sh"
  # 远程脚本单独成文件：嵌在 heredoc 里时 $ 转义漏一层就会运行期报 syntax error（踩过）
  ssh "$HOST" "bash /tmp/tcm-verify.sh '$PORT' '$C_ID' '$C_SLUG' '$R_URI'"
fi

# ── 4. 收尾 ───────────────────────────────────────────────────
say "4/4 完成"
echo "  APP 入口：http://$HOST_WEB:$PORT/index.json"
echo "  单章示例：http://$HOST_WEB:$PORT/$C_ID/$C_SLUG/master.m3u8"
echo "  纯音频  ：http://$HOST_WEB:$PORT/$C_ID/$C_SLUG/audio.m3u8"
echo
echo "  提示：真机播放前先在手机上打开上面第一条，能看到 JSON 说明网络通了；"
echo "        播不动就按 platform/MEDIA-DELIVERY.md 第四·五节的三个头逐项对。"
