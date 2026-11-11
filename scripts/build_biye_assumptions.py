#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""scripts/build_biye_assumptions.py —— 把「假设」写成可验证的假设

上一轮承认：客户数是假设、客单是假设、工时没有。用户要求「假设条件下做完」。
做法不是把假设当真，而是**给每个假设配一个可核的锚与一条判据**：

  客户数  ← 服务市场规模 SAM（S1／S2 的机构数）× 渗透率；判据：隐含渗透率是否落在该客群合理带内
  客单    ← 与客户年营收或 IT 预算的占比；判据：软件支出占营收 0.1%–5%（CHIMA：三级医院 IT 预算占 1%–2%）
  工时    ← 三段比例假设（设计 40%／校验 35%／返工 25%）；判据：**标注「假设·未实测」，不得冒充实测**

来源（新增）：
  S16 《2023-2024 年度中国医院信息化状况调查报告》（CHIMA）：三级医院信息化投入预算占总预算 1%–2% 的比例最高（19.51%），其次 0.5%–1%
  S17 国家中医药管理局《2021 年全国中医医疗机构收入支出情况》：中医类医院总收入 5,910.5 亿元；中医类门诊部 128.6 亿元
"""
import json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'standards', 'biye')

# 客群 SAM（来自公开数字或明确标注为估计）
SAM = {
 "基层中医馆": {"n": 42000, "src": "S2（2025-03：4.2 万个）", "band": [0.1, 3.0]},
 "中医类诊所": {"n": 100885, "src": "S1（2025 公报：100,885 个）", "band": [0.1, 3.0]},
 "中医类医院": {"n": 6498, "src": "S1（2025 公报：6,498 个）", "band": [1.0, 10.0]},
 "院校": {"n": 60, "src": "估计（未取得权威数字，含高职）", "band": [5.0, 40.0]},
 "药企与器械": {"n": 200, "src": "估计（未取得权威数字）", "band": [1.0, 15.0]},
}
REVENUE = {   # 客户年营收／IT 预算（元），用于客单占比校验
 "中医类医院": {"rev": 91000000, "itRatio": [0.01, 0.02], "src": "S17：5,910.5 亿 ÷ 6,498 家 ≈ 9,100 万/家；S16：IT 预算占 1%–2%"},
 "中医类门诊部": {"rev": 3110000, "itRatio": [0.005, 0.02], "src": "S17：128.6 亿 ÷ 4,135 家 ≈ 311 万/家"},
 "基层中医馆": {"rev": 3000000, "itRatio": [0.005, 0.02], "src": "估计（未取得单馆营收权威值）"},
}
SEG_OF = {
 '02-zhongyi-zhenghou-paisheng': "基层中医馆",
 '03-zhongyi-xuepai-cibiao': "院校",
 '04-zhongyi-zhexue-fanchou': "院校",
 '05-zhongyao-xingzhuang-jiexi': "药企与器械",
 '06-zhongyao-fangji-yaowei': "药企与器械",
 '07-zhongyao-yaoli-nandu': "院校",
 '08-zhenjiu-jingluo-diben': "基层中医馆",
 '09-zhenjiu-shuxue-guishu': "药企与器械",
 '10-zhenjiu-zhishishu-guadian': "院校",
 '11-gushang-gubing-qianyi': "中医类医院",
 '12-gushang-chuangshang-shijianchuang': "中医类医院",
 '13-gushang-kangfu-pingding': "基层中医馆",
 '14-huli-pinggu-diben': "中医类医院",
 '15-huli-jiaoban-sbar': "中医类医院",
 '16-huli-yangsheng-fangan': "基层中医馆",
 '17-guanli-tongji-diben': "中医类医院",
 '18-guanli-fugaidu-baobiao': "院校",
 '19-guanli-zhengce-guadian': "院校",
 '20-zhineng-icd-jiansuo': "中医类医院",
 '21-zhineng-yuyi-zhangliang': "药企与器械",
 '22-zhineng-zhibiao-shibai': "药企与器械",
 '23-wuguan-mianbu-wangzhen': "药企与器械",
 '24-wuguan-fangji-shai': "药企与器械",
 '25-wuguan-guangxue-canliang': "中医类诊所",
 '26-jichu-bingli-diben': "院校",
 '27-jichu-bingsheng-jiuzhou': "院校",
 '28-jichu-shengli-zhengchangzhi': "中医类医院",
}
WORK_SPLIT = {"设计": 0.40, "校验": 0.35, "返工": 0.25}


def main():
    mk = json.load(open(os.path.join(OUT, '市场层.json'), encoding='utf-8'))
    cb = json.load(open(os.path.join(OUT, '成本口径.json'), encoding='utf-8'))
    rows, agg = [], {"合理": 0, "偏高": 0, "偏低": 0, "无锚": 0}
    for slug, c in mk['cases'].items():
        b = c['budget']
        seg = SEG_OF[slug]
        sam = SAM[seg]
        pen = round(b['三年客户'] / sam['n'] * 100, 3)
        lo, hi = sam['band']
        verdict = "偏高" if pen > hi else ("偏低" if pen < lo else "合理")
        # 客单校验：与客户营收／IT 预算比
        rev = REVENUE.get(seg)
        if rev:
            it_low = rev['rev'] * rev['itRatio'][0]
            it_high = rev['rev'] * rev['itRatio'][1]
            share = round(b['客单'] / rev['rev'] * 100, 3)
            in_band = (it_low <= b['客单'] <= it_high) or (share <= 5.0)
            price_note = (f"客单占客户年营收 {share}%（IT 预算区间 {int(it_low):,}–{int(it_high):,} 元/年）"
                          f"——{'落在合理带内' if in_band else '超出 IT 预算上限，需下调或分级'}")
            price_anchor = rev['src']
        else:
            in_band = None
            price_note = "无营收锚：仅作内部一致性检查（同类案例客单差异不超过 5 倍）"
            price_anchor = "未取得"
        agg[verdict] += 1
        if in_band is None:
            agg['无锚'] += 1
        rows.append({"slug": slug, "title": c['title'], "客群": seg, "SAM": sam['n'], "SAM来源": sam['src'],
                     "客户数": b['三年客户'], "隐含渗透率%": pen, "合理带%": sam['band'],
                     "客户数判定": verdict,
                     "客单": b['客单'], "客单说明": price_note, "客单锚": price_anchor,
                     "客单在带内": in_band})

    json.dump({"subject": "22-zhongyi-biye-sheji",
               "what": "三条假设的锚与判据：客户数←SAM×渗透率；客单←占营收／IT 预算比例；工时←三段比例（假设，非实测）。",
               "sources": {"S16": "《2023-2024 年度中国医院信息化状况调查报告》（CHIMA）",
                           "S17": "国家中医药管理局《2021 年全国中医医疗机构收入支出情况》"},
               "sam": SAM, "revenue": REVENUE, "workSplit": WORK_SPLIT,
               "rules": ["客户数不直接设定，而由 SAM×渗透率推出：隐含渗透率必须落在该客群合理带内",
                         "客单必须与客户年营收／IT 预算挂钩：软件支出占营收 0.1%–5% 视为合理",
                         "工时三段比例是假设，用于把隐性成本拆开；任何使用处必须标「假设·未实测」"],
               "totals": agg, "rows": rows},
              open(os.path.join(OUT, '假设集.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

    # 工时台账：按假设比例填写，来源标「假设·未实测」
    tl = json.load(open(os.path.join(OUT, '工时台账.json'), encoding='utf-8'))
    cbmap = {r['slug']: r for r in cb['rows']}
    filled = 0
    for row in tl['rows']:
        r = cbmap[row['slug']]
        hidden = None if r['细口径'] is None else (r['粗口径'] - r['细口径'])
        if hidden is None:
            row.update({"人月": None, "记录人": None, "日期": None, "来源": "待建·不拆"})
            continue
        if hidden <= 0:
            # 粗口径＝细口径，没有隐性成本可拆：不填 0（0 会被校验器判为非法），标「无隐性成本」
            row.update({"人月": None, "记录人": None, "日期": None, "来源": "无隐性成本"})
            continue
        price = 20000
        total_months = hidden / price
        row["人月"] = round(total_months * WORK_SPLIT[row['段']], 2)
        row["记录人"] = "假设·未实测"
        row["日期"] = "—"
        row["来源"] = "假设"
        filled += 1
    cases_filled = len({r['slug'] for r in tl['rows'] if r['来源'] == '假设'})
    tl['status'] = {"已填案数": cases_filled, "待填案数": len({r['slug'] for r in tl['rows']}) - cases_filled,
                    "已填行数": filled, "来源": "假设·未实测",
                    "说明": "按设计 40%／校验 35%／返工 25% 的假设比例拆分隐性成本；替换为实测值前，任何由此得出的比例不得进入结论。"}
    json.dump(tl, open(os.path.join(OUT, '工时台账.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

    print(json.dumps(agg, ensure_ascii=False))
    print(f"工时台账：{filled} 行按假设填写（{cases_filled} 案），其余 {len(tl['rows']) - filled} 行为待建·不拆")
    for r in sorted(rows, key=lambda x: -x['隐含渗透率%'])[:6]:
        print(f"{r['slug']:34s} {r['客群']:6s} 客户{r['客户数']:>5,} SAM{r['SAM']:>6,} 渗透{r['隐含渗透率%']:>6}% [{r['合理带%'][0]}-{r['合理带%'][1]}] {r['客户数判定']}")
    for slug in ('11-gushang-gubing-qianyi', '26-jichu-bingli-diben', '19-guanli-zhengce-guadian'):
        r = cbmap[slug]
        if r['细口径'] is not None:
            print(f"工时拆解 {slug}: 隐性 {r['粗口径'] - r['细口径']:,} 元 → "
                  + "／".join(f"{k} {round((r['粗口径'] - r['细口径']) * v):,}" for k, v in WORK_SPLIT.items()))


if __name__ == '__main__':
    main()
