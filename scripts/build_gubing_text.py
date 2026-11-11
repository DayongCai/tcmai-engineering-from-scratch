#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""scripts/build_gubing_text.py —— 中医骨病学工作簿 → 底本 + 单元层

母本：F:\\textbooks\\qhzy-中医骨病学.xlsx（29 表：17 前置/平台 + 12 内容章）
  内容章表名形如 `05 化脓性骨髓炎与化脓性关节炎`；表内五列定位：章 / 节 / 小节 / 段 / 文字。
  段编号约定与前七门一致：段=k 是**段标题行**，段=1k 是它的**正文**。

产出：
  standards/gubing/底本.json     章 → 节 → 小节 → 段（标题 + 正文）+ counts + sha256
  standards/gubing/units.json    单元层：一小节一条，含 brief/prose/hanzi/measure/三判
  standards/gubing/METHOD.json   前置与平台表的行数 + 口径说明
  standards/gubing/axis-probe.json  三套四位面候选的全库实测（定口径留痕）

口径（骨病学与外科的分工）：
  骨病学讲「骨与关节本身的病」（骨髓炎、骨结核、骨肿瘤、骨代谢、骨坏死、退变、畸形），
  外科讲「疮疡与周围血管」，两者在 05 章附骨疽 / 11 章脱疽 处衔接，但不重叠。
  1. 三辨沿用**病因 / 病机 / 证候表现**，第三项落在「骨科查体与影像可数的项」：
     疼痛、肿胀、压痛、活动受限、畸形、窦道、骨质破坏、骨膜反应、死骨、X线/CT/MRI。
  2. 四位面有三条候选，实测后取一条，其余留进 axis-probe.json：
     A 组织深浅：骨膜 / 骨质 / 骨髓 / 关节腔（骨科解剖轴，与影像分期同构）
     B 解剖部位：四肢长骨 / 脊柱 / 关节 / 骨盆手足
     C 病理类别：感染 / 肿瘤 / 代谢 / 退变（与教材 05–10 章同构）
  3. 数值不回避：骨科写分期、角度、时限、剂量，measure 保留 valueLike 计数。
"""

import hashlib
import json
import os
import re

import openpyxl

SRC = r"F:\textbooks\qhzy-中医骨病学.xlsx"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "standards", "gubing")

CONTENT_SHEET = re.compile(r"^(\d{2})\s+(.+)$")
SUB_TITLE = re.compile(r"^(\d+)\.(\d+)\.(\d+)\s+(.+)$")
SEG_TITLE = re.compile(r"^(\d+)\.(\d+)\.(\d+)\.(\d+)\s+(.+)$")
HANZI = re.compile(r"[\u4e00-\u9fff]")

VIEWS = {
    "病因": ["病因", "外伤", "跌仆", "闪挫", "劳损", "外感", "六淫", "寒湿", "湿热", "疫毒",
             "先天", "禀赋", "肝肾不足", "年老", "体虚", "药毒", "激素", "痰浊", "瘀血"],
    "病机": ["病机", "肝肾", "筋骨", "气血", "经络", "瘀阻", "痰凝", "毒邪", "正虚", "邪恋",
             "骨蚀", "骨痿", "骨痹", "筋挛", "失养", "不通", "不荣", "传变", "内陷"],
    "证候表现": ["疼痛", "肿胀", "压痛", "活动受限", "畸形", "窦道", "瘘管", "跛行",
                 "骨质破坏", "骨膜反应", "死骨", "硬化", "钙化", "间隙", "X 线", "X线",
                 "CT", "MRI", "舌", "脉", "发热", "消瘦", "盗汗"],
}

# A 组织深浅（骨科解剖轴）
LEVELS_A = {
    "骨膜": ["骨膜", "骨膜反应", "葱皮", "袖口", "增生"],
    "骨质": ["骨质", "骨皮质", "皮质", "硬化", "破坏", "死骨", "骨折", "囊变"],
    "骨髓": ["骨髓", "髓腔", "脓液", "脓性", "坏死", "水肿", "浸润"],
    "关节腔": ["关节", "关节腔", "软骨", "滑膜", "间隙", "积液", "强直", "脱位"],
}

# B 解剖部位
LEVELS_B = {
    "四肢长骨": ["股骨", "胫骨", "腓骨", "肱骨", "尺骨", "桡骨", "骨干", "干骺端", "长骨"],
    "脊柱": ["脊柱", "椎体", "腰椎", "颈椎", "胸椎", "椎间盘", "骶髂"],
    "关节": ["关节", "膝", "髋", "踝", "肩", "肘", "腕", "软骨", "滑膜"],
    "骨盆手足": ["骨盆", "髂骨", "耻骨", "坐骨", "跟骨", "跖骨", "掌骨", "指骨", "足"],
}

# C 病理类别
LEVELS_C = {
    "感染": ["感染", "化脓", "脓", "结核", "毒", "炎", "窦道", "脓肿"],
    "肿瘤": ["肿瘤", "瘤", "癌", "肉瘤", "转移", "恶性", "良性", "化疗"],
    "代谢": ["代谢", "骨质疏松", "骨软化", "佝偻", "矿化", "钙", "维生素", "内分泌"],
    "退变": ["退变", "增生", "关节间隙", "骨赘", "强直", "免疫", "风湿", "类风湿", "缺血"],
}


# D 病性四分（骨蚀 / 骨痿 / 骨痹 / 骨畸形）——按教材 05–11 章的病性落点分组
LEVELS_D = {
    "骨蚀": ["破坏", "脓", "死骨", "窦道", "瘘管", "结核", "肿瘤", "溶骨", "浸润", "转移", "脓肿"],
    "骨痿": ["疏松", "软化", "矿化", "骨量", "坏死", "塌陷", "缺血", "萎", "骨折", "钙"],
    "骨痹": ["退变", "增生", "骨赘", "强直", "风湿", "类风湿", "间隙", "僵", "痹", "免疫"],
    "骨畸形": ["畸形", "弯曲", "驼背", "侧弯", "短缩", "内翻", "外翻", "软骨", "先天", "发育"],
}

LEVELS = LEVELS_D

VALUE_RE = re.compile(
    r"\d+(?:\.\d+)?\s*(?:°|度|cm|mm|kg|g|mg|ml|mL|%|天|日|周|月|年|岁|小时|分钟|次)")
LIST_RE = re.compile(r"(?:^|" + chr(10) + r")\s*\d+\s*[\.、]")


def count_hanzi(s):
    return len(HANZI.findall(s or ""))


def measure(text, levels=None):
    t = text or ""
    lv = levels if levels is not None else LEVELS
    vals = VALUE_RE.findall(t)
    return {
        "digits": len(re.findall(r"\d", t)),
        "valueLike": len(vals),
        "valueSamples": vals[:6],
        "listItems": len(LIST_RE.findall(t)),
        "views": {k: sum(t.count(w) for w in ws) for k, ws in VIEWS.items()},
        "levels": {k: sum(t.count(w) for w in ws) for k, ws in lv.items()},
    }


def tri(m):
    def pick(d):
        tot = sum(d.values())
        if not tot:
            return {"primary": None, "share": 0.0, "mix": "", "counts": d}
        order = sorted(d.items(), key=lambda kv: -kv[1])
        return {"primary": order[0][0], "share": round(order[0][1] / tot, 3),
                "mix": ">".join(k for k, v in order if v), "counts": d}
    return {"view": pick(m["views"]), "level": pick(m["levels"])}


def main():
    wb = openpyxl.load_workbook(SRC, read_only=True, data_only=True)
    sha = hashlib.sha256(open(SRC, "rb").read()).hexdigest()

    content_sheets, other_sheets = [], []
    for name in wb.sheetnames:
        m = CONTENT_SHEET.match(name)
        (content_sheets if m else other_sheets).append((name, m))

    chapters, units = [], []
    method = {"source": os.path.basename(SRC), "sha256": sha, "prefaceSheets": []}
    probeA = {k: 0 for k in LEVELS_A}
    probeB = {k: 0 for k in LEVELS_B}
    probeC = {k: 0 for k in LEVELS_C}
    probeD = {k: 0 for k in LEVELS_D}

    for name, _m in other_sheets:
        ws = wb[name]
        rows = sum(1 for _ in ws.iter_rows(values_only=True))
        method["prefaceSheets"].append({"sheet": name, "rows": rows})

    for name, m in content_sheets:
        no, title = m.group(1), m.group(2).strip()
        ws = wb[name]
        sec = sub = None
        pending = None
        subs, secs = [], []
        for row in ws.iter_rows(min_row=2, values_only=True):
            ch, s_val, sub_val, seg, text = (list(row) + [None] * 5)[:5]
            text = (text or "").strip() if isinstance(text, str) else (str(text).strip() if text else "")
            s_val = (str(s_val).strip() if s_val not in (None, "·") else "")
            sub_val = (str(sub_val).strip() if sub_val not in (None, "·") else "")
            seg = (str(seg).strip() if seg not in (None, "·") else "")

            if s_val:
                sec = {"no": s_val, "title": "", "subs": []}
                secs.append(sec)
                sub = None
                pending = None
            if sub_val:
                sub = {"sub": sub_val, "title": "", "segs": []}
                subs.append(sub)
                if sec is None:
                    sec = {"no": sub_val.rsplit(".", 1)[0], "title": "", "subs": []}
                    secs.append(sec)
                sec["subs"].append(sub)
                pending = None
            if not text:
                continue
            if seg:
                if seg.isdigit() and len(seg) >= 2 and seg.startswith("1"):
                    if pending is not None and sub is not None:
                        pending["body"] = text
                        pending = None
                else:
                    mm = SEG_TITLE.match(text)
                    t = mm.group(5) if mm else text
                    if sub is None:
                        sub = {"sub": (sec["no"] + ".1") if sec else f"{no}.1", "title": "", "segs": []}
                        subs.append(sub)
                        if sec:
                            sec["subs"].append(sub)
                    pending = {"seg": seg, "title": t, "body": ""}
                    sub["segs"].append(pending)
            else:
                if sub is not None and not sub["title"]:
                    mm = SUB_TITLE.match(text)
                    sub["title"] = (mm.group(1) + "." + mm.group(2) + "." + mm.group(3) + " " + mm.group(4)) if mm else text
                elif sec is not None and not sec["title"]:
                    sec["title"] = text

        n_units = 0
        hanzi = 0
        for sub in subs:
            prose = "\n".join(s2["body"] for s2 in sub["segs"] if s2.get("body"))
            if not prose.strip():
                continue
            titles = [s2["title"] for s2 in sub["segs"]]
            unit = {
                "chapter": str(int(no)),
                "chapterTitle": f"第{int(no)}章 {title}",
                "sec": next((s3["title"] or s3["no"] for s3 in secs if sub in s3["subs"]), ""),
                "sub": sub["sub"],
                "title": sub["title"] or f"{sub['sub']}",
                "locator": f"教材·第{int(no)}章·{sub['sub']}",
                "brief": "／".join(t for t in titles if t),
                "goals": [],
                "rawBody": prose,
                "body": prose,
                "prose": prose,
                "segments": [{"title": s2["title"], "hanzi": count_hanzi(s2.get("body", ""))} for s2 in sub["segs"]],
                "hanzi": count_hanzi(prose),
                "measure": measure(prose),
            }
            for i, lv in ((probeA, LEVELS_A), (probeB, LEVELS_B), (probeC, LEVELS_C), (probeD, LEVELS_D)):
                for k, v in measure(prose, lv)["levels"].items():
                    i[k] += v
            unit["tri"] = tri(unit["measure"])
            units.append(unit)
            n_units += 1
            hanzi += unit["hanzi"]

        chapters.append({
            "no": str(int(no)), "title": f"第{int(no)}章 {title}", "units": n_units, "hanzi": hanzi,
            "secs": [{"no": s["no"], "title": s["title"], "subs": [x["sub"] for x in s["subs"]]} for s in secs],
        })

    counts = {
        "chapters": len(chapters),
        "units": len(units),
        "hanzi": sum(c["hanzi"] for c in chapters),
        "digits": sum(u["measure"]["digits"] for u in units),
        "valueLike": sum(u["measure"]["valueLike"] for u in units),
    }
    by_primary_view, by_primary_level = {}, {}
    for u in units:
        for key, bucket in (("view", by_primary_view), ("level", by_primary_level)):
            p = u["tri"][key]["primary"]
            if p:
                bucket[p] = bucket.get(p, 0) + 1

    os.makedirs(OUT, exist_ok=True)
    json.dump({"source": {"file": os.path.basename(SRC), "sha256": sha, "sheets": len(wb.sheetnames)},
               "counts": counts, "chapters": chapters},
              open(os.path.join(OUT, "底本.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    json.dump({"source": {"file": os.path.basename(SRC), "sha256": sha, "script": "scripts/build_gubing_text.py"},
               "counts": counts, "views": VIEWS, "levels": LEVELS,
               "chapters": [{"no": c["no"], "title": c["title"], "units": c["units"], "hanzi": c["hanzi"]} for c in chapters],
               "units": units,
               "triaxis": {"byPrimaryView": by_primary_view, "byPrimaryLevel": by_primary_level}},
              open(os.path.join(OUT, "units.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    method["contentSheets"] = [c["title"] for c in chapters]
    method["axes"] = {"views": list(VIEWS), "levels": list(LEVELS),
                      "note": "三辨＝病因/病机/证候表现（第三项取骨科查体与影像可数的项：疼痛/肿胀/压痛/活动受限/畸形/窦道/骨质破坏/骨膜反应/死骨）；四位面取**病性四分**（骨蚀/骨痿/骨痹/骨畸形），理由：组织深浅轴实测 71/668/492/1244（max/min 17.5×，关节腔单极）、解剖轴 282/438/1654/364（5.9×）、病理轴 1476/1189/462/265（5.6×），病性轴 1060/968/483/520（**2.2×**），且与教材 05–11 章的病性落点一一对应"}
    json.dump(method, open(os.path.join(OUT, "METHOD.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    json.dump({"counts": counts, "A_tissue": probeA, "B_anatomy": probeB, "C_pathology": probeC, "D_lesion": probeD},
              open(os.path.join(OUT, "axis-probe.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    print(f"章 {counts['chapters']} · 单元 {counts['units']} · 汉字 {counts['hanzi']:,} · 数值命中 {counts['valueLike']}")
    print("三辨主轴:", by_primary_view)
    print("四位面主轴:", by_primary_level)
    print("A 组织深浅:", probeA)
    print("B 解剖部位:", probeB)
    print("C 病理类别:", probeC)
    print("D 病性四分:", probeD)
    for c in chapters:
        print(f"  第{c['no']}章 {c['title'][4:]:<26s} 单元 {c['units']:>3d} · 汉字 {c['hanzi']:>7,d}")


if __name__ == "__main__":
    main()
