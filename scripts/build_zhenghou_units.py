#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""scripts/build_zhenghou_units.py —— 中医证候学：辨证篇 → 单元层（units.json）

母本：`standards/zhenghou/底本-辨证篇.json`（由 build_zhenghou_layer.py 从
`F:/textbooks/qhzy-中医诊断学.xlsx` 第 6–12 表摘出；源 sha256 记在该文件的 classical 块里）。
七篇：八纲 / 病性 / 脏腑 / 经络 / 六经 / 卫气营血 / 三焦，共 8,292 汉字。

切分口径：**小标题即单元**。辨证篇的原文按「第N章 → N.1 节 → N.1.1 小节 → N.1.1.1 条目」
编号，取最深一级（条目）为单元；没有下级的节/小节自行成单元。locator 写「教材·第N章·N.M.K」，
可逐字回查 `底本-辨证篇.json`。

为什么这层必须有：本课此前的两层是「跨课程派生底本（证候库 132 证）+ 12 章正文」，
没有可引的**原文单元层**——章里说「表证以恶寒发热并见、苔薄脉浮为辨证要点」时，
引的是《中医诊断学》的表述，却无法在自己的单元层里定位到它。补上这一层，引文才有出处。

用法：
  python scripts/build_zhenghou_units.py            # 写盘
  python scripts/build_zhenghou_units.py --check    # 只比对
"""
from __future__ import annotations

import hashlib
import io
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = os.path.join(ROOT, "standards", "zhenghou")
DIBEN = os.path.join(D, "底本-辨证篇.json")
HANZI = re.compile(r"[\u4e00-\u9fff]")
VALUE = re.compile(r"\d+(?:\.\d+)?\s*(?:℃|°C|%|次|天|日|周|月|年|岁|寸|分|小时|度)")
# 编号：6.1 / 6.1.1 / 6.1.1.1（前面不能是数字或点，避免把 8,292 里的数字当编号）
NUM = re.compile(r"(?<![\d.])(\d{1,2}(?:\.\d{1,2}){1,3})(?![\d])")


def split_title(chunk_after_no: str) -> str:
    """标题取到第一个冒号/句号/左括号为止；取不到就退回前 12 字（标题只作索引，正文一个字不切）。"""
    m = re.search(r"[:：。（(]", chunk_after_no)
    cand = (chunk_after_no[: m.start()] if m else chunk_after_no[:12]).strip()
    # 标题里常把第一定义的首词重复一遍（「血热证、血寒证血热证」），去掉尾部重复
    for k in range(min(len(cand) // 2, 12), 3, -1):
        if cand.endswith(cand[:k]):
            cand = cand[: len(cand) - k]
            break
    return cand or chunk_after_no[:12].strip()


def clean_text(body: str, sub: str) -> str:
    """去掉行首的「篇名 + 节号标题 + 小节号标题 + 条目号标题」链，只留可引的实质正文。

    切法：从本单元编号最后一次出现处起，跳过紧随的「标题（…）」直到第一个冒号；
    再把尾巴上属于下一级标题的片段（`N.N` 或 `N.N.N` 后接文字）截掉。
    只做删减，不改一个字——引文仍可逐字回查。
    """
    i = body.rfind(sub)
    t = body[i + len(sub):] if i >= 0 else body
    t = t.lstrip()
    m = re.search(r"[:：]", t[:60])
    if m and m.start() > 0:
        t = t[m.end():]
    m2 = re.search(r"\d{1,2}(?:\.\d{1,2}){1,3}\s", t[80:])
    if m2:
        t = t[: 80 + m2.start()]          # 尾巴上出现下一级编号 → 那是下一条的开头，截掉
    return t.strip()


def measure(t: str) -> dict:
    return {"digits": len(re.findall(r"\d", t or "")),
            "valueLike": len(VALUE.findall(t or "")),
            "valueSamples": VALUE.findall(t or "")[:6],
            "listItems": len(re.findall(r"(?:^|\n)\s*\d+\s*[\.、]", t or ""))}


def build() -> dict:
    raw = json.load(io.open(DIBEN, encoding="utf-8"))
    units, chapters = [], []
    for sheet, text in raw["texts"].items():
        ch_no = raw["sheets"][sheet]["no"]
        title = re.match(r"^(?:第\d+章)?\s*(.+?)\d", text)
        t = (title.group(1) if title else sheet).strip()
        t = re.sub(r"^第\d+章\s*", "", t)          # 有的篇首重复写了「第6章」
        ch_title = f"第{ch_no}章 {t}"
        marks = [(m.start(), m.group(1), len(m.group(1).split("."))) for m in NUM.finditer(text)]
        segs = []
        for i, (pos, no, depth) in enumerate(marks):
            end = marks[i + 1][0] if i + 1 < len(marks) else len(text)
            chunk = text[pos:end]
            after = chunk[len(no):]
            segs.append({"no": no, "name": split_title(after), "body": chunk, "depth": depth})
        # 只保留最细一级（没有更深编号作前缀的），避免父子重复计字；
        # 单元的正文取「本单元编号 → 下一个叶子编号」，把中间出现的父级小标题与导语一并收进来，
        # 这样底本一个字都不丢（只丢每篇开头「第N章 …」这行篇名）。
        leaves = [s for s in segs if not any(o["no"].startswith(s["no"] + ".") for o in segs)]
        starts = {s["no"]: text.find(s["no"]) for s in leaves}
        ordered = sorted(leaves, key=lambda s: starts[s["no"]])
        for k, s in enumerate(ordered):
            nxt = starts[ordered[k + 1]["no"]] if k + 1 < len(ordered) else len(text)
            s["body"] = text[starts[s["no"]]:nxt]
        if ordered:
            # 篇首「第N章 …」这行也归第一个单元，否则每篇漏十几个字，总数对不上底本自报值
            ordered[0]["body"] = text[:starts[ordered[0]["no"]]] + ordered[0]["body"]
        n_units = 0
        for s in ordered:
            body = s["body"]
            parts = s["no"].split(".")
            sec = ".".join(parts[:2])
            sec_name = next((x["name"] for x in segs if x["no"] == sec), "")
            units.append({
                "chapter": str(ch_no), "chapterTitle": ch_title,
                "sec": sec_name or sec, "sub": s["no"], "title": s["name"] or s["no"],
                "locator": f"教材·第{ch_no}章·{s['no']}",
                "brief": "", "goals": [],
                "rawBody": body, "body": body, "text": clean_text(body, s["no"]), "prose": body,
                "segments": [], "hanzi": len(HANZI.findall(body)), "measure": measure(body),
            })
            n_units += 1
        chapters.append({"no": str(ch_no), "title": ch_title, "units": n_units,
                         "hanzi": sum(u["hanzi"] for u in units if u["chapter"] == str(ch_no))})

    counts = {"chapters": len(chapters), "units": len(units),
              "hanzi": sum(c["hanzi"] for c in chapters),
              "digits": sum(u["measure"]["digits"] for u in units),
              "valueLike": sum(u["measure"]["valueLike"] for u in units)}
    declared = sum(v["hanzi"] for v in raw["sheets"].values())
    if counts["hanzi"] != declared:
        raise SystemExit(f"✗ 汉字 {counts['hanzi']} ≠ 底本自报 {declared}（切分漏字或重复计）")
    return {
        "source": {"file": "standards/zhenghou/底本-辨证篇.json",
                   "sha256": hashlib.sha256(open(DIBEN, "rb").read()).hexdigest(),
                   "script": "scripts/build_zhenghou_units.py",
                   "note": "由 qhzy-中医诊断学.xlsx 第 6–12 表摘出（源 sha256 见 证候库.json 的 source.classical）"},
        "basis": {"unit": "小标题即单元（取最细一级编号）",
                  "locator": "教材·第N章·N.M.K，与辨证篇编号一致",
                  "axes": "未设三辨/位面：本层是原文索引层；证候族与病位由 证候库.json 提供"},
        "counts": counts, "chapters": chapters, "units": units,
    }


def main() -> int:
    obj = build()
    text = json.dumps(obj, ensure_ascii=False, indent=1)
    out = os.path.join(D, "units.json")
    c = obj["counts"]
    if "--check" in sys.argv:
        old = io.open(out, encoding="utf-8").read() if os.path.exists(out) else ""
        same = old == text
        print(f"{'✓' if same else '✗'} zhenghou: 篇 {c['chapters']} · 单元 {c['units']} · 汉字 {c['hanzi']:,}"
              f"{'' if same else ' —— 与磁盘不一致'}")
        return 0 if same else 1
    io.open(out, "w", encoding="utf-8", newline="\n").write(text)
    print(f"✓ zhenghou: 篇 {c['chapters']} · 单元 {c['units']} · 汉字 {c['hanzi']:,} → standards/zhenghou/units.json")
    for ch in obj["chapters"]:
        print(f"   {ch['title']}: {ch['units']} 单元 / {ch['hanzi']:,} 汉字")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
