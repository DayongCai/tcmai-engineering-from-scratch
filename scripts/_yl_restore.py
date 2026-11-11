# -*- coding: utf-8 -*-
"""从 Hermes 会话库恢复 12-yaoli-xue 被覆盖的原始章节文件（两路取源）。

路径一：write_file 入参；
路径二：read_file 结果（tool 行内容里没有路径，须按 tool_call_id 回连到发起调用）。
取非空白字符最多的一版。用法：python scripts/_yl_restore.py [--write]
"""
import io
import json
import os
import re
import sqlite3
import sys
from collections import Counter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB = os.path.join(os.environ["LOCALAPPDATA"], "Hermes Agent CN Desktop", "data", "hermes-home", "state.db")
NEEDLE = "departments/09-jichu/12-yaoli-xue/chapters/"
WRITE = "--write" in sys.argv

con = sqlite3.connect(f"file:{DB}?mode=ro", uri=True)

# ① 找出所有「路径里带本课章节目录」的调用
calls = {}
for mid, tc in con.execute(
    "select id, tool_calls from messages where tool_calls like ? order by id", (f"%{NEEDLE}%",)
):
    try:
        parsed = json.loads(tc)
    except Exception:
        continue
    for c in parsed:
        fn = c.get("function") or {}
        cid = c.get("call_id") or c.get("id")
        try:
            a = json.loads(fn.get("arguments") or "{}")
        except Exception:
            a = {}
        if cid:
            calls[cid] = (fn.get("name"), a)

files = {}


def put(rel, content, src):
    if not content or not content.strip():
        return
    key = len(re.sub(r"\s", "", content))
    old = files.get(rel)
    if old is None or key > old[0]:
        files[rel] = (key, content, src)


for cid, (name, a) in calls.items():
    p = (a.get("path") or "").replace("\\", "/")
    if name == "write_file" and NEEDLE in p and "content" in a:
        put(p.split(NEEDLE, 1)[1], a["content"], f"write#{cid}")

# ② 按 tool_call_id 取回 read_file 的结果
ids = [c for c, (n, a) in calls.items() if n == "read_file"
       and NEEDLE in (a.get("path") or "").replace("\\", "/")]
print("read_file 调用数", len(ids))
for i in range(0, len(ids), 300):
    chunk = ids[i:i + 300]
    q = "select id, tool_call_id, content from messages where tool_call_id in (%s)" % ",".join("?" * len(chunk))
    for mid, tcid, content in con.execute(q, chunk):
        p = (calls[tcid][1].get("path") or "").replace("\\", "/")
        try:
            body = json.loads(content).get("content") or ""
        except Exception:
            body = content or ""
        out = []
        for ln in body.split("\n"):
            m = re.match(r"^(\d+)\|(.*)$", ln)
            out.append(m.group(2) if m else ln)
        put(p.split(NEEDLE, 1)[1], "\n".join(out), f"read#{mid}")

print(f"可恢复 {len(files)} 个文件")
print("  类型:", dict(Counter("/".join(r.split("/")[1:2]) if "/" in r else r for r in files)))
docs = sorted(r for r in files if r.endswith("docs/zh.md"))
print(f"  docs {len(docs)} 个 · 非空白<3000 的 {sum(1 for r in docs if files[r][0] < 3000)} 个")

if not WRITE:
    for r in docs[:3]:
        print("  样例:", r, files[r][0], "字 ·", files[r][2])
    sys.exit(0)

n = 0
for rel, (_, content, _s) in files.items():
    p = os.path.join(ROOT, "departments", "09-jichu", "12-yaoli-xue", "chapters", rel)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    io.open(p, "w", encoding="utf-8", newline="\n").write(content)
    n += 1
print(f"已写回 {n} 个文件")
