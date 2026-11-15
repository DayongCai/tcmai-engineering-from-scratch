# -*- coding: utf-8 -*-
"""scripts/build_textbook_units.py —— 五部教材底本 → 单元层（units.json）

为什么这五门要单独补单元层：
  中医基础理论、中医诊断学、中药学、方剂学、药理学五门课，底本（standards/<x>/底本.json）
  与正文都在，章代码逐章现算，但**没有单元层**——按三层口径属 B 类。后果不是「没内容」，
  而是没进统计口径：scripts/build_kt_history.py 与 build_kt_sphere_data.py 只扫
  standards/*/units.json，缺一层就等于在知识树里显示「单元 0」。四大基础课 + 药理学
  是全库正文最厚的几本（622,115 汉字），它们的单元缺席，知识树的底座就是缺的。

切分口径：**一小节一单元**（沿用 erke / yiguwen 的教材口径，不是经典的「一条一单元」）。
  章（chapter）＝底本章；节（sec）＝底本节；小节（sub）＝单元。
  locator 写「教材·第N章·N.M.K」，与底本四级编号一致，可逐字回查底本。

两种底本形态都在这里处理（不猜、不改写）：
  paras 为字符串          jichu / zhenduan / zhongyao —— 段落即正文
  paras 为 {no,title,text} fangji —— 第三级是「条目」，条目标题进 segments/brief
  brief + body            yaoli —— 整段正文；【学习目标】单独抽成 goals（正文保留原文）

三条轴（views/levels/tri）**不设**：这五部底本没有儿科那种「三辨＋四位面」编排，
没有编排就没有轴；硬套一套词表算出来的是脚本的轴，不是教材的轴。
故 units.json 只带 measure（digits / valueLike / listItems）与 counts，不写 triaxis。
底本结构本身就是这五门的索引骨架。

用法：
  python scripts/build_textbook_units.py             # 写 5 份 units.json
  python scripts/build_textbook_units.py --check     # 只比对，不写；漂移退出码 1
  python scripts/build_textbook_units.py jichu ...   # 只处理指定学科（调试用）
"""
from __future__ import annotations

import hashlib
import io
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STD = os.path.join(ROOT, "standards")
HANZI = re.compile(r"[\u4e00-\u9fff]")
LIST_RE = re.compile(r"(?:^|\n)\s*\d+\s*[\.、]")
# 教材里的数值带单位：药理要剂量/浓度/时间，中基中诊少见但同一条正则不漏
VALUE_RE = re.compile(
    r"\d+(?:\.\d+)?\s*"
    r"(?:mg/kg|mg|μg|ug|ng|g|kg|ml|mL|L|%|℃|°C|mmol/L|mol/L|U/L|Hz|"
    r"小时|分钟|秒|天|日|周|月|年|岁|次|倍|度|分|厘米|毫米|毫升|千克|克|升|毫克|微克)"
)

COURSES = ["jichu", "zhenduan", "fangji", "yaoli"]
# 中药学不在这里：standards/zhongyao-xue/units.json 已由 scripts/build_zhongyao_xue_text.py
# 从同一本 qhzy-中药学.xlsx 切出（340 单元 · 47,844 汉字 · 带药物库与 axis-probe）。
# 同一母本再切一份 standards/zhongyao/units.json 就是双份单元层，两边迟早漂移——
# 故中药学走「别名解析」（zhongyaoxue → zhongyao-xue），不再新建。


def sha256_of(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def paras_to_segments(paras) -> list[dict]:
    """底本三种形态 → [{'title':..,'text':..}]；不改写一个字。"""
    segs: list[dict] = []
    for p in paras or []:
        if isinstance(p, str):
            if p.strip():
                segs.append({"title": "", "text": p})
        elif isinstance(p, dict):
            text = p.get("text") or p.get("body") or ""
            if (text or "").strip():
                segs.append({"title": (p.get("title") or p.get("no") or "").strip(), "text": text})
    return segs


def extract_goals(text: str) -> list[str]:
    """【学习目标】后面的编号行抽成 goals；抽取不删正文（body 仍保留原文）。"""
    m = re.search(r"【学习目标】", text or "")
    if not m:
        return []
    goals, tail = [], (text[m.end():] or "")
    for raw in tail.split("\n"):
        line = raw.strip()
        if not line:
            if goals:
                break
            continue
        mm = re.match(r"(\d{1,2})[\.、]\s*(.+)$", line)
        if mm:
            goals.append(mm.group(2).strip())
        elif goals:
            break
    return goals


def measure(text: str) -> dict:
    t = text or ""
    vals = VALUE_RE.findall(t)
    return {
        "digits": len(re.findall(r"\d", t)),
        "valueLike": len(vals),
        "valueSamples": vals[:6],
        "listItems": len(LIST_RE.findall(t)),
    }


def build(name: str) -> dict:
    diben_path = os.path.join(STD, name, "底本.json")
    if not os.path.exists(diben_path):
        raise SystemExit(f"✗ 缺底本：{os.path.relpath(diben_path, ROOT)}")
    book = json.load(io.open(diben_path, encoding="utf-8"))

    units: list[dict] = []
    chapters: list[dict] = []

    for ch in book.get("chapters") or []:
        cno = str(ch.get("no") or "").strip()
        ctitle = str(ch.get("title") or "").strip()
        if ctitle and not ctitle.startswith("第"):
            ctitle = f"第{cno}章 {ctitle}"
        ch_units, ch_hanzi = 0, 0
        secs_out: list[dict] = []

        def push(sec_no, sec_title, sub_no, sub_title, segs, brief_extra="", goals=None, items=None):
            nonlocal ch_units, ch_hanzi
            body = "\n".join(s["text"] for s in segs)
            if not body.strip():
                return
            titles = [s["title"] for s in segs if s["title"]]
            if not titles and items:
                titles = [it.get("title") or "" for it in items if it.get("title")]
            brief = "／".join(titles) if titles else ""
            unit = {
                "chapter": cno,
                "chapterTitle": ctitle,
                "sec": sec_title or sec_no,
                "sub": sub_no,
                "title": sub_title or sub_no,
                "locator": f"教材·第{cno}章·{sub_no}",
                "brief": brief,
                "goals": goals if goals is not None else extract_goals(body),
                "rawBody": body,
                "body": body,
                "prose": body,
                "segments": [{"title": s["title"], "hanzi": len(HANZI.findall(s["text"]))} for s in segs],
                "hanzi": len(HANZI.findall(body)),
                "measure": measure(body),
            }
            if items:
                unit["items"] = [{"no": str(it.get("no") or "").strip(),
                                  "title": str(it.get("title") or "").strip()} for it in items]
            if brief_extra:
                # 底本自带的 brief 原样保留，但不顶替「条目骨架」口径（yaoli 的 brief 是写作口径，不是摘要）
                unit["sourceBrief"] = brief_extra
            units.append(unit)
            ch_units += 1
            ch_hanzi += unit["hanzi"]

        # 章级导语（底本自带则收，不造）
        ch_segs = paras_to_segments(ch.get("paras"))
        if ch_segs:
            push("0", "本章导语", f"{cno}.0", "本章导语", ch_segs)

        for sec in ch.get("secs") or []:
            sno = str(sec.get("no") or "").strip()
            stitle = str(sec.get("title") or "").strip()
            subs = sec.get("subs") or []
            sec_paras = paras_to_segments(sec.get("paras"))
            if sec_paras:
                push(sno, stitle, f"{sno}.0", stitle or "本节导语", sec_paras)
            for sub in subs:
                ubno = str(sub.get("no") or sub.get("sub") or "").strip()
                utitle = str(sub.get("title") or "").strip()
                segs = paras_to_segments(sub.get("paras"))
                if not segs and sub.get("body"):
                    segs = [{"title": "", "text": sub["body"]}]
                goals = extract_goals(sub.get("body") or "\n".join(s["text"] for s in segs))
                push(sno, stitle, ubno, utitle, segs, brief_extra=str(sub.get("brief") or ""),
                     goals=goals, items=sub.get("items"))
            if subs:
                secs_out.append({"no": sno, "title": stitle,
                                 "subs": [str(s.get("no") or s.get("sub") or "").strip() for s in subs]})

        chapters.append({"no": cno, "title": ctitle, "units": ch_units, "hanzi": ch_hanzi, "secs": secs_out})

    counts = {
        "chapters": len(chapters),
        "secs": sum(len(c["secs"]) for c in chapters),
        "units": len(units),
        "hanzi": sum(c["hanzi"] for c in chapters),
        "digits": sum(u["measure"]["digits"] for u in units),
        "valueLike": sum(u["measure"]["valueLike"] for u in units),
    }

    # 自检：单元数须等于底本自报小节数（底本没报就跳过，不猜）
    reported = (book.get("counts") or {}).get("subs")
    if isinstance(reported, int) and reported != len(units) and not any(
        paras_to_segments(ch.get("paras")) for ch in book.get("chapters") or []
    ):
        raise SystemExit(f"✗ {name}: 单元 {len(units)} ≠ 底本自报小节 {reported}")

    return {
        "source": {
            "file": "standards/%s/底本.json" % name,
            "sha256": sha256_of(diben_path),
            "dibenSource": (book.get("source") or {}),
            "script": "scripts/build_textbook_units.py",
        },
        "basis": {
            "unit": "一小节一单元（章=底本章，节=底本节，小节=单元）",
            "locator": "教材·第N章·N.M.K，与底本四级编号一致，可逐字回查",
            "axes": "未设三辨/位面：底本无该编排，不造轴；只带 measure 与 counts",
        },
        "counts": counts,
        "chapters": chapters,
        "units": units,
    }


def dump(obj: dict) -> str:
    return json.dumps(obj, ensure_ascii=False, indent=1)


def main() -> int:
    check = "--check" in sys.argv
    names = [a for a in sys.argv[1:] if not a.startswith("--")] or COURSES
    bad = []
    for name in names:
        obj = build(name)
        text = dump(obj)
        path = os.path.join(STD, name, "units.json")
        c = obj["counts"]
        if check:
            old = io.open(path, encoding="utf-8").read() if os.path.exists(path) else ""
            same = old == text
            print(f"{'✓' if same else '✗'} {name}: 章 {c['chapters']} · 单元 {c['units']} · 汉字 {c['hanzi']:,}"
                  f"{'' if same else ' —— 与磁盘不一致'}")
            if not same:
                bad.append(name)
            continue
        io.open(path, "w", encoding="utf-8", newline="\n").write(text)
        print(f"✓ {name}: 章 {c['chapters']} · 节 {c['secs']} · 单元 {c['units']} · 汉字 {c['hanzi']:,}"
              f" · 数值类 {c['valueLike']} → standards/{name}/units.json")
    if bad:
        print("✗ 漂移：" + "、".join(bad))
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
