#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""scripts/build_biye_instances.py —— 把「通用检查表」做成三套可运行的实例

中药系（20-zhongyao-biye-sheji）、基础医学院（17-jichu-biye-sheji）、骨伤系（17-gushang-biye-sheji）。
每套实例都只做一件事：**用该系真实资产规模，把第 2–4 项算出来**——

  第 2 项 客户数：客群 SAM（公开机构数）× 渗透带中位 → 客户数，并报隐含渗透率
  第 3 项 客单：客单 ÷ 客户营收（或 ≤ IT 预算），判定是否在带内
  第 4 项 敏感性：成本侧（人月单价四档）× 收入侧（客户数四档），并回答「何时出现亏损」

产出：`standards/biye/instances/<dept>.json`，由 `build_biye_checklist.py` 读取后把 2/3/4/7 项升为「齐备」。

单价与固定项与 `预算模型.json`、`成本口径.json` 一致，不另设一套参数。
"""
import json, math, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'standards', 'biye')
INST = os.path.join(OUT, 'instances')

BM = json.load(open(os.path.join(OUT, '预算模型.json'), encoding='utf-8'))
CB = json.load(open(os.path.join(OUT, '成本口径.json'), encoding='utf-8'))
P = BM['params']
FIXED = CB['fixed']
UNITP = CB['unitPrice']

TEMPLATE = [
  {"dept": "02-zhongyao", "course": "20-zhongyao-biye-sheji", "title": "中药系毕设实例",
   "product": "药材—方剂结构化 API（287 味性味归经 ＋ 114 方 836 药位）",
   "asset": "字段", "qty": 1148 + 836, "segs": ["中医类医院", "药企与器械"],
   "price": 30000, "priceAnchor": "客单 3 万 ÷ 医院年营收 9,100 万 = 0.03%；≤ IT 预算（约 91–182 万）的 3.3%",
   "cases": ["中药饮片配伍核账", "集采报量校验", "经典名方药位复用"],
   "productMonths": 8, "maturity": 0.2},
  {"dept": "09-jichu", "course": "17-jichu-biye-sheji", "title": "基础医学院毕设实例",
   "product": "病理／病理生理／生理三套单元层（252 ＋ 216 ＋ 132 单元）",
   "asset": "单元", "qty": 252 + 216 + 132, "segs": ["院校"],
   "price": 32000, "priceAnchor": "无营收锚（院校）：仅作内部一致性检查，与同类 3 万–4 万区间对齐",
   "cases": ["病理图像标注语料", "九轴覆盖度诊断", "正常值表可复现交付"],
   "productMonths": 6, "maturity": 0.2},
  {"dept": "04-gushang", "course": "17-gushang-biye-sheji", "title": "骨伤系毕设实例",
   "product": "骨病单元层（60 单元 / 149,316 字）＋ 四候选轴实测",
   "asset": "单元", "qty": 60, "segs": ["中医类医院"],
   "price": 36000, "priceAnchor": "客单 3.6 万 ÷ 医院年营收 9,100 万 = 0.04%；≤ IT 预算的 4%",
   "cases": ["骨伤专科路径底座", "轴选择留痕报告", "康复量表可复现包"],
   "productMonths": 5, "maturity": 0.2},
]

SAM = {"基层中医馆": (42000, 0.1, 3.0, "S2"), "中医类诊所": (100885, 0.1, 3.0, "S1"),
       "中医类医院": (6498, 1.0, 10.0, "S1"), "院校": (60, 5.0, 40.0, "估计"),
       "药企与器械": (200, 1.0, 15.0, "估计")}
REV = {"中医类医院": (91000000, "S17：5,910.5 亿 ÷ 6,498 家 ≈ 9,100 万/家"), "院校": (None, "未取得")}
CV = P['首年客户系数']
OPEX = P['年运维人月']


def build_cost(qty, typ, product_months=0, price_m=None):
    base = UNITP[typ] if typ in ('检索栈', '量表') else round(qty * UNITP[typ])
    pm = (price_m or P['人月单价']) * product_months
    return base + pm + FIXED['云资源年'] + FIXED['标注'] + FIXED['合规备案']


def run(t, price=None, client_k=1.0):
    price = price if price is not None else t['price']
    seg = t['segs'][0]
    sam, lo, hi, src = SAM[seg]
    mid = (lo + hi) / 2 / 100
    # 成熟度折算：毕设级产物无渠道、无支持体系，渗透按带中位 × maturity
    clients = max(1, round(sam * mid * client_k * t['maturity']))
    c1 = max(1, math.ceil(clients * CV))
    cac_unit = 300 if clients >= 150 else 3000
    build = build_cost(t['qty'], t['asset'], t.get('productMonths', 0), price)
    cac = cac_unit * c1
    opex = OPEX * P['人月单价'] * 2
    rev1 = price * c1
    rev2 = price * min(clients, c1 * 3)
    rev3 = price * clients
    revs = rev1 + rev2 + rev3
    cost3 = build + cac + opex
    payback = round((build + cac) / (rev1 / 12), 1) if rev1 else None
    return {"客户数": clients, "首年客户": c1, "建设": build, "获客": cac, "运维": opex,
            "三年收入": revs, "三年成本": cost3, "三年毛利": revs - cost3,
            "回本中位": payback, "亏损": revs - cost3 < 0,
            "隐含渗透率%": round(clients / sam * 100, 3)}


def main():
    os.makedirs(INST, exist_ok=True)
    summary = []
    for t in TEMPLATE:
        seg = t['segs'][0]
        sam, lo, hi, src = SAM[seg]
        base = run(t)
        # 成本侧：人月单价四档（只影响固定项里的人月部分：这里用「建设＝qty×单价」的结构，故按比例缩放）
        cost_side = []
        for price_m in (15000, 20000, 30000, 40000):
            k = price_m / P['人月单价']
            build_m = build_cost(t['qty'], t['asset'], t.get('productMonths', 0), price_m)
            c1 = base['首年客户']
            cac_unit = 300 if base['客户数'] >= 150 else 3000
            cac = cac_unit * c1
            rev1 = t['price'] * c1
            revs = rev1 + t['price'] * min(base['客户数'], c1 * 3) + t['price'] * base['客户数']
            cost3 = build_m + cac + OPEX * price_m * 2
            cost_side.append({"人月单价": price_m, "建设": build_m, "三年收入": revs,
                              "三年毛利": revs - cost3,
                              "回本": round((build_m + cac) / (rev1 / 12), 1) if rev1 else None,
                              "亏损": revs - cost3 < 0})
        # 收入侧：客户数四档
        rev_side = []
        for k in (0.05, 0.25, 0.5, 1.0, 2.0):
            r = run(t, client_k=k)
            rev_side.append({"客户数系数": k, "客户数": r['客户数'], "三年收入": r['三年收入'],
                             "三年毛利": r['三年毛利'], "回本": r['回本中位'], "亏损": r['亏损']})
        rev, revsrc = REV.get(seg, (None, "未取得"))
        share = round(t['price'] / rev * 100, 4) if rev else None
        data = {"dept": t['dept'], "course": t['course'], "title": t['title'],
                "product": t['product'], "cases": t['cases'],
                "item2": {"客群": seg, "SAM": sam, "SAM来源": src, "渗透带%": [lo, hi],
                          "带中位%": round((lo + hi) / 2, 2), "客户数": base['客户数'],
                          "隐含渗透率%": base['隐含渗透率%'],
                          "判定": "合理" if lo <= base['隐含渗透率%'] <= hi else "越界"},
                "item3": {"客单": t['price'], "锚": t['priceAnchor'], "客群年营收": rev,
                          "营收锚来源": revsrc, "客单占营收%": share,
                          "判定": "带内" if (share is None or share <= 5.0) else "超带"},
                "item4": {"成本侧": cost_side, "收入侧": rev_side,
                          "首次转亏的客户数系数": next((x['客户数系数'] for x in rev_side if x['亏损']), None)},
                "base": base,
                "assumptions": {"成熟度系数": t['maturity'], "产品化人月": t.get('productMonths', 0),
                                "说明": "成熟度系数把渗透带中位折算为毕设级产物的现实份额（0.2）；产品化人月含界面／部署／支持，先前未计。"},
                "复算": "python scripts/build_biye_instances.py && python scripts/build_biye_checklist.py --check"}
        json.dump(data, open(os.path.join(INST, f"{t['dept']}.json"), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        summary.append((t['dept'], base['客户数'], base['隐含渗透率%'], t['price'],
                        base['三年收入'], base['回本中位'], data['item4']['首次转亏的客户数系数']))

    print("院系          客户数  渗透率%   客单   三年收入   回本(月)  首次转亏系数")
    for dept, n, pen, price, revs, pb, loss in summary:
        print(f"{dept:12s} {n:>6,} {pen:>8} {price:>7,} {revs:>10,} {str(pb):>8} {str(loss):>10}")


if __name__ == '__main__':
    main()
