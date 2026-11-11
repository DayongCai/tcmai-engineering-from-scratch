#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""scripts/build_jiangyi_roadmap.py —— 知识树 md → standards/binglishengli/supplements/roadmap.json

为什么要有这一份：桌面「病生」的《知识树》已经把 15 单元 53 章的路线图写在 §4 的代码块里，
但那是**给人读的树形文本**——不能查询、不能统计、不能进门。转成 JSON 之后可以做三件事：
  1. 说清「讲义目前只写了 2 章，还有 51 章待写」，而不是含糊地说「后续再补」；
  2. 让看板/README 能现算进度，不手写；
  3. 将来若决定切到 53 章体系，这份就是章目清单，不用重新誊一遍。

不改原文：脚本只读 `supplements/jiangyi/知识树.md`，不往里面写任何东西。
"""
import hashlib
import io
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "standards", "binglishengli", "supplements", "jiangyi", "知识树.md")
OUT = os.path.join(ROOT, "standards", "binglishengli", "supplements", "roadmap.json")

UNIT_RE = re.compile(r"^[├└]─\s*(U\d\d)\s+(.+?)【阶段(\d+)】\s*$")
CH_RE = re.compile(r"^[│\s]*[├└]─\s*(C\d\d)\s+(.+?)\s*$")
STATUS_RE = re.compile(r"^\|\s*阶段\s*(\d+)\s*\|\s*(U\d\d)\s*\|\s*(C[\d–\-]+)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|")


def main():
    raw = io.open(SRC, encoding="utf-8").read()
    sha = hashlib.sha256(raw.encode("utf-8")).hexdigest()
    units = []
    cur = None
    for line in raw.split("\n"):
        m_u = UNIT_RE.match(line.strip())
        if m_u:
            cur = {"unit": m_u.group(1), "title": m_u.group(2).strip(), "stage": int(m_u.group(3)), "chapters": []}
            units.append(cur)
            continue
        m_c = CH_RE.match(line)
        if m_c and cur is not None:
            cur["chapters"].append({"id": m_c.group(1), "title": m_c.group(2).strip()})

    # 阶段状态表（§5）：把「已交付 / 待写」对齐到单元。
    # 用 cell 切分而不是整行正则：表头/数据行里「阶段 1」带空格、状态列含括号与 emoji，
    # 整行正则一旦有一个字符不匹配就整条静默丢失（第一版就是这样丢掉全部状态的）。
    status = {}
    for line in raw.split("\n"):
        if not line.strip().startswith("|"):
            continue
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        if len(cells) < 5 or not cells[0].startswith("阶段"):
            continue
        if not re.fullmatch(r"U\d\d", cells[1]):
            continue
        status[cells[1]] = {"stage": cells[0], "range": cells[2], "status": cells[4]}
    # 状态以**讲义实物**为准：知识树表里的 ✅/⏳ 是写作计划，会过期；
    # 实物是 supplements/jiangyi.json 里真实存在的章号。两者不一致时以实物为准，并把计划值留作 plan。
    idx_path = os.path.join(ROOT, "standards", "binglishengli", "supplements", "jiangyi.json")
    done_ch = set()
    if os.path.exists(idx_path):
        idx = json.load(io.open(idx_path, encoding="utf-8"))
        done_ch = {str(c.get("no")) for c in idx.get("chapters", [])}
    for u in units:
        planned = status.get(u["unit"], {}).get("status", "未知")
        ids = [c["id"] for c in u["chapters"]]
        nos = [str(int(i[1:])) for i in ids]
        hit = [n for n in nos if n in done_ch]
        if len(hit) == len(nos):
            real = "✅ 已交付"
        elif hit:
            real = f"🚧 部分（{len(hit)}/{len(nos)} 章）"
        else:
            real = "⏳ 待写"
        u["status"] = real
        u["planStatus"] = planned

    done = [u for u in units if u["status"].startswith("✅")]
    doc = {
        "book": "hermes-病理生理学(教材) · 15 单元 / 53 章（Banasik Pathophysiology 8th ed. 目录结构）",
        "source": {"file": os.path.relpath(SRC, ROOT).replace("\\", "/"), "bytes": len(raw.encode("utf-8")), "sha256": sha},
        "units": units,
        "counts": {
            "units": len(units),
            "chapters": sum(len(u["chapters"]) for u in units),
            "unitsDone": len(done),
            "chaptersDone": sum(len(u["chapters"]) for u in done),
        },
    }
    io.open(OUT, "w", encoding="utf-8", newline="\n").write(json.dumps(doc, ensure_ascii=False, indent=1) + "\n")
    c = doc["counts"]
    print(f"路线图：{c['units']} 单元 / {c['chapters']} 章 · 已交付 {c['chaptersDone']} 章（{c['unitsDone']} 单元）· 待写 {c['chapters'] - c['chaptersDone']} 章")


if __name__ == "__main__":
    main()
