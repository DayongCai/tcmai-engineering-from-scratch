# -*- coding: utf-8 -*-
"""18 第五步：从《药品生产质量管理规范》(GMP 2010) 抽 P01–P15。"""
import io
import json
import os
import re

import pdfplumber

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = os.path.join(ROOT, "standards", "yaoshi-guanli")
PDF = os.path.join(D, "sources", "GMP-2010.pdf")
NUM = "一二三四五六七八九十百零"


def load_articles():
    with pdfplumber.open(PDF) as p:
        raw = "\n".join((pg.extract_text() or "") for pg in p.pages)
    # 页脚「- 1 -X卫生部发布国家市场监督管理总局规章」会在跨页处夹进正文，先剔除
    raw = re.sub(r"-\s*\d{1,3}\s*-\s*X?\s*", "", raw)
    raw = raw.replace("卫生部发布", "").replace("国家市场监督管理总局规章", "")
    parts = re.split(r"(?=^第[" + NUM + r"]+条)", raw, flags=re.M)
    arts = {}
    for a in parts[1:]:
        m = re.match(r"(第[" + NUM + r"]+条)", a.strip())
        if not m or "。" not in a:
            continue
        key, body = m.group(1), a.strip()
        key = re.sub(r"\s+", "", key)
        body = re.sub(r"\n", "", body)
        # 章/节标题会粘在正文末尾（如「……欺骗行为。第二章 质量管理第一节 原 则」），截掉
        cut = re.search(r"第[一二三四五六七八九十]+[章节]", body[20:])
        if cut:
            body = body[: 20 + cut.start()].strip()
        if key not in arts or len(body) > len(arts[key]):
            arts[key] = body
    return arts


A = load_articles()

PICK = [
 ("P01", "第二条", "企业应当建立药品质量管理体系，涵盖影响药品质量的所有因素。"),
 ("P02", "第四条", "企业应当严格执行本规范，坚持诚实守信，禁止任何虚假、欺骗行为。"),
 ("P03", "第十六条", "企业应设独立的质量管理部门，履行质量保证与质量控制职责。"),
 ("P04", "第二十条", "关键人员至少包括企业负责人、生产管理负责人、质量管理负责人和质量受权人，且应为全职。"),
 ("P05", "第二十五条", "质量受权人的资质要求，以及产品放行的决定职责。"),
 ("P06", "第一百三十八条", "确认或验证的范围和程度应当经过风险评估来确定。"),
 ("P07", "第一百四十四条", "确认和验证不是一次性行为，需根据产品质量回顾分析进行再确认或再验证。"),
 ("P08", "第一百六十二条", "每批药品应当有批记录（批生产、批包装、批检验、放行审核）。"),
 ("P09", "第一百九十五条", "应尽可能避免偏差；一旦出现，按偏差处理操作规程执行。"),
 ("P10", "第二百三十一条", "持续稳定性考察的目的：在有效期内监控已上市药品质量，发现与生产相关的稳定性问题。"),
 ("P11", "第二百四十条", "企业应建立变更控制系统，对所有影响产品质量的变更进行评估和管理。"),
 ("P12", "第二百五十二条", "企业应建立纠正措施和预防措施系统，对投诉、召回、偏差、自检等调查并采取措施。"),
 ("P13", "第二百六十六条", "每年对所有生产的药品按品种进行产品质量回顾分析。"),
 ("P14", "第三百零六条", "质量管理部门应定期组织自检，评估是否符合本规范并提出纠正预防措施。"),
 ("P15", "第二百七十八条", "委托生产/检验须签订书面合同，明确各方责任。"),
]

clauses, missing = [], []
for cid, art, zh in PICK:
    body = A.get(art)
    if not body:
        missing.append((cid, art))
        continue
    clauses.append({"id": cid, "source": "MOH-GMP-2010", "clause": art, "原文": body, "zh": zh})

path = os.path.join(D, "外源条文.json")
data = json.load(io.open(path, encoding="utf-8"))
data["sources"]["MOH-GMP-2010"] = {
    "file": "GMP-2010.pdf",
    "title": "药品生产质量管理规范（2010 年修订，卫生部令第 79 号，2011-03-01 施行）",
    "revised": "2010",
    "url": "（用户提供官方发布件，PDF）",
}
data["clauses"] = data["clauses"] + clauses
data["note"] = ("药事管理学 外源条文层：只收 sources/ 下原件里逐字可查的条文（约定见 补源约定.md）。"
                "Y＝注册办法(2020)，M＝药品管理法(2019)，E＝实施条例(828, 2026)，G＝GVP(2021)，P＝GMP(2010)。"
                "原文整条照录，中文一栏为本库转述。")
json.dump(data, io.open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("P 段", len(clauses), "总条", len(data["clauses"]), "缺", missing)
for c in clauses:
    print(c["id"], c["clause"], len(c["原文"]), c["原文"][:32].replace("\n", ""))
