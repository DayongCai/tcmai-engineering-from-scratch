# -*- coding: utf-8 -*-
"""打印《药理学》第 N 章的 4 节 12 小节：编号 / 标题 / brief / 正文全量。"""
import io
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = json.load(io.open(os.path.join(ROOT, "standards", "yaoli", "底本.json"), encoding="utf-8"))
n = int(sys.argv[1])
c = [x for x in D["chapters"] if x["no"] == n][0]
print(f"# 第 {n} 章 {c['title']}")
print("字数", sum(len(u.get("body", "")) for s in c["secs"] for u in s["subs"]))
for s in c["secs"]:
    print(f"\n## {s['no']} {s['title']}")
    for u in s["subs"]:
        print(f"\n### {u['no']} {u['title']}")
        print("BRIEF:", u.get("brief", ""))
        print("BODY:", u.get("body", ""))
