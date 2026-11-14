# -*- coding: utf-8 -*-
"""scripts/zgh_ocr/parse_records.py —— OCR 页 → 候条目（四级码 + 原书字段）

版面规则（照 scanned-book-reconstruction skill 第 3 节，按本书实测调过）：
  · 页眉 = 当前章名（「第七章火证（热证）门（60证313候）」），y0 < 8%H 且含「第…章」→ 丢
  · 页码 = 页脚数字，y0 > 93%H 且整行 ≤ 8 字符 → 丢
  · 行 = 同一 y 带（y 中心差 ≤ 10 px）的框；行内按 x 排序，缝隙 > 40 px 视为分段
  · 段 = x0 比正文左边距多出 ≥ 45 px（缩进两字）；否则接上一段（中文不加空格）
  · 候标题 = （一）卫气失宣候（L01-Z01-H001）；证标题 = 一、肺卫风寒证（L01-Z01）
  · 字段 = 通称/证候别称/内含病例/病因病机/证象组合/主症/副症/宾症/治则/方症/摘录/病案

不做的事：不改写任何原文；OCR 明显错字（「侯」→「候」等）只在码处纠正，正文原样保留。
"""
import glob
import json
import os
import re
import sys
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from _paths import DATA  # noqa: E402  数据目录（scratch，不进 git）
OCR = os.path.join(DATA, "ocr")

# 全角/半角破折号、空格、甚至句点都可能出现在码里（OCR 会把这些当图形大小写），一律放宽
CODE = r"(L\s*[0-9A-Za-z]{2}\s*[-－—–一]\s*Z\s*[0-9A-Za-z]{2}\s*[-－—–一]\s*H\s*[0-9A-Za-z]{3})"
ZCODE = r"(L\s*[0-9A-Za-z]{2}\s*[-－—–一]\s*Z\s*[0-9A-Za-z]{2})"
HOU_RE = re.compile(r"[（(【\[]\s*([一二三四五六七八九十]+)\s*[）)】\]]\s*([^\s（(]{2,14}?[候侯])\s*[（(]\s*" + CODE + r"\s*[）)]")
ZHENG_RE = re.compile(r"^([一二三四五六七八九十]+)、\s*([^\s（(]{2,16}?证)\s*[（(]\s*" + ZCODE + r"\s*[）)]")
MEN_RE = re.compile(r"第[一二三四五六七八九十]+章\s*\S*?门")
FIELD_RE = re.compile(r"(证候别称|内含病例|病因病机|证象组合|主症|副症|宾症|治则|方症|摘录|病案|通称)\s*[：:]")
LABELS = ["通称", "证候别称", "内含病例", "病因病机", "证象组合", "主症", "副症", "宾症", "治则", "方症", "摘录", "病案"]


def load_pages(vol, a, b):
    out = []
    for p in range(a, b + 1):
        f = os.path.join(OCR, "%s-%04d.json" % (vol, p))
        if os.path.exists(f):
            out.append(json.load(open(f, encoding="utf-8")))
    return out


def page_lines(pg):
    items = pg["items"]
    if not items:
        return []
    H = max(i["y1"] for i in items)
    boxes = []
    for i in items:
        t = i["text"].strip()
        if not t:
            continue
        yc = (i["y0"] + i["y1"]) / 2
        if i["y0"] < H * 0.075 and (MEN_RE.search(t) or "中医证候学" in t):
            continue                                  # 页眉
        if yc > H * 0.94 and len(t) <= 8 and re.fullmatch(r"[·\+\.\s]*\d{1,4}[·\+\.\s]*", t):
            continue                                  # 页脚页码
        boxes.append(i)
    boxes.sort(key=lambda i: (i["y0"] + i["y1"]) / 2)
    rows = []
    for b in boxes:
        yc = (b["y0"] + b["y1"]) / 2
        if rows and abs(yc - rows[-1]["yc"]) <= 10:
            rows[-1]["items"].append(b)
            rows[-1]["yc"] = (rows[-1]["yc"] * (len(rows[-1]["items"]) - 1) + yc) / len(rows[-1]["items"])
        else:
            rows.append({"yc": yc, "items": [b]})
    lines = []
    for r in rows:
        segs = sorted(r["items"], key=lambda i: i["x0"])
        txt = ""
        last_x1 = None
        for s in segs:
            if last_x1 is not None and s["x0"] - last_x1 > 40:
                txt += " "
            txt += s["text"]
            last_x1 = s["x1"]
        lines.append({"text": txt, "x0": segs[0]["x0"], "y0": min(s["y0"] for s in segs),
                      "page": pg["page"], "printed": pg["printed"]})
    return lines


def lines_to_paras(lines):
    paras = []
    left = min((l["x0"] for l in lines), default=0)
    for l in lines:
        if not paras or l["x0"] - left > 45:
            paras.append({"page": l["page"], "printed": l["printed"], "text": l["text"]})
        else:
            # 缩进不足两字的行视为上一段的续行；中文续行不加空格
            paras[-1]["text"] += l["text"]
    return paras


def is_toc_page(pg):
    """判断这一页是不是「目录」页。

    为什么必须判：中册/下册最前面几页是**本册目录**，里面同样写着
    「（二）脾阴消涸候（L44-Z02-H272）」这种带码的标题行 —— 不拦掉，解析器会把
    整页目录当成 145 条候正文，全部落成「未匹配」，还会把目录里的字当正文用。
    判据取三条中最硬的一条：首行是「目录」，或行里过半是「（…）（数字）」的目录体。
    """
    items = [i["text"].strip() for i in pg.get("items", []) if i["text"].strip()]
    if not items:
        return False
    if items[0] in ("目录", "目 录", "目次"):
        return True
    tocish = sum(1 for t in items if re.search(r"[（(]\s*\d{1,4}\s*[）)]\s*$", t))
    return tocish >= max(4, len(items) * 0.4)


def parse_vol(vol, a, b, men_code):
    pages = [pg for pg in load_pages(vol, a, b) if not is_toc_page(pg)]
    paras = []
    for pg in pages:
        paras.extend(lines_to_paras(page_lines(pg)))

    recs = []
    cur = None
    cur_zheng = None
    for p in paras:
        t = p["text"].strip()
        if not t:
            continue
        m = HOU_RE.search(t)
        if m and t.find("候") <= 30:
            if cur:
                recs.append(cur)
            cur = {"code": re.sub(r"[\s－—–]", "-", m.group(3)), "zh": m.group(2).replace("侯", "候"),
                   "page": p["printed"], "pdf_page": p["page"], "zheng": cur_zheng, "buf": []}
            tail = t[m.end():].strip()
            if tail:
                cur["buf"].append(tail)
            continue
        m2 = ZHENG_RE.match(t)
        if m2:
            if cur:
                recs.append(cur)
                cur = None
            cur_zheng = {"code": re.sub(r"[\s－—–]", "-", m2.group(3)), "zh": m2.group(2)}
            continue
        if cur:
            cur["buf"].append(t)
    if cur:
        recs.append(cur)

    # 字段切分
    for r in recs:
        blob = "\n".join(r.pop("buf"))
        fields = {}
        marks = [(m.start(), m.group(1)) for m in FIELD_RE.finditer(blob)]
        for i, (pos, name) in enumerate(marks):
            end = marks[i + 1][0] if i + 1 < len(marks) else len(blob)
            body = blob[pos:end]
            body = body[body.index("：") + 1:] if "：" in body[:8] else body
            fields[name] = (fields.get(name, "") + " " + body.strip()).strip()
        r["fields"] = fields
        r["chars"] = len(re.sub(r"\s", "", blob))
        r["raw"] = blob
        r["men"] = men_code
    return recs


def main():
    vol = sys.argv[1]
    a, b = int(sys.argv[2]), int(sys.argv[3])
    men = sys.argv[4]
    recs = parse_vol(vol, a, b, men)
    print("候条目 %d" % len(recs))
    print("字段覆盖：", dict(Counter(k for r in recs for k in r["fields"])))
    print("每条字数 中位 %.0f" % sorted(r["chars"] for r in recs)[len(recs) // 2] if recs else 0)
    out = os.path.join(DATA, "parsed-%s.json" % men)
    json.dump(recs, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("→", out)
    for r in recs[:2]:
        print("\n---", r["code"], r["zh"], r["page"])
        for k, v in r["fields"].items():
            print("   ", k, ":", v[:70])


if __name__ == "__main__":
    main()
