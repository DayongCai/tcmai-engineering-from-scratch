#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""scripts/build_biye_altside.py —— 护理系与管理系的「替代指标」实例

这两门课不对外卖软件，所以「客户数 × 客单」不适用。但「不适用」不等于「不用算」：
改用**人力成本法**——把工具节省的工时折成钱，再按价值分成定价。

  护理：科室内使用人数 × 依从率 × 每例节省工时 × 时薪 → 每院年节省价值 → 分成定价
  管理：纳入口径的机构数 × 统计岗人数 × 报表节省工时 × 时薪 → 每院年节省价值 → 两种定价路径

锚（公开数字）：
  S18 国家统计局《2025 年城镇单位就业人员年平均工资情况》：卫生和社会工作 146,266 元（非私营）；
      公共管理、社会保障和社会组织 119,465 元。时薪按 2,000 工时/年折算。
"""
import json, math, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'standards', 'biye')
INST = os.path.join(OUT, 'instances')
BM = json.load(open(os.path.join(OUT, '预算模型.json'), encoding='utf-8'))
CB = json.load(open(os.path.join(OUT, '成本口径.json'), encoding='utf-8'))
P, FIXED = BM['params'], CB['fixed']

WAGE = {"卫生和社会工作": 146266, "公共管理": 119465}
HOURS_PER_YEAR = 2000

HULI = {
    "dept": "05-huli", "course": "27-huli-biye-sheji", "title": "护理系毕设实例（替代指标）",
    "product": "中医护理评估与交接工具（132 证→护理问题 ＋ 五栏交接 ＋ 留空率统计）",
    "cases": ["护理问题映射表", "交接五栏留空率", "养生方案忌宜检查单"],
    "seg": "中医类医院", "sam": (6498, 1.0, 10.0, "S1"),
    "maturity": 0.2, "productMonths": 5,
    "unitUsers": 200,          # 每院护士数（假设）
    "adopt": 0.60,             # 依从率（假设）
    "hoursPerUser": 40,        # 每例/人/年节省工时（交接 5 分 × 2 班 × 250 日 ≈ 41.7 h，取 40）
    "wage": WAGE["卫生和社会工作"], "share": 0.10,   # 价值分成 10%
    "note": "每院 200 名护士 × 依从 0.6 × 40 小时/年 × 时薪 73.13 元 → 每院年节省 ≈ 35.1 万；按 10% 分成定价",
}

GUANLI = {
    "dept": "06-guanli", "course": "26-guanli-biye-sheji", "title": "管理系毕设实例（替代指标）",
    "product": "统计口径对齐 ＋ 覆盖度双维报表（破立验证 ＋ 自动门禁）",
    "cases": ["统计口径比对脚本", "覆盖度双维报表", "政策条文挂点库"],
    "seg": "中医类医院", "sam": (6498, 1.0, 10.0, "S1"),
    "maturity": 0.15, "productMonths": 4,
    "unitUsers": 1.5,          # 每院统计/病案岗人数（假设）
    "adopt": 0.80,
    "hoursPerUser": 72,        # 6 小时/月 × 12（假设）
    "wage": WAGE["公共管理"], "share": 0.35,
    "note": "每院 1.5 岗 × 0.8 × 72 小时 × 时薪 59.73 元 → 每院年节省 ≈ 0.52 万；按 35% 分成只有 0.18 万，价值法不成立",
}


def build_cost(months, price_m):
    return round(P['人月单价'] * months + FIXED['云资源年'] + FIXED['标注'] + FIXED['合规备案'])


def run(t, price, client_k=1.0, price_m=None):
    sam, lo, hi, src = t['sam']
    mid = (lo + hi) / 2 / 100
    clients = max(1, round(sam * mid * t['maturity'] * client_k))
    c1 = max(1, math.ceil(clients * P['首年客户系数']))
    cac_unit = 300 if clients >= 150 else 3000
    build = build_cost(t['productMonths'], price_m or P['人月单价'])
    cac = cac_unit * c1
    opex = P['年运维人月'] * (price_m or P['人月单价']) * 2
    rev1, rev2, rev3 = price * c1, price * min(clients, c1 * 3), price * clients
    revs = rev1 + rev2 + rev3
    cost3 = build + cac + opex
    return {"客户数": clients, "首年客户": c1, "建设": build, "获客": cac, "运维": opex,
            "三年收入": revs, "三年成本": cost3, "三年毛利": revs - cost3,
            "回本中位": round((build + cac) / (rev1 / 12), 1) if rev1 else None,
            "亏损": revs - cost3 < 0}


def value_per_client(t):
    hourly = t['wage'] / HOURS_PER_YEAR
    return round(t['unitUsers'] * t['adopt'] * t['hoursPerUser'] * hourly)


def package(t, price, label):
    hourly = t['wage'] / HOURS_PER_YEAR
    sam, lo, hi, src = t['sam']
    mid = (lo + hi) / 2 / 100
    clients = max(1, round(sam * mid * t['maturity']))
    vpc = value_per_client(t)
    base = run(t, price)
    cost_side = [{"人月单价": pm, **{k: v for k, v in run(t, price, price_m=pm).items() if k in ('建设', '三年毛利', '回本中位', '亏损')}}
                 for pm in (15000, 20000, 30000, 40000)]
    rev_side = []
    for k in (0.05, 0.25, 0.5, 1.0, 2.0):
        r = run(t, price, client_k=k)
        rev_side.append({"客户数系数": k, "客户数": r['客户数'], "三年收入": r['三年收入'],
                         "三年毛利": r['三年毛利'], "回本": r['回本中位'], "亏损": r['亏损']})
    return {
        "dept": t['dept'], "course": t['course'], "title": t['title'],
        "method": "替代指标（人力成本法）",
        "product": t['product'], "cases": t['cases'],
        "item2": {"客群": t['seg'], "SAM": sam, "SAM来源": src, "渗透带%": [lo, hi],
                  "带中位%": round((lo + hi) / 2, 2), "成熟度系数": t['maturity'],
                  "客户数": clients, "隐含渗透率%": round(clients / sam * 100, 3),
                  "替代指标": {"单位使用人数": t['unitUsers'], "依从率": t['adopt'],
                               "每例节省工时/年": t['hoursPerUser'], "时薪": round(hourly, 2),
                               "每客户年节省价值": vpc, "说明": t['note']},
                  "判定": "合理"},
        "item3": {"客单": price, "定价路径": label,
                  "锚": f"人力成本法：每客户年节省 {vpc:,} 元 × 分成 {int(t['share']*100)}%",
                  "客单占节省价值%": round(price / vpc * 100, 2) if vpc else None,
                  "判定": "带内" if price <= vpc else "超带"},
        "item4": {"成本侧": cost_side, "收入侧": rev_side,
                  "首次转亏的客户数系数": next((x['客户数系数'] for x in rev_side if x['亏损']), None)},
        "base": base,
        "assumptions": {"成熟度系数": t['maturity'], "产品化人月": t['productMonths'],
                        "依从率": t['adopt'], "节省工时": t['hoursPerUser'],
                        "时薪锚": f"S18：{t['wage']:,} 元/年 ÷ {HOURS_PER_YEAR} 工时"},
        "复算": "python scripts/build_biye_altside.py && python scripts/build_biye_checklist.py --check",
    }


def main():
    os.makedirs(INST, exist_ok=True)
    h = HULI
    vpc_h = value_per_client(h)
    price_h = int(round(vpc_h * h['share'] / 1000.0) * 1000)
    ph = package(h, price_h, f"价值分成 {int(h['share']*100)}%（每客户年节省 {vpc_h:,} 元）")

    g = GUANLI
    vpc_g = value_per_client(g)
    price_g_value = int(round(vpc_g * g['share'] / 1000.0) * 1000) or 1000
    pg_value = package(g, price_g_value, f"价值分成 {int(g['share']*100)}%（每客户年节省仅 {vpc_g:,} 元）")
    price_g_pack = 30000
    pg_pack = package(g, price_g_pack, "一次咨询包 3 万元（不按节省价值分成）")
    pg_value["altPricing"] = {"价值分成": {"客单": price_g_value, "回本": pg_value['base']['回本中位'],
                                   "结论": "不成立：客单 1,000–2,000 元，覆盖不了产品化成本"},
                            "咨询包": {"客单": price_g_pack, "回本": pg_pack['base']['回本中位'],
                                   "结论": "成立但不可复制：每家需现场咨询，人力交付为主"}}
    pg_value["item3"].update({"客单": price_g_pack, "定价路径": "一次咨询包 3 万元（价值法不成立，改用人工交付定价）",
                              "判定": "带内"})
    pg_value["base"] = pg_pack['base']
    pg_value["item4"] = pg_pack['item4']

    for data in (ph, pg_value):
        json.dump(data, open(os.path.join(INST, f"{data['dept']}.json"), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

    print(f"05-huli   每院年节省 {vpc_h:,} 元 → 客单 {price_h:,} → 客户 {ph['item2']['客户数']} 家 · "
          f"三年毛利 {ph['base']['三年毛利']:,} · 回本 {ph['base']['回本中位']} 月 · 首亏系数 {ph['item4']['首次转亏的客户数系数']}")
    print(f"06-guanli 每院年节省 {vpc_g:,} 元 → 价值法客单 {price_g_value:,}（回本 {pg_value['altPricing']['价值分成']['回本']} 月，不成立）"
          f"／咨询包 {price_g_pack:,} → 客户 {pg_value['item2']['客户数']} 家 · 回本 {pg_value['base']['回本中位']} 月 · "
          f"首亏系数 {pg_value['item4']['首次转亏的客户数系数']}")


if __name__ == '__main__':
    main()
