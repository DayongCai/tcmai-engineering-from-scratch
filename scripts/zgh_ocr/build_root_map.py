#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""scripts/zgh_ocr/build_root_map.py —— 「态根 ↔ 病机」可疑对照表

背景：正文层 1810 条候的【证象组合】是「位 + 态根」缩写（气郁 / 液灼 / 阳浮），
而附录一的 72 格是「位 + 病机」全称（不宣 / 闭塞 / 蕴灼 / 脱绝）。两者不在一层。

本脚本只做一件人工口径活：把**每个态根**逐个判一次 —— 它该映到哪个病机格，还是根本不该映。
判据三条（用户口径）：
  1. 只映**语义确实同一**的（灼→蕴灼、闭→闭塞、涸→枯竭）；
  2. 郁 / 虚 / 浮 / 滞 这类是**性质**不是病机，一律不映；
  3. 拿不准的记 `待核`，不硬判 —— 待核也是结论。

产出 standards/zhenghou-cidian/态根-病机对照.json：
  roots[]  每个态根：出现次数、位分布、判定（映射/性质不映/待核/噪声）、病机格、依据
  stats    按判定汇总次数、以及「若把映射项计入，可解释率会从 21.0% 变成多少」

纪律：**不接进计分**。这张表只是把「能不能映」这件事摊开，入不入计分另议。
"""
import glob
import json
import os
import re
import sys
from collections import Counter, defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
STD = os.path.join(ROOT, "standards", "zhenghou-cidian")

WEI_ABBR = {
    "表": "腠理", "腠理": "腠理", "经": "经脉", "经脉": "经脉", "络": "络脉", "络脉": "络脉",
    "经络": "经脉", "清空": "清空", "清窍": "清窍", "窍": "清窍", "空窍": "清空",
    "气": "气机", "气机": "气机", "神": "神志", "神志": "神志", "津": "津", "津气": "津",
    "液": "液", "津液": "液", "营": "营", "营气": "营", "血": "血", "血液": "血",
    "阳": "阳", "阳气": "阳", "阴": "阴", "阴液": "阴",
}
SPLIT = re.compile(r"[+＋、，,；;·・\s]+")

# ── 人工判定表（本轮口径）─────────────────────────────────────────────
# 判定取值：映射 / 性质不映 / 待核 / 噪声
# 「映射」= 语义与原表某病机格同一，且该位在原表有这一格时才真正落格；
# 「性质不映」= 它是性质或程度，不是「哪一步坏了」，原表也没有对应的字；
# 「待核」= 拿不准，留给人看；「噪声」= 分词/OCR 残留，不是真实态根。
DECISION = {
    # 语义同一，可映（表里有字）
    "蒸": ("映射", "蕴蒸", "气机蕴蒸 / 津气蕴蒸 等：与原表「蕴蒸」同一"),
    "灼": ("映射", "蕴灼", "液灼 / 营灼：与原表「蕴灼」同一（津液消灼）"),
    "炽": ("映射", "蕴炽", "气炽 / 血炽 / 阴热蕴炽：与原表「蕴炽」同一"),
    "闭": ("映射", "闭塞", "气闭 / 神闭：与原表「闭塞」同一（气机闭塞 / 神志蒙闭）"),
    "蒙": ("映射", "闭塞", "神蒙：原表此格写作「神志蒙闭」，同指"),
    "结": ("映射", "不通", "气结 / 血结：原表「不通」格的写法就是「气机郁结 / 血滞瘀结」"),
    "陷": ("映射", "不升", "气陷 / 阳陷：原表「不升」格含「气机下陷」"),
    "涸": ("映射", "枯竭", "液涸 / 阴涸 / 津涸：与原表「枯竭」同一（津液枯涸）"),
    "枯": ("映射", "枯竭", "阴枯 / 津枯：同上"),
    "竭": ("映射", "枯竭", "津竭 / 液竭：与原表「枯竭」格同一（津液枯涸）——与 涸/枯 同指，只是写法不同"),
    "脱": ("映射", "脱绝", "阳脱 / 气脱：与原表「脱绝」同一"),
    "扰": ("映射", "不宁", "神扰：与原表「神志不宁」同一"),
    # 性质 / 程度，不是病机 —— 按口径不映
    "郁": ("性质不映", None, "郁是「气机不畅」的性质概括，原表 19 病机里没有「郁」这一档；气郁≠某一格"),
    "虚": ("性质不映", None, "虚是正气状态（阴虚/气虚），不是「哪一步坏了」，原表无此档"),
    "浮": ("性质不映", None, "阳浮属虚阳外越的性质描述；原表 19 病机里没有「浮」这一档"),
    "衰": ("性质不映", None, "衰退是程度描述（正气衰），原表 19 病机里没有「衰」这一档"),
    "弱": ("性质不映", None, "虚弱是程度描述（体弱/脉弱），不是「哪一步坏了」"),
    "伤": ("性质不映", None, "伤（津伤/血伤）是结果描述，不是病机档"),
    # 拿不准，留给人看
    "滞": ("待核", None, "滞在不同位落到不同格：血滞→不利（血滞不行）、血瘀→不通（血滞瘀结），逐位不同，不设全局映射"),
    "逆": ("待核", None, "气逆多指上逆，可近「不降」也可近「陷逆」族，需按位判"),
    "溢": ("待核", None, "血溢近「溃乱」（络血妄行），但也可指出血，非必然一格"),
    "滑": ("待核", None, "精滑 / 血滑近「不固」，但原表不固格写的是「津液不固 / 血液不固」，用词不同"),
    "泄": ("待核", None, "津泄 / 液泄可近「不固」，也可能指「不宣×津=气不化津」"),
    "热": ("待核", None, "「热」是性质，若为「热炽」则应归蕴炽；本表按原字保留，不并"),
    "乱": ("待核", None, "气乱 / 血乱近「溃乱」，出现仅 11 次，样本太少"),
    "瘀": ("待核", None, "瘀可近「不通」，但原表把瘀写在血滞瘀结（不通）与络瘀血溢（腐败）两格"),
}

NOISE = {"脉", "络", "气", "志", "机", "主", "法", "谥", "烘", "洞", "酒", "虑", "越", "化",
         "气蒸", "血虚", "阳郁", "虚经络郁滞", "瘀血溢", "化不行", "清空不利", "郁滞", "失养",
         "不荣", "不和", "不利"}


def load_xiang():
    return json.load(open(os.path.join(STD, "证象-合法组合.json"), encoding="utf-8"))


def collect():
    """把标签切成 (位, 态根)，统计次数与位分布。"""
    roots = Counter()
    by_wei = defaultdict(Counter)
    samples = defaultdict(list)
    for f in sorted(glob.glob(os.path.join(STD, "正文-M*.json"))):
        d = json.load(open(f, encoding="utf-8"))
        for code, it in d["items"].items():
            text = (it.get("fields") or {}).get("证象组合") or ""
            if not text.strip() or "【" in text:
                continue
            for t in SPLIT.split(re.sub(r"[:：。．，]", "", text)):
                t = t.strip().strip("·、,，。．!！")
                if not t or len(t) > 8 or re.search(r"\d", t):
                    continue
                col = None
                for k in sorted(WEI_ABBR, key=len, reverse=True):
                    if t.startswith(k) and len(t) > len(k):
                        col = WEI_ABBR[k]
                        break
                if not col:
                    continue
                root = t[len(k):]
                roots[root] += 1
                by_wei[root][col] += 1
                if len(samples[root]) < 3:
                    samples[root].append({"code": code, "zh": it.get("zh"), "page": it.get("page"), "tag": t})
    return roots, by_wei, samples


def main():
    X = load_xiang()
    roots, by_wei, samples = collect()
    out = []
    stats = Counter()
    mapped_ok = 0          # 位+病机都能落格的次数（真正能算「可解释」）
    for root, n in roots.most_common():
        verdict, row, why = DECISION.get(root, (None, None, None))
        if verdict is None:
            verdict, why = ("噪声", "分词/OCR 残留，不是真实态根") if root in NOISE else ("待核", "未在人工判定表里（低频且形状可疑）")
        entry = {
            "态根": root, "次数": n,
            "位分布": dict(by_wei[root].most_common()),
            "判定": verdict, "病机": row, "依据": why,
            "样例": samples[root],
        }
        if verdict == "映射":
            # 该根在原表里，逐位看有没有这一格；只有位+病机都对上才算「真能落格」
            hit = sum(c for col, c in by_wei[root].items() if (X["byWei"].get(col) or {}).get(row))
            entry["可落格次数"] = hit
            mapped_ok += hit
        stats[verdict] += n
        out.append(entry)

    total = sum(roots.values())
    doc = {
        "$about": "「态根 ↔ 病机」可疑对照表。逐根人工判一次：映射 / 性质不映 / 待核 / 噪声，"
                  "并给出依据。**不接进计分** —— 本表只把「能不能映」摊开，入不入计分另议。",
        "source": {"标签来自": "正文-M01…M12.json 的【证象组合】字段",
                   "病机格": "证象-合法组合.json（附录一，19 病机 × 13 位）"},
        "counts": {
            "态根种类": len(roots), "出现总次": total,
            "按判定": dict(stats),
            "映射项能真正落格的次数": mapped_ok,
            "原可解释": 1468,
            "映射后可解释上限": 1468 + mapped_ok,
            "映射后可解释率(%)": round(100.0 * (1468 + mapped_ok) / total, 2),
        },
        "roots": out,
    }

    path = os.path.join(STD, "态根-病机对照.json")
    content = json.dumps(doc, ensure_ascii=False, indent=1) + "\n"
    if "--check" in sys.argv:
        old = open(path, encoding="utf-8").read() if os.path.exists(path) else ""
        print("✅ 态根-病机对照.json 与重算一致" if old == content else "✗ 漂移: 态根-病机对照.json")
        return 0 if old == content else 1
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(content)

    c = doc["counts"]
    print("态根 %d 种 / %d 次" % (c["态根种类"], c["出现总次"]))
    for k in ("映射", "性质不映", "待核", "噪声"):
        print("  %-6s %6d 次" % (k, c["按判定"].get(k, 0)))
    print("映射项能真正落格 %d 次 → 可解释率 21.0%% → %.2f%%"
          % (c["映射项能真正落格的次数"], c["映射后可解释率(%)"]))
    return 0


if __name__ == "__main__":
    sys.exit(main())
