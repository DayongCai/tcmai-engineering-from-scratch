#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""把「伤寒理解-病理生理.xlsx / 01七言」的「药」栏拆成药物-方剂索引。

解析规则（对应原表写法）：
  · 「；」分隔多个方；「：」前为方名，后为药味（无「：」则方名取自 H 列「方」栏）
  · 「、」分隔药味；药名取前面的汉字串，剂量取其后（g / 枚 / 茎 / ml / 分 / 等分 / 适量）
  · 括注（研末、每服…、水酒各半煎…）整段剥离，不入剂量
产出：同工作簿新增/重写同名表「药物-方剂索引」三段：
  ① 药物总表（出现方数、方名、剂量跨度）
  ② 逐条明细（药—量—方—条文号—行）
  ③ 重点药用量梯度（按剂量升序排方）
"""
import os
import re
from collections import Counter, defaultdict

import openpyxl
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter

XLSX = os.path.join(os.path.expanduser("~"), "Desktop", "伤寒理解-病理生理.xlsx")
SHEET = "01七言"
OUT = "药物-方剂索引"

HEAD = ["简", "记法(01)", "太阳病", "伤寒论太阳病的正文内容", "", "理", "法", "方", "药(g)"]
NAME_RE = re.compile(r"^([\u4e00-\u9fa5]{1,6})(.*)$")
# 原表里的几种写法清洗：「上方再加大黄」「再加猪胆汁」「栝楼根各等分」「苦酒适量」
NAME_FIX = ["上方再加", "再加", "另加", "再加入", "各等分", "等分", "适量", "熬挺", "熬"]
UNIT_RE = re.compile(r"(枚|茎|ml|毫升|分|片|个|斤|升)")
PAREN_RE = re.compile(r"（[^）]*）|\([^)]*\)")


def parse_herbs(text, fang_default):
    """→ [(方名, 药名, 剂量)]"""
    out = []
    if not text or text.strip() in ("—", ""):
        return out
    for part in str(text).split("；"):
        part = part.strip()
        if not part:
            continue
        if "：" in part:
            fang, body = part.split("：", 1)
            fang = fang.strip()
        else:
            fang, body = fang_default, part
        body = PAREN_RE.sub("", body)
        for item in re.split(r"[、,，]", body):
            item = item.strip()
            if not item:
                continue
            m = NAME_RE.match(item)
            if not m:
                continue
            name, dose = m.group(1), m.group(2).strip()
            suffix = ""
            for pre in NAME_FIX:
                if name.startswith(pre):
                    name = name[len(pre):] or name
                if pre in dose:
                    suffix = pre if pre not in suffix else suffix
                    dose = dose.replace(pre, "")
            # 后缀型（栝楼根各等分 / 蜂蜜适量熬挺）：药名吃掉后缀
            for post in NAME_FIX:
                if name.endswith(post) and len(name) > len(post):
                    name = name[: -len(post)]
                    if post not in dose:
                        suffix = post if not suffix else suffix
                    break
                if post in name and len(name) > len(post):
                    name = name.replace(post, "")
                    if post not in dose:
                        suffix = post if not suffix else suffix
                    break
            for post in NAME_FIX:          # 兜底：药名里仍夹带的修饰词一律剥掉
                if post in name and len(name) > len(post):
                    name = name.replace(post, "")
                    suffix = suffix or post
            name = name.strip()
            dose = dose.strip() or "—"
            if suffix:
                dose = suffix if dose == "—" else dose + suffix
            if name and name not in ("见下列各条", "见下", "同上", "各等分"):
                out.append((fang, name, dose))
    return out


def dnum(dose):
    m = re.search(r"(\d+(?:\.\d+)?)", str(dose))
    return float(m.group(1)) if m else None


def main():
    wb = openpyxl.load_workbook(XLSX)
    ws = wb[SHEET]
    recs = []          # (行, 编号, 七言, 方, 药, 剂量, 段)
    for r in range(2, 123):
        code = ws.cell(r, 3).value
        if code in ("阳明病", "少阳病", "三阴病", "杂病"):
            continue
        poem = ws.cell(r, 4).value or ""
        fang_cell = str(ws.cell(r, 8).value or "")
        herb_cell = ws.cell(r, 9).value or ""
        for fang, name, dose in parse_herbs(herb_cell, fang_cell):
            seg = "太阳"
            if r >= 27:
                seg = "阳明"
            if r >= 59:
                seg = "少阳"
            if r >= 83:
                seg = "三阴"
            if r >= 103:
                seg = "杂病"
            recs.append((r, code, poem, fang, name, dose, seg))

    by_herb = defaultdict(list)
    for rec in recs:
        by_herb[rec[4]].append(rec)

    if OUT in wb.sheetnames:
        del wb[OUT]
    out = wb.create_sheet(OUT)
    out["A1"] = "药物-方剂索引 · 由「01七言」药栏解析（117 条）"
    out["A1"].font = Font(name="仿宋", size=13, bold=True)
    out["A2"] = (f"共 {len(recs)} 条药味记录、{len({r[3] for r in recs})} 个方、{len(by_herb)} 味药。"
                 "剂量沿用原表（教材常用折算：汉一两≈3g、一升≈200ml），枚/茎/ml/等分为原方计量单位。"
                 "用法：§① 查某味药出现在哪些方；§③ 看同一味药的用量梯度（如桂枝 3→15g）。")
    out["A2"].font = Font(name="等线", size=9)
    out["A2"].alignment = Alignment(wrap_text=True, vertical="top")
    out.merge_cells("A2:H2")
    out.row_dimensions[2].height = 30

    head_font = Font(name="仿宋", size=11, bold=True, color="FF0000FF")
    fill = PatternFill("solid", fgColor="F2EADC")
    wrap = Alignment(wrap_text=True, vertical="top")

    def writerow(r, vals, bold=False):
        for c, v in enumerate(vals, 1):
            cell = out.cell(r, c, v)
            cell.font = Font(name="仿宋", size=11, bold=True, color="FF0000FF") if bold else Font(name="等线", size=10)
            cell.alignment = wrap
            if bold:
                cell.fill = fill

    # ---- §① 药物总表
    r = 4
    out.cell(r, 1, "① 药物总表（按出现方数降序）").font = Font(name="宋体", size=11, bold=True)
    r += 1
    writerow(r, ["药名", "出现方数", "出现条数", "剂量写法", "剂量跨度(g)", "代表方（前 6）", "出现段落"], bold=True)
    r += 1
    for name, lst in sorted(by_herb.items(), key=lambda kv: (-len({x[3] for x in kv[1]}), -len(kv[1]), kv[0])):
        fangs = []
        for x in lst:
            if x[3] not in fangs:
                fangs.append(x[3])
        doses = [x[5] for x in lst]
        nums = [dnum(d) for d in doses]
        nums = [n for n in nums if n is not None]
        span = "—"
        if nums:
            unit = ""
            us = {m.group(1) for d in doses for m in [UNIT_RE.search(str(d))] if m}
            if len(us) == 1 and "g" not in str(doses):
                unit = list(us)[0]
            if min(nums) != max(nums):
                span = f"{min(nums):g}–{max(nums):g}{unit}"
            else:
                span = f"{min(nums):g}{unit}"
        segs = []
        for x in lst:
            if x[6] not in segs:
                segs.append(x[6])
        writerow(r, [name, len(fangs), len(lst),
                     "、".join(sorted(set(doses), key=lambda d: (dnum(d) or 0)))[:60],
                     span, "、".join(fangs[:6]) + ("…" if len(fangs) > 6 else ""), "、".join(segs)])
        r += 1

    # ---- §② 逐条明细
    r += 1
    out.cell(r, 1, "② 逐条明细（药—量—方—条文号；可筛选反查）").font = Font(name="宋体", size=11, bold=True)
    r += 1
    writerow(r, ["药名", "剂量", "方", "条文号", "七言", "段落", "行号"], bold=True)
    r += 1
    for name, lst in sorted(by_herb.items(), key=lambda kv: (-len(kv[1]), kv[0])):
        for x in lst:
            writerow(r, [name, x[5], x[3], x[1], x[2], x[6], x[0]])
            r += 1

    # ---- §③ 重点药梯度
    r += 1
    out.cell(r, 1, "③ 重点药用量梯度（同药各方按剂量升序）").font = Font(name="宋体", size=11, bold=True)
    r += 1
    writerow(r, ["药名", "剂量", "方", "条文号（同方多条并列）", "同药其它档"], bold=True)
    r += 1
    KEY = {"桂枝", "芍药", "炙甘草", "甘草", "附子", "制附子", "干姜", "大黄", "麻黄",
           "半夏", "人参", "茯苓", "黄芩", "黄连", "石膏", "生姜", "大枣", "柴胡", "枳实", "厚朴"}
    for name in sorted(KEY & set(by_herb), key=lambda n: -len(by_herb[n])):
        lst = [x for x in by_herb[name] if dnum(x[5]) is not None]
        merged = {}
        for x in lst:
            k = (x[3], dnum(x[5]))
            merged.setdefault(k, []).append(x[1])
        rows_ = sorted(merged.items(), key=lambda kv: (kv[0][1], kv[0][0]))
        tiers = sorted({d for (_, d) in merged})
        for (fang, dose), codes in rows_:
            tip = f"{len(tiers)} 档：{tiers[0]:g}–{tiers[-1]:g}g" if len(tiers) > 1 else "单一档"
            writerow(r, [name, f"{dose:g}g", fang, "、".join(sorted(set(codes))), tip])
            r += 1

    widths = [10, 8, 26, 24, 30, 34, 34, 8]
    for i, w in enumerate(widths, 1):
        out.column_dimensions[get_column_letter(i)].width = w
    out.freeze_panes = "A5"

    wb.save(XLSX)
    print(f"药味记录 {len(recs)} · 方 {len({r[3] for r in recs})} · 药 {len(by_herb)}")
    print("Top10:", [(n, len({x[3] for x in l})) for n, l in
                     sorted(by_herb.items(), key=lambda kv: -len({x[3] for x in kv[1]}))[:10]])
    for probe in ("桂枝", "芍药", "炙甘草", "附子", "大黄"):
        if probe in by_herb:
            seq = sorted(((dnum(x[5]), x[3], x[5]) for x in by_herb[probe] if dnum(x[5]) is not None))
            print(f"  {probe}: " + " → ".join(f"{f}({d}g)" for d, f, _ in seq))
    print("saved", XLSX)


if __name__ == "__main__":
    main()
