#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""scripts/build_jiangyi_index.py —— 讲义 md（U01…U15）→ standards/binglishengli/supplements/jiangyi.json

来源：`standards/binglishengli/supplements/jiangyi/U*.md`（按单元分文件）。
这批讲义是**本仓库原创编写**的简体中文学习讲义，按 Pathophysiology 8th ed.（Elsevier, J. L. Banasik）的
目录结构组织，不是教材译本、不是扫描件。引用时一律标 `补充·hermes-病理生理学讲义·第N章·N.M`，
**不许标「教材」**——教材位被代用底本《疾病学基础》占着。

为什么按单元分文件而不是一个大 md：
  15 个单元是分批写的（阶段 1 已交付，其余按批推进），分文件让「哪些单元写完了」可以由文件系统
  直接回答；一个巨型 md 一旦某批写坏，回退会连累前面已交付的单元。

解析规则（与 U01 已交付体例一致）：
  `# 第N章 标题（English）`      → 章
  `## N.M 标题`                  → 节
  `## 学习目标 / 关键术语表 / 本章小结 / 自测题 / 单元临床案例` → 章的具名部分
  其它 `##`                        → 章的具名部分（按标题名存）
"""
import glob
import hashlib
import io
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIR = os.path.join(ROOT, "standards", "binglishengli", "supplements", "jiangyi")
OUT = os.path.join(ROOT, "standards", "binglishengli", "supplements", "jiangyi.json")

CH_RE = re.compile(r"^#\s*第(\d+)章\s+(.+)$")
SEC_RE = re.compile(r"^##\s*(\d+)\.(\d+)\s+(.+)$")
PART_RE = re.compile(r"^##\s+(.+)$")
UNIT_RE = re.compile(r"^U(\d\d)-.+\.md$")
HANZI = re.compile(r"[\u4e00-\u9fff]")

REQUIRED_PARTS = ["学习目标", "关键术语表", "本章小结", "自测题"]


def hanzi(s):
    return len(HANZI.findall(s or ""))


def parse_file(path):
    raw = io.open(path, encoding="utf-8").read()
    lines = raw.split("\n")
    chapters = []
    cur_ch = None
    cur_sec = None
    cur_part = None

    def flush_sec():
        nonlocal cur_sec
        if cur_sec is not None and cur_ch is not None:
            text = "\n".join(cur_sec["paras"]).strip()
            cur_sec["paras"] = [p for p in cur_sec["paras"] if p.strip()]
            cur_sec["hanzi"] = hanzi(text)
            cur_ch["secs"].append(cur_sec)
        cur_sec = None

    for line in lines:
        m_ch = CH_RE.match(line)
        if m_ch:
            flush_sec()
            cur_part = None
            cur_ch = {"no": m_ch.group(1), "title": m_ch.group(2).strip(), "secs": [], "parts": {}}
            chapters.append(cur_ch)
            continue
        if cur_ch is None:
            continue
        m_sec = SEC_RE.match(line)
        if m_sec:
            flush_sec()
            cur_part = None
            cur_sec = {"no": f"{m_sec.group(1)}.{m_sec.group(2)}", "title": m_sec.group(3).strip(), "paras": []}
            continue
        m_part = PART_RE.match(line)
        if m_part:
            flush_sec()
            cur_part = m_part.group(1).strip()
            cur_ch["parts"][cur_part] = []
            continue
        if cur_sec is not None:
            cur_sec["paras"].append(line)
        elif cur_part is not None:
            cur_ch["parts"][cur_part].append(line)
    flush_sec()

    for ch in chapters:
        for k, v in list(ch["parts"].items()):
            ch["parts"][k] = "\n".join(v).strip()
        ch["hanzi"] = hanzi("\n".join([" ".join(p for p in s["paras"]) for s in ch["secs"]]))
    return raw, chapters


def main():
    files = sorted(glob.glob(os.path.join(DIR, "U*.md")))
    units = []
    all_ch = []
    for f in files:
        name = os.path.basename(f)
        m = UNIT_RE.match(name)
        if not m:
            continue
        raw, chapters = parse_file(f)
        unit = {
            "unit": f"U{m.group(1)}",
            "file": os.path.relpath(f, ROOT).replace("\\", "/"),
            "bytes": len(raw.encode("utf-8")),
            "sha256": hashlib.sha256(raw.encode("utf-8")).hexdigest(),
            "chapters": chapters,
            "counts": {
                "chapters": len(chapters),
                "secs": sum(len(c["secs"]) for c in chapters),
                "hanzi": sum(c["hanzi"] for c in chapters),
            },
        }
        for c in chapters:
            c["unit"] = unit["unit"]
            missing = [p for p in REQUIRED_PARTS if not any(k.startswith(p) for k in c["parts"])]
            c["missingParts"] = missing
            all_ch.append(c)
        units.append(unit)

    doc = {
        "book": "hermes-病理生理学(教材) —— 原创简体中文讲义（按 Pathophysiology 8th ed. 目录结构）",
        "nature": "本仓库原创讲义，非译本；引用格式 补充·hermes-病理生理学讲义·第N章·N.M",
        "locator": "补充·hermes-病理生理学讲义·第N章·N.M",
        "units": units,
        "chapters": all_ch,
        "counts": {
            "units": len(units),
            "chapters": len(all_ch),
            "secs": sum(len(u["chapters"]) for u in units) and sum(u["counts"]["secs"] for u in units),
            "hanzi": sum(c["hanzi"] for c in all_ch),
            "chaptersMissingParts": [c["no"] for c in all_ch if c["missingParts"]],
        },
    }
    io.open(OUT, "w", encoding="utf-8", newline="\n").write(json.dumps(doc, ensure_ascii=False, indent=1) + "\n")
    c = doc["counts"]
    print(f"讲义层：{c['units']} 单元 / {c['chapters']} 章 / {c['secs']} 节 / {c['hanzi']:,} 汉字")
    for u in units:
        nos = ",".join(x["no"] for x in u["chapters"])
        print(f"  {u['unit']} {u['bytes']:>7,} B · {u['counts']['chapters']} 章（{nos}）· {u['counts']['secs']} 节 · {u['counts']['hanzi']:,} 字")
    if c["chaptersMissingParts"]:
        print(f"  ⚠ 缺必备部分的章：{','.join(c['chaptersMissingParts'])}")


if __name__ == "__main__":
    main()
