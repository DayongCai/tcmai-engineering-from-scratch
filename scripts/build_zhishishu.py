# -*- coding: utf-8 -*-
"""05-zhongyi-zhishi-tupu（中医知识图谱）：教材 qhzy-中医知识树.xlsx（10 章，2 列 章/节/正文 版式）。

版式（第五种）：sheet 名「第N章 …」，两列；行首标签 节（1.1 标题）/正文/代码/表格。
units = 节，body = 其下 正文 行；代码与表格行不入正文（见缺口登记）。
"""
import hashlib
import io
import json
import os
import re
import subprocess
import sys

import openpyxl

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S = os.path.join(ROOT, "standards")
PY = sys.executable
SRC = r"F:\textbooks\qhzy-中医知识树.xlsx"
SUB = "zhongyi-zhishishu"
DEPT = "departments/07-zhineng/05-zhongyi-zhishi-tupu"
TITLE = "中医知识图谱"
HANZI = re.compile(r"[\u4e00-\u9fff]")

CN = {"一": 1, "二": 2, "三": 3, "四": 4, "五": 5, "六": 6, "七": 7, "八": 8, "九": 9, "十": 10}


def cn2int(s):
    if s == "十":
        return 10
    if s.startswith("十"):
        return 10 + CN[s[1]]
    if "十" in s:
        a, b = s.split("十")
        return CN[a] * 10 + (CN[b] if b else 0)
    return CN[s]


VIEWS = {"知识表示": ["实体", "关系", "属性", "概念", "语义", "表示"],
         "层级与映射": ["层次", "节点", "枝", "映射", "编码", "维度"],
         "工程与应用": ["构建", "管线", "实验", "应用", "检索", "查询"]}
PLANES = {"理论与表示": [1, 2, 3], "结构与映射": [4, 5, 6], "编码与桥接": [7], "实现与实验": [8, 9, 10]}

wb = openpyxl.load_workbook(SRC, read_only=True, data_only=True)
sheets = [n for n in wb.sheetnames if re.match(r"^第[一二三四五六七八九十]+章", n)]
print("内容章", len(sheets))

units = []
for name in sheets:
    no = cn2int(re.match(r"^第([一二三四五六七八九十]+)章", name).group(1))
    title = name.split("章", 1)[1].strip(" 　—-")
    cur = None
    k = 0
    for row in wb[name].iter_rows(values_only=True):
        lab = str(row[0] or "").strip()
        val = str(row[1] or "").strip() if len(row) > 1 else ""
        if lab == "节":
            if cur:
                units.append(cur)
            k += 1
            m = re.match(r"^(\d+\.\d+)\s*(.*)$", val)
            sec_no, sec_title = (m.group(1), m.group(2)) if m else (f"{no}.{k}", val)
            cur = {"chapter": str(no), "chapterTitle": f"第{no}章 {title}", "sec": sec_title,
                   "secNo": sec_no, "sub": f"{no}.{k}", "title": sec_title,
                   "locator": f"教材·第{no}章·{no}.{k}", "brief": "", "goals": [],
                   "rawBody": "", "body": "", "prose": "", "segments": [], "hanzi": 0, "measure": {}}
        elif lab == "正文" and cur is not None and val:
            cur["segments"].append({"seg": str(len(cur["segments"]) + 1), "text": val})
    if cur:
        units.append(cur)
        cur = None

for u in units:
    body = "\n".join(s["text"] for s in u["segments"])
    u["body"] = u["rawBody"] = u["prose"] = body
    u["hanzi"] = len(HANZI.findall(body))
    u["brief"] = f"{u['title']}（只写教材所述的类别与关系，不写参数与数值）"
    u["measure"] = {"view": {k: sum(body.count(w) for w in ws) for k, ws in VIEWS.items()},
                    "valueLike": len(re.findall(r"\d+\s*(?:%|个|条|层|维|次|年)", body))}
    u["measure"]["views"] = dict(u["measure"]["view"])
    u["measure"]["levels"] = {p: (u["hanzi"] if int(u["chapter"]) in chs else 0) for p, chs in PLANES.items()}

tv = {k: sum(u["measure"]["view"][k] for u in units) for k in VIEWS}
tp = {k: sum(u["hanzi"] for u in units if int(u["chapter"]) in chs) for k, chs in PLANES.items()}
U = {"source": {"file": os.path.basename(SRC), "sha256": hashlib.sha256(open(SRC, "rb").read()).hexdigest(),
                "script": "scripts/build_zhishishu.py"},
     "counts": {"chapters": len(sheets), "units": len(units), "hanzi": sum(u["hanzi"] for u in units),
                "valueLike": sum(u["measure"]["valueLike"] for u in units)},
     "views": VIEWS, "levels": {k: [k] for k in PLANES}, "probe": {"view": tv, "A_part": tp},
     "ratio": {"view": round(max(tv.values()) / max(1, min(tv.values())), 1),
               "A_part": round(max(tp.values()) / max(1, min(tp.values())), 1)},
     "chapters": [{"no": cn2int(re.match(r"^第([一二三四五六七八九十]+)章", c).group(1)),
                   "title": c.split("章", 1)[1].strip(" 　—-"),
                   "units": sum(1 for u in units if int(u["chapter"]) == cn2int(re.match(r"^第([一二三四五六七八九十]+)章", c).group(1))),
                   "sheet": c} for c in sheets],
     "units": units}
os.makedirs(os.path.join(S, SUB), exist_ok=True)
json.dump(U, io.open(os.path.join(S, SUB, "units.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
json.dump({"note": "三辨按词表现算；四位面按教材章群结构分区。", "views": VIEWS, "levelsA": PLANES,
           "probe": U["probe"], "ratio": U["ratio"]},
          io.open(os.path.join(S, SUB, "axes.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

SLUGS = ["xulun", "zhishi-biaoshi", "xu-yu-gen", "gan-yu-zhi", "ye-ceng", "jingmai",
         "bingzheng-qiaojie", "goujian-guanxian", "yingyong", "shiyan"]
CM = {}
for c in U["chapters"]:
    n = c["no"]
    slug = f"{n:02d}-{SLUGS[n - 1]}"
    CM[slug] = {"n": n, "title": c["title"], "units": [u["sub"] for u in units if int(u["chapter"]) == n],
                "srcChapters": [str(n)], "why": f"{c['title']}：由知识图谱的局限推到知识树的构造",
                "derivedFrom": f"教材第{n}章"}
json.dump({"note": "10 章 = 教材 10 章（1:1）。", "chapters": CM},
          io.open(os.path.join(S, SUB, "chapter-map.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

fb = {s: [f"《中医知识树·{v['title']}》", f"教材第{v['n']}章"] for s, v in CM.items()}
cq = {s: [f"{v['title']}：这一章要回答什么，凭什么说结构成立", v["why"]] for s, v in CM.items()}
json.dump({"courseTitle": TITLE, "deptPath": DEPT, "xlsx": f"F:/textbooks/{os.path.basename(SRC)}",
           "chain": "表示 → 层级 → 映射 → 编码 → 管线 → 应用",
           "levelLabel": "章群结构",
           "objectPressure": "知识图谱的判据是「实体—关系—层级」三件套：认得出实体、说得清关系、指得出层级",
           "reportRule": "建树记录写：节点与边的来源、层级归属、可复核的抽样",
           "gapNote": "教材无插图；代码与表格段不入正文（见缺口登记）。**不写真实患者数据与诊疗结论**",
           "chapterQ": cq, "fallback": fb, "defaultCite": ["《中医知识树》", "教材章名级"]},
          io.open(os.path.join(S, SUB, "doc-config.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

print(f"plan: {len(CM)} 章 / {len(units)} 单元 / {U['counts']['hanzi']:,} 汉字 · 三辨 {U['ratio']['view']}× · 四位面 {U['ratio']['A_part']}×")
chdir = os.path.join(ROOT, DEPT, "chapters")
if os.path.isdir(chdir):
    left = [d for d in os.listdir(chdir) if os.path.exists(os.path.join(chdir, d, "docs", "zh.md"))]
    assert not left, f"已有正文 {len(left)} 章，拒绝重建"
for cmd in ([PY, "scripts/scaffold_huli_chapter.py", SUB, DEPT, "--all"],
            [PY, "scripts/build_huli_docs.py", SUB, DEPT]):
    r = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, encoding="utf-8", errors="replace")
    print("  ", cmd[1], "→", (r.stdout or r.stderr).strip().splitlines()[-1:])
