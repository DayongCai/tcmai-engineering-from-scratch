# -*- coding: utf-8 -*-
"""18 第七步（修）：Z06/Z14 这类「只有小标题」的段落，连同其后 n 段一起截取。"""
import io
import json

P = "scripts/_ys_clauses7.py"
s = io.open(P, encoding="utf-8").read()

s = s.replace('''def pick(anchor):
    for p in PARAS:
        if p.startswith(anchor):
            return p
    return None''',
'''def pick(anchor, extra=0):
    for i, p in enumerate(PARAS):
        if p.startswith(anchor):
            tail = PARAS[i + 1: i + 1 + extra]
            return "\\n".join([p] + [x for x in tail if len(x) > 4])
    return None''')

s = s.replace('("Z06", "2.3中药增加功能主治。", "改良型情形之一：增加功能主治（从补充申请改为新药申报路径）。")',
              '("Z06", "2.3中药增加功能主治。", "改良型情形之一：增加功能主治（从补充申请改为新药申报路径）。", 1)')
s = s.replace('("Z14", "1.3.4古代经典名方关键信息", "经典名方制剂应提供处方、基原、药用部位、炮制方法、剂量、用法用量、功能主治等关键信息；3.1 类须与国家发布信息一致。")',
              '("Z14", "1.3.4古代经典名方关键信息", "经典名方制剂应提供处方、基原、药用部位、炮制方法、剂量、用法用量、功能主治等关键信息；3.1 类须与国家发布信息一致。", 1)')

s = s.replace('''for cid, anchor, zh in PICK:
    body = pick(anchor)''',
'''for item in PICK:
    cid, anchor, zh = item[0], item[1], item[2]
    extra = item[3] if len(item) > 3 else 0
    body = pick(anchor, extra)''')

io.open(P, "w", encoding="utf-8").write(s)
import ast
ast.parse(s)
print("patched")
