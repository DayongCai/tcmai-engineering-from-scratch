# -*- coding: utf-8 -*-
"""实验针灸学：词频探底（三辨/四位面候选）。"""
import re

import openpyxl

wb = openpyxl.load_workbook(r"F:\textbooks\qhzy-实验针灸学.xlsx", read_only=True, data_only=True)
chunks = []
for name in wb.sheetnames:
    if not re.match(r"^\d{2}\s", name):
        continue
    ws = wb[name]
    buf = []
    for row in ws.iter_rows(values_only=True):
        for c in row:
            if isinstance(c, str):
                buf.append(c)
    t = "\n".join(buf)
    chunks.append((name, t))
whole = "\n".join(t for _, t in chunks)
print("章", len(chunks), "汉字", len(re.findall(r"[\u4e00-\u9fff]", whole)))
for n, t in chunks:
    print(f"  {n[:28]:32} {len(re.findall(r'[一-龥]', t)):>6}")

C1 = {
    "效应与机制": ["效应", "机制", "作用", "通路", "受体", "递质", "调节", "抑制", "兴奋"],
    "方法与技术": ["方法", "技术", "检测", "测定", "记录", "指标", "模型", "实验设计", "统计", "影像"],
    "证据与临床": ["临床", "循证", "证据", "疗效", "试验", "系统评价", "Meta", "指南", "随机"],
}
C2 = {
    "神经系统": ["神经", "脑", "脊髓", "中枢", "外周", "突触", "神经元"],
    "内分泌免疫": ["内分泌", "激素", "免疫", "细胞因子", "炎症", "肾上腺"],
    "循环呼吸消化": ["循环", "心", "血流", "呼吸", "肺", "消化", "胃肠"],
    "泌尿生殖运动": ["泌尿", "生殖", "运动", "肌肉", "关节", "膀胱"],
}
C3 = {
    "动物实验": ["大鼠", "小鼠", "家兔", "动物", "模型"],
    "人体研究": ["受试者", "患者", "志愿者", "临床研究"],
    "文献与理论": ["文献", "理论", "学说", "古代", "记载"],
}
for title, C in (("三辨候选", C1), ("四位面：系统", C2), ("第三轴：对象", C3)):
    print(f"\n== {title}")
    for k, ws in C.items():
        print(f"  {k:10} {sum(whole.count(w) for w in ws):>5}")
