# -*- coding: utf-8 -*-
"""药理学（09-jichu/12-yaoli-xue，目标 49 章）：结构 + 词频探底。"""
import re

import openpyxl

SRC = r"F:\textbooks\qhzy-药理学.xlsx"
wb = openpyxl.load_workbook(SRC, read_only=True, data_only=True)
print("sheets", len(wb.sheetnames))
chunks = []
for name in wb.sheetnames:
    if not re.match(r"^\d{2}[\s　]", name):
        continue
    ws = wb[name]
    buf = []
    for row in ws.iter_rows(values_only=True):
        for c in row:
            if isinstance(c, str):
                buf.append(c)
    chunks.append((name.strip(), "\n".join(buf)))
print("内容章", len(chunks))
whole = "\n".join(t for _, t in chunks)
print("汉字", len(re.findall(r"[\u4e00-\u9fff]", whole)))
for n, t in chunks:
    print(f"  {n[:32]:34} {len(re.findall(r'[一-龥]', t)):>6}")
first = [s for s in wb.sheetnames if re.match(r"^\d{2}[\s　]", s)][0]
ws0 = wb[first]
print("首章表", ws0.max_row, ws0.max_column)
for row in ws0.iter_rows(min_row=1, max_row=6, values_only=True):
    print([str(x)[:22] if x is not None else "" for x in row])

C1 = {
    "药效与机制": ["作用", "机制", "受体", "酶", "通道", "效应", "抑制", "激动"],
    "药动与用法": ["吸收", "分布", "代谢", "排泄", "半衰期", "剂量", "给药", "生物利用度"],
    "应用与不良反应": ["适应证", "临床应用", "不良反应", "禁忌", "中毒", "相互作用"],
}
C2 = {
    "外周神经": ["胆碱", "肾上腺素", "受体", "神经节", "递质"],
    "中枢神经": ["中枢", "镇静", "催眠", "抗癫痫", "镇痛", "麻醉"],
    "心血管与内脏": ["心血管", "血压", "心律", "利尿", "消化", "呼吸", "激素"],
    "化疗与免疫": ["抗菌", "抗生素", "抗肿瘤", "免疫", "抗病毒", "抗寄生虫"],
}
for title, C in (("三辨候选", C1), ("四位面候选", C2)):
    print(f"\n== {title}")
    tot = {k: sum(whole.count(w) for w in ws) for k, ws in C.items()}
    for k, v in tot.items():
        print(f"  {k:10} {v:>5}")
    print("  ratio", round(max(tot.values()) / max(1, min(tot.values())), 1))
