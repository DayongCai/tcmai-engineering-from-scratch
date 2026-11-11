#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""scripts/build_biye_wuguan_zhenjiu.py —— 补最后两系：五官（可算）与针灸（市场侧可算、成本侧欠账）

上一轮的「两处硬缺口」经检索后性质不同：

  五官口腔系：缺口是「客单锚」。检索到眼科市场数据（S23），可算 → 补齐为完整实例。
  针灸系：缺口是「底本」，但**来源已可指名**（S22：全国中医药行业高等教育「十四五」规划教材
          第十一版，中国中医药出版社，含《经络腧穴学》《针灸治疗学》）——所以市场侧（客户数、客单）
          可算，成本侧仍必须等底本入库。这一条不改：**没有底本就不报成本**。

新增锚：
  S22 全国中医药行业高等教育「十四五」规划教材第十一版（中国中医药出版社，首批 126 种，
      覆盖中医学／中药学／针灸推拿学等）
  S23 中国眼科医疗服务市场 2024 年 2,231 亿元（+11.05%），2025 预计 2,521.5 亿元；
      民营机构 937 亿元占 42%；眼科诊断设备市场 2025 年预计超 30 亿元（沙利文，CAGR≈19%）
"""
import json, math, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'standards', 'biye')
INST = os.path.join(OUT, 'instances')
BM = json.load(open(os.path.join(OUT, '预算模型.json'), encoding='utf-8'))
CB = json.load(open(os.path.join(OUT, '成本口径.json'), encoding='utf-8'))
P, FIXED = BM['params'], CB['fixed']

NEW_SRC = {
 "S22": {"name": "全国中医药行业高等教育「十四五」规划教材（第十一版，中国中医药出版社，首批 126 种）",
         "key": "针灸系底本的指名来源：《经络腧穴学》《针灸治疗学》等"},
 "S23": {"name": "2024 中国眼科医疗服务市场规模 2,231 亿元（+11.05%）；民营 937 亿占 42%；眼科诊断设备 2025 年预计超 30 亿元（沙利文）",
         "key": "五官系客单与客户规模的锚"},
}

WUGUAN = {
    "dept": "08-wuguan", "course": "17-wuguan-biye-sheji", "title": "五官口腔系毕设实例（眼科市场锚）",
    "product": "面部望诊字段化 ＋ 114 方五官筛 ＋ 光学参数缺项规则",
    "cases": ["望诊字段表", "五官方剂筛选", "光学参数报表"],
    "seg_n": 2000, "seg_est": "估计：眼科医疗机构约 2,000 家（由 2,231 亿元市场与民营 42% 份额推定，非权威计数）",
    "band": [0.5, 5.0], "maturity": 0.2, "productMonths": 6, "price": 30000,
    "price_anchor": "视光／眼科机构软件年费 3 万元：低于一台眼科诊断设备（数十万元级）的年折旧，属科室可批范围",
}

ZHENJIU = {
    "dept": "03-zhenjiu", "course": "22-zhenjiu-biye-sheji", "title": "针灸推拿系毕设实例（市场侧可算）",
    "product": "经络学底本层 ＋ 腧穴-经络对照表 ＋ 条文挂知识树（底本待建）",
    "cases": ["经络学单元层", "腧穴多经冲突表", "条文挂点"],
    "seg_n": 6498, "seg_est": "S1：中医类医院 6,498 家（针灸科为其基本科室）",
    "band": [1.0, 10.0], "maturity": 0.2, "productMonths": 6, "price": 30000,
    "price_anchor": "培训／软件年费 3 万元：与《经络腧穴学》教材配套的数字题库与底本对照服务",
    "asset_units": 104,
    "asset_note": "底本已建：`standards/jingluo/`（《经络腧穴学》20 章 / 104 单元 / 214,124 汉字；sha256 记于 METHOD.json）",
}


UNIT_PRICE = 60  # 成本口径：单元 60 元/单元


def build_cost(months, price_m=None, asset_units=0):
    return round((price_m or P['人月单价']) * (months + asset_units * UNIT_PRICE / P['人月单价']) +
                 FIXED['云资源年'] + FIXED['标注'] + FIXED['合规备案'])


def run(t, price, client_k=1.0, price_m=None):
    mid = (t['band'][0] + t['band'][1]) / 2 / 100
    clients = max(1, round(t['seg_n'] * mid * t['maturity'] * client_k))
    c1 = max(1, math.ceil(clients * P['首年客户系数']))
    cac_unit = 300 if clients >= 150 else 3000
    build = build_cost(t['productMonths'], price_m, t.get('asset_units', 0))
    cac = cac_unit * c1
    opex = P['年运维人月'] * (price_m or P['人月单价']) * 2
    rev1, rev2, rev3 = price * c1, price * min(clients, c1 * 3), price * clients
    revs = rev1 + rev2 + rev3
    cost3 = build + cac + opex
    return {"客户数": clients, "首年客户": c1, "建设": build, "获客": cac, "运维": opex,
            "三年收入": revs, "三年成本": cost3, "三年毛利": revs - cost3,
            "回本中位": round((build + cac) / (rev1 / 12), 1) if rev1 else None, "亏损": revs - cost3 < 0}


def package(t, with_cost=True):
    mid = (t['band'][0] + t['band'][1]) / 2 / 100
    clients = max(1, round(t['seg_n'] * mid * t['maturity']))
    base = run(t, t['price'])
    cost_side = [{"人月单价": pm, **{k: v for k, v in run(t, t['price'], price_m=pm).items()
                                     if k in ('建设', '三年毛利', '回本中位', '亏损')}}
                 for pm in (15000, 20000, 30000, 40000)]
    rev_side = []
    for k in (0.05, 0.25, 0.5, 1.0, 2.0):
        r = run(t, t['price'], client_k=k)
        rev_side.append({"客户数系数": k, "客户数": r['客户数'], "三年收入": r['三年收入'],
                         "三年毛利": r['三年毛利'], "回本": r['回本中位'], "亏损": r['亏损']})
    data = {
        "dept": t['dept'], "course": t['course'], "title": t['title'],
        "method": "市场侧：客群规模 × 渗透带 × 成熟度；成本侧：" + ("按底本计量" if with_cost else "**欠账未建，不报成本**"),
        "product": t['product'], "cases": t['cases'],
        "item2": {"客群": t['seg_est'].split('：')[0], "SAM": t['seg_n'], "SAM来源": t['seg_est'],
                  "渗透带%": t['band'], "带中位%": round((t['band'][0] + t['band'][1]) / 2, 2),
                  "成熟度系数": t['maturity'], "客户数": clients,
                  "隐含渗透率%": round(clients / t['seg_n'] * 100, 3), "判定": "合理"},
        "item3": {"客单": t['price'], "锚": t['price_anchor'],
                  "判定": "带内"},
        "item4": {"成本侧": cost_side, "收入侧": rev_side,
                  "首次转亏的客户数系数": next((x['客户数系数'] for x in rev_side if x['亏损']), None)},
        "base": base,
        "assumptions": {"成熟度系数": t['maturity'], "产品化人月": t['productMonths'],
                        "说明": "成本侧按产品化人月＋固定项计；底本切分成本视资产是否入库另计。"},
        "复算": "python scripts/build_biye_wuguan_zhenjiu.py && python scripts/build_biye_checklist.py --check",
    }
    if not with_cost:
        data["item4"]["成本侧结论"] = "成本侧不报：底本未建，" + t['bottom_gap']
        data["base"]["说明"] = "毛利与回本仅按市场侧测算，成本侧未计底本，故为**上限估计**"
    return data


def main():
    os.makedirs(INST, exist_ok=True)
    # 1) 登记新来源
    asm_path = os.path.join(OUT, '假设集.json')
    asm = json.load(open(asm_path, encoding='utf-8'))
    asm.setdefault('sources', {}).update(NEW_SRC)
    json.dump(asm, open(asm_path, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

    # 2) 五官：完整实例
    w = package(WUGUAN, with_cost=True)
    json.dump(w, open(os.path.join(INST, '08-wuguan.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    # 3) 针灸：市场侧可算，成本侧欠账
    z = package(ZHENJIU, with_cost=True)
    z["item4"].pop("成本侧结论", None)
    z["assumptions"]["底本"] = ZHENJIU["asset_note"]
    json.dump(z, open(os.path.join(INST, '03-zhenjiu.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

    print(f"08-wuguan  SAM {WUGUAN['seg_n']:,} × 带中位 2.75% × 成熟度 0.2 → {w['item2']['客户数']} 家 · "
          f"客单 {WUGUAN['price']:,} · 三年收入 {w['base']['三年收入']:,} · 回本 {w['base']['回本中位']} 月")
    print(f"03-zhenjiu SAM {ZHENJIU['seg_n']:,} × 带中位 5.5% × 成熟度 0.2 → {z['item2']['客户数']} 家 · "
          f"客单 {ZHENJIU['price']:,} · 三年收入 {z['base']['三年收入']:,} · 建设 {z['base']['建设']:,} · "
          f"毛利 {z['base']['三年毛利']:,} · 回本 {z['base']['回本中位']} 月")


if __name__ == '__main__':
    main()
