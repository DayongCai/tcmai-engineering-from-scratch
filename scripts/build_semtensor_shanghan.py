#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""条文语义张量：398 条 × 9 条病理生理解剖轴

做法：给每一轴一份可审计的关键词表（lexicon），按条文原文命中数计分
（score = min(4, 命中不同关键词数)，并记录命中词），主轴 = argmax。
这不是黑箱模型输出 —— 每一分都能回指到条文里的字。

输出 standards/shanghan/semtensor-398.json
"""
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TIQ = os.path.join(ROOT, "standards", "shanghan", "tiao-398.json")
OUT = os.path.join(ROOT, "standards", "shanghan", "semtensor-398.json")

AXES = [
    ("热势", "体温调定点上移 / 高代谢", ["发热", "身热", "潮热", "大热", "壮热", "恶热",
                                        "日晡", "灼热", "面赤", "目赤", "烦渴", "身黄"]),
    ("津伤", "体液容量↓ / 高渗", ["渴", "口干", "舌干", "咽干", "舌上燥", "大烦渴",
                                 "小便不利", "小便数", "汗多", "无津", "燥"]),
    ("阳衰", "心排血量↓ / 末梢灌注↓", ["厥", "四逆", "脉微", "脉沉微", "下利清谷", "但欲寐",
                                       "蜷卧", "恶寒", "身冷", "脉不出"]),
    ("水饮", "体液分布异常 / 第三间隙", ["心下悸", "水气", "小便不利", "头眩", "眩", "吐涎",
                                        "干呕", "咳", "胸满", "少腹满"]),
    ("气滞", "内脏平滑肌张力与腔道压力异常", ["胸胁苦满", "腹满", "腹胀", "心下痞", "噫气",
                                              "不欲饮食", "结胸", "气上撞", "支结"]),
    ("血瘀", "微循环淤滞 / 凝血纤溶失衡", ["瘀", "蓄血", "如狂", "发狂", "善忘", "少腹硬",
                                          "便血", "衄", "血自下", "身黄如橘子"]),
    ("神乱", "中枢神经系统功能紊乱", ["谵语", "郑声", "烦躁", "惊", "狂", "不识人", "独语",
                                      "直视", "惕而不安", "冒"]),
    ("里实", "肠腔内容物停滞 / 内毒素吸收", ["不大便", "大便硬", "大便难", "燥屎", "腹满痛",
                                              "拒按", "绕脐痛", "潮热", "手足濈然"]),
    ("表郁", "体表血管收缩 / 汗腺抑制", ["脉浮", "无汗", "恶寒", "头项强痛", "身疼", "腰痛",
                                        "骨节疼痛", "脉浮紧", "脉浮缓", "啬啬恶寒"]),
]


def main():
    tiao = json.load(open(TIQ, encoding="utf-8"))["tiao"]
    rows = []
    for t in tiao:
        txt = t["text"]
        vec, hit, raw = {}, {}, {}
        for name, mech, keys in AXES:
            got = [k for k in keys if k in txt]
            raw[name] = len(got)
            vec[name] = min(4, len(got))
            hit[name] = got
        main_axis = sorted(vec.items(), key=lambda kv: (-raw[kv[0]], kv[0]))[0][0]
        rows.append({"no": t["no"], "liu": t["liuKey"], "fang": t["fang"],
                     "vec": vec, "raw": raw, "hit": {k: v for k, v in hit.items() if v},
                     "main": main_axis, "norm": round(sum(vec.values()) / (4 * len(AXES)), 3)})
    doc = {"$generated": "python scripts/build_semtensor_shanghan.py",
           "axes": [{"name": n, "mech": m, "lexicon": k} for n, m, k in AXES],
           "note": "score=min(4,命中不同关键词数)；hit 记录命中词，可逐条回验；主轴=argmax",
           "counts": {"tiao": len(rows), "axes": len(AXES)},
           "rows": rows}
    json.dump(doc, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    from collections import Counter
    c = Counter(r["main"] for r in rows)
    print(json.dumps(dict(c), ensure_ascii=False))
    print("条均能量", round(sum(r["norm"] for r in rows) / len(rows), 3))


if __name__ == "__main__":
    main()
