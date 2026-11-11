#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""scripts/build_bingli_text.py —— 病理学工作簿 → 底本 + 单元层

母本：E:\\textbooks\\qhzy-生理学.xlsx（411,687 B · 27 表）
  37 表 = 7 前置（0封面/0历史/0改写说明/0映射1-3/0目录）+ 21 内容章（01–21）+ 9 平台表

产出：
  standards/bingli/底本.json    章 → 节 → 小节 三级 + 每小节的「口径句」与「正文」+ counts
  standards/bingli/units.json   单元层：一小节一条，含学习目标、正文、三视角/四层级词频、数值与单位计数
  standards/bingli/METHOD.json  前置与平台 16 表的行数

口径（为什么这样做）：
  1. 这个工作簿与中药学/方剂学不同：**没有段标题**。每小节恰好两行——
     段=1 是一句「口径句」（小节名 + 括注约束：「只写过程与调节与机制的类别与关系，
     不写数值与单位与正常值，不作诊断与正常与异常判定」），段=11 才是正文（以【学习目标】开头）。
     所以段=1 不当标题存，单列 `brief`；段=11 存 `body`。
  2. 口径句里那句「不写数值与单位与正常值」是可核验的断言：本脚本统计每小节的
     阿拉伯数字、单位、以及「正常值」类词的出现次数，交给门去断言。
  3. 章名只在表名里（`04 血液循环`），首行是节标题 —— 与方剂学同一个坑。
"""

import hashlib
import io
import json
import os
import re
import sys

import openpyxl

SRC = r"E:\textbooks\qhzy-病理学.xlsx"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "standards", "bingli")

CONTENT_SHEET = re.compile(r"^(\d{2})\s+(.+)$")
SEC_TITLE = re.compile(r"^(\d+)\.(\d+)\s+(.+)$")
SUB_TITLE = re.compile(r"^(\d+)\.(\d+)\.(\d+)\s+(.+)$")
HANZI = re.compile(r"[\u4e00-\u9fff]")

# 三视角（病理学的经典三问：病因 / 机制 / 形态）
VIEWS = {
    "病因": ["病因", "致病", "损伤因素", "感染", "理化", "遗传", "免疫因素", "诱因"],
    "机制": ["机制", "过程", "通路", "介质", "调控", "环节", "发生发展", "发病"],
    "形态": ["形态", "结构", "细胞", "组织", "排列", "大体", "镜下", "改变"],
}
# 四层级（细胞 / 组织 / 器官 / 系统）
LEVELS = {
    "细胞": ["细胞", "膜电位", "跨膜", "胞内", "胞外"],
    "组织": ["组织", "上皮", "肌组织", "结缔"],
    "器官": ["器官", "心脏", "肾脏", "肺", "肝", "胃", "肠", "血管"],
    "系统": ["系统", "整体", "全身", "循环", "神经调节", "体液调节"],
}

# 数值证据：只认「数字 + 计量单位」或「数字 + 明确量词」，避免把列表序号与单元编号算成数值
VALUE_RE = re.compile(r"\d+(?:\.\d+)?\s*(?:mmHg|kPa|℃|°C|‰|%|mmol|mOsm|mol|mV|Hz|次/分|个/L|g/L|mg|ml|mL|kg|cm|mm|μm|um|ms|min|小时|秒钟|升|毫升)")
# 列表序号（「1. 」「2、」行首）
LIST_RE = re.compile(r"(?:^|" + chr(10) + r")\s*\d+\s*[\.、]")
# 单元/术语编号（SL-01、T01、E1、SL-21）
CODE_RE = re.compile(r"(?:SL|T|E|D)-?\d{1,3}")
# 「正常值」类词：区分「否定语境」（声明不给值）与「实体语境」（真的在讲正常值）
NORMAL_WORDS = ["正常值", "参考值", "正常范围"]
NEG_BEFORE = ["不写", "不列", "不给", "不记", "不提供", "不作", "不含", "不标", "不以"]


def labels(counts):
    """把「三视角/四层级」的词频折算成一个标签：主视角 + 占比 + 排序串。

    为什么要落成标签而不只留词频：教材是按「代谢/机能/形态」三线、细胞→组织→器官→系统
    四层组织的，只有词频时读者还得自己比大小；给每个单元一个主标签，才能算出
    「132 个单元里多少以机能为主」「哪一层最薄」，也才能按标签检索。
    """
    total = sum(counts.values())
    if total == 0:
        return {"primary": None, "share": 0.0, "mix": "—", "counts": dict(counts)}
    # 并列时按词表顺序取第一个（dict 保持插入序）：与门里的 argmax 同一条规则，
    # 早先用 (counts[k], k) 让字典序参与 tie-break，1.4.1/4.1.1 的层级标签会跳到「系统」。
    primary = max(counts, key=lambda k: counts[k])
    order = sorted(counts, key=lambda k: (-counts[k], k))
    return {"primary": primary, "share": round(counts[primary] / total, 3),
            "mix": ">".join(order), "counts": dict(counts)}


def axis_of(m):
    v = labels(m["views"])
    l = labels(m["levels"])
    return {
        "view": v,
        "level": l,
        "tags": [(f"视角·{v['primary']}" if v["primary"] else "视角·无"),
                 (f"层级·{l['primary']}" if l["primary"] else "层级·无")],
    }


def build_triaxis(units, chapters, views, levels):
    """三视角 × 四层级的总表：主标签分布 + 章内分布 + 3×4 交叉矩阵。"""
    by_view = {k: [] for k in VIEWS}
    by_level = {k: [] for k in LEVELS}
    cross = {f"{v}|{l}": 0 for v in VIEWS for l in LEVELS}
    unlabelled = []
    for u in units:
        pv, pl = u["tri"]["view"]["primary"], u["tri"]["level"]["primary"]
        if pv is None or pl is None:
            unlabelled.append(u["sub"])
            continue
        by_view[pv].append(u["sub"])
        by_level[pl].append(u["sub"])
        cross[f"{pv}|{pl}"] += 1
    chs = []
    for c in chapters:
        us = [u for u in units if u["chapter"] == c["no"]]
        cv = {k: sum(u["measure"]["views"][k] for u in us) for k in VIEWS}
        cl = {k: sum(u["measure"]["levels"][k] for u in us) for k in LEVELS}
        chs.append({
            "no": c["no"], "title": c["title"], "units": len(us),
            "views": cv, "levels": cl,
            "primaryView": labels(cv)["primary"], "primaryLevel": labels(cl)["primary"],
            "viewMix": labels(cv)["mix"], "levelMix": labels(cl)["mix"],
            "unitsByView": {k: sum(1 for u in us if u["tri"]["view"]["primary"] == k) for k in VIEWS},
        })
    return {
        "note": "三视角（病因/机制/形态）与四层级的定义、词表与统计口径同 scripts/build_bingli_text.py；本文件是单元层标签的汇总，不引入新数据。",
        "definitions": {"views": VIEWS, "levels": LEVELS,
                        "counting": "同一单元内逐词 count 相加；标签取词频最大者，并列时按词表顺序；全零记 None"},
        "totals": {"views": views, "levels": levels},
        "byPrimaryView": {k: {"units": len(v), "subs": v} for k, v in by_view.items()},
        "byPrimaryLevel": {k: {"units": len(v), "subs": v} for k, v in by_level.items()},
        "cross": cross,
        "unlabelled": unlabelled,
        "chapters": chs,
    }


def measure(text):
    value_like = VALUE_RE.findall(text)
    list_items = LIST_RE.findall(text)
    codes = CODE_RE.findall(text)
    digits = len(re.findall(r"\d", text))
    normal_total = normal_neg = 0
    for w in NORMAL_WORDS:
        for m in re.finditer(w, text):
            normal_total += 1
            head = text[max(0, m.start() - 12):m.start()]
            if any(n in head for n in NEG_BEFORE):
                normal_neg += 1
    views = {k: sum(text.count(w) for w in ws) for k, ws in VIEWS.items()}
    levels = {k: sum(text.count(w) for w in ws) for k, ws in LEVELS.items()}
    return {
        "digits": digits,
        "valueLike": len(value_like),
        "valueSamples": value_like[:5],
        "listItems": len(list_items),
        "codes": len(codes),
        "normalWords": normal_total,
        "normalNegated": normal_neg,
        "views": views,
        "levels": levels,
    }


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def cell(v):
    return "" if v is None else str(v).strip()


def split_goals(body):
    """把正文开头的【学习目标】编号清单切出来；返回 (goals[], 正文余下部分)

    按行取，不用正则跨行偷懒：早先写成 `【学习目标】\\s*(.*?)(?=\\n\\s*\\n|\\Z)`，
    当目标清单后**没有空行**时，非贪婪匹配会一路吃到文末，把整段正文当目标吞掉——
    于是 9 个单元（每章 1 小节）的 body 变成空串，词频统计静默少一整节。
    """
    i = body.find("【学习目标】")
    if i < 0:
        return [], body
    lines = body[i + len("【学习目标】"):].split(chr(10))
    goals = []
    intro = ""
    # 目标块有两种开头：直接编号（多数）、或先写一句引导语「学完本章，应当能够：」再编号
    start = None
    for j in range(min(4, len(lines))):
        if re.match(r"^\s*\d+\s*[\.、]", lines[j]):
            start = j
            break
        if j == 0 and lines[j].strip():
            intro = lines[j].strip()
    if start is None:
        return [], body
    k = start
    for k in range(start, len(lines)):
        ln = lines[k]
        if re.match(r"^\s*\d+\s*[\.、]", ln):
            goals.append(re.sub(r"^\s*\d+\s*[\.、]\s*", "", ln).strip())
        else:
            break
    rest = chr(10).join(lines[k:]).strip()
    return goals, rest


def measure_legacy_removed():
    pass


def parse_sheet(ws):
    rows = list(ws.iter_rows(values_only=True))
    ch = None
    sec = None
    sub = None
    for r in rows:
        c = [cell(x) for x in (list(r) + ["", "", "", "", ""])[:5]]
        ch_no, sec_no, sub_no, para_no, text = c
        if not text:
            continue
        if ch is None:
            if not ch_no.isdigit():
                continue
            ch = {"no": ch_no, "title": text, "secs": []}
            # 不 continue：本章第一行同时就是第一条「节」，否则节号会塌成章号
        if ch_no and not ch_no.isdigit():
            continue
        if sec_no.isdigit():
            sec = {"no": f"{ch['no']}.{sec_no}", "title": text, "subs": []}
            ch["secs"].append(sec)
            sub = None
            continue
        if sub_no.isdigit():
            if sec is None:
                sec = {"no": ch["no"], "title": ch["title"], "subs": []}
                ch["secs"].append(sec)
            sub = {"no": f"{sec['no']}.{sub_no}", "title": text, "brief": "", "body": ""}
            sec["subs"].append(sub)
            continue
        if para_no.isdigit() and sub is not None:
            if para_no == "1":
                sub["brief"] = text          # 口径句，不是标题
            else:
                sub["body"] = (sub["body"] + "\n" + text).strip() if sub["body"] else text
    return ch


def counts(ch):
    subs = [u for s in ch["secs"] for u in s["subs"]]
    bodies = [u["body"] for u in subs if u["body"]]
    return {
        "secs": len(ch["secs"]),
        "subs": len(subs),
        "withBody": len(bodies),
        "hanzi": sum(len(HANZI.findall(b)) for b in bodies),
    }


def build():
    wb = openpyxl.load_workbook(SRC, read_only=True, data_only=True)
    names = wb.sheetnames
    content = [(m.group(1), m.group(2), n) for n in names for m in [CONTENT_SHEET.match(n)] if m]
    plat = [n for n in names if not CONTENT_SHEET.match(n)]

    chapters = []
    for no, title, sheet in sorted(content, key=lambda x: int(x[0])):
        ch = parse_sheet(wb[sheet])
        if ch is None:
            print(f"[warn] {sheet} 解析为空", file=sys.stderr)
            continue
        ch["sheet"] = sheet
        ch["title"] = f"第{int(no)}章 {title}"
        ch["counts"] = counts(ch)
        chapters.append(ch)

    units = []
    for ch in chapters:
        for s in ch["secs"]:
            for u in s["subs"]:
                goals, rest = split_goals(u["body"])
                m = measure(u["body"])
                units.append({
                    "chapter": ch["no"],
                    "chapterTitle": ch["title"],
                    "sec": s["title"],
                    "sub": u["no"],
                    "title": u["title"],
                    "locator": f"教材·第{ch['no']}章·{u['no']}",
                    "brief": u["brief"],
                    "goals": goals,
                    "rawBody": u["body"],
                    # 统计口径固定为 rawBody：body 恒等于原文整段，prose 是「去掉【学习目标】后的正文视图」。
                    # 早先 body 存的是去掉目标后的余文，纯目标单元就变成空串，text() 静默退到 rawBody，
                    # 数字跟着口径飘（97→95 这种差一两点最容易被当成笔误）。口径定死，数字才可比。
                    "body": u["body"],
                    "prose": rest,
                    "goalsOnly": not rest,
                    "hanzi": len(HANZI.findall(u["body"])),
                    "measure": m,
                    # 三轴标签：教材的「代谢/机能/形态」× 细胞/组织/器官/系统，落到每个单元上
                    "tri": axis_of(m),
                })

    total = {k: sum(c["counts"][k] for c in chapters) for k in ["secs", "subs", "withBody", "hanzi"]}
    base = {
        "source": {
            "file": SRC,
            "bytes": os.path.getsize(SRC),
            "sha256": sha256(SRC),
            "sheets": len(names),
            "contentSheets": len(content),
            "platformSheets": plat,
        },
        "counts": {"chapters": len(chapters), **total},
        "chapters": chapters,
    }

    with_goals = sum(1 for u in units if u["goals"])
    digits = sum(u["measure"]["digits"] for u in units)
    normal = sum(u["measure"]["normalWords"] for u in units)
    normal_neg = sum(u["measure"]["normalNegated"] for u in units)
    value_like = sum(u["measure"]["valueLike"] for u in units)
    list_items = sum(u["measure"]["listItems"] for u in units)
    codes = sum(u["measure"]["codes"] for u in units)
    views = {k: sum(u["measure"]["views"][k] for u in units) for k in VIEWS}
    levels = {k: sum(u["measure"]["levels"][k] for u in units) for k in LEVELS}

    udoc = {
        "source": base["source"],
        "counts": {
            "units": len(units),
            "withGoals": with_goals,
            "goalTotal": sum(len(u["goals"]) for u in units),
            "digits": digits,
            "unitHits": value_like,
            "normalWords": normal,
            "normalNegated": normal_neg,
            "valueLike": value_like,
            "listItems": list_items,
            "codes": codes,
        },
        "views": views,
        "levels": levels,
        "chapters": [{"no": c["no"], "title": c["title"], "units": c["counts"]["subs"], "hanzi": c["counts"]["hanzi"]}
                     for c in chapters],
        "units": units,
    }

    tri = build_triaxis(units, chapters, views, levels)
    udoc["triaxis"] = {
        "file": "triaxis.json",
        "byPrimaryView": {k: v["units"] for k, v in tri["byPrimaryView"].items()},
        "byPrimaryLevel": {k: v["units"] for k, v in tri["byPrimaryLevel"].items()},
    }

    method = {
        "sheets": [{"name": n, "rows": wb[n].max_row, "cols": wb[n].max_column} for n in plat],
        "note": "前置 7 表与平台 9 表不进底本：不是教材正文，行数在此留档。",
    }

    os.makedirs(OUT, exist_ok=True)
    for fn, obj in [("底本.json", base), ("units.json", udoc), ("triaxis.json", tri), ("METHOD.json", method)]:
        with io.open(os.path.join(OUT, fn), "w", encoding="utf-8") as f:
            json.dump(obj, f, ensure_ascii=False, indent=1)

    c = base["counts"]
    print(f"母本 {base['source']['bytes']:,} B · {base['source']['sha256'][:12]} · {len(names)} 表 = "
          f"{len(content)} 内容 + {len(plat)} 前置/平台")
    print(f"底本 {c['chapters']} 章 / {c['secs']} 节 / {c['subs']} 小节 / 有正文 {c['withBody']} / {c['hanzi']:,} 汉字")
    print(f"单元 {len(units)} · 有学习目标 {with_goals} · 目标条数 {udoc['counts']['goalTotal']}")
    print(f"口径核验：数字字符 {digits} · 数值型（数字+单位）{value_like} · 列表序号 {list_items} · 编号 {codes} · 「正常值」类 {normal}（其中否定语境 {normal_neg}）")
    print("三视角：" + " · ".join(f"{k} {v}" for k, v in views.items()))
    print("四层级：" + " · ".join(f"{k} {v}" for k, v in levels.items()))
    print("主标签单元数：视角 " + " · ".join(f"{k} {v['units']}" for k, v in tri["byPrimaryView"].items())
          + " ；层级 " + " · ".join(f"{k} {v['units']}" for k, v in tri["byPrimaryLevel"].items())
          + f" ；无标签 {len(tri['unlabelled'])}")
    return 0


if __name__ == "__main__":
    sys.exit(build())
