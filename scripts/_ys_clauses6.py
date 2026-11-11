# -*- coding: utf-8 -*-
"""18 第六步：从《药品经营质量管理规范》(GSP 2016 修正) 抽 S01–S14。"""
import io
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = os.path.join(ROOT, "standards", "yaoshi-guanli")
TXT = os.path.join(D, "sources", "GSP-2016.txt")
NUM = "一二三四五六七八九十百零"


def load_articles():
    t = io.open(TXT, encoding="utf-8").read()
    parts = re.split(r"(?=^第[" + NUM + r"]+条)", t, flags=re.M)
    arts = {}
    for a in parts[1:]:
        m = re.match(r"(第[" + NUM + r"]+条)", a.strip())
        if not m or "。" not in a:
            continue
        key, body = m.group(1), a.strip()
        # 章标题若粘在条末，截掉
        cut = re.search(r"第[一二三四五六七八九十]+章", body[15:])
        if cut:
            body = body[: 15 + cut.start()].strip()
        if key not in arts or len(body) > len(arts[key]):
            arts[key] = body
    return arts


A = load_articles()

PICK = [
 ("S01", "第五条", "企业应依法律法规与本规范建立质量管理体系，确定质量方针，制定质量管理体系文件，开展质量策划、质量控制等活动。"),
 ("S02", "第七条", "质量管理体系应与经营范围和规模相适应，包括组织机构、人员、设施设备、体系文件及计算机系统。"),
 ("S03", "第十五条", "企业质量负责人应由高层管理人员担任，全面负责质量管理工作，独立履职并在内部对质量管理具有裁决权。"),
 ("S04", "第十六条", "企业应设立质量管理部门；质量管理部门的职责不得由其他部门及人员履行。"),
 ("S05", "第十七条", "质量管理部门的职责清单（含督促执行、审核、查验、处理质量查询与投诉、不合格药品确认等）。"),
 ("S06", "第五十三条", "对计量器具、温湿度监测设备等定期校准或者检定。"),
 ("S07", "第五十四条", "依验证管理制度形成验证控制文件：验证方案、报告、评价、偏差处理和预防措施。"),
 ("S08", "第五十七条", "建立符合经营全过程管理与质量控制要求的计算机系统，实现药品可追溯。"),
 ("S09", "第七十二条", "按规定程序对到货药品逐批进行收货、验收，防止不合格药品入库。"),
 ("S10", "第八十三条", "根据药品质量特性合理储存（温湿度、分类、避光、堆码等要求）。"),
 ("S11", "第八十四条", "养护人员应根据库房条件、外部环境与药品质量特性开展养护。"),
 ("S12", "第九十二条", "做好药品销售记录（品名、规格、剂型、批号、有效期、生产厂商、购货单位、数量等）。"),
 ("S13", "第一百零五条", "冷藏冷冻药品运输途中应实时监测并记录冷藏车/箱/保温箱内温度数据。"),
 ("S14", "第一百三十七条", "质量管理岗位、处方审核岗位的职责不得由其他岗位人员代为履行。"),
]

clauses, missing = [], []
for cid, art, zh in PICK:
    body = A.get(art)
    if not body:
        missing.append((cid, art))
        continue
    clauses.append({"id": cid, "source": "MOH-GSP-2016", "clause": art, "原文": body, "zh": zh})

path = os.path.join(D, "外源条文.json")
data = json.load(io.open(path, encoding="utf-8"))
data["sources"]["MOH-GSP-2016"] = {
    "file": "GSP-2016.docx",
    "title": "药品经营质量管理规范（2015 年总局令第 13 号公布，2016 年总局令第 28 号修正）",
    "revised": "2016",
    "url": "（用户提供官方发布件，.docx 原件）",
    "textfile": "GSP-2016.txt",
    "note": "原件为 .docx；文本副本 GSP-2016.txt 由 python-docx 直接抽取（未做改写），校勘走 txt 通道。",
}
data["clauses"] = data["clauses"] + clauses
data["note"] = ("药事管理学 外源条文层：只收 sources/ 下原件里逐字可查的条文（约定见 补源约定.md）。"
                "Y＝注册办法(2020)，M＝药品管理法(2019)，E＝实施条例(828, 2026)，G＝GVP(2021)，P＝GMP(2010)，S＝GSP(2016)。"
                "原文整条照录，中文一栏为本库转述。")
json.dump(data, io.open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("S 段", len(clauses), "总条", len(data["clauses"]), "缺", missing)
for c in clauses:
    print(c["id"], c["clause"], len(c["原文"]), c["原文"][:30].replace("\n", ""))
