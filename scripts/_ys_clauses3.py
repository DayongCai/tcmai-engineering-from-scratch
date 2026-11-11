# -*- coding: utf-8 -*-
"""18 第三步：从《药品管理法实施条例》(828 号令) 官方 HTML 抽 E01–E12，追加进 外源条文.json。"""
import html as H
import io
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = os.path.join(ROOT, "standards", "yaoshi-guanli")
SRC = os.path.join(D, "sources", "实施条例-828.html")
NUM = "一二三四五六七八九十百零"


def load_articles():
    raw = io.open(SRC, encoding="utf-8", errors="ignore").read()
    raw = re.sub(r"(?is)<(script|style).*?</\1>", "", raw)
    txt = H.unescape(re.sub(r"<[^>]+>", "\n", raw))
    txt = re.sub(r"[ \t\u3000]+", " ", txt)
    # 只在「行首的条标」处切分：正文里「药品管理法第九十八条」这类交叉引用会把条文切断
    parts = re.split(r"(?=\n\s*第[" + NUM + r"]+条[\u3000\s])", "\n" + txt)
    arts = {}
    for a in parts[1:]:
        m = re.match(r"(第[" + NUM + r"]+条)", a.strip())
        if not m:
            continue
        body = a.strip()
        if "。" not in body:
            continue
        k = m.group(1)
        body = re.sub(r"\n\s*\n+", "\n", body)
        if k not in arts or len(body) > len(arts[k]):
            arts[k] = body
    return arts


A = load_articles()

PICK = [
 ("E01", "第七十一条", "把药品管理法第九十八条第二款第二项所指的假药情形细化成可判断的具体形态。"),
 ("E02", "第七十二条", "认定假药/劣药的三条路径：点明情形不需检验、其余应检验、原料辅料记录足以证明时可以不检验。"),
 ("E03", "第六十九条", "标准项目与方法检不出掺杂掺假时，可用经批准的补充检验项目和方法，结果可作为认定药品质量的依据。"),
 ("E04", "第六十七条", "对检验结果有异议，可在收到结果之日起 7 日内申请复验。"),
 ("E05", "第八十六条", "经营企业、医疗机构履行进货检查验收等义务且有充分证据证明不知情时免予处罚，但应收缴假劣药，损害仍须赔偿。"),
 ("E06", "第八十二条", "提供虚假证明、数据、资料、样品骗取许可的，10 年内不受理相应申请，并处 50 万至 500 万元罚款。"),
 ("E07", "第三十一条", "持有人可委托生产但受托方不得再次委托；血液制品、麻精毒放与易制毒类药品不得委托生产。"),
 ("E08", "第三十九条", "中药饮片生产企业应当自行炮制中药饮片，不得委托炮制。"),
 ("E09", "第四十六条", "疫苗、血液制品、麻精毒放与易制毒类药品不得网络销售；其他风险较高药品不得网络零售。"),
 ("E10", "第二十一条", "儿童用药品与罕见病治疗用药品可获市场独占期（分别不超过 2 年、7 年）。"),
 ("E11", "第二十二条", "含新型化学成份药品等的未披露试验数据受保护，期限自注册之日起不超过 6 年。"),
 ("E12", "第五十七条", "列举不得作为医疗机构制剂的七类药品。"),
]

clauses, missing = [], []
for cid, art, zh in PICK:
    body = A.get(art)
    if not body:
        missing.append((cid, art))
        continue
    clauses.append({"id": cid, "source": "STATE-实施条例-828", "clause": art, "原文": body, "zh": zh})

path = os.path.join(D, "外源条文.json")
data = json.load(io.open(path, encoding="utf-8"))
data["sources"]["STATE-实施条例-828"] = {
    "file": "实施条例-828.html",
    "title": "中华人民共和国药品管理法实施条例（国务院令第 828 号，2026-01-16 公布，2026-05-15 施行）",
    "revised": "2026",
    "url": "https://www.gov.cn/gongbao/2026/issue_12546/202602/content_7057461.html",
    "note": "来源：中国政府网·国务院公报 2026 年第 4 号（官方发布页，HTML 无 PDF）；落盘为原页 HTML，校勘时按标签剥离取正文。",
}
data["clauses"] = data["clauses"] + clauses
data["note"] = ("药事管理学 外源条文层：只收 sources/ 下原件里逐字可查的条文（约定见 补源约定.md）。"
                "Y 段＝《药品注册管理办法》(2020)，M 段＝《药品管理法》(2019)，E 段＝《药品管理法实施条例》(828 号令, 2026)。"
                "原文整条照录，中文一栏为本库转述。")
json.dump(data, io.open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("E 段", len(clauses), "总条", len(data["clauses"]), "缺", missing)
for c in clauses:
    print(c["id"], c["clause"], len(c["原文"]), c["原文"][:36].replace("\n", " "))
