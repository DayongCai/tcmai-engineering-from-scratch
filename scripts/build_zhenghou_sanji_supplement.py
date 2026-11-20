#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""scripts/build_zhenghou_sanji_supplement.py —— 补齐三块「缺母本」的数据层

## 三块缺口与各自的母本

| 缺口 | 母本（都在辞典里，本来就有，只是没被整理成层） | 产物 |
|---|---|---|
| 证象学 | 附录一「位×病机」72 格 + 语素-态 108 态/6 族 + 1815 条【证象组合】的形态普查 | `证象学.json` |
| 危候判据 | 候名态根（脱绝/闭塞/厥逆…）+ 治则里的救逆/固脱/开窍词 + 概论第八节顺逆条文 | `危候判据.json` |
| 证—法—方 | 每候的【治则】【方症】两字段（1858 / 1860 条有） | `方症索引.json` |

一句话：不是去外面找新书，而是把书里已经印着、但一直没被单独抽出来的三样东西抽成层。
所以每一处判定都必须带**依据字段 + 印张**，判不出的进 `待核`，不猜。

## 三块各自的口径（写在产物里，也写在课程第 25–27 章）

1. **证象学**：附录一 19 病机 × 13 位，实测 72 格（书声明 75）；108 个态分 6 族；
   1815 条【证象组合】里 3 条是「证象型（带【…】全称）」、1812 条是「标签型（位缩写+态缩写）」。
   可解释率按「位在附录一 + 态根能映回病机」算，不降阈值、不改词表。
2. **危候判据**：**词面判据**，不是临床判据。三档（厥脱／脱绝／陷逆）来自 `口语别名.json` 的
   `危象` 段；候级清单从「候名态根」与「治则关键词」两路取，两路都记，命中的写依据，只命中一路的
   标 `单路`。全部需人工复核 —— 这一点写进产物的 `校勘` 与课程边界。
3. **证—法—方**：一候一条，取【治则】首句与【方症】里的方名（`X症：` 前的 2–10 字）。
   取不到方名的记 `无名`（多为「（1）《某书》方」式），不硬造。

## 幂等

不写生成时间；`--check` 只读比对。

用法：
    python scripts/build_zhenghou_sanji_supplement.py
    python scripts/build_zhenghou_sanji_supplement.py --check
"""
import argparse
import io
import json
import os
import re
from collections import Counter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STD = os.path.join(ROOT, "standards", "zhenghou-cidian")
HANZI = re.compile(r"[\u4e00-\u9fff]")

# 危候三档的候级触发词（词面判据：候名尾部态根 + 治则用语）
WEI_ROOTS = {"厥脱": ["厥脱", "厥逆", "昏厥", "晕厥"],
             "脱绝": ["脱绝", "亡阳", "亡阴", "虚脱", "气脱", "血脱", "液脱"],
             "陷逆": ["陷逆", "内陷", "逆传", "闭脱", "蒙闭", "闭塞清窍"]}
ZL_HINT = ["救逆", "固脱", "回阳", "开窍", "醒神", "急下", "益气固脱", "回阳固脱",
           "凉血解毒", "清营", "透热转气", "急存阴", "扶阳", "摄纳", "镇摄"]
FANG = re.compile(r"([\u4e00-\u9fff]{2,12})症\s*[:：]")
FANG2 = re.compile(r"([\u4e00-\u9fff]{2,10}(?:汤|散|丸|丹|饮|膏|煎|锭|片))")


def load(p):
    return json.load(io.open(os.path.join(STD, p), encoding="utf-8"))


def bodies():
    out = []
    for p in sorted(os.listdir(STD)):
        if not re.match(r"^正文-M\d{2}\.json$", p):
            continue
        d = json.load(io.open(os.path.join(STD, p), encoding="utf-8"))
        for code, it in d["items"].items():
            out.append({"code": code, "men": d["men"], "zh": it.get("zh", ""),
                        "page": it.get("page"), "chars": it.get("chars", 0),
                        "fields": it.get("fields") or {}, "src": p})
    return out


def build_zhengxiang():
    few = load("附录-证象.json")
    legal = load("证象-合法组合.json")
    tai = load("语素-态.json")
    qc = load("证象组合-质检.json")
    rows, cols, cells = legal["rows"], legal["cols"], few["cells"]
    fam = Counter()
    for t in tai["态"]:
        fam[t["族"]] += 1
    c = qc["counts"]
    return {
        "$about": "证象学：证象的定义、位×病机合法格、态表与【证象组合】的形态普查。"
                  "全部数字来自辞典自身（附录一 / 语素表 / 质检表），无一处外部补写。",
        "定义": {
            "原文定位": "概论·第四节（证的结构）",
            "要义": "证象是反映单一病机状态的识别单位（单位病机），不是独立证候；"
                    "由症象、脉象、舌象按病机形态归并而成；各表象具有同等效价（「但见一症便是，不必悉具」）。",
            "自述规模": "概论自述「13 类、76 个病机单位」；本层能逐格核到的是附录一的 72 格（见下）。",
        },
        "格": {"行（病机）": len(rows), "列（位）": len(cols), "合法格": len(cells),
               "书内声明": few.get("declare"), "差异": few.get("declare", 0) - len(cells),
               "行表": rows, "列表": cols,
               "格": [{"病机": x["row"], "位": x["col"], "证象": x["text"]} for x in cells]},
        "态": {"总": len(tai["态"]), "族": dict(fam.most_common()),
               "明细": [{"态": t["zh"], "族": t["族"], "动作": t.get("动作"), "释": t.get("释")} for t in tai["态"]]},
        "组合形态": {
            "候总数": c["候"], "有证象组合字段": c["有证象组合字段"],
            "字段形态": c["字段形态"], "标签种类": c["标签种类"], "标签出现总次": c["标签出现总次"],
            "标签型判定": c["标签型判定"],
            "可解释率": round(c["标签型判定"].get("可解释（位在附录一 + 态根映得回病机）", 0)
                              / max(1, c["标签出现总次"]), 4),
        },
        "读法": [
            "① 先看【证象组合】是证象型还是标签型——全书只有 3 条写成【全称】。",
            "② 标签型按「位缩写 + 态根」拆；位要在附录一的 13 位里，态根要能映回 19 个病机之一。",
            "③ 拆开又映不回的，记「表外」，并写清是哪个位缺哪一格 —— 不硬塞。",
            "④ 可解释率是 21.1%（1470 / 6982 次），不是「几乎全覆盖」；这个数不许靠降阈值改。",
        ],
        "校勘": [
            "附录一书内声明 75 格，实测人工读表 72 格，差 3 格（行/列缺格），已在 `附录-证象-原格.json` 留档。",
            "概论自述「13 类 76 单位」，与附录一的 72 格不是同一口径（前者是分类学说法，后者是表格实测），不得互相换算。",
        ],
    }


def build_weihou(items):
    hits, seen = [], Counter()
    for it in items:
        f = it["fields"]
        zl = (f.get("治则") or "").strip()
        name = it["zh"]
        tier, why = None, []
        for t, roots in WEI_ROOTS.items():
            if any(r in name for r in roots):
                tier = t
                why.append("候名含「%s」" % next(r for r in roots if r in name))
                break
        kw = [k for k in ZL_HINT if k in zl]
        if kw:
            why.append("治则含「%s」" % kw[0])
        if tier is None:
            # 候名里没有危候态根：不判危候，单列「候选」（只有治则用语支持），由人复核
            if kw:
                seen["候选"] += 1
                hits.append({"code": it["code"], "name": name, "men": it["men"], "tier": "候选",
                             "why": "；".join(why), "twoRoute": False,
                             "治则首句": re.split(r"[。；]", zl)[0][:80] if zl else "",
                             "printed": it["page"], "src": it["src"]})
            continue
        seen[tier] += 1
        hits.append({"code": it["code"], "name": name, "men": it["men"], "tier": tier,
                     "why": "；".join(why), "twoRoute": bool(kw) and len(why) > 1,
                     "治则首句": re.split(r"[。；]", zl)[0][:80] if zl else "",
                     "printed": it["page"], "src": it["src"]})
    ali = load("口语别名.json")
    return {
        "$about": "危候判据（词面层）：三档＋候级清单。判据来自候名态根与治则用语，**不是临床判据**，"
                  "每一条都要人工复核；只命中一路的标 twoRoute=false。",
        "口径": {
            "三档": {t: roots for t, roots in WEI_ROOTS.items()},
            "治则提示词": ZL_HINT,
            "注意": "本层只做「哪些候带危象语义、依据是哪个字」，不做生死判断，也不给处置时限。",
        },
        "口语入口": ali.get("危象", {}),
        "counts": {"命中": len(hits), "按档": dict(seen), "两条路都好": sum(1 for h in hits if h["twoRoute"]),
                   "候总数": len(items)},
        "清单": sorted(hits, key=lambda h: (h["tier"], h["code"])),
        "校勘": ["词面判据会把「闭塞」类的普通候也算进来（如「经脉闭塞」），清单里一律保留并标依据，"
                 "由人工按原书【摘录】复核；删条要写理由，不许静默。"],
    }


def build_fangzheng(items):
    rows, named = [], 0
    fang_top = Counter()
    multi = 0
    for it in items:
        f = it["fields"]
        zy = (f.get("方症") or "").strip()
        zl = (f.get("治则") or "").strip()
        if not zy:
            continue
        m = FANG.search(zy[:60])
        name = m.group(1) if m else ""
        if not name:
            m2 = FANG2.search(zy[:80])
            name = m2.group(1) if m2 else ""
        if name:
            named += 1
            fang_top[name] += 1
        if re.search(r"[（(]\s*[1一]\s*[）)]", zy):
            multi += 1
        rows.append({"code": it["code"], "name": it["zh"], "men": it["men"],
                     "治法首句": re.split(r"[。；]", zl)[0][:80] if zl else "",
                     "方名": name or None, "一方多方": bool(re.search(r"[（(]\s*[2２]\s*[）)]", zy)),
                     "方症首段": zy[:120], "printed": it["page"], "src": it["src"]})
    return {
        "$about": "证—法—方对接层：一候一条，取【治则】首句（法）与【方症】里的方名（方）。"
                  "方名只认「X症：」前的 2–12 字，取不到记 null，不硬造。",
        "counts": {"有方症字段": len(rows), "取到方名": named, "取不到": len(rows) - named,
                   "含多首方": multi, "方名种类": len(fang_top)},
        "方名频次Top20": fang_top.most_common(20),
        "条目": rows,
        "校勘": ["方名以「X症：」为锚，遇到「（1）《肘后方》方」式开头会取不到名，记 null 并在课程里说明；",
                 "本层是「候→法→方」的对接索引，不等于方剂学的主治归经，也不替代方书。"],
    }


def build():
    items = bodies()
    data = {"证象学.json": build_zhengxiang(),
            "危候判据.json": build_weihou(items),
            "方症索引.json": build_fangzheng(items)}
    out = {}
    for name, d in data.items():
        out[os.path.join(STD, name)] = json.dumps(d, ensure_ascii=False, indent=1) + "\n"
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true")
    a = ap.parse_args()
    files = build()
    drift = []
    for p, txt in files.items():
        old = io.open(p, encoding="utf-8").read() if os.path.exists(p) else None
        if old != txt:
            drift.append(p)
    if a.check:
        if drift:
            print("DRIFT: " + "、".join(os.path.basename(p) for p in drift) + " —— 请跑 python scripts/build_zhenghou_sanji_supplement.py")
            return 1
        print("✓ 补篇三层一致（证象学 / 危候判据 / 方症索引）")
        return 0
    for p, txt in files.items():
        io.open(p, "w", encoding="utf-8", newline="\n").write(txt)
    z = json.loads(files[os.path.join(STD, "证象学.json")])
    w = json.loads(files[os.path.join(STD, "危候判据.json")])
    f = json.loads(files[os.path.join(STD, "方症索引.json")])
    print("✓ 证象学：格 %d/%d 声明 %d · 态 %d/%d 族 · 可解释率 %.1f%%" % (
        z["格"]["合法格"], z["格"]["行（病机）"] * z["格"]["列（位）"], z["格"]["书内声明"],
        z["态"]["总"], len(z["态"]["族"]), z["组合形态"]["可解释率"] * 100))
    print("✓ 危候判据：命中 %d 条（%s）· 两条路都好 %d" % (
        w["counts"]["命中"], " / ".join("%s %d" % (k, v) for k, v in w["counts"]["按档"].items()),
        w["counts"]["两条路都好"]))
    print("✓ 方症索引：有方症 %d · 取到方名 %d · 含多首方 %d · 方名种类 %d" % (
        f["counts"]["有方症字段"], f["counts"]["取到方名"], f["counts"]["含多首方"], f["counts"]["方名种类"]))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
