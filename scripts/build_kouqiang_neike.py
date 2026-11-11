# -*- coding: utf-8 -*-
"""09 口腔内科：无独立教材，按「合成 + 派生」建成 10 章并如实登记同源关系。

材料：①《人体解剖学》消化系统章（口腔段）1 章；②《中医耳鼻喉科学》口齿科章切分出的
《中医口腔科学》（08 课）9 章。**本课与 08 同源，汉字不相加**，已在缺口登记写明。
"""
import io
import json
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PY = sys.executable
S = os.path.join(ROOT, "standards")
SUB = "kouqiang-neike-xue"

V = {"病位与组织": ["牙", "齿", "龈", "口腔", "黏膜", "颌"],
     "病性与证候": ["热", "虚", "风", "湿", "火", "瘀"],
     "诊法与治法": ["辨证", "治法", "方药", "外治", "调护", "预防"]}
L = {"组织与病因": [1, 2, 3], "辨证与治法": [4, 5], "病证各论": [6, 7, 8], "调护与预防": [9, 10]}

PLAN = {
    "title": "口腔内科学",
    "note": "合成课：组织基础取《人体解剖学》口腔段，其余九章取自《中医耳鼻喉科学》口齿科章（经 08 中医口腔科学切分）。"
            "库内无口腔内科教材，根管治疗、用药剂量、手术适应证一律不写。",
    "views": V,
    "levels": L,
    "chapters": [
        {"title": "口腔内科的范围与检查方法", "picks": [["renti-jiepou-xue", 3]]},
        {"title": "口腔的中医解剖与生理", "picks": [["zhongyi-kouqiang-kexue", 1]]},
        {"title": "病因病机：火、虚与齿龈的关系", "picks": [["zhongyi-kouqiang-kexue", 2]]},
        {"title": "辨证要点：从齿龈到脏腑", "picks": [["zhongyi-kouqiang-kexue", 3]]},
        {"title": "治法与外治的边界", "picks": [["zhongyi-kouqiang-kexue", 4]]},
        {"title": "龋病与牙痛", "picks": [["zhongyi-kouqiang-kexue", 5]]},
        {"title": "牙周病与牙龈出血", "picks": [["zhongyi-kouqiang-kexue", 6]]},
        {"title": "口腔黏膜病：口疮与糜烂", "picks": [["zhongyi-kouqiang-kexue", 7]]},
        {"title": "口臭与口干", "picks": [["zhongyi-kouqiang-kexue", 8]]},
        {"title": "口腔卫生、调护与预防", "picks": [["zhongyi-kouqiang-kexue", 10]]},
    ],
}
os.makedirs(os.path.join(S, SUB), exist_ok=True)
json.dump(PLAN, io.open(os.path.join(S, SUB, "plan.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
r = subprocess.run([PY, "scripts/build_mixed.py", SUB], cwd=ROOT, capture_output=True, text=True,
                   encoding="utf-8", errors="replace")
print((r.stdout or r.stderr).strip().splitlines()[-1])

DEPT = "departments/08-wuguan/09-kouqiang-neike-xue"
r = subprocess.run([PY, "scripts/make_outline_course.py", SUB, DEPT, "口腔内科学", "e9",
                    "范围 → 组织 → 病因 → 辨证 → 治法 → 病证 → 调护",
                    "口腔内科的判据是「定位到牙与龈、辨证到邪、处置有禁忌」"],
                   cwd=ROOT, capture_output=True, text=True, encoding="utf-8", errors="replace")
out = (r.stdout or r.stderr).strip().splitlines()
print(out[-1] if out else "无输出")
