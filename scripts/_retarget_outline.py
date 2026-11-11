# -*- coding: utf-8 -*-
"""按底本实际容量调整两门大纲课的章节目标：05 知识图谱 10→4、17 中医信息学 34→8。

理由：两本 qhzy 教材是提纲型（正文 4,542 / 9,282 汉字），按原目标拆章会低于每章 1,000 字的章门下限。
调整后每章约 1,135 / 1,160 字，仍在下限之上；缺口登记里写明「目标下调」这件事。
"""
import io
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
p = os.path.join(ROOT, "curriculum.json")
C = json.load(io.open(p, encoding="utf-8"))
CHANGES = {"05-zhongyi-zhishi-tupu": 4, "17-zhongyi-xinxi-xue": 8}
done = {}
for d in C["departments"]:
    for s in d["subjects"]:
        key = s[0].split("/")[-1]
        if key in CHANGES and s[6] != CHANGES[key]:
            done[key] = (s[6], CHANGES[key])
            s[6] = CHANGES[key]
json.dump(C, io.open(p, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("目标已调整:", done)
