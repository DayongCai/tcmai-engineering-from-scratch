#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""scripts/build_biye_alloc.py —— B 端与 C 端的合并账（成本分摊）

上一轮两本账分开算，没说清「同一套底本同时供 B 与 C 时，成本如何分摊」。
本层给三件事：

  1. 合并账：每案 三年收入 = B 三年 + C 三年×3；共同成本 = 底本建设（B 的首年投入）
  2. 三种分摊规则：收入比例 / 等分 / 增量法（C 不担共同成本）
  3. 一个恒等式与一条判据：
       恒等式：合并毛利与分摊规则无关（A_B + A_C = 共同成本，故相互抵消）
       判据：**决策看增量，不看分摊** —— C 端该不该做，等于「C 三年净收入 − C 三年增量成本」

为什么要把这条写清楚：分摊只改变两块报表的「好看程度」，不改变合并结果。
真正会改决策的是增量：若 C 端增量贡献为负，任何分摊方式都不能把它变成好生意，
只能把亏损挪到另一本账上——那叫会计，不叫商业。
"""
import json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'standards', 'biye')

RULES = [
    {"name": "收入比例", "desc": "共同成本按 B／C 三年收入比例分摊",
     "how": "A_C = 共同成本 × C收入 ÷ (B收入 + C收入)"},
    {"name": "等分", "desc": "两条渠道各担一半",
     "how": "A_C = 共同成本 ÷ 2"},
    {"name": "增量法", "desc": "共同成本全部由 B 承担，C 只担增量成本",
     "how": "A_C = 0"},
]


def main():
    mk = json.load(open(os.path.join(OUT, '市场层.json'), encoding='utf-8'))
    cases = mk['cases']
    rows, agg = [], {"共同成本合计": 0, "B三年收入合计": 0, "C三年收入合计": 0,
                     "B净贡献合计": 0, "C增量净合计": 0, "合并净合计": 0,
                     "C增量为正": 0, "C增量为负": 0, "C不可为": 0}
    for slug, c in cases.items():
        b = c['budget']
        shared = b['首年投入']                        # 底本建设＝共同资产
        b_other = b['三年总成本'] - shared            # B 侧增量（获客＋运维）
        b_rev = b['三年收入']
        b_net_before = b_rev - b_other                # 未摊共同成本时的 B 净
        cs = c.get('cside') or {}
        if cs.get('可行'):
            cb = cs['budget']
            c_rev = cb['净收入'] * 3
            c_other = cb['获客成本'] * 3 + cb['合规一次性']
            c_inc = c_rev - c_other                   # 增量净贡献（未摊共同成本）
        else:
            c_rev = c_other = c_inc = 0
        merged = b_net_before + c_inc - shared
        allocs = {}
        for r in RULES:
            if not cs.get('可行'):
                allocs[r['name']] = {"B净": round(b_net_before - shared), "C净": 0,
                                     "C分摊": 0,
                                     "合并核查": round(b_net_before + c_inc - shared)}
                continue
            if r['name'] == '收入比例':
                a_c = shared * c_rev / (b_rev + c_rev) if (b_rev + c_rev) else 0
            elif r['name'] == '等分':
                a_c = shared / 2
            else:
                a_c = 0
            allocs[r['name']] = {"B净": round(b_net_before - (shared - a_c)),
                                 "C净": round(c_inc - a_c),
                                 "C分摊": round(a_c),
                                 "合并核查": round(b_net_before + c_inc - shared)}
        row = {"slug": slug, "title": c['title'], "C可做": bool(cs.get('可行')),
               "共同成本": round(shared), "B增量成本": round(b_other), "B收入": round(b_rev),
               "C收入": round(c_rev), "C增量成本": round(c_other), "C增量净": round(c_inc),
               "B净未摊": round(b_net_before - shared), "合并净": round(merged),
               "分摊": allocs,
               "判定": ("加 C" if c_inc > 0 else ("不加 C" if cs.get('可行') else "只做 B"))}
        rows.append(row)
        agg['共同成本合计'] += shared
        agg['B三年收入合计'] += b_rev
        agg['C三年收入合计'] += c_rev
        agg['B净贡献合计'] += b_net_before - shared
        agg['C增量净合计'] += c_inc
        agg['合并净合计'] += merged
        if cs.get('可行'):
            agg['C增量为正' if c_inc > 0 else 'C增量为负'] += 1
        else:
            agg['C不可为'] += 1

    # 恒等式核查：三种规则下每案合并净必须一致
    for r in rows:
        vals = {round(v['合并核查']) for v in r['分摊'].values()}
        assert len(vals) == 1, (r['slug'], vals)

    json.dump({"subject": "22-zhongyi-biye-sheji",
               "what": "B／C 两渠道的合并账与三规则分摊；每案给出共同成本、增量成本、增量净与判定。",
               "sharedAsset": "底本建设＝B 预算的「首年投入」（人月＋云＋标注＋合规）",
               "rules": RULES,
               "identity": "合并净 = B净未摊 + C增量净 − 共同成本；与分摊规则无关（A_B + A_C = 共同成本）",
               "criterion": "C 端是否值得做 = C 增量净 > 0；分摊只改变两块账的好看程度，不改变合并结果",
               "totals": agg, "rows": rows},
              open(os.path.join(OUT, '合并账.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

    print(json.dumps(agg, ensure_ascii=False))
    for r in rows:
        if r['C可做']:
            print(f"{r['slug']:34s} 共同{r['共同成本']:>7,} B净{r['B净未摊']:>10,} "
                  f"C增量净{r['C增量净']:>9,} 合并{r['合并净']:>10,} {r['判定']}")


if __name__ == '__main__':
    main()
