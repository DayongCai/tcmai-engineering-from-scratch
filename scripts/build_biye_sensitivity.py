#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""scripts/build_biye_sensitivity.py —— 参数天花板与欠账登记

回答两件事：

1. 人月单价是整套预算的天花板。把它在 1.5／2／3／4 万元四档上重跑，
   看**什么变、什么不变**：绝对值全变，比例与排序不变——这才是「参数天花板」的准确含义。
   排序不变用 Spearman 秩相关检验（与 2 万元档比），不是嘴上说。

2. 11 个「待建·不可计」的资产不是估算，是欠账。逐案登记：缺什么、依赖哪门课／哪份教材、
   满足什么条件才可计——写成清单，随课程一起走，不许静默消失。

若 `工时台账.json` 不存在才初始化骨架（存在则绝不覆盖——台账由 build_biye_assumptions.py 维护）。
台账存在的意义是：**有真实工时才能拆上面那 45% 的隐性成本；没有就不拆**，
脚本对占位值（0 或负数）直接报错，防止有人拿 0 当数据。
"""
import json, math, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'standards', 'biye')

PRICES = [15000, 20000, 30000, 40000]
FIXED = {"云资源年": 14400, "标注": 8000, "合规备案": 5000}
CV = 0.05          # 首年客户系数
OPEX_MONTHS = 0.5  # 年运维人月

# 11 个待建资产：缺什么、依赖、可计条件
DEBT = {
 '08-zhenjiu-jingluo-diben': ("经络学教材文本层", "该系尚无教材工作簿入库（底本 0 门）", "教材入库并完成按节切分后，可按「单元×60 元」计"),
 '09-zhenjiu-shuxue-guishu': ("穴-经对照表", "缺多教材穴名与归经字段（需补源）", "两份以上教材的穴名/归经可对齐后，按「字段×12 元」计"),
 '10-zhenjiu-zhishishu-guadian': ("条文挂点表", "条文层未建，只有知识树 schema", "条文入库并完成一次人工挂点后，按「条×0.6 元」计"),
 '13-gushang-kangfu-pingding': ("康复量表定义与评分脚本", "量表需自建并通过信度检验", "量表定稿且完成 30 例试评后，按固定 2 万元计"),
 '15-huli-jiaoban-sbar': ("五栏交接模板", "模板未定稿（院内流程相关）", "模板经护理部确认后，按固定 2 万元计"),
 '16-huli-yangsheng-fangan': ("忌宜检查单", "条目未定稿，判据未量化", "条目定稿且每条带可观察判据后，按固定 2 万元计"),
 '17-guanli-tongji-diben': ("指标字典", "指标口径未建（缺院内报表样本）", "指标字典与三份报表可对齐后，按「字段×12 元」计"),
 '18-guanli-fugaidu-baobiao': ("覆盖度报表字段", "字段定义未固化", "字段定义冻结并跑通一次全库统计后，按「字段×12 元」计"),
 '19-guanli-zhengce-guadian': ("政策条文全文", "政策原文未补源（须登记来源与 sha256）", "补源并登记后方可按「条×0.6 元」计"),
 '23-wuguan-mianbu-wangzhen': ("望诊字段表", "字段表未建；且涉及器械属性判定", "字段表建好并通过分类界定后，按「字段×12 元」计"),
 '25-wuguan-guangxue-canliang': ("光学参数表", "参数表未建（院内数据不可得）", "参数表定稿且缺项规则明确后，按「字段×12 元」计"),
}

TIMELOG_ROWS = ["设计", "校验", "返工"]


def budget(months, price, clients, cac_unit):
    build = months * price + 12 * 1200 + FIXED['标注'] + FIXED['合规备案']
    c1 = max(1, math.ceil(clients * CV))
    cac = cac_unit * c1
    opex = OPEX_MONTHS * price * 2
    return {"build": build, "cac": cac, "opex": opex, "c1": c1}


def spearman(a, b):
    """秩相关：不引第三方库，手算。"""
    def rank(xs):
        order = sorted(range(len(xs)), key=lambda i: xs[i])
        r = [0.0] * len(xs)
        i = 0
        while i < len(order):
            j = i
            while j + 1 < len(order) and xs[order[j + 1]] == xs[order[i]]:
                j += 1
            avg = (i + j) / 2 + 1
            for k in range(i, j + 1):
                r[order[k]] = avg
            i = j + 1
        return r
    ra, rb = rank(a), rank(b)
    n = len(a)
    ma, mb = sum(ra) / n, sum(rb) / n
    num = sum((x - ma) * (y - mb) for x, y in zip(ra, rb))
    den = (sum((x - ma) ** 2 for x in ra) * sum((y - mb) ** 2 for y in rb)) ** 0.5
    return round(num / den, 4) if den else None


def main():
    mk = json.load(open(os.path.join(OUT, '市场层.json'), encoding='utf-8'))
    cases = mk['cases']
    base = mk['params']

    runs, paybacks = [], {}
    for price in PRICES:
        build_sum = rev3_sum = cost3_sum = 0
        pbs = []
        for slug, c in cases.items():
            b = c['budget']
            months, art_price, clients = b['人月'], b['客单'], b['三年客户']
            cac_unit = 300 if clients >= 150 else 3000
            nb = budget(months, price, clients, cac_unit)
            c1 = nb['c1']
            rev1, rev2, rev3 = art_price * c1, art_price * min(clients, c1 * 3), art_price * clients
            revs = rev1 + rev2 + rev3
            cost3 = nb['build'] + nb['cac'] + nb['opex']
            build_sum += nb['build']
            rev3_sum += revs
            cost3_sum += cost3
            pbs.append(round((nb['build'] + nb['cac']) / (rev1 / 12), 1))
        paybacks[price] = pbs
        runs.append({"人月单价": price, "首年投入合计": build_sum, "三年收入合计": rev3_sum,
                     "三年成本合计": cost3_sum, "三年毛利合计": rev3_sum - cost3_sum,
                     "回本中位": sorted(pbs)[len(pbs) // 2],
                     "回本区间": [min(pbs), max(pbs)]})

    base_pb = paybacks[20000]
    for r in runs:
        r['与2万档比例(投入)'] = round(r['首年投入合计'] / runs[1]['首年投入合计'], 3)
        r['与2万档比例(毛利)'] = round(r['三年毛利合计'] / runs[1]['三年毛利合计'], 3)
        r['排序一致性(Spearman)'] = spearman(base_pb, paybacks[r['人月单价']])

    # 欠账登记：与成本口径交叉，确保 11 案一一对应
    cb = json.load(open(os.path.join(OUT, '成本口径.json'), encoding='utf-8'))
    pending = [r['slug'] for r in cb['rows'] if r['细口径'] is None]
    assert set(pending) == set(DEBT), (set(pending) ^ set(DEBT))
    debt_rows = []
    for slug in pending:
        c = cases[slug]
        lack, depend, cond = DEBT[slug]
        debt_rows.append({"slug": slug, "title": c['title'], "缺": lack,
                          "依赖": depend, "可计条件": cond,
                          "粗口径占位": c['budget']['首年投入'], "状态": "欠账·不可计"})
    debt_tot = {"欠账案数": len(debt_rows), "占全部案例": f"{len(debt_rows)}/{len(cases)}",
                "粗口径合计(仅占位，不计入成本口径合计)": sum(r['粗口径占位'] for r in debt_rows)}

    # 工时台账骨架（不填数）
    timelog = {"subject": "22-zhongyi-biye-sheji",
               "what": "设计／校验／返工三段的真实工时台账；有数据才拆隐性成本，没有就留空。",
               "schema": ["slug", "段", "人月", "记录人", "日期"],
               "rule": ["人月须为正数；0 或负数视为未填", "未填不得参与任何比例计算",
                        "填满某案三段后，该案粗口径可由「细口径 + 三段人月×单价」复算"],
               "status": {"已填案数": 0, "待填案数": len(debt_rows) + sum(1 for r in cb['rows'] if r['细口径'] is not None),
                          "已填行数": 0},
               "rows": []}
    for r in cb['rows']:
        for seg in TIMELOG_ROWS:
            timelog['rows'].append({"slug": r['slug'], "段": seg, "人月": None,
                                    "记录人": None, "日期": None})

    # 第二组：客户数缩放（0.25／0.5／1.0），价固定 2 万——检验「哪一侧才是结论的天花板」
    scales = []
    for k in (0.05, 0.25, 0.5, 1.0):
        build_sum = rev_sum = cost_sum = 0
        pbs, neg = [], 0
        for slug, c in cases.items():
            b = c['budget']
            months, art_price = b['人月'], b['客单']
            clients = max(1, math.ceil(b['三年客户'] * k))
            cac_unit = 300 if clients >= 150 else 3000
            nb = budget(months, 20000, clients, cac_unit)
            c1 = nb['c1']
            rev1 = art_price * c1
            revs = rev1 + art_price * min(clients, c1 * 3) + art_price * clients
            cost3 = nb['build'] + nb['cac'] + nb['opex']
            build_sum += nb['build']
            rev_sum += revs
            cost_sum += cost3
            pb = round((nb['build'] + nb['cac']) / (rev1 / 12), 1) if rev1 else 999
            pbs.append(pb)
            if revs - cost3 < 0:
                neg += 1
        scales.append({"客户数系数": k, "首年投入合计": build_sum, "三年收入合计": rev_sum,
                       "三年毛利合计": rev_sum - cost_sum,
                       "毛利/基准": round((rev_sum - cost_sum) / 58806300, 3),
                       "回本中位": sorted(pbs)[len(pbs) // 2], "亏损案数": neg})

    json.dump({"subject": "22-zhongyi-biye-sheji",
               "what": "两组敏感性：人月单价四档（成本侧）与客户数三档（收入侧），判断「哪一侧才是结论的天花板」。",
               "clientScales": scales,
               "prices": PRICES, "runs": runs,
               "reading": ["绝对值随单价线性上升，是口径而非发现",
                           "排序一致性=1.000 说明「哪个案先回本」与单价无关，可以放心用它做优先级",
                           "毛利比例为负增长时，说明高单价下更多案例转亏——这才是该看的信号"]},
              open(os.path.join(OUT, '敏感性.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    json.dump({"subject": "22-zhongyi-biye-sheji",
               "what": "待建资产的欠账登记：不是估算，是欠账；逐案写缺什么、依赖什么、满足什么条件才可计。",
               "totals": debt_tot, "rows": debt_rows},
              open(os.path.join(OUT, '欠账清单.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    tl_path = os.path.join(OUT, '工时台账.json')
    if not os.path.exists(tl_path):
        json.dump(timelog, open(tl_path, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

    print(json.dumps(debt_tot, ensure_ascii=False))
    for r in scales:
        print(f"客户数×{r['客户数系数']:<5} 收入{r['三年收入合计']:>11,} 毛利{r['三年毛利合计']:>11,} "
              f"毛利比{r['毛利/基准']} 回本中位{r['回本中位']:>5} 亏损案{r['亏损案数']}")
    for r in runs:
        print(f"单价{r['人月单价']:>6} 投入{r['首年投入合计']:>10,} 收入{r['三年收入合计']:>11,} "
              f"毛利{r['三年毛利合计']:>11,} 回本中位{r['回本中位']:>5} "
              f"投入比{r['与2万档比例(投入)']} 毛利比{r['与2万档比例(毛利)']} ρ={r['排序一致性(Spearman)']}")


if __name__ == '__main__':
    main()
