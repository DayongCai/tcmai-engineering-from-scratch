# -*- coding: utf-8 -*-
"""18-药事管理学 扩课第一步：从《药品管理法》(2019) PDF 抽 M01–M15 条文，追加进 外源条文.json。"""
import io
import json
import os
import re

import pdfplumber

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = os.path.join(ROOT, "standards", "yaoshi-guanli")
PDF = os.path.join(D, "sources", "药品管理法-2019.pdf")
NUM = "一二三四五六七八九十百零"


def load_articles():
    with pdfplumber.open(PDF) as p:
        raw = "\n".join((pg.extract_text() or "") for pg in p.pages)
    raw = re.sub(r"[—–-]\s*\d{1,3}\s*[—–-]", "", raw)
    parts = re.split(r"(?=第[" + NUM + r"]+条)", raw)
    arts = {}
    for a in parts[1:]:
        m = re.match(r"(第[" + NUM + r"]+条)", a)
        if not m or "。" not in a:
            continue
        key, body = m.group(1), a.strip()
        if key not in arts or len(body) > len(arts[key]):
            arts[key] = body
    return arts


A = load_articles()

PICK = [
 ("M01", "第二条", "在境内从事药品研制、生产、经营、使用和监督管理活动适用本法；药品是用于预防、治疗、诊断人的疾病，有目的地调节生理机能并规定适应症或功能主治、用法用量的物质，包括中药、化学药和生物制品等。"),
 ("M02", "第三条", "药品管理以人民健康为中心，坚持风险管理、全程管控、社会共治，建立科学严格的监督管理制度。"),
 ("M03", "第六条", "国家实行药品上市许可持有人制度；持有人依法对药品研制、生产、经营、使用全过程中药品的安全性、有效性和质量可控性负责。"),
 ("M04", "第七条", "从事研制、生产、经营、使用活动应遵守法律法规规章标准规范，保证全过程信息真实、准确、完整和可追溯。"),
 ("M05", "第十二条", "国家建立健全药品追溯制度；监管部门制定统一追溯标准与规范，推进追溯信息互通互享。"),
 ("M06", "第四十三条", "从事药品生产应遵守药品生产质量管理规范，建立健全质量管理体系，保证生产全过程持续符合法定要求。"),
 ("M07", "第五十三条", "从事药品经营应遵守药品经营质量管理规范，建立健全质量管理体系，保证经营全过程持续符合法定要求。"),
 ("M08", "第五十四条", "国家对药品实行处方药与非处方药分类管理制度。"),
 ("M09", "第六十一条", "持有人、药品经营企业通过网络销售药品，应遵守本法药品经营的有关规定。"),
 ("M10", "第六十九条", "医疗机构应配备依法经过资格认定的药师或其他药学技术人员，负责本单位药品管理、处方审核和调配、合理用药指导等工作。"),
 ("M11", "第八十条", "持有人应开展上市后不良反应监测，主动收集、跟踪分析疑似不良反应信息，对已识别风险的药品及时采取风险控制措施。"),
 ("M12", "第九十条", "药品广告内容应真实合法，以核准的说明书为准，不得含有虚假内容。"),
 ("M13", "第九十八条", "禁止生产（包括配制）、销售、使用假药、劣药；并列举假药与劣药的认定情形。"),
 ("M14", "第一百一十八条", "生产销售假药、或生产销售劣药情节严重的，对法定代表人、主要负责人、直接负责的主管人员和其他责任人员没收违法行为发生期间所获收入并处罚款，终身禁业，可由公安机关拘留。"),
 ("M15", "第九十二条", "国家实行药品储备制度，建立中央和地方两级药品储备。"),
]

clauses, missing = [], []
for cid, art, zh in PICK:
    body = A.get(art)
    if not body:
        missing.append((cid, art))
        continue
    clauses.append({"id": cid, "source": "NPC-药品管理法-2019", "clause": art, "原文": body, "zh": zh})

path = os.path.join(D, "外源条文.json")
data = json.load(io.open(path, encoding="utf-8"))
data["sources"]["NPC-药品管理法-2019"] = {
    "file": "药品管理法-2019.pdf",
    "title": "中华人民共和国药品管理法（2019 年 8 月 26 日第十三届全国人民代表大会常务委员会第十二次会议第二次修订，2019-12-01 施行）",
    "revised": "2019",
    "url": "https://faolex.fao.org/docs/pdf/chn217458.pdf",
    "note": "中国全国人大法律文本，经 FAOLEX（联合国粮农组织法律数据库）收录版本取得；"
            "本机未取到中国人大网一手文件（flk.npc.gov.cn 与 gov.cn 均无可用响应），已登记为缺口。",
}
data["clauses"] = data["clauses"] + clauses
data["note"] = ("药事管理学 外源条文层：只收 sources/ 下 PDF 里逐字可查的条文（约定见 补源约定.md）。"
                "Y 段＝《药品注册管理办法》(2020)，M 段＝《药品管理法》(2019)。原文整条照录，中文一栏为本库转述。")
json.dump(data, io.open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("M 段", len(clauses), "总条", len(data["clauses"]), "缺", missing)
for c in clauses:
    print(c["id"], c["clause"], c["原文"][:40].replace("\n", ""))
