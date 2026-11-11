# -*- coding: utf-8 -*-
"""18-药事管理学：从《药品注册管理办法》(2020) 抽取条文 + 构建外源课（10 章）。"""
import io
import json
import os
import re

import pdfplumber

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SUB, DEPT = "yaoshi-guanli", "departments/02-zhongyao/18-yaoshi-guanli-xue"
SRC = os.path.join(ROOT, "standards", SUB, "sources")
PDF = os.path.join(SRC, "药品注册管理办法-2020.pdf")

NUM = "一二三四五六七八九十百零"


def load_articles():
    with pdfplumber.open(PDF) as p:
        raw = "\n".join((pg.extract_text() or "") for pg in p.pages)
    flat = re.sub(r"\n", "", raw)          # 合并断行；比对时 norm 也去空白，等价
    flat = flat.replace("\u00ad", "")
    parts = re.split(r"(?=第[" + NUM + r"]+条)", flat)
    arts = {}
    for a in parts[1:]:
        m = re.match(r"(第[" + NUM + r"]+条)", a)
        if not m:
            continue
        key, body = m.group(1), a.strip()
        # 交叉引用（如「第一百一十六条 …… 违反本办法第二十八条、」）也会被切出来，
        # 其特征是编号后紧跟「、」或正文极短；只保留最长且含句号的那一段。
        if "。" not in body:
            continue
        if key not in arts or len(body) > len(arts[key]):
            arts[key] = body
    return arts


ARTS = load_articles()

# (id, 条号, 中文转述)
PICK = [
 ("Y01", "第三条", "药品注册的定义：申请人依法定程序提出临床试验、上市许可、再注册等申请，监管方审查后决定是否同意。"),
 ("Y02", "第四条", "药品按中药、化学药、生物制品分类注册；中药再按创新药、改良型新药、古代经典名方等分类。"),
 ("Y03", "第七条", "注册管理遵循公开公平公正，以临床价值为导向，鼓励创新、推动仿制药发展。"),
 ("Y04", "第九条", "申请人须为能承担相应法律责任的企业或研制机构。"),
 ("Y05", "第十条", "提出上市注册前，须完成药学、药理毒理学与药物临床试验等研究。"),
 ("Y06", "第十二条", "注册证书有效期五年；有效期内持有人须持续保证安全、有效与质量可控。"),
 ("Y07", "第十三条", "国家建立药品加快上市注册制度。"),
 ("Y08", "第十九条", "支持中药传承与创新，建立符合中药特点的注册管理与技术评价体系。"),
 ("Y09", "第二十条", "药物临床试验是以药品上市注册为目的、在人体开展的安全性有效性研究。"),
 ("Y10", "第二十一条", "药物临床试验分Ⅰ—Ⅳ期及生物等效性试验。"),
 ("Y11", "第二十五条", "开展药物临床试验须经伦理委员会审查同意。"),
 ("Y12", "第二十八条", "申办者须定期提交研发期间安全性更新报告（每年）。"),
 ("Y13", "第三十条", "发现安全性问题或其他风险时，申办者须及时调整方案、暂停或终止试验。"),
 ("Y14", "第三十二条", "药物临床试验须在批准后三年内实施。"),
 ("Y15", "第三十三条", "开展试验前须在登记与信息公示平台登记试验方案等信息。"),
 ("Y16", "第三十四条", "提出上市许可申请须完成支持上市的研究、确定质量标准并完成商业规模生产工艺验证。"),
 ("Y17", "第三十九条", "综合审评结论通过的，批准上市并发给注册证书；不通过的作出不予批准决定。"),
 ("Y18", "第四十五条", "药品注册核查：核实申报资料真实性、一致性与商业化生产条件，检查研制合规性。"),
 ("Y19", "第五十一条", "药品注册检验包括标准复核与样品检验。"),
 ("Y20", "第六十三条", "符合情形（严重危及生命且无有效治疗手段等）可申请附条件批准。"),
 ("Y21", "第六十六条", "附条件批准后，持有人须采取风险管理措施并按期完成承诺的研究。"),
 ("Y22", "第七十七条", "上市后变更按对安全性、有效性、质量可控性的影响程度实行分类管理。"),
 ("Y23", "第八十二条", "持有人应在注册证书有效期届满前六个月申请再注册。"),
 ("Y24", "第一百一十条", "法定情形下注销药品注册证书并公布。"),
]

clauses = []
for cid, art, zh in PICK:
    body = ARTS.get(art)
    if not body:
        print("!! 缺条", cid, art)
        continue
    clauses.append({"id": cid, "source": "NMPA-注册办法-2020", "clause": art, "原文": body, "zh": zh})

out = {
 "note": "药事管理学 外源条文层：只收 sources/ 下《药品注册管理办法》(2020) PDF 里逐字可查的条文（约定见 补源约定.md）。"
         "原文整条照录（已合并 PDF 断行，norm 亦去空白故等价）；中文一栏是本库转述。",
 "sources": {"NMPA-注册办法-2020": {
    "file": "药品注册管理办法-2020.pdf",
    "title": "药品注册管理办法（国家市场监督管理总局令第 27 号，2020-01-22 公布，2020-07-01 施行）",
    "revised": "2020",
    "url": "（用户提供，官方发布件；附件名《药品管理法》实为同一文件，见 缺口登记.md）"}},
 "clauses": clauses,
}
base = os.path.join(ROOT, "standards", SUB)
json.dump(out, io.open(os.path.join(base, "外源条文.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("clauses", len(clauses))
for c in clauses:
    print(c["id"], c["clause"], c["原文"][:46].replace("\n", " "))
