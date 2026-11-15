#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""scripts/zgh_ocr/audit_xiangzuhe.py —— 【证象组合】字段 × 附录一 72 格的对照质检

先讲清一件事，免得结论被误读：**这两个字段不是同一套词。**
  · 附录一（印张 2290）是「部位 × 病机」矩阵，格内是**证象全称**：气机郁结、腠理不宣、血液失养…
  · 正文层的【证象组合】绝大多数是**位缩写 + 态缩写**的标签串：`气郁+气滞+阳浮+液灼`…
    其中「郁/滞/浮/灼」来自 108 态表，不是附录一那 19 个病机（不宣/不利/闭塞/蕴灼/脱绝…）。

所以「用 72 格校验 1863 条」这件事本身要分两层做，混在一起算会得到假数字：
  A 证象型（字段里带【…】全称）：逐条与 72 格比对 —— 这才是「原书用词 vs 我转写用词」；
  B 标签型（位缩写+态缩写）：72 格里根本没有「郁/滞/灼」这些字，比不了；
    改为量三件事 —— 该标签的**位**在不在附录一的 13 个位里、**态**在不在 108 态表里、
    以及在附录一里该位有没有格。这样量出的是「两套词汇的重合度」，不是命中率。

只统计与列举，不改正文一个字。产出 standards/zhenghou-cidian/证象组合-质检.json。
"""
import glob
import json
import os
import re
import sys
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
STD = os.path.join(ROOT, "standards", "zhenghou-cidian")

BRACKET = re.compile(r"【([^】]{2,12})】")
MARK = re.compile(r"(主证|副证|宾证|佐证|兼证|变证|转证|本证)[:：]?")
SPLIT = re.compile(r"[+＋、，,；;]+")

# 位缩写 → 附录一列名。只收「常识性同指」，不把「表」硬算成「腠理」以外的任何东西。
WEI_ABBR = {
    "表": "腠理", "腠理": "腠理", "肌腱": "腠理",
    "经": "经脉", "经脉": "经脉", "络": "络脉", "络脉": "络脉", "经络": "经脉",
    "清空": "清空", "清窍": "清窍", "窍": "清窍", "空窍": "清空",
    "气": "气机", "气机": "气机", "神": "神志", "神志": "神志",
    "津": "津", "津气": "津", "液": "液", "津液": "液",
    "营": "营", "营气": "营", "血": "血", "血液": "血",
    "阳": "阳", "阳气": "阳", "阴": "阴", "阴液": "阴",
}


def load_tai():
    return {t["zh"] for t in json.load(open(os.path.join(STD, "语素-态.json"), encoding="utf-8"))["态"]}


def load_xiang():
    X = json.load(open(os.path.join(STD, "证象-合法组合.json"), encoding="utf-8"))
    cells = {}
    for col, m in X["byWei"].items():
        for row, text in m.items():
            cells[text] = (col, row)
    for key, texts in (X.get("multiText") or {}).items():
        col, row = key.split("×")
        for t in texts:
            cells.setdefault(t, (col, row))
    return X, cells


# 标签的「态根」是**单字缩写**（气郁 / 阳滞 / 液灼），不是 108 态的全称（郁结 / 郁滞 / 蕴灼）。
# 其中一部分能直接映回附录一的 19 个病机，另一部分（郁/滞/逆/虚/实/溢/浮…）在原表里**没有对应格**。
ROOT_TO_ROW = {
    "宣": "不宣", "降": "不降", "升": "不升", "闭": "闭塞", "塞": "闭塞",
    "和": "不和", "宁": "不宁", "振": "不振", "养": "不养", "荣": "不荣",
    "固": "不固", "涸": "枯竭", "竭": "枯竭", "脱": "脱绝", "绝": "脱绝",
    "蒸": "蕴蒸", "灼": "蕴灼", "炽": "蕴炽", "溃": "溃乱", "腐": "腐败",
    "利": "不利", "通": "不通",
}
ROOT_ABBR = set("郁滞逆结虚实溢浮陷蒙扰动泄亢盛衰弛缓急痛痒麻木")


def split_wei_tai(tag, X, TAI):
    """把标签切成 (位缩写, 态根)：位取最长前缀，其余整段当态根（可能是单字，也可能是「蕴蒸」这类全称）。"""
    s = re.sub(r"\s", "", tag)
    for col in sorted(WEI_ABBR, key=len, reverse=True):
        if s.startswith(col) and len(s) > len(col):
            return col, s[len(col):]
    # 位名残缺：某位名以该前缀结尾（气之于气机、表之于腠理）
    for col in sorted(WEI_ABBR, key=len, reverse=True):
        if s[:1] and WEI_ABBR[col].startswith(s[:1]):
            return s[0], s[1:]
    return "", s


def classify_xiang(label, X, cells):
    """证象型【…】的判定（与编码器同口径）。"""
    s = re.sub(r"\s", "", label)
    s = MARK.sub("", s).strip("：:、，,")
    if not s:
        return "unknown", None, None
    if s in cells:
        col, row = cells[s]
        return "exact", col, row
    rows = sorted(X["rows"], key=len, reverse=True)
    row = next((r for r in rows if s.endswith(r)), None)
    if not row:
        return "unknown", None, None
    prefix = s[: -len(row)]
    variants = {"阳": ["阳气"], "阴": ["阴液"], "津": ["津气", "津液"], "营": ["营气"], "血": ["血液"]}
    for col in sorted(X["byWei"], key=len, reverse=True):
        for p in [col] + variants.get(col, []):
            if prefix == p:
                cell = (X["byWei"].get(col) or {}).get(row)
                return ("variant", col, row) if cell else ("empty", col, row)
    # 位名被截首（理不宣 / 腠理不宣）
    for col in sorted(X["byWei"], key=len, reverse=True):
        for p in [col] + variants.get(col, []):
            if prefix and p.endswith(prefix):
                return "clipped", col, row
    return "unknown", None, row


def main():
    check = "--check" in sys.argv
    X, cells = load_xiang()
    TAI = load_tai()
    files = sorted(glob.glob(os.path.join(STD, "正文-M*.json")))

    n_hou = n_with = 0
    xiang_forms = Counter()          # 证象型 / 标签型
    xiang_detail = []
    xiang_cls = Counter()
    tag_cnt = Counter()
    tag_cls = Counter()
    tag_unexplained = {"位不在表": Counter(), "态根原表无对应": Counter(), "拆不开": Counter()}
    per_door = []

    for f in files:
        d = json.load(open(f, encoding="utf-8"))
        men = d["men"]
        door = Counter()
        for code, it in d["items"].items():
            n_hou += 1
            text = (it.get("fields") or {}).get("证象组合") or ""
            if not text.strip():
                continue
            n_with += 1
            if "【" in text:
                xiang_forms["证象型（带【…】全称）"] += 1
                for m in BRACKET.finditer(text):
                    v = MARK.sub("", re.sub(r"\s", "", m.group(1))).strip("：:、，,")
                    if not v:
                        continue
                    kind, col, row = classify_xiang(v, X, cells)
                    xiang_cls[kind] += 1
                    door["证象:" + kind] += 1
                    if kind != "exact":
                        xiang_detail.append({"men": men, "code": code, "zh": it.get("zh"),
                                             "page": it.get("page"), "label": v, "判定": kind,
                                             "位": col, "病机": row})
                continue

            xiang_forms["标签型（位缩写+态缩写）"] += 1
            for t in SPLIT.split(re.sub(r"[:：]", "", text)):
                t = t.strip()
                if not t or len(t) > 8 or re.search(r"\d", t):
                    continue
                tag_cnt[t] += 1
                if t in WEI_ABBR:                      # 只写部位（空窍 / 清空 / 清窍）
                    tag_cls["纯位标签（有位无态）"] += 1
                    door["标签:纯位"] += 1
                    continue
                wei_ab, root = split_wei_tai(t, X, TAI)
                wei = WEI_ABBR.get(wei_ab)
                # 三类「单边标签」先摘出来，别混进「对不上」：
                #   纯位标签（空窍 / 清空 / 清窍）—— 只给部位，没给态；
                #   纯病机标签（不和 / 火炽 / 佛郁）—— 只给态根，没给位；
                # 它们不是错，是这套缩写在原文里就允许只写一头。
                if not root:
                    if wei:
                        tag_cls["纯位标签（有位无态）"] += 1
                        door["标签:纯位"] += 1
                    else:
                        tag_cls["拆不开（无态根）"] += 1
                        tag_unexplained["拆不开"][t] += 1
                        door["标签:拆不开"] += 1
                    continue
                if not wei and (t in X["rows"] or root in ROOT_TO_ROW
                                or root in X["rows"] or (root[-1:] in ROOT_ABBR)):
                    # 只给态、没给位：如「精滑 / 水泄 / 佛郁 / 火炽」——原书写法允许单边
                    tag_cls["纯态或纯病机标签（有位无位不齐）"] += 1
                    door["标签:纯态"] += 1
                    continue
                row = ROOT_TO_ROW.get(root) if len(root) == 1 else None
                if not row and root in X["rows"]:
                    row = root
                if wei and row:
                    tag_cls["可解释（位在附录一 + 态根映得回病机）"] += 1
                    door["标签:可解释"] += 1
                elif wei:
                    tag_cls["位在附录一·态根是缩写（原表无对应病机）"] += 1
                    tag_unexplained["态根原表无对应"][t] += 1
                    door["标签:态根表外"] += 1
                else:
                    tag_cls["位不在附录一 13 位"] += 1
                    tag_unexplained["位不在表"][t] += 1
                    door["标签:位不在表"] += 1
        per_door.append({"men": men, **dict(door)})

    doc = {
        "$about": "【证象组合】× 附录一 72 格的对照质检。两层分开算："
                  "A 证象型（带【…】全称）逐条与 72 格比对；B 标签型（位缩写+态缩写）改用"
                  "「位是否在附录一 13 位、态是否在 108 态」量两套词汇的重合度。"
                  "只统计与列举，不改正文。",
        "source": {"正文层": "正文-M01…M12.json（证象组合字段）",
                   "附录一": "证象-合法组合.json（印张 2290，72 格 / 13 位 / 19 病机）",
                   "态表": "语素-态.json（108 态）"},
        "counts": {
            "候": n_hou,
            "有证象组合字段": n_with,
            "字段形态": dict(xiang_forms),
            "证象型判定": dict(xiang_cls),
            "标签型判定": dict(tag_cls),
            "标签种类": len(tag_cnt),
            "标签出现总次": sum(tag_cnt.values()),
        },
        "证象型明细": xiang_detail,
        "标签型未解释明细": {k: dict(v.most_common()) for k, v in tag_unexplained.items()},
        "标签Top40": dict(tag_cnt.most_common(40)),
        "perDoor": per_door,
    }

    path = os.path.join(STD, "证象组合-质检.json")
    content = json.dumps(doc, ensure_ascii=False, indent=1) + "\n"
    if check:
        old = open(path, encoding="utf-8").read() if os.path.exists(path) else ""
        if old != content:
            print("✗ 漂移: 证象组合-质检.json")
            return 1
        print("✅ 证象组合-质检.json 与重算一致")
        return 0
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(content)

    c = doc["counts"]
    print("候 %d 条 · 有【证象组合】字段 %d 条" % (c["候"], c["有证象组合字段"]))
    for k, v in c["字段形态"].items():
        print("  形态 %-22s %d 条" % (k, v))
    print("  证象型判定（应只有 %d 个标签）：%s" % (sum(xiang_cls.values()), dict(xiang_cls)))
    print("  标签型：%d 种 / %d 次" % (c["标签种类"], c["标签出现总次"]))
    for k, v in tag_cls.most_common():
        print("    %-24s %6d 次（%.1f%%）" % (k, v, 100.0 * v / c["标签出现总次"]))
    for k, v in tag_unexplained.items():
        if v:
            print("    %s Top8：%s" % (k, v.most_common(8)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
