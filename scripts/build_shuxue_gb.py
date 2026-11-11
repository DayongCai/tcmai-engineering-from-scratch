#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""scripts/build_shuxue_gb.py —— 用国标 GB/T 12346-2021 补齐经穴库（270 → 全经穴）

为什么要补：教材《经络腧穴学》只讲「重点穴」，穴位库覆盖 270 穴（其中经穴 252、任督 25、奇穴 18）。
第 9 章「特定穴」与第 10 章「主治规律」要按全经穴算，缺的 109 穴必须补齐，否则统计只反映教材选材。

**补源约定**（与《伤寒》外源补条同规则）：
  1. 来源必须可核：GB/T 12346-2021《经穴名称与定位》，官方发布页 openstd.samr.gov.cn；
     本库保存官方 PDF 于 `standards/shuxue/sources/GB-T-12346-2021.pdf`，**sha256 与发布页记录一致**；
  2. 每条外源穴位在 `locator` 里写「外源·GB/T 12346-2021 第X.X.X条」，与「教材·第N章·X.X.X」明确分列；
  3. 外源不混入底本统计：`穴位库.json`（教材层）保持原样，国标数据另存 `穴位库-国标.json`，
     合并视图 `穴位库-全经穴.json` 逐条标 `来源`；
  4. 校勘登记写进 `补源登记.json`：条数、名称不一致、定位不一致（教材与国标并列，不覆盖）。

产出：
  standards/shuxue/穴位库-国标.json     361 条（编号/穴名/拼音/条款/页码/定位/来源）
  standards/shuxue/穴位库-全经穴.json   合并视图（教材层优先，缺的用国标，逐条标来源）
  standards/shuxue/补源登记.json        sha256 + URL + 校勘结果 + 条款页码索引
"""
import hashlib
import json
import os
import re
import time

import pymupdf

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = os.path.join(ROOT, "standards", "shuxue")
PDF = os.path.join(D, "sources", "GB-T-12346-2021.pdf")
STD = "GB/T 12346-2021"
SRC_URL = "https://www.ntcamsac.ac.cn/upload/std_info/202306192125376309.pdf"
PAGE_URL = "https://openstd.samr.gov.cn/bzgk/std/newGbInfo?hcno=397548AE7248D3D87DD15E0AB8107185"

PAT = re.compile(
    r"(\d+\.\d+\.\d+)\s+([\u4e00-\u9fff]{1,4})\s*([A-Za-z\u00C0-\u024F\u2018\u2019]*)\s*"
    r"\(([A-Z]{2}\d{1,2})\s*(\+?)\s*\)\s*(.*?)"
    r"(?=\d+\.\d+\.\d+\s+[\u4e00-\u9fff]|\Z)"
)
MERIDIAN = {"LU": "手太阴肺经", "LI": "手阳明大肠经", "ST": "足阳明胃经", "SP": "足太阴脾经",
            "HT": "手少阴心经", "SI": "手太阳小肠经", "BL": "足太阳膀胱经", "KI": "足少阴肾经",
            "PC": "手厥阴心包经", "TE": "手少阳三焦经", "GB": "足少阳胆经", "LR": "足厥阴肝经",
            "GV": "督脉", "CV": "任脉"}


def clean_loc(s):
    for cut in ("GB/T", "GB/T12346", "订单号", "防伪编号"):
        i = s.find(cut)
        if i >= 0:
            s = s[:i]
    s = re.sub(r"\s+", "", s)
    s = re.sub(r"(。)\d{1,3}$", r"", s)      # 去掉跨页带出的页脚数字
    return s.strip()


def main():
    if not os.path.exists(PDF):
        raise SystemExit(f"缺国标 PDF：{PDF}")
    h = hashlib.sha256(open(PDF, "rb").read()).hexdigest()

    doc = pymupdf.open(PDF)
    pages = [p.get_text() for p in doc]
    raw = "\n".join(pages)
    t = re.sub(r"\n(?=\d)", "", raw)
    t = re.sub(r"(\d\.)\s*\n\s*(\d)", r"\1\2", t)
    t = re.sub(r"\s+", " ", t)

    # 页码索引：条款 → PDF 页（1 基）
    clause_page = {}
    for i, pg in enumerate(pages, 1):
        norm = re.sub(r"\s+", "", pg)
        for m in re.finditer(r"(\d+\.\d+\.\d+)[\u4e00-\u9fff]{1,4}[A-Za-z\u00C0-\u024F\u2018\u2019]*\(", norm):
            clause_page.setdefault(m.group(1), i)

    items, seen = [], set()
    for m in PAT.finditer(t):
        clause, name, pinyin, code, plus, loc = m.groups()
        if not clause.startswith("5."):
            continue                      # 3.6 基准穴点是重复条目，只取第 5 章
        code_full = code + ("+" if plus else "")
        if code_full in seen:
            continue
        seen.add(code_full)
        items.append({
            "编号": code_full,
            "穴名": name,
            "拼音": pinyin,
            "经": MERIDIAN.get(code[:2], ""),
            "条款": clause,
            "页码": clause_page.get(clause, 0),
            "定位": clean_loc(loc),
            "locator": f"外源·{STD} 第{clause}条",
        })

    # 教材层（270，其中经穴 252）
    text_book = json.load(open(os.path.join(D, "穴位库.json"), encoding="utf-8"))
    ALIAS = {"GV29": "GV24+"}      # 教材把印堂编作 GV29；国标 2021 记作 GV24+
    tb = {}
    for p in text_book["points"]:
        c = p["编号"]
        tb[ALIAS.get(c, c)] = p
    tb_jing = {k: v for k, v in tb.items() if not k.startswith("EX-") and k not in ("",)}

    gb = {p["编号"]: p for p in items}
    matched = sorted(set(gb) & set(tb_jing))
    missing = sorted(set(gb) - set(tb_jing))
    extra = sorted(set(tb_jing) - set(gb))
    name_diff = [(c, tb_jing[c]["穴名"], gb[c]["穴名"]) for c in matched if tb_jing[c]["穴名"] != gb[c]["穴名"]]

    # 定位校勘：教材与国标文字不同是常态（教材是改写，国标是条文），
    # 因此不比「是否相同」，而比字符重合率，分三档：≥0.90 高一致 / 0.75–0.90 措辞不同 / <0.75 需人工核
    def norm(x):
        return re.sub(r"[，,。；;：:\s]", "", x or "")

    buckets = {"一致≥0.90": [], "部分覆盖0.75–0.90": [], "需人工核<0.75": []}
    for c in matched:
        a, b = norm(tb_jing[c]["定位"]), norm(gb[c]["定位"])
        if not a or not b:
            continue
        # 用「教材是否被国标覆盖」判，而不是 Jaccard：
        # 国标条目常带「注」（取穴细则），长度更长，Jaccard 会系统性压低真正一致的条目
        cov = len(set(a) & set(b)) / max(1, len(set(a)))
        key = "一致≥0.90" if cov >= 0.90 else ("部分覆盖0.75–0.90" if cov >= 0.75 else "需人工核<0.75")
        buckets[key].append({"编号": c, "穴名": gb[c]["穴名"], "覆盖": round(cov, 3)})
    sim = {k: {"n": len(v), "样例": v[:5]} for k, v in buckets.items()}

    # 合并视图：教材层优先；缺的用国标补
    merged = []
    for code, g in sorted(gb.items(), key=lambda kv: (list(MERIDIAN).index(kv[0][:2]) if kv[0][:2] in MERIDIAN else 99,
                                                      kv[0])):
        if code in tb_jing:
            tbp = tb_jing[code]
            merged.append({
                "编号": g["编号"], "穴名": tbp["穴名"], "经": g["经"],
                "部位": tbp.get("部位", ""), "特定穴": tbp.get("特定穴", ""),
                "定位": tbp.get("定位", ""), "国标定位": g["定位"],
                "安全红线": tbp.get("安全红线", ""), "主治": tbp.get("主治", ""),
                "来源": "教材", "教材locator": tbp.get("locator", ""), "国标locator": g["locator"],
            })
        else:
            merged.append({
                "编号": g["编号"], "穴名": g["穴名"], "经": g["经"],
                "部位": "", "特定穴": "",
                "定位": g["定位"], "国标定位": g["定位"],
                "安全红线": "", "主治": "",
                "来源": "外源·国标", "教材locator": "", "国标locator": g["locator"],
            })

    counts = {
        "国标条数": len(items),
        "教材经穴条数": len(tb_jing),
        "教材奇穴条数": len(tb) - len(tb_jing),
        "匹配": len(matched),
        "国标有教材无": len(missing),
        "教材有国标无": len(extra),
        "名称不一致": len(name_diff),
        "合并视图条数": len(merged),
        "其中教材来源": sum(1 for m in merged if m["来源"] == "教材"),
        "其中外源补入": sum(1 for m in merged if m["来源"] != "教材"),
    }

    reg = {
        "来源": STD + "《经穴名称与定位》",
        "标准发布页": PAGE_URL,
        "官方PDF": SRC_URL,
        "本地文件": "standards/shuxue/sources/GB-T-12346-2021.pdf",
        "sha256": h,
        "抓取时间": time.strftime("%Y-%m-%dT%H:%M:%S"),
        "范围": "第 5 章「经穴名称与定位」；第 3.6 节基准穴点为重复条目，不重复计入",
        "counts": counts,
        "定位校勘": {"分档": sim, "说明": "教材为改写、国标为条文，文字必然不同；按字符重合率分档，低档需人工核对，不自动改写任何一方"},
        "校勘": {
            "名称不一致": [{"编号": c, "教材": a, "国标": b} for c, a, b in name_diff],
            "教材有国标无": extra,
            "国标有教材无（本次补入）": missing,
        },
        "约定": "外源条目 locator 一律写「外源·GB/T 12346-2021 第X.X.X条」；不覆盖教材定位，两个定位并列存。",
    }

    json.dump({"standard": STD, "sha256": h, "counts": counts, "points": items},
              open(os.path.join(D, "穴位库-国标.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    json.dump({"standard": STD, "counts": counts, "points": merged},
              open(os.path.join(D, "穴位库-全经穴.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    json.dump(reg, open(os.path.join(D, "补源登记.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    print(json.dumps(counts, ensure_ascii=False, indent=1))
    print("名称不一致：", name_diff[:6], "…" if len(name_diff) > 6 else "")
    print("教材有国标无：", extra[:6])
    print(f"sha256 {h}")


if __name__ == "__main__":
    main()
