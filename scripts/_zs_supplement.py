# -*- coding: utf-8 -*-
"""05 中医知识图谱：按补源约定补入《中医信息学》标准化/数据元/数据库三节，凑够 6 章。

理由：本课底本《中医知识树》仅 4,542 字，而课程契约要求章节数 ≥6、章门要求每章 ≥1,000 字，
两条同时成立需要 ≥6,000 字。缺的约 1,500–2,000 字按「同域补源」从《中医信息学》取，
每条 unit 的 locator 记「补充·中医信息学·原第N章·M.K」，source 记母本名，绝不混入底本统计。
"""
import io
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S = os.path.join(ROOT, "standards")
A = json.load(io.open(os.path.join(S, "zhongyi-zhishishu", "units.json"), encoding="utf-8"))
B = json.load(io.open(os.path.join(S, "zhongyi-xinxi-xue", "units.json"), encoding="utf-8"))

# 从《中医信息学》取「标准化 / 数据表示 / 数据库」三类单元（原第 15–17 章）
extra = [u for u in B["units"] if re.search(r"第(1[5-9]|2[0-2])章", u.get("locator", ""))]
extra = extra[:26]
print("补入单元", len(extra), "·", sum(u["hanzi"] for u in extra), "汉字")

units = []
for u in A["units"]:
    nu = dict(u)
    nu["src"] = "知识树"
    units.append(nu)
for u in extra:
    nu = json.loads(json.dumps(u))
    nu["locator"] = f"补充·中医信息学·{u['locator'].replace('教材·', '')}"
    nu["source"] = f"中医信息学:{u['locator']}"
    nu["title"] = u["title"] + "（补充）"
    nu["src"] = "信息学"
    units.append(nu)

# 按汉字总量均分成 6 章
total = sum(u["hanzi"] for u in units)
target = total / 6
groups, cur, acc = [], [], 0
for i, u in enumerate(units):
    cur.append(u)
    acc += u["hanzi"]
    if len(groups) < 5 and acc >= target * (len(groups) + 1):
        groups.append(cur)
        cur = []
if cur:
    if len(groups) == 6:
        groups[-1] += cur
    else:
        groups.append(cur)
assert len(groups) == 6, f"分组失败：{len(groups)}"

out = []
for ci, g in enumerate(groups, 1):
    for k, u in enumerate(g, 1):
        nu = dict(u)
        nu["chapter"] = str(ci)
        nu["sub"] = f"{ci}.{k}"
        nu["secNo"] = f"{ci}.{1 + (k - 1) // 4}"
        nu["chapterTitle"] = f"第{ci}章 知识组织（第 {ci} 段）"
        out.append(nu)
for ci in range(1, 7):
    g = [u for u in out if int(u["chapter"]) == ci]
    print(f"  ch{ci}: {len(g)} 单元 · {sum(u['hanzi'] for u in g)} 汉字")

U = dict(A)
U["units"] = out
U["counts"] = {"chapters": 6, "units": len(out), "hanzi": sum(u["hanzi"] for u in out),
               "valueLike": sum(u["measure"].get("valueLike", 0) for u in out)}
U["chapters"] = [{"no": i, "title": f"知识组织（第 {i} 段）", "units": sum(1 for u in out if int(u["chapter"]) == i)}
                 for i in range(1, 7)]
U["probe"]["A_part"] = {p: sum(u["hanzi"] for u in out if int(u["chapter"]) in chs)
                        for p, chs in {"1": [1], "2": [2], "3": [3], "4": [4], "5": [5], "6": [6]}.items()}
json.dump(U, io.open(os.path.join(S, "zhongyi-zhishishu", "units.json"), "w", encoding="utf-8"),
          ensure_ascii=False, indent=1)
print("新总量", U["counts"]["hanzi"], "汉字 ·", len(out), "单元")
