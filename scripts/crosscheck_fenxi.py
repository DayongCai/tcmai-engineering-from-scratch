#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""scripts/crosscheck_fenxi.py —— 跨课对账：《中药化学》的成分类别 ×《中药分析学》的测定方法

为什么做这一层：
  《中药化学》按**成分**编（生物碱、黄酮、皂苷…），回答「这类成分长什么样、怎么提」；
  《中药分析学》按**方法**编（TLC、HPLC、指纹图谱…），回答「怎么测、怎么判」。
  两门课各说各话，读者最难接的一句是：**化学课讲了八类成分，分析课接住了几类？**

做法（只做共现核对，不做方法推断）：
  1. 成分类别取自《中药化学》课程章名（八类 + 多糖鞣质等），作为「要测的对象」；
  2. 在《中药分析学》60 个单元里查类别词是否出现，且同单元内是否出现测定方法词；
  3. 三分类：方法可查 / 仅提名 / 未覆盖。
"""
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHEM = os.path.join(ROOT, 'standards', 'zhongyao-huaxue', 'chapter-map.json')
FENXI = os.path.join(ROOT, 'standards', 'zhongyao-fenxi', 'units.json')
OUT = os.path.join(ROOT, 'standards', 'zhongyao-fenxi', '跨课对账.json')

# 八类成分（与《中药化学》课程章名一一对应）+ 两个补充项
CLASSES = ['生物碱', '黄酮', '萜类', '挥发油', '皂苷', '醌类', '香豆素', '多糖', '鞣质']
# 只认具体技术名；「测定」「检测」这类泛词会把每一节都算进去（首版因此得到 100%，不可用）
METHODS = ['薄层', '液相', '气相', '色谱', '紫外', '质谱', '分光光度', '滴定', '显色反应', '比色']


def main():
    cm = json.load(open(CHEM, encoding='utf-8'))['chapters']
    titles = [v['title'] for v in cm.values()]
    fx = json.load(open(FENXI, encoding='utf-8'))
    units = fx['units']

    def near(text, kw, win=40):
        for m in re.finditer(re.escape(kw), text):
            seg = text[max(0, m.start() - win): m.end() + win]
            if any(k in seg for k in METHODS):
                return True
        return False

    full, mention, missing = [], [], []
    for cls in CLASSES:
        hit = [u for u in units if cls in u['prose']]
        with_m = [u for u in hit if near(u['prose'], cls)]
        if with_m:
            full.append({"成分": cls, "方法": sorted({m for u in with_m for m in METHODS if m in u['prose']}),
                         "单元": [u['sub'] for u in with_m][:3],
                         "化学课章": [t for t in titles if cls in t][:1]})
        elif hit:
            mention.append({"成分": cls, "单元": [u['sub'] for u in hit][:3]})
        else:
            missing.append(cls)

    counts = {"成分类别数": len(CLASSES), "方法可查": len(full), "仅提名": len(mention),
              "未覆盖": len(missing),
              "覆盖率": round(len(full) / len(CLASSES), 3)}
    json.dump({"note": "跨课对账：《中药化学》成分类别 ×《中药分析学》测定方法；邻近判定（±40 字），只做共现核对。",
               "counts": counts, "方法可查": full, "仅提名": mention, "未覆盖": missing},
              open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(f"成分类别 {len(CLASSES)}：方法可查 {len(full)} · 仅提名 {len(mention)} · 未覆盖 {len(missing)}（覆盖率 {counts['覆盖率']}）")
    print('可查：', [x['成分'] for x in full])
    print('仅提名：', [x['成分'] for x in mention])
    print('未覆盖：', missing)


if __name__ == '__main__':
    main()
