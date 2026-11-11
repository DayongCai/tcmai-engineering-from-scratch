#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""宋本《伤寒论》398 条语料构建（条号 + 原文 + 篇/经 + 方剂 + 校勘值）

三方来源：
  A 条号骨架/原文：standards/shanghan/sources/SH_text-398.json
       （外源，github xukongwen/shanghan_learn data/SH_text.json，见 PROVENANCE-398.md）
  B 见证：F:/textbooks/qhzy-伤寒论讲义.xlsx 的（第N条）引文
  C 见证：standards/shanghan/底本.json（识典古籍刻本，无条号）

输出 standards/shanghan/tiao-398.json。只做标点规范化（句内 。→，）与
异体字登记，不改字。
"""
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SH = os.path.join(ROOT, "standards", "shanghan", "sources", "SH_text-398.json")
JB = os.path.join(ROOT, "standards", "shanghan", "底本.json")
OUT = os.path.join(ROOT, "standards", "shanghan", "tiao-398.json")
JB_XLSX = "F:/textbooks/qhzy-伤寒论讲义.xlsx"

PIAN = [
    ("辨太阳病脉证并治上", "卷二·第五篇", "太阳病", 1, 30, "太阳"),
    ("辨太阳病脉证并治中", "卷三·第六篇", "太阳病", 31, 127, "太阳"),
    ("辨太阳病脉证并治下", "卷四·第七篇", "太阳病", 128, 178, "太阳"),
    ("辨阳明病脉证并治", "卷五·第八篇", "阳明病", 179, 262, "阳明"),
    ("辨少阳病脉证并治", "卷五·第九篇", "少阳病", 263, 272, "少阳"),
    ("辨太阴病脉证并治", "卷六·第十篇", "太阴病", 273, 280, "太阴"),
    ("辨少阴病脉证并治", "卷六·第十一篇", "少阴病", 281, 325, "少阴"),
    ("辨厥阴病脉证并治", "卷六·第十二篇", "厥阴病", 326, 381, "厥阴"),
    ("辨霍乱病脉证并治", "卷七·第十三篇", "霍乱病", 382, 391, "霍乱"),
    ("辨阴阳易差后劳复病脉证并治", "卷七·第十四篇", "差后劳复", 392, 398, "阴阳易差后劳复"),
]
VARIANT = {"鞕": "硬", "蚘": "蛔", "讝": "谵", "差": "瘥", "支": "肢", "藏": "脏"}

# 宋本 113 方（去重后常用方名，含异写与简称指向同一方）
FANG_LIST = [
    "桂枝汤", "桂枝加葛根汤", "桂枝加附子汤", "桂枝去芍药汤", "桂枝去芍药加附子汤",
    "桂枝麻黄各半汤", "桂枝二麻黄一汤", "桂枝二越婢一汤", "桂枝去桂加茯苓白术汤",
    "桂枝加厚朴杏子汤", "桂枝加芍药生姜各一两人参三两新加汤", "桂枝加芍药汤", "桂枝加大黄汤",
    "桂枝加桂汤", "桂枝人参汤", "桂枝甘草汤", "桂枝甘草龙骨牡蛎汤",
    "桂枝去芍药加蜀漆牡蛎龙骨救逆汤", "桂枝附子汤", "去桂加白术汤", "桂枝附子去桂加白术汤",
    "麻黄汤", "葛根汤", "葛根加半夏汤", "葛根黄芩黄连汤", "麻黄杏仁甘草石膏汤",
    "麻黄杏子甘草石膏汤", "麻黄附子甘草汤", "麻黄细辛附子汤", "麻黄升麻汤",
    "麻黄连轺赤小豆汤", "小青龙汤", "大青龙汤", "五苓散", "文蛤散", "十枣汤",
    "小柴胡汤", "大柴胡汤", "柴胡桂枝汤", "柴胡桂枝干姜汤", "柴胡加龙骨牡蛎汤",
    "柴胡加芒消汤", "柴胡加芒硝汤", "栀子豉汤", "栀子甘草豉汤", "栀子生姜豉汤",
    "栀子厚朴汤", "栀子干姜汤", "栀子蘗皮汤", "枳实栀子汤", "白虎汤", "白虎加人参汤",
    "竹叶石膏汤", "猪苓汤", "调胃承气汤", "小承气汤", "大承气汤", "桃核承气汤",
    "麻子仁丸", "蜜煎导", "大陷胸汤", "大陷胸丸", "小陷胸汤", "三物白散", "大黄黄连泻心汤",
    "附子泻心汤", "半夏泻心汤", "生姜泻心汤", "甘草泻心汤", "旋复代赭汤", "赤石脂禹余粮汤",
    "禹余粮丸", "理中丸", "四逆汤", "通脉四逆汤", "通脉四逆加猪胆汤", "四逆加人参汤",
    "茯苓四逆汤", "干姜附子汤", "白通汤", "白通加猪胆汁汤", "真武汤", "附子汤",
    "甘草附子汤", "芍药甘草汤", "芍药甘草附子汤", "甘草干姜汤", "甘草汤", "桔梗汤",
    "黄连阿胶汤", "猪肤汤", "苦酒汤", "半夏散", "桃花汤", "吴茱萸汤", "黄连汤",
    "黄芩汤", "黄芩加半夏生姜汤", "干姜黄芩黄连人参汤", "白头翁汤", "当归四逆汤",
    "当归四逆加吴茱萸生姜汤", "乌梅丸", "烧裈散", "牡蛎泽泻散", "厚朴生姜半夏甘草人参汤",
    "小建中汤", "炙甘草汤", "茵陈蒿汤", "茯苓桂枝甘草大枣汤", "茯苓桂枝白术甘草汤",
    "茯苓甘草汤", "四逆散", "瓜蒂散",
]
FANG_LIST.sort(key=len, reverse=True)


def pian_of(n):
    for name, juan, liu, lo, hi, key in PIAN:
        if lo <= n <= hi:
            return name, juan, liu, key
    raise ValueError(n)


def norm(s):
    s = re.sub(r"[（(][^）)]{1,12}[）)]", "", s)
    return re.sub(r"[^\u4e00-\u9fff]", "", s)


def punct(s):
    """句内 。 → ，，句末保留 。；去空格。"""
    s = re.sub(r"\s+", "", s)
    s = re.sub(r"([，。；：])。", r"\1", s)
    s = s.replace("。", "，")
    s = re.sub(r"[，、]+$", "", s)
    return s + "。"


def clause_cov(body, hay):
    """按分句统计字覆盖：命中分句的字数 / 全条字数（C 级子串查找，够快）。"""
    if not body or not hay:
        return 0.0
    hit = 0
    for cl in re.split(r"[，；：、。]", body):
        if len(cl) >= 2 and cl in hay:
            hit += len(cl)
    return hit / len(body)


def recall(a, b):
    """a 的分句在 b（分句集合）中的覆盖率。"""
    if not a or not b:
        return 0.0
    hit = 0
    for cl in re.split(r"[，；：、。]", a):
        if len(cl) < 2:
            hit += len(cl)
            continue
        if not any(cl in seg for seg in b):
            continue
        hit += len(cl)
    return hit / len(a)


def jiaoyi_texts():
    import openpyxl
    wb = openpyxl.load_workbook(JB_XLSX, read_only=True)
    pat = re.compile(r"[\u2018'\"]([^\u2019'\"]{6,}?)[\u2019'\"]\s*（第(\d+)条）")
    best = {}
    for s in wb.sheetnames:
        if not s.startswith("卷"):
            continue
        for r in wb[s].iter_rows(values_only=True):
            c = r[4] if len(r) > 4 else None
            if not c:
                continue
            for m in pat.finditer(str(c)):
                n, t = int(m.group(2)), m.group(1).strip()
                if n not in best or len(t) > len(best[n]):
                    best[n] = t
    return best


def main():
    sh = json.load(open(SH, encoding="utf-8"))
    flat = {}
    for k, v in sh.items():
        for no, txt in v.items():
            flat[int(no)] = (k, txt)
    assert len(flat) == 398 and sorted(flat) == list(range(1, 399)), "SH 条号不连续"

    dib = json.load(open(JB, encoding="utf-8"))["pian"]
    dib_text = "".join(it["text"] for p in dib for it in p["items"])
    dib_full = norm(dib_text)
    jb = jiaoyi_texts()
    jb_cl = {n: [c for c in re.split(r"[，；：、。]", t) if len(c) >= 2] for n, t in jb.items()}

    out = []
    for n in range(1, 399):
        key, raw = flat[n]
        name, juan, liu, lk = pian_of(n)
        txt = punct(raw)
        body = norm(txt)
        fangs = [f for f in FANG_LIST if f in txt]
        # 最长优先去重（"桂枝加芍药汤" 不应同时记为 "桂枝汤"）
        kept = []
        for f in fangs:
            if not any(f != g and f in g for g in kept):
                kept.append(f)
        out.append({
            "no": n, "pian": name, "juan": juan, "liu": liu, "liuKey": lk,
            "text": txt, "chars": len(body),
            "fang": kept,
            "witness": {
                "dibenIn": body in dib_full,
                "dibenRecall": round(clause_cov(txt, dib_text), 3),
                "jiaoyiRecall": round(recall(txt, jb_cl.get(n, [])), 3) if n in jb else None,
            },
            "src": "外源·xukongwen/shanghan_learn SH_text.json 第%d条" % n,
        })
    doc = {
        "$generated": "python scripts/build_shanghan_398.py",
        "source": {"primary": {"file": "standards/shanghan/sources/SH_text-398.json",
                               "sha256": "c9f2e7bba4d29ee6cde5da258af725c45423d5fe6303847d7587d6afe1be6abc",
                               "origin": "https://cdn.jsdelivr.net/gh/xukongwen/shanghan_learn@master/data/SH_text.json"},
                   "witness": ["standards/shanghan/底本.json（识典古籍刻本，无条号）", JB_XLSX + "（讲义引文，含（第N条）标注）"]},
        "note": "标点规范化：句内 。→，；未改字。异体字对照见 novel 字段 variantMap。",
        "variantMap": VARIANT,
        "counts": {"tiao": len(out), "chars": sum(x["chars"] for x in out),
                   "dibenIn": sum(1 for x in out if x["witness"]["dibenIn"]),
                   "fangTiao": sum(1 for x in out if x["fang"])},
        "pian": [{"name": a, "juan": b, "liu": c, "from": d, "to": e, "n": e - d + 1, "key": f}
                 for a, b, c, d, e, f in PIAN],
        "tiao": out,
    }
    json.dump(doc, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(json.dumps(doc["counts"], ensure_ascii=False))
    low = sorted([x for x in out if x["witness"]["dibenRecall"] < 0.75], key=lambda x: x["witness"]["dibenRecall"])
    print("校勘：底本 recall<0.75 条数", len(low), [(x["no"], x["witness"]["dibenRecall"]) for x in low[:12]])
    jl = sorted([x for x in out if x["witness"]["jiaoyiRecall"] is not None and x["witness"]["jiaoyiRecall"] < 0.6],
                key=lambda x: x["witness"]["jiaoyiRecall"])
    print("讲义 rec<0.6 条数", len(jl), [(x["no"], x["witness"]["jiaoyiRecall"]) for x in jl[:8]])
    allf = sorted({f for x in out for f in x["fang"]})
    print("方名候选", len(allf))
    print("、".join(allf))


if __name__ == "__main__":
    main()
