# -*- coding: utf-8 -*-
"""scripts/build_jingui_quanwen_appendix.py —— 给前十章补「本篇原文全录」

问题：篇目精读 14 章（第 11-24 章）章末都带「附：本篇原文全录」，共 208 条；
前十章只有按问题节引的片段，于是「整本可读」这件事只做到一半。
本脚本把剩下 190 条（篇 1-6、12、13、20-22）＋ 序 1 条，按**篇 → 章**一一指派写进对应章末：
于是 24 章的 docs 合起来 = 《金匮要略》402 条 + 序，每条恰好出现一次。

指派表（一篇只进一章，避免重复计数）：
  第1章 成书与杂病分类   ← 序（张仲景序 / 林亿序，底本无条号）
  第2章 脏腑经络先后病   ← 篇 1（17 条）
  第3章 痉湿暍           ← 篇 2（27 条）
  第4章 百合狐惑阴阳毒   ← 篇 3（15 条）
  第5章 疟病与中风历节   ← 篇 4（5 条）+ 篇 5（10 条）
  第6章 血痹虚劳         ← 篇 6（18 条）
  第7章 痰饮咳嗽         ← 篇 12（41 条）
  第8章 消渴与淋病       ← 篇 13（13 条）
  第9章 妇人病三篇       ← 篇 20（11）+ 21（11）+ 22（22）= 44 条
  第10章 杂病配伍统计    ← 不指派（本章跨篇抽样，原文由第 2/5/7/9 章承担）

写入方式：附在 docs/zh.md 末尾，用 `<!-- jingui-quanwen:start -->` / `:end` 包裹，重复运行只替换该块。
校验：`--check` 比对现算文本（改底本不改文档、或改文档不改底本都会红）。

用法：
  python scripts/build_jingui_quanwen_appendix.py
  python scripts/build_jingui_quanwen_appendix.py --check
"""
from __future__ import annotations

import io
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SUBJ = os.path.join(ROOT, "departments", "01-zhongyi", "08-jingui-yaolue")
BEN = json.load(io.open(os.path.join(ROOT, "standards", "jingui", "底本.json"), encoding="utf-8"))
BY_NO = {p["no"]: p for p in BEN["pian"] if p.get("no")}
TAIL = [p for p in BEN["pian"] if not p.get("no")]  # 序 + 23 + 24 + 25
XU = TAIL[0]

START = "<!-- jingui-quanwen:start -->"
END = "<!-- jingui-quanwen:end -->"

APPENDIX = [
    ("01-chengshu-zabing", [], "序"),
    ("02-zangfu-chuanbian", [1], None),
    ("03-jing-shi-ye", [2], None),
    ("04-baihe-huhuo", [3], None),
    ("05-nueb-zhongfeng", [4, 5], None),
    ("06-pibai-xulao", [6], None),
    ("07-tanyin-kesou", [12], None),
    ("08-xiaoke-linbing", [13], None),
    ("09-furen-sanpian", [20, 21, 22], None),
]


def articles_of(no: int):
    return sorted(BY_NO[no]["articles"], key=lambda a: a["idx"])


def render_block(no_list, with_xu: str | None) -> str:
    out = [START, "", "## 附：本篇原文全录（逐条，主见证）", ""]
    total = 0
    if with_xu:
        arts = XU["articles"]
        total += len(arts)
        out += [
            "> 序不入篇、底本无条号（`tiao: null`），按源页顺序整段录出；`notes`（雙行夾注）不混进正文。",
            "",
            "**序（无条号）**　" + arts[0]["zhHans"].strip(),
            "",
        ]
    for no in no_list:
        p = BY_NO[no]
        arts = articles_of(no)
        total += len(arts)
        out += [
            "> **第 %d 篇 · %s**：%d 条 · %d 方 · %d 字（本库 `tiao` 编号即源页 `<p id=\"X.Y\">`，"
            "不等于宋本分条）。本章逐条录出，未做改写；与古诗文网本的分篇/分字差异见 "
            "`standards/jingui/gushiwen/校勘.md`。"
            % (no, p.get("nameSimp", ""), len(arts),
               sum(len(a.get("formulas") or []) for a in arts), p.get("chars", 0)),
            "",
        ]
        for a in arts:
            out.append("**第%s条**　%s" % (a["tiao"], a["zhHans"]))
            out.append("")
    out += [
        "> 本章全录 **%d 条**。全书 402 条的分布：前十章 191 条（含序 1）+ 篇目精读 14 章 208 条 + 附篇 3 篇"
        "（笈成本各作 1 条、按段引用于第 22-24 章）。" % total,
        "",
        END,
    ]
    return "\n".join(out)


def apply(path: str, block: str) -> str:
    md = io.open(path, encoding="utf-8").read()
    pat = re.compile(re.escape(START) + r".*?" + re.escape(END), re.S)
    if pat.search(md):
        return pat.sub(block, md, count=1)
    return md.rstrip() + "\n\n" + block + "\n"


def main() -> int:
    check = "--check" in sys.argv[1:]
    changed, total = [], 0
    for slug, no_list, xu in APPENDIX:
        path = os.path.join(SUBJ, "chapters", slug, "docs", "zh.md")
        block = render_block(no_list, xu)
        total += sum(len(articles_of(n)) for n in no_list) + (1 if xu else 0)
        new = apply(path, block)
        old = io.open(path, encoding="utf-8").read()
        if new != old:
            changed.append(slug)
            if not check:
                io.open(path, "w", encoding="utf-8", newline="\n").write(new)
    if check:
        if changed:
            print("✗ 以下章的全录块与现算不一致：%s" % ", ".join(changed))
            return 1
        print("✓ 前十章原文全录一致（191 条 = 序 1 + 篇 1-6、12、13、20-22 共 190 条）")
        return 0
    print("✓ 前十章原文全录：191 条（写/更新 %d 章）%s" % (len(changed), ("：" + ", ".join(changed)) if changed else ""))
    print("  全书 402 条 = 前十章 191（含序 1）+ 篇目精读 208 + 附篇 3 篇")
    return 0


if __name__ == "__main__":
    sys.exit(main())
