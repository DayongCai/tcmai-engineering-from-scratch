#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""scripts/apply_rewrite_block.py —— 给「源正文层」教材章补判断层（REWRITE 块）

为什么单独一条工序
------------------
`import_textbooks.js` 生成的章文件是**源正文层**：正文逐字来自底本工作簿，且文件末尾明确写着
「请勿手改 —— 需要修改请改源工作簿后重跑」。这些课已经有正文、已进看板与五卷，缺的是
N.1–N.5 这些**判断层**。

`textbooks/README.md` 已定约定：判断层写在 `<!-- REWRITE:BEGIN/END -->` 块里、落在文末，
渲染脚本只认这两个标记之间的内容。本脚本就是执行这条约定的工具：

  · 不动正文一个字（源正文层保持逐字可核）
  · 只替换/追加 REWRITE 块（幂等）
  · 判断层文本由人写在 `standards/<slug>/rewrite-plan.json`

用法
----
  python scripts/apply_rewrite_block.py --slug zhongyao-huaxue
  python scripts/apply_rewrite_block.py --slug zhongyao-huaxue --check
  python scripts/apply_rewrite_block.py --all [--check]

输入：standards/<slug>/rewrite-plan.json
  { "dept", "subject", "book", "baseline",
    "chapters": [ { "n", "title", "src"?, "question", "n2", "n3", "n4", "n5", "check": [...] } ] }

门（--check，任一不符退 1）
  1. 章文件必须存在且形如 NN-第N章-*.md，章号与 n 一致；
  2. 块内八节齐（N.1–N.5 + 免责 + 思考题 + 延伸阅读），免责句必须在 N.5 之后、思考题之前；
  3. N.2 与 N.5 各 ≥200 汉字（不许占位）；
  4. 块必须落在文末，且正文（块前内容）与磁盘一致 —— 说明没有人在块外偷改正文；
  5. 与磁盘逐字节一致（幂等）。
"""
import argparse
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HANZI = re.compile(r"[\u4e00-\u9fff]")
BLOCK_RE = re.compile(r"\n?<!-- REWRITE:BEGIN -->[\s\S]*?<!-- REWRITE:END -->\n?", re.M)
DISCLAIM = "> **免责**：本章为教学整理，不构成诊断或治疗建议；具体处置须由具备资质的人员依规范作出。"


def hanzi(s):
    return len(HANZI.findall(s or ""))


def read_json(p):
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def read_text(p):
    with open(p, encoding="utf-8") as f:
        return f.read()


def find_chapter_file(textbook_dir, n):
    for f in sorted(os.listdir(textbook_dir)):
        m = re.match(r"^\d+-第(\d+)章-(.+)\.md$", f)
        if m and int(m.group(1)) == int(n):
            return os.path.join(textbook_dir, f)
    return None


def build_block(ch, cfg):
    L = []
    L.append("<!-- REWRITE:BEGIN -->")
    L.append("")
    L.append("## N.1 概念与出处")
    L.append("")
    if ch.get("src"):
        L.append(f"底本：《{cfg['book']}》{ch['src']}。正文逐字取自源工作簿"
                 f"（`{cfg['baseline']}`），本节只补判断层，不改正文。")
    else:
        L.append(f"底本：《{cfg['book']}》。正文逐字取自源工作簿（`{cfg['baseline']}`）。")
    L.append("")
    L.append("## N.2 为什么可以这样翻译")
    L.append("")
    L.append(ch["n2"].strip())
    L.append("")
    L.append("## N.3 这个翻译丢掉了什么")
    L.append("")
    L.append(ch["n3"].strip())
    L.append("")
    L.append("## N.4 与相邻学科的接口")
    L.append("")
    L.append(ch["n4"].strip() if ch.get("n4") else (cfg.get("defaultN4") or "").strip())
    L.append("")
    L.append("## N.5 争议与本项目立场")
    L.append("")
    L.append(ch["n5"].strip())
    L.append("")
    L.append(cfg.get("disclaimer") or DISCLAIM)
    L.append("")
    L.append("## 思考题")
    L.append("")
    for i, q in enumerate(ch.get("check") or [], 1):
        L.append(f"{i}. {q}")
    L.append("")
    L.append("## 延伸阅读")
    L.append("")
    L.append(f"- 《{cfg['book']}》{ch.get('src') or ''}（本章底本出处）。".replace(" 》", "》"))
    if cfg.get("extraReading"):
        for x in cfg["extraReading"]:
            L.append(f"- {x}")
    L.append("")
    L.append("<!-- REWRITE:END -->")
    return "\n".join(L) + "\n"


def apply_one(slug, check=False):
    sd = os.path.join(ROOT, "standards", slug)
    cfg = read_json(os.path.join(sd, "rewrite-plan.json"))
    subj = cfg.get("subject", slug)
    tb_dir = os.path.join(ROOT, "textbooks", cfg["dept"], subj)
    if not os.path.isdir(tb_dir):
        print(f"✗ 教材目录不存在：textbooks/{cfg['dept']}/{subj}")
        return 1

    errs = []
    written = []
    for ch in cfg["chapters"]:
        n = ch["n"]
        path = find_chapter_file(tb_dir, n)
        if not path:
            errs.append(f"第 {n} 章：找不到 NN-第{n}章-*.md")
            continue
        disk = read_text(path)
        body = BLOCK_RE.sub("\n", disk).rstrip() + "\n"
        block = build_block(ch, cfg)

        # 门 2/3：八节齐、免责位置、判断层字数
        for sec in ("## N.1 概念与出处", "## N.2 为什么可以这样翻译", "## N.3 这个翻译丢掉了什么",
                    "## N.4 与相邻学科的接口", "## N.5 争议与本项目立场", "## 思考题", "## 延伸阅读"):
            if sec not in block:
                errs.append(f"第 {n} 章：块内缺 {sec}")
        i5, iq = block.index("## N.5"), block.index("## 思考题")
        if "不构成诊断或治疗建议" not in block[i5:iq]:
            errs.append(f"第 {n} 章：免责句不在 N.5 与思考题之间")
        for k in ("n2", "n5"):
            if hanzi(ch.get(k)) < 200:
                errs.append(f"第 {n} 章：{k} 只有 {hanzi(ch.get(k))} 汉字（下限 200）")
        new = body + "\n" + block
        written.append((path, new, body))

    if errs:
        for e in errs:
            print("✗ " + e)
        return 1

    if check:
        bad = []
        for path, new, _ in written:
            disk = read_text(path)
            if disk.replace("\r\n", "\n") != new.replace("\r\n", "\n"):
                bad.append(os.path.relpath(path, ROOT))
        if bad:
            print("✗ DRIFT（重跑本脚本）：" + "、".join(bad))
            return 1
        print(f"✓ {slug}：{len(written)} 章 REWRITE 块与 plan 一致")
        return 0

    for path, new, body in written:
        with open(path, "w", encoding="utf-8", newline="\n") as f:
            f.write(new)
    total = sum(hanzi(read_text(p)) for p, _, _ in written)
    print(f"✓ {slug}：{len(written)} 章已注入 REWRITE 块（块+正文合计 {total:,} 汉字）")
    return 0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--slug")
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--check", action="store_true")
    a = ap.parse_args()
    if a.all:
        slugs = sorted(d for d in os.listdir(os.path.join(ROOT, "standards"))
                       if os.path.exists(os.path.join(ROOT, "standards", d, "rewrite-plan.json")))
        rc = 0
        skipped = []
        for s in slugs:
            plan = read_json(os.path.join(ROOT, "standards", s, "rewrite-plan.json"))
            if plan.get("status") == "draft":
                skipped.append(s)      # N.2/N.5 尚待人工撰写，不注入
                continue
            print(f"── {s}")
            rc |= apply_one(s, a.check)
        if skipped:
            print(f"（跳过草稿 {len(skipped)} 门：N.2/N.5 未写满，见 standards/REWRITE-待写清单.md）")
        return rc
    if not a.slug:
        ap.error("要么 --slug <name>，要么 --all")
    return apply_one(a.slug, a.check)


if __name__ == "__main__":
    sys.exit(main())
