#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""scripts/crosscheck_paozhi.py —— 跨课对账：《中药毒理学》的「减毒结论」×《中药炮制学》的「减毒工艺」

为什么做这一层：
  毒理课（派生自《中药学》）里，「有毒/小毒/大毒」是对**药**的判定；
  炮制课里，「炒炭/酒炙/煅淬/复制」是对**操作**的描述。
  两门课各自都完整，但读者最容易问的一句是——**教材说它有毒，那它怎么减的毒？**

做法（不做语义推断，只做共现核对）：
  1. 取《中药学》药物库里标注了毒性（大毒/有毒/小毒）的药名，作为「有减毒结论」集合；
  2. 在《中药炮制学》48 个单元里查这些药名是否出现，且同单元内是否出现炮制方法词；
  3. 三分类：
     工艺可查 —— 药名与方法词同单元出现（可指到具体操作）
     仅提名   —— 药名出现但同单元没有方法词
     未覆盖   —— 炮制课里根本没提这味药
  4. 反向再查一次：炮制课里出现方法词但教材没标毒性的药，记为「不是为减毒而制」——避免把炮制一律读成减毒。
"""
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
YAO = os.path.join(ROOT, 'standards', 'zhongyao-xue', '药物库.json')
PZ = os.path.join(ROOT, 'standards', 'zhongyao-paozhi', 'units.json')
OUT = os.path.join(ROOT, 'standards', 'zhongyao-paozhi', '跨课对账.json')

TOX = ('大毒', '有毒', '小毒')
METHODS = ['炒', '炙', '煅', '蒸', '煮', '燀', '复制', '发酵', '发芽', '煨', '燀', '制霜', '提净',
           '酒', '醋', '蜜', '盐水', '姜汁', '甘草', '黑豆', '麦麸', '滑石粉', '砂', '土']


def main():
    drugs = json.load(open(YAO, encoding='utf-8'))['drugs']
    pz = json.load(open(PZ, encoding='utf-8'))
    units = pz['units']

    toxic = []
    for d in drugs:
        blob = f"{d.get('性味归经', '')}{d.get('功效', '')}{d.get('使用注意', '')}"
        name = d['药名']
        # 只要真药：总论的单元标题（如「3.2.2 采收方法」）不是药名，用「有性味归经或无数字前缀」筛掉
        if not name or not re.fullmatch(r'[一-鿿]{2,6}', name):
            continue
        if any(t in blob for t in TOX):
            toxic.append(name)
    toxic = sorted(set(toxic))

    def near(text, name, win=40):
        """药名 ±win 字内是否出现方法词——比「同单元出现」严，避免用单字把整节都算进去。"""
        for m in re.finditer(re.escape(name), text):
            seg = text[max(0, m.start() - win): m.end() + win]
            if any(k in seg for k in METHODS):
                return True
        return False

    full, mention, missing = [], [], []
    for name in toxic:
        hit = [u for u in units if name in u['prose']]
        with_m = [u for u in hit if near(u['prose'], name)]
        if with_m:
            full.append({"药名": name,
                         "操作": sorted({m for u in with_m for m in METHODS if m in u['prose']}),
                         "单元": [u['sub'] for u in with_m][:3]})
        elif hit:
            mention.append({"药名": name, "单元": [u['sub'] for u in hit][:3]})
        else:
            missing.append(name)

    # 反向：炮制课里出现、但教材没标毒性的药（取药物库全部药名做对照）
    all_names = {d['药名'] for d in drugs if d['药名'] and len(d['药名']) >= 2}
    toxic_set = set(toxic)
    nontoxic_hit = sorted({n for n in all_names - toxic_set
                           if any(n in u['prose'] for u in units)})

    loose = len([n for n in toxic if any(n in u['prose'] and any(m in u['prose'] for m in METHODS) for u in units)])
    counts = {
        "宽松判定(同单元)": loose,
        "严格判定(±40 字)": len(full),
        "毒性药数": len(toxic),
        "工艺可查": len(full),
        "仅提名": len(mention),
        "未覆盖": len(missing),
        "炮制课提及但未标毒性的药": len(nontoxic_hit),
        "覆盖率(工艺可查/毒性药)": round(len(full) / len(toxic), 3) if toxic else None,
    }
    json.dump({"note": "跨课对账：毒理课（《中药学》毒性标注）× 炮制课（《中药炮制学》工艺）。只做共现核对，不做语义推断。",
               "counts": counts, "工艺可查": full, "仅提名": mention, "未覆盖": missing,
               "炮制课提及但未标毒性的药": nontoxic_hit[:40]},
              open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

    print(f"毒性药 {counts['毒性药数']} 味：工艺可查 {counts['工艺可查']} · 仅提名 {counts['仅提名']} · 未覆盖 {counts['未覆盖']}"
          f"（覆盖率 {counts['覆盖率(工艺可查/毒性药)']}）")
    print('工艺可查样例：', [x['药名'] for x in full[:12]])
    print('仅提名样例：', [x['药名'] for x in mention[:12]])
    print('未覆盖样例：', missing[:12])


if __name__ == '__main__':
    main()
