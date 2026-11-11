#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""scripts/build_biye_costbasis.py —— 成本口径：按资产类型分层，而不是一个单价

上一版共同成本直接取「B 首年投入」，粗但诚实。用户指出「底本层可以按单元数×单价精确到每案」。
本层回答这个问题，但**拒绝把它做成一个统一单价**，理由是三类资产的计量单位不同源：

  单元层底本   以「教材的节」为单位，1 单元 ≈ 1 个可核段落   → 元/单元
  字段表       以「记录 × 字段」为单位                      → 元/字段
  语料统计层   以「条」为单位（条文、范畴命中）              → 元/条
  检索栈／量表 以「固定交付」为单位，无法按量分摊            → 固定人月

**只有同一类型内部可以比单价；跨类型比单价会制造假精度。** 所以本层做两件事：
  1. 给出每案的资产类型与计量值（能从底本现算的，用现算值；尚未建成的，标「待建·不可计」）；
  2. 给出「细口径」与「粗口径」的差，作为**敏感性**，而不是替代值——粗口径仍是合并账的计费口径。

单价（元）取自分摊参数，任何人可替换后重算：
  单元 60   元/单元（每 100 单元 0.3 人月 × 20,000 ÷ 100 × 100）
  字段 12   元/字段（每 100 字段 0.06 人月）
  条   0.6  元/条（每 1,000 条 0.03 人月）
  检索栈   固定 2 人月＝40,000 元；量表 固定 1 人月＝20,000 元
"""
import json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'standards', 'biye')

UNIT = {"单元": 60, "字段": 12, "条": 0.6, "检索栈": 40000, "量表": 20000}
FIXED = {"云资源年": 14400, "标注": 8000, "合规备案": 5000}

# slug → (类型, 计量值或 None, 计量说明)
Q = {
 '02-zhongyi-zhenghou-paisheng': ('单元', 900, '外科 325 ＋ 儿科 250 ＋ 妇科 325'),
 '03-zhongyi-xuepai-cibiao': ('条', 2792, '伤寒 1,760 ＋ 金匮 402 ＋ 温病 630'),
 '04-zhongyi-zhexue-fanchou': ('条', 162, '内经 162 篇（12 范畴 × 篇的命中矩阵）'),
 '05-zhongyao-xingzhuang-jiexi': ('字段', 1148, '287 味 × 4 字段（气／味／归经／毒性）'),
 '06-zhongyao-fangji-yaowei': ('字段', 836, '114 方 836 个药位'),
 '07-zhongyao-yaoli-nandu': ('单元', 588, '药理 588 小节'),
 '08-zhenjiu-jingluo-diben': ('单元', None, '该系底本 0 门，未建成'),
 '09-zhenjiu-shuxue-guishu': ('字段', None, '穴-经表未建'),
 '10-zhenjiu-zhishishu-guadian': ('条', None, '条文层未建'),
 '11-gushang-gubing-qianyi': ('单元', 60, '骨病 60 单元'),
 '12-gushang-chuangshang-shijianchuang': ('单元', 48, '急诊 48 单元'),
 '13-gushang-kangfu-pingding': ('量表', None, '量表需自建'),
 '14-huli-pinggu-diben': ('字段', 132, '132 证 → 护理问题映射'),
 '15-huli-jiaoban-sbar': ('量表', None, '五栏模板未定稿'),
 '16-huli-yangsheng-fangan': ('量表', None, '检查单未定稿'),
 '17-guanli-tongji-diben': ('字段', None, '指标字典未建'),
 '18-guanli-fugaidu-baobiao': ('字段', None, '报表字段未建'),
 '19-guanli-zhengce-guadian': ('条', None, '政策条文未补源'),
 '20-zhineng-icd-jiansuo': ('检索栈', 1, '固定交付：索引＋查询集＋指标表'),
 '21-zhineng-yuyi-zhangliang': ('检索栈', 1, '固定交付：两表示对比＋翻转案例'),
 '22-zhineng-zhibiao-shibai': ('检索栈', 1, '固定交付：指标表＋失效清单'),
 '23-wuguan-mianbu-wangzhen': ('字段', None, '望诊字段表未建'),
 '24-wuguan-fangji-shai': ('字段', 836, '复用 114 方 836 药位'),
 '25-wuguan-guangxue-canliang': ('字段', None, '参数表未建'),
 '26-jichu-bingli-diben': ('单元', 252, '病理 252 单元'),
 '27-jichu-bingsheng-jiuzhou': ('单元', 216, '病理生理 216 单元'),
 '28-jichu-shengli-zhengchangzhi': ('单元', 132, '生理 132 单元'),
}

TYPENOTE = {
 '单元': '以教材的「节」为单位；同类型内可比',
 '字段': '以「记录 × 字段」为单位；字段密度因表而异，跨表比单价意义有限',
 '条': '以条文／篇数为单位；语料长度差别大，须同时报字数',
 '检索栈': '固定交付，无法按量分摊',
 '量表': '固定交付，无法按量分摊',
}


def main():
    mk = json.load(open(os.path.join(OUT, '市场层.json'), encoding='utf-8'))
    cases = mk['cases']
    rows, agg = [], {"可计": 0, "待建不可计": 0, "细口径合计": 0, "粗口径合计": 0}
    for slug, (typ, qty, note) in Q.items():
        b = cases[slug]['budget']
        coarse = b['首年投入']
        fixed = FIXED['云资源年'] + FIXED['标注'] + FIXED['合规备案']
        if qty is None:
            fine = None
            diff = None
        elif typ in ('检索栈', '量表'):
            fine = round(UNIT[typ] + fixed)
            diff = round((fine - coarse) / coarse * 100, 1)
        else:
            fine = round(qty * UNIT[typ] + fixed)
            diff = round((fine - coarse) / coarse * 100, 1)
        unit_all = round(coarse / qty, 1) if (qty and typ not in ('检索栈', '量表')) else None
        rows.append({"slug": slug, "title": cases[slug]['title'], "类型": typ,
                     "计量": qty, "计量说明": note, "单价": UNIT[typ],
                     "细口径": fine, "粗口径": coarse, "差异率%": diff,
                     "粗口径单位成本": unit_all,
                     "隐性占比%": None if fine is None else round((coarse - fine) / coarse * 100, 1)})
        cases[slug]['costbasis'] = rows[-1]
        if fine is None:
            agg['待建不可计'] += 1
        else:
            agg['可计'] += 1
            agg['细口径合计'] += fine
            agg['粗口径合计'] += coarse

    agg['差异合计%'] = round((agg['细口径合计'] - agg['粗口径合计']) / agg['粗口径合计'] * 100, 1)
    agg['覆盖率'] = f"{agg['可计']}/{len(Q)}"
    # 类型内的单位综合成本区间（说明规模效应）
    bytype = {}
    for r in rows:
        if r['粗口径单位成本'] is None:
            continue
        bytype.setdefault(r['类型'], []).append(r['粗口径单位成本'])
    agg['单位综合成本'] = {k: {"min": min(v), "max": max(v), "倍差": round(max(v) / min(v), 1)} for k, v in bytype.items()}

    json.dump({"subject": "22-zhongyi-biye-sheji",
               "what": "成本口径分层：四类资产各有计量单位；同类型内可比单价，跨类型不比单价。",
               "unitPrice": UNIT, "fixed": FIXED, "typeNote": TYPENOTE,
               "rule": ["只有同一类型内部可以比单价；跨类型比单价会制造假精度",
                        "尚未建成的资产标「待建·不可计」，不按 0 计、也不按目标体量估",
                        "细口径只作敏感性：合并账仍以粗口径（首年投入）计费，便于横向对账"],
               "totals": agg, "rows": rows},
              open(os.path.join(OUT, '成本口径.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    json.dump(mk, open(os.path.join(OUT, '市场层.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

    print(json.dumps(agg, ensure_ascii=False))
    for r in sorted([x for x in rows if x['差异率%'] is not None], key=lambda x: -abs(x['差异率%'])):
        print(f"{r['slug']:34s} {r['类型']:4s} 计量{str(r['计量']):>6} 细{r['细口径']:>7,} 粗{r['粗口径']:>7,} 差{r['差异率%']:>7}%")


if __name__ == '__main__':
    main()
