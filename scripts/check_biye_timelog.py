#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""scripts/check_biye_timelog.py —— 工时台账校验：不许拿 0 或占位值当数据

规则（与 standards/biye/工时台账.json 的 rule 一致）：
  1. 人月必须为正数；0、负数、null 一律视为「未填」
  2. 已填行必须同时有 记录人 与 日期
  3. 已填案数必须等于「三段全填」的案数（不许只填一段就宣称可算）
  4. 未填行不得参与任何比例计算 —— 本脚本只统计，不代填

用法：
  python scripts/check_biye_timelog.py          # 校验并打印状态
  python scripts/check_biye_timelog.py --strict # 有任何未填行即 exit 1（上线前用）
"""
import json, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = os.path.join(ROOT, 'standards', 'biye', '工时台账.json')
SEGS = ('设计', '校验', '返工')


def main():
    tl = json.load(open(P, encoding='utf-8'))
    rows = tl['rows']
    bad = []
    filled_by_case = {}
    for i, r in enumerate(rows, start=2):
        v = r.get('人月')
        is_filled = isinstance(v, (int, float)) and v > 0
        if is_filled and (not r.get('记录人') or not r.get('日期')):
            bad.append(f"第 {i} 行已填人月但缺 记录人/日期：{r.get('slug')}·{r.get('段')}")
        if v is not None and not is_filled:
            bad.append(f"第 {i} 行人月非正数（{v}）——0 或负数视为未填，不许当数据：{r.get('slug')}·{r.get('段')}")
        filled_by_case.setdefault(r['slug'], set())
        if is_filled:
            filled_by_case[r['slug']].add(r['段'])

    full = [k for k, v in filled_by_case.items() if v == set(SEGS)]
    partial = [k for k, v in filled_by_case.items() if v and v != set(SEGS)]
    declared = tl.get('status', {}).get('已填案数', 0)
    if declared != len(full):
        bad.append(f"status.已填案数 {declared} ≠ 实际三段全填案数 {len(full)}")

    print(f"台账行数 {len(rows)} · 三段全填 {len(full)} 案 · 部分填写 {len(partial)} 案 · 未填 {len(rows) - sum(len(v) for v in filled_by_case.values())} 行")
    if partial:
        print("部分填写（不能参与比例计算）：" + '、'.join(partial))
    if bad:
        print("\n".join(f"✗ {b}" for b in bad))
        sys.exit(1)
    print("✓ 台账无占位值、无半填案")
    if '--strict' in sys.argv and len(full) < len(filled_by_case):
        print(f"✗ --strict：仍有 {len(filled_by_case) - len(full)} 案未填满")
        sys.exit(1)


if __name__ == '__main__':
    main()
