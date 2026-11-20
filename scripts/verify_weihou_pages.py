#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""scripts/verify_weihou_pages.py —— 危候 80 条逐条回原页复核

## 为什么要这一步

`危候判据.json` 是**词面**判据：候名里带「厥脱/脱绝/陷逆」就进清单。词面判据最容易犯的错，
是「产物里写着，原书那页却没有」——OCR 漏行、页码偏移、条目归错门，都会造成这种假命中。
所以每一条都要回到**印张那一页的 OCR 原文**看两件事：

1. 候名是否真的出现在该印张页（不是只在目录或结构图里）；
2. 若该条的依据里有治则用语（救逆/固脱/回阳/开窍…），该用语是否出现在该页或其后两页内
   （一条候的正文常跨 2–3 页）。

## 判四档

| 档 | 含义 |
|---|---|
| 双证 | 候名在印张页 + 治则用语在同页或后两页 |
| 仅名 | 只有候名；治则用语未在本段命中（可能跨更多页或 OCR 缺字） |
| 仅治法 | 只有治则用语，候名不在该页 —— 视为页码偏或条目归错门，需人工 |
| 未命中 | 两者都没有 —— 该条不能引用，必须写明 |

不猜、不改数据：本脚本只产出复核表，`危候判据.json` 的判定不动。
**证据链**：每条都写 印张 / 实际命中印张 / 命中所在 OCR 文件，可回原页点数。

用法：
    python scripts/verify_weihou_pages.py
    python scripts/verify_weihou_pages.py --check
"""
import argparse
import io
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STD = os.path.join(ROOT, "standards", "zhenghou-cidian")
OCR = os.path.join(ROOT, "scratch", "zgh_ocr", "ocr")
OUT = os.path.join(STD, "危候判据-复核.json")
VOLS = ("shang", "zhong", "xia")


def page_index():
    """{printed: [(vol, pdfpage, text)]}，只建一次索引。"""
    idx = {}
    if not os.path.isdir(OCR):
        raise SystemExit("缺 scratch/zgh_ocr/ocr —— 复核需要 OCR 原页（本机才有，不入库）")
    for name in os.listdir(OCR):
        m = re.match(r"^(shang|zhong|xia)-(\d{4})\.json$", name)
        if not m:
            continue
        vol, pno = m.group(1), int(m.group(2))
        d = json.load(io.open(os.path.join(OCR, name), encoding="utf-8"))
        printed = d.get("printed")
        if printed in (None, ""):
            continue
        text = "".join(i.get("text", "") for i in d.get("items", []))
        idx.setdefault(int(printed), []).append((vol, pno, text))
    return idx


def clean(s):
    return re.sub(r"[\s·．.\-—－]", "", s or "")


def toc_pages():
    """目录层页码（书签页）。上册 = PDF 页（与印张恒差 55，可换算）；中下两册书签目标失效。"""
    sp = json.load(io.open(os.path.join(STD, "结构.json"), encoding="utf-8"))
    out = {}
    for m in sp["men"]:
        for l in m["lei"]:
            for z in l["zhengList"]:
                for h in z["houList"]:
                    out[h["full"]] = h.get("page")
    return out


def verify():
    w = json.load(io.open(os.path.join(STD, "危候判据.json"), encoding="utf-8"))
    toc = toc_pages()
    hits = [h for h in w["清单"] if h["tier"] != "候选"]
    idx = page_index()
    rows = []
    for h in hits:
        name = clean(h["name"])
        printed = int(h["printed"] or 0)
        zl = [k for k in ("救逆", "固脱", "回阳", "开窍", "醒神", "急下", "存阴", "摄纳", "镇摄", "凉血", "清营")
              if k in (h.get("why") or "")]
        name_at, zl_at = None, None
        for dp in (0, -1, 1, -2, 2):
            pg = printed + dp
            for vol, pno, text in idx.get(pg, []):
                t = clean(text)
                if name_at is None and name in t:
                    name_at = (pg, vol, pno)
                if zl and zl_at is None and any(k in t for k in zl):
                    zl_at = (pg, vol, pno)
            if name_at and (zl_at or not zl):
                break
        if name_at and (zl_at or not zl):
            status = "双证" if zl else "仅名（无治则线索）"
        elif name_at:
            status = "仅名"
        elif zl_at:
            status = "仅治法"
        else:
            status = "未命中"
        vol = "上" if printed <= 735 else ("中" if printed <= 1539 else "下")
        tp = toc.get(h["code"])
        toc_note = None
        if vol == "上" and tp:
            # 上册：书签页 = PDF 页，PDF = 印张 − 55；偏差恒为 55 才算对齐
            toc_note = "对齐" if abs(int(tp) - (printed - 55)) <= 1 else "偏差 %d" % (int(tp) - (printed - 55))
        elif vol != "上":
            toc_note = "不可校（本册书签目标页失效，见 PDF登记.json）"
        rows.append({
            "code": h["code"], "name": h["name"], "tier": h["tier"],
            "printed": printed, "vol": vol, "tocPage": tp, "tocCheck": toc_note,
            "why": h.get("why", ""),
            "status": status,
            "nameHit": None if not name_at else {"printed": name_at[0], "vol": name_at[1], "pdf": name_at[2]},
            "zlHit": None if not zl_at else {"printed": zl_at[0], "vol": zl_at[1], "pdf": zl_at[2], "kw": zl},
        })
    by_vol = {}
    for r in rows:
        by_vol[r["vol"]] = by_vol.get(r["vol"], 0) + 1
    toc_ok = sum(1 for r in rows if r["tocCheck"] == "对齐")
    toc_bad = sum(1 for r in rows if r["tocCheck"] and r["tocCheck"].startswith("偏差"))
    cnt = {}
    for r in rows:
        k = "双证" if r["status"].startswith("双证") else (
            "仅名（无治则线索）" if r["status"].startswith("仅名（无") else r["status"])
        cnt[k] = cnt.get(k, 0) + 1
    return {
        "$about": "危候 80 条的原页复核：每条回印张页的 OCR 原文，查候名与治则用语是否真的在场。"
                  "本表不改判定，只给「能不能引用」的证据。",
        "口径": {"匹配": "候名/治则词去空白与间隔号后做子串匹配",
                 "页窗": "印张页 ±2 页（一候正文常跨 2–3 页）",
                 "治则词": ["救逆", "固脱", "回阳", "开窍", "醒神", "急下", "存阴", "摄纳", "镇摄", "凉血", "清营"]},
        "counts": {"复核条数": len(rows), "分档": cnt, "按册": by_vol,
                   "目录页可校": sum(1 for r in rows if r["vol"] == "上" and r["tocPage"]),
                   "目录页对齐": toc_ok, "目录页偏差": toc_bad,
                   "可引用（双证）": cnt.get("双证", 0),
                   "需人工（仅名/仅治法/未命中）": len(rows) - cnt.get("双证", 0)},
        "条目": rows,
        "校勘": ["OCR 会把形近字认错（如「怫郁→佛郁」「腠理→滕理」），本表按去空白后子串匹配，"
                 "错字会造成「未命中」——这类要么回原页看图，要么按 校勘 表别名匹配，不许直接判为「书里没有」。",
                 "「仅名」不等于条目造假：一候正文可跨 3 页以上，治则用语可能在更后面；本表只声明「本页窗内未见」。"],
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true")
    a = ap.parse_args()
    data = verify()
    txt = json.dumps(data, ensure_ascii=False, indent=1) + "\n"
    if a.check and not os.path.isdir(OCR):
        # 干净克隆没有 OCR 原页（scratch 不入库）：只核产物自洽，不重算、不假装核过
        d = json.load(io.open(OUT, encoding="utf-8"))
        n = len(d["条目"])
        assert n == d["counts"]["复核条数"], "复核表条数与 counts 不符"
        assert sum(d["counts"]["分档"].values()) == n, "分档之和 ≠ 条数"
        assert d["counts"]["按册"] and sum(d["counts"]["按册"].values()) == n
        print("✓ 危候复核表自洽（%d 条）· 本机无 OCR 原页，未重算" % n)
        return 0
    if a.check:
        old = io.open(OUT, encoding="utf-8").read() if os.path.exists(OUT) else ""
        if old != txt:
            print("DRIFT: standards/zhenghou-cidian/危候判据-复核.json —— 请跑 python scripts/verify_weihou_pages.py")
            return 1
        print("✓ 危候复核表一致：%s" % json.dumps(data["counts"]["分档"], ensure_ascii=False))
        return 0
    io.open(OUT, "w", encoding="utf-8", newline="\n").write(txt)
    print("✓ 危候 %d 条逐条回原页" % data["counts"]["复核条数"])
    for k, v in data["counts"]["分档"].items():
        print("   %-12s %d" % (k, v))
    c = data["counts"]
    print("   按册 %s · 目录页可校 %d（对齐 %d / 偏差 %d）" % (
        " ".join("%s %d" % kv for kv in c["按册"].items()), c["目录页可校"], c["目录页对齐"], c["目录页偏差"]))
    miss = [r for r in data["条目"] if r["status"] == "未命中" or r["status"] == "仅治法"]
    if miss:
        print("   需回原页看图：")
        for r in miss[:10]:
            print("     %s %s（印张 %s，%s）" % (r["code"], r["name"], r["printed"], r["status"]))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
