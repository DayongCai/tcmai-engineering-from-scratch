#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""药对频次表：把 117 条七言的药味按「方」聚合，统计两味药的同现次数。

口径（避免重复计数）：
  · 统计单位是「方」而不是「条文行」——同一方出现在多条（如桂枝汤见 TY04、JK12）只计一次；
  · 条文号另存一列（并列），用于回查；
  · 只统计同方内同现，不跨方、不按条文顺序配对。

产出：桌面工作簿新增「药对频次」表
  ① 药对总表（按同现方数降序）＋ Top20 条形图
  ② 单药最强搭档（每个药的前 3 个搭档）
  ③ Top 药对的配伍义（病理生理 / 治疗靶点，人工撰写的解读）
"""
import importlib.util
import os
from collections import Counter, defaultdict
from itertools import combinations

import openpyxl
from openpyxl.chart import BarChart, Reference
from openpyxl.styles import Alignment, Font, PatternFill

XLSX = os.path.join(os.path.expanduser("~"), "Desktop", "伤寒理解-病理生理.xlsx")
OUT = "药对频次"
HERE = os.path.dirname(os.path.abspath(__file__))

spec = importlib.util.spec_from_file_location("herbmod", os.path.join(HERE, "build_herb_index.py"))
herbmod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(herbmod)

# Top 药对的配伍义（hermesagent 视角：只说这一对在病理生理上解决什么）
PAIR_NOTE = {
    ("干姜", "制附子"): "回阳救逆的核心对：附子复心搏出量与末梢灌注，干姜温中焦以续后天之火力——单用附子「走而不守」，得干姜则「守而不走」，故四逆辈以姜附同用。",
    ("桂枝", "芍药"): "调和营卫的基准对：桂枝扩张体表血管（通阳），芍药收敛营阴、缓解平滑肌痉挛（和营），一散一收即把汗出—恶风的自主神经失衡拉回中线。",
    ("柴胡", "黄芩"): "和解少阳的核心对：柴胡透达半表半里、降炎症负荷，黄芩清胆肠之热，二者把「往来寒热」的周期性毒血症状压平。",
    ("桂枝", "炙甘草"): "温复心阳的最小方：桂枝温通心脉、甘草补中益气，用于发汗过多后的心悸（心搏代偿）。",
    ("生姜", "半夏"): "降逆止呕的固定对：半夏降胃气、生姜散水气并制半夏之毒，凡呕、噫气、心下逆满皆用。",
    ("大枣", "炙甘草"): "守中护液的基础对：甘草缓急、大枣补液护胃，凡汗吐下后需「留一分胃气」者皆配。",
    ("人参", "炙甘草"): "补气复脉的基础对：人参提气、甘草守中，用于津气两伤（脉微、少气、口渴）。",
    ("茯苓", "桂枝"): "温阳化水的对：茯苓利水渗湿（降低体液潴留），桂枝通阳化气（恢复气化动力），治水气上冲。",
    ("白术", "茯苓"): "健脾利水对：白术运脾燥湿、茯苓淡渗下行，解决「水停中焦」的输布障碍。",
    ("栀子", "淡豆豉"): "清宣郁热的对：栀子导热下行、豆豉宣透郁结，专治无形之热扰胸膈（虚烦、懊憹）。",
    ("知母", "石膏"): "清热生津的对：石膏直折高热、知母滋阴保液，对应「高代谢＋大量出汗」的容量丢失。",
    ("大黄", "芒硝"): "攻下软坚的对：大黄促肠蠕动、芒硝高渗软化粪块，用于燥实内结（痞满燥实）。",
    ("黄连", "黄芩"): "清热燥湿的对：黄芩偏上焦与胆肠、黄连偏中焦与心，合用以治湿热或寒热错杂之痞利。",
    ("大黄", "枳实"): "行气通下的对：枳实破气消痞、大黄泄实，解决「气滞＋壅实」的肠腔积滞（痞满实）。",
    ("厚朴", "枳实"): "破气除满的对：厚朴宽中下气、枳实破结，用于腹满、胸满而按之硬者。",
    ("牡蛎", "龙骨"): "重镇安神的对：龙骨牡蛎潜阳固摄，用于烦躁、惊狂、失精（中枢兴奋性过高）。",
    ("当归", "桂枝"): "温经养血的通路对：当归补血、桂枝温通，用于血虚寒凝之手足厥寒、脉细欲绝。",
    ("黄连", "干姜"): "辛开苦降的对：黄连清上热、干姜温下寒，治寒热错杂之痞（心下痞、肠鸣）。",
    ("半夏", "黄连"): "化痰消痞的对：半夏散结化痰、黄连泄热，用于痰热互结的小结胸或痞证。",
    ("麻黄", "桂枝"): "发汗解表的对：麻黄开腠理发汗、桂枝通阳助其力，用于表实无汗（麻黄汤）。",
    ("麻黄", "杏仁"): "宣肺平喘的对：麻黄宣肺、杏仁降气，解决气道痉挛与分泌物增多（无汗而喘）。",
    ("甘草", "桔梗"): "利咽的对：桔梗宣肺利咽、甘草清热解毒，用于客热咽痛。",
    ("干姜", "白术"): "温中健脾的对：干姜温中散寒、白术健脾燥湿，治太阴虚寒之吐利。",
    ("人参", "制附子"): "回阳益气的对：附子回阳救逆、人参益气生津，用于亡阳脱液（四逆加人参汤）。",
    ("桂枝", "炙甘草"): "「通阳」这一功能的通用件：在 33 方中出现，是桂枝汤类、柴胡类、泻心类共用的最小骨架；单用即桂枝甘草汤——桂枝通心脉、甘草守中，治发汗过多后的心悸、叉手自冒心。",
    ("大枣", "生姜"): "和胃气的基础对：生姜散水降逆、大枣补液护胃；凡需「留胃气、防药伤中」者都配——桂枝汤、柴胡类、泻心三方共有的底座。",
    ("炙甘草", "生姜"): "一散一守的对：生姜走而不守，炙甘草守而不走，用于汗吐下后胃气已伤而仍需降逆者。",
    ("大枣", "桂枝"): "通阳与补液的对：桂枝开表易耗津，大枣补液固中，二者把「发汗」限定在不伤津的范围内（桂枝汤、柴胡桂枝汤）。",
    ("炙甘草", "芍药"): "柔筋缓急对（芍药甘草汤的核心）：芍药缓解平滑肌痉挛、甘草补中缓急，用于脚挛急、腹中急痛。",
    ("桂枝", "生姜"): "通阳散寒的对：生姜助桂枝走表散寒，用于表寒较重或需兼降逆者（桂枝汤、大青龙）。",
    ("大枣", "芍药"): "补液与敛阴的对：芍药敛营、大枣补液，防止桂枝类方发散太过（小建中、当归四逆）。",
    ("生姜", "芍药"): "散水与缓急的对：生姜散水气、芍药缓筋脉，见于柴胡类与建中类。",
    ("干姜", "炙甘草"): "温中守中的对：干姜温中焦、炙甘草守中气，用于里寒诸方（理中、四逆、泻心）。",
    ("桂枝", "茯苓"): "温阳化水（苓桂剂核心）：桂枝通阳化气、茯苓利水渗湿。",
    ("桃仁", "大黄"): "逐瘀泄热的对：桃仁破血、大黄泄热，用于下焦蓄血（如狂、少腹急结）。",
    ("水蛭", "虻虫"): "破血逐瘀的峻对：二者专入血分，用于蓄血重证（发狂、少腹硬满）。",
    ("五味子", "干姜"): "敛肺温中的对：干姜细辛温化水饮、五味子收敛肺气，用于寒饮咳喘（小青龙）。",
    ("芍药", "炙甘草"): "柔筋缓急的对：芍药缓解平滑肌痉挛、甘草补中，用于脚挛急、腹中急痛。",
    ("厚朴", "杏仁"): "降气平喘的对：厚朴下气、杏仁降肺，用于喘家（桂枝加厚朴杏子汤）。",
    ("石膏", "麻黄"): "清肺平喘的对：麻黄宣肺、石膏清泄肺热，用于汗出而喘（麻杏甘石汤）。",
    ("制附子", "白术"): "温阳除湿的对：附子温经、白术燥湿，用于寒湿身痛（附子汤）。",
    ("桂枝", "葛根"): "解肌升津的对：葛根升津舒筋、桂枝解肌，用于项背强几几。",
    ("黄芩", "芍药"): "清热缓急的对：黄芩清胆肠之热、芍药缓肠痉挛，用于热利腹痛（黄芩汤）。",
    ("白头翁", "黄柏"): "凉血止痢的对：白头翁清热解毒凉血、黄柏清下焦湿热，用于热利下重。",
    ("赤石脂", "禹余粮"): "涩肠固脱的对：二者重涩，用于下焦滑脱不禁（利不止）。",
    ("吴茱萸", "生姜"): "温胃降逆的对：吴茱萸暖肝温胃、生姜散寒止呕，用于干呕吐涎沫、头痛。",
    ("旋覆花", "代赭石"): "降逆化痰的对：旋覆花下气消痰、代赭石重镇降逆，用于噫气不除。",
    ("制附子", "细辛"): "温经散寒的对：附子温阳、细辛走窜通络，用于少阴兼表（反发热、脉沉）。",
    ("黄连", "阿胶"): "滋阴降火的对：黄连清心火、阿胶滋肾阴，用于阴虚阳亢之不得卧。",
}


def main():
    wb = openpyxl.load_workbook(XLSX)
    ws = wb["01七言"]

    fang_herbs = defaultdict(set)      # 方 → 药集合
    fang_codes = defaultdict(set)      # 方 → 条文号
    for r in range(2, 123):
        code = ws.cell(r, 3).value
        if code in ("阳明病", "少阳病", "三阴病", "杂病"):
            continue
        fang_cell = str(ws.cell(r, 8).value or "")
        for fang, name, _dose in herbmod.parse_herbs(ws.cell(r, 9).value or "", fang_cell):
            fang_herbs[fang].add(name)
            fang_codes[fang].add(code)

    pair_fangs = defaultdict(set)
    for fang, herbs in fang_herbs.items():
        for a, b in combinations(sorted(herbs), 2):
            pair_fangs[(a, b)].add(fang)

    pairs = sorted(pair_fangs.items(), key=lambda kv: (-len(kv[1]), kv[0]))
    pair_codes = {}
    for (a, b), fangs in pair_fangs.items():
        codes = set()
        for f in fangs:
            codes |= fang_codes[f]
        pair_codes[(a, b)] = sorted(codes)

    mate = defaultdict(list)           # 单药 → [(搭档, 方数)]
    for (a, b), fangs in pair_fangs.items():
        mate[a].append((b, len(fangs)))
        mate[b].append((a, len(fangs)))

    if OUT in wb.sheetnames:
        del wb[OUT]
    out = wb.create_sheet(OUT)
    out["A1"] = "药对频次 · 以「方」为单位统计同方内两味药的同现"
    out["A1"].font = Font(name="仿宋", size=13, bold=True)
    out["A2"] = (f"共 {len(fang_herbs)} 方、{len(pair_fangs)} 个药对。计入规则：同一方在多条出现只计一次"
                 "（条文号并列在列内，可回查）。用途：把「方族」从方名层面下沉到配伍层面——"
                 "看哪两味药反复同现，就知道这一族群真正的结构骨架。")
    out["A2"].font = Font(name="等线", size=9)
    out["A2"].alignment = Alignment(wrap_text=True, vertical="top")
    out.merge_cells("A2:F2")
    out.row_dimensions[2].height = 30

    wrap = Alignment(wrap_text=True, vertical="top")
    fill = PatternFill("solid", fgColor="F2EADC")

    def row(r, vals, bold=False):
        for c, v in enumerate(vals, 1):
            cell = out.cell(r, c, v)
            cell.font = Font(name="仿宋", size=11, bold=True, color="FF0000FF") if bold else Font(name="等线", size=10)
            cell.alignment = wrap
            if bold:
                cell.fill = fill

    r = 4
    out.cell(r, 1, "① 药对总表（按同现方数降序；仅列 ≥3 方的药对）").font = Font(name="宋体", size=11, bold=True)
    r += 1
    row(r, ["药对", "同现方数", "同现条文数", "出现条文号", "方（前 8）", "配伍义（病理生理 / 靶点）"], bold=True)
    r += 1
    strong = [(k, v) for k, v in pairs if len(v) >= 3]
    for (a, b), fangs in strong:
        note = PAIR_NOTE.get((a, b)) or PAIR_NOTE.get((b, a)) or ""
        row(r, [f"{a}＋{b}", len(fangs), len(pair_codes[(a, b)]),
                "、".join(pair_codes[(a, b)][:8]) + ("…" if len(pair_codes[(a, b)]) > 8 else ""),
                "、".join(sorted(fangs)[:8]) + ("…" if len(fangs) > 8 else ""), note])
        r += 1
    chart_first, chart_last = 6, r - 1

    # Top20 条形图（放在右侧）
    top = strong[:20]
    if top:
        ch = BarChart()
        ch.type = "bar"
        ch.style = 10
        ch.title = "Top 20 药对（同现方数）"
        ch.y_axis.title = "同现方数"
        ch.height = 11
        ch.width = 15
        data = Reference(out, min_col=2, min_row=chart_first - 1, max_row=chart_first - 1 + len(top))
        cats = Reference(out, min_col=1, min_row=chart_first, max_row=chart_first - 1 + len(top))
        ch.add_data(data, titles_from_data=True)
        ch.set_categories(cats)
        out.add_chart(ch, f"H4")

    # ② 单药最强搭档
    r += 1
    out.cell(r, 1, "② 单药最强搭档（每味药前 3 个搭档，按同现方数）").font = Font(name="宋体", size=11, bold=True)
    r += 1
    row(r, ["药", "搭档 1", "搭档 2", "搭档 3", "搭档数（不同药味）"], bold=True)
    r += 1
    for herb, lst in sorted(mate.items(), key=lambda kv: -len(kv[1])):
        lst.sort(key=lambda x: -x[1])
        tops = lst[:3]
        row(r, [herb] + [f"{n}（{c} 方）" for n, c in tops] + [len({f for f, _ in lst})])
        r += 1

    # ③ 高频药对解读（只取已撰写的）
    r += 1
    out.cell(r, 1, "③ 高频药对解读（hermesagent 视角：这一对在病理生理上解决什么）").font = Font(name="宋体", size=11, bold=True)
    r += 1
    out.cell(r, 1, "底座发现：前 8 位药对全部出自「姜、枣、炙甘草、桂枝、芍药」这一组——桂枝＋炙甘草 33 方最高，"
                   "说明全书真正的共同底座不是某个方，而是「和胃气＋守津液＋通阳」三件事的组合；方族的差别体现在这层底座上再加什么（加麻黄则发汗、加柴胡则和解、加姜附则回阳）。")
    out.cell(r, 1).font = Font(name="等线", size=9.5, italic=True)
    out.cell(r, 1).alignment = Alignment(wrap_text=True, vertical="top")
    out.merge_cells(start_row=r, start_column=1, end_row=r, end_column=6)
    out.row_dimensions[r].height = 32
    r += 2
    row(r, ["药对", "同现方数", "解读"], bold=True)
    r += 1
    seen = []
    for (a, b), fangs in pairs:
        note = PAIR_NOTE.get((a, b)) or PAIR_NOTE.get((b, a))
        if note:
            row(r, [f"{a}＋{b}", len(fangs), note])
            r += 1
            seen.append((a, b))

    for col, w in zip("ABCDEF", (18, 12, 12, 26, 40, 66)):
        out.column_dimensions[col].width = w
    out.freeze_panes = "A5"

    wb.save(XLSX)
    print(f"方 {len(fang_herbs)} · 药对 {len(pair_fangs)} · ≥3 方 {len(strong)} · 已解读 {len(seen)}")
    print("Top12:")
    for (a, b), fangs in pairs[:12]:
        print(f"   {a}＋{b}: {len(fangs)} 方 | {'、'.join(sorted(fangs)[:5])}")
    print("saved", XLSX)


if __name__ == "__main__":
    main()
