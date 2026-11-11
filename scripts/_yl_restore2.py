# -*- coding: utf-8 -*-
"""扫 request_dump 与会话库，回收 12-yaoli-xue 各章文件（write_file 入参）。

用法：python scripts/_yl_restore2.py [--write]
"""
import glob
import io
import json
import os
import re
import sqlite3
import sys
from collections import Counter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HOME = os.path.join(os.environ["LOCALAPPDATA"], "Hermes Agent CN Desktop", "data", "hermes-home")
NEEDLE = "departments/09-jichu/12-yaoli-xue/chapters/"
OUTDIR = os.path.join(ROOT, "departments", "09-jichu", "12-yaoli-xue", "chapters")
WRITE = "--write" in sys.argv

files = {}


def put(rel, content, src):
    if not content or not str(content).strip():
        return
    k = len(re.sub(r"\s", "", content))
    old = files.get(rel)
    if old is None or k > old[0]:
        files[rel] = (k, content, src)


def harvest(obj):
    """递归找 {name:'write_file', arguments:'{...}'} 形态的调用。"""
    stack = [obj]
    while stack:
        cur = stack.pop()
        if isinstance(cur, dict):
            fn = cur.get("function") if isinstance(cur.get("function"), dict) else None
            name = None
            raw = None
            if fn and fn.get("name"):
                name, raw = fn.get("name"), fn.get("arguments")
            elif cur.get("name") in ("write_file", "write_file_tool"):
                name, raw = cur.get("name"), cur.get("arguments")
            if name == "write_file" and isinstance(raw, str):
                try:
                    a = json.loads(raw)
                except Exception:
                    a = None
                if a and "content" in a:
                    p = (a.get("path") or "").replace("\\", "/")
                    if NEEDLE in p:
                        put(p.split(NEEDLE, 1)[1], a["content"], "dump")
            stack.extend(cur.values())
        elif isinstance(cur, list):
            stack.extend(cur)


for f in glob.glob(os.path.join(HOME, "sessions", "*.json")):
    try:
        if os.path.getsize(f) > 40 * 1024 * 1024:
            continue
        data = json.load(io.open(f, encoding="utf-8", errors="replace"))
    except Exception:
        continue
    harvest(data)

con = sqlite3.connect(f"file:{os.path.join(HOME, 'state.db')}?mode=ro", uri=True)
for mid, tc in con.execute("select id, tool_calls from messages where tool_calls like ?", (f"%{NEEDLE}%",)):
    try:
        harvest(json.loads(tc))
    except Exception:
        pass

print("可回收文件", len(files))
docs = {r: v for r, v in files.items() if r.endswith("docs/zh.md")}
print(f"  docs {len(docs)} 章 · 非空白>=3000 的 {sum(1 for v in docs.values() if v[0] >= 3000)}")
print("  类型:", dict(Counter("/".join(r.split("/")[1:2]) if "/" in r else r for r in files)))

need = ["docs/zh.md", "quiz.json", "code/main.js", "code/main.test.js"]
short_missing = []
for slug in sorted(os.listdir(OUTDIR)):
    if not os.path.isdir(os.path.join(OUTDIR, slug)):
        continue
    short = slug.split("-", 1)[1]
    got = [n for n in need if f"{slug}/{n}" in files]
    got += [n for n in (f"outputs/prompt-{short}.md", f"outputs/skill-{short}.md") if f"{slug}/{n}" in files]
    if len(got) < 6:
        short_missing.append((slug, 6 - len(got)))
print("仍缺（章, 缺件数）:", short_missing[:12], "…共", len(short_missing))

if not WRITE:
    sys.exit(0)
n = 0
for rel, (_, content, _s) in files.items():
    p = os.path.join(OUTDIR, rel)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    io.open(p, "w", encoding="utf-8", newline="\n").write(content)
    n += 1
print("已写回", n)
