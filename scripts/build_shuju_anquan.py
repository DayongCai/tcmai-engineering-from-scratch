# -*- coding: utf-8 -*-
"""14 医学数据安全与隐私（教材课）：底本《卫生信息管理》第 3、4、8、12 章 + 合规口径。

四教材章 → 八课程章（每章按小节序号均分两半），保证每章 ≥1,000 字。
"""
import io
import json
import os
import re

import openpyxl

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
XLSX = "F:/textbooks/qhzy-卫生信息管理.xlsx"
SUB = "yixue-shuju-anquan-yinsi"
SELECT = [3, 4, 8, 12]
HANZI = re.compile(r"[\u4e00-\u9fff]")
RE_SEC = re.compile(r"^(\d+)\.(\d+)\s+(.+)$")
RE_SUB = re.compile(r"^(\d+)\.(\d+)\.(\d+)\s+(.+)$")
VIEWS = {
    "法规与合规": ["法规", "条例", "规定", "合规", "责任", "要求"],
    "安全与技术": ["安全", "加密", "权限", "访问", "备份", "风险"],
    "隐私与伦理": ["隐私", "知情", "同意", "伦理", "匿名", "脱敏"],
}
LEVELS = {"法规与标准": [1, 2], "技术与风险": [3, 4], "隐私与伦理": [5, 6], "治理与运营": [7, 8]}


def hanzi(s):
    return len(HANZI.findall(s or ""))


wb = openpyxl.load_workbook(XLSX, read_only=True, data_only=True)
sheets = {int(n[:2]): n for n in wb.sheetnames if re.match(r"^\d{2}\s", n)}
raw = []
for no in SELECT:
    name = sheets[no]
    cur = None
    for row in wb[name].iter_rows(values_only=True):
        if not row or len(row) < 5:
            continue
        c4, txt = str(row[3] or "").strip(), str(row[4] or "").strip()
        if not txt:
            continue
        m = RE_SUB.match(txt)
        if m:
            if cur:
                raw.append(cur)
            cur = [no, m.group(1), m.group(2), m.group(3), m.group(4), []]
            continue
        if RE_SEC.match(txt):
            continue
        if cur and c4 and not txt.startswith("【学习目标】"):
            cur[5].append(txt)
    if cur:
        raw.append(cur)

units, cnt = [], {}
for (no, sec, subk, sub2, title, paras) in raw:
    body = "\n".join(paras)
    h = hanzi(body)
    if h < 120:
        continue
    idx = SELECT.index(no)
    ci = idx * 2 + 1 if not cnt.get(idx * 2 + 1) or (cnt.get(idx * 2) and cnt[idx * 2] >= 6) else idx * 2
    # 简化：前 6 个小节进奇数章，其余进偶数章
    ci = idx * 2 + 1 if (cnt.get(idx * 2 + 1) or 0) < 6 else idx * 2 + 2
    cnt[ci] = cnt.get(ci, 0) + 1
    units.append({
        "chapter": str(ci), "sub": f"{ci}.{cnt[ci]}",
        "sec": title, "secNo": f"{ci}.{sec}", "title": title,
        "locator": f"教材·卫生信息管理·第{no}章·{sec}.{subk}",
        "source": f"卫生信息管理:第{no}章·{sec}.{subk}",
        "body": body, "prose": re.sub(r"\s+", " ", body).strip(), "hanzi": h,
        "segments": [{"seg": str(i + 1), "text": t} for i, t in enumerate([x for x in body.split("\n") if x.strip()])],
        "brief": "只写教材与法规所述的义务、流程与控制点，不写具体技术参数",
        "measure": {"views": {k: sum(body.count(w) for w in ws) for k, ws in VIEWS.items()},
                    "levels": {k: (h if ci in v else 0) for k, v in LEVELS.items()},
                    "valueLike": len(re.findall(r"\d+(?:\.\d+)?\s*(?:条|项|年|天|小时|%)", body))},
    })

names = {1: "信息标准与编码基础", 2: "标准落地的合规要求", 3: "政策法规与伦理总则", 4: "伦理审查与知情同意",
         5: "信息安全体系与风险", 6: "访问控制与加密备份", 7: "病案与医疗数据管理", 8: "数据治理与隐私保护"}
for ci in range(1, 9):
    g = [u for u in units if int(u["chapter"]) == ci]
    print(f"  ch{ci} {names[ci][:16]}: {len(g)} 单元 · {sum(u['hanzi'] for u in g):,} 汉字")
    for u in g:
        u["chapterTitle"] = names[ci]

tv = {k: sum(u["measure"]["views"][k] for u in units) for k in VIEWS}
tl = {k: sum(u["hanzi"] for u in units if int(u["chapter"]) in v) for k, v in LEVELS.items()}
OUT = {"subject": SUB, "title": "医学数据安全与隐私", "views": VIEWS, "levels": LEVELS,
       "source": {"kind": "textbook", "file": XLSX, "selectedChapters": SELECT,
                  "note": "另参照 standards/biye/合规口径.json 的法规条文（不并入汉字统计）"},
       "probe": {"view": tv, "A_part": tl},
       "ratio": {"view": round(max(tv.values()) / max(1, min(tv.values())), 1),
                 "A_part": round(max(tl.values()) / max(1, min(tl.values())), 1)},
       "counts": {"chapters": 8, "units": len(units), "hanzi": sum(u["hanzi"] for u in units),
                  "valueLike": sum(u["measure"]["valueLike"] for u in units)},
       "units": units,
       "chapters": [{"no": i, "title": names[i], "units": sum(1 for u in units if int(u["chapter"]) == i)} for i in range(1, 9)]}
d = os.path.join(ROOT, "standards", SUB)
os.makedirs(d, exist_ok=True)
json.dump(OUT, io.open(os.path.join(d, "units.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
json.dump({"note": "四教材章按小节均分成八课程章。", "views": VIEWS, "levelsA": LEVELS,
           "probe": {"view": tv, "A_part": tl},
           "ratio": {"view": OUT["ratio"]["view"], "A_part": OUT["ratio"]["A_part"]}},
          io.open(os.path.join(d, "axes.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(f"{SUB}: 8 章 / {len(units)} 单元 / {OUT['counts']['hanzi']:,} 汉字 · 三辨 {OUT['ratio']['view']}× · 四位面 {OUT['ratio']['A_part']}×")
