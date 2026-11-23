#!/usr/bin/env bash
# publish-release.sh —— 交互式发 Release：只问一次令牌，输入不回显
#
#   bash scripts/publish-release.sh                 # 默认发 DayongCai/tcm-course-media
#   bash scripts/publish-release.sh --dry-run       # 只看计划
#   REPO=owner/other bash scripts/publish-release.sh
#
# 为什么要有这个：本机 github.com 不可达（device flow 走不通），只能靠令牌；
# 而令牌不该粘进聊天记录、也不该留在 shell history 里。
# 这里用 `read -s` 读进变量，直接传给子进程的环境，不落盘、不 echo。

set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

REPO="${REPO:-DayongCai/tcm-course-media}"
TAG="${TAG:-media-v1}"

if [[ -z "${GITHUB_TOKEN:-}" ]]; then
  printf 'GitHub 令牌（fine-grained：Contents + Releases 读写，输入不回显）：'
  IFS= read -rs TOKEN
  echo
  if [[ -z "$TOKEN" ]]; then
    echo "✗ 没输入令牌，退出" >&2
    exit 2
  fi
else
  TOKEN="$GITHUB_TOKEN"
fi

PY=""
for c in python python3 py; do
  if command -v "$c" >/dev/null 2>&1 && "$c" --version >/dev/null 2>&1; then PY="$c"; break; fi
done
[[ -n "$PY" ]] || { echo "✗ 找不到 python" >&2; exit 3; }

echo "→ 目标仓库 $REPO · tag $TAG"
GITHUB_TOKEN="$TOKEN" "$PY" scripts/publish_release_github.py \
  --repo "$REPO" --tag "$TAG" --create-repo "$@"
