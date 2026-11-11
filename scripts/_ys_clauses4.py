# -*- coding: utf-8 -*-
"""18 第四步：从《药物警戒质量管理规范》(GVP 2021) 文本副本抽 G01–G13 条文。"""
import io
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = os.path.join(ROOT, "standards", "yaoshi-guanli")
TXT = os.path.join(D, "sources", "GVP-2021.txt")
NUM = "一二三四五六七八九十百零"


def load_articles():
    t = io.open(TXT, encoding="utf-8").read()
    parts = re.split(r"(?=^第[" + NUM + r"]+条)", t, flags=re.M)
    arts = {}
    for a in parts[1:]:
        m = re.match(r"(第[" + NUM + r"]+条)", a)
        if not m:
            continue
        k, body = m.group(1), a.strip()
        if "。" not in body:
            continue
        if k not in arts or len(body) > len(arts[k]):
            arts[k] = body
    return arts


A = load_articles()

PICK = [
 ("G01", "第三条", "持有人与申办者应当建立药物警戒体系，通过体系运行监测、识别、评估和控制药品不良反应及其他与用药有关的有害反应。"),
 ("G02", "第十五条", "持有人是药物警戒的责任主体；委托开展相关工作的，相应法律责任仍由持有人承担。"),
 ("G03", "第二十三条", "法定代表人或主要负责人对药物警戒活动全面负责，应指定药物警戒负责人并配备足够数量且具适当资质的人员。"),
 ("G04", "第四十九条", "个例报告按时限提交：严重不良反应不迟于获知后 15 日，非严重不良反应按规定时限（30 日）。"),
 ("G05", "第五十五条", "持有人应当对各种途径收集的疑似不良反应信息开展信号检测，及时发现新的安全风险。"),
 ("G06", "第六十一条", "同一批号（或相邻批号）药品短期内集中出现多例临床表现相似的疑似不良反应（聚集性事件）时的处置要求。"),
 ("G07", "第六十二条", "持有人应当及时对新的安全风险开展评估，分析影响因素、描述风险特征、判定风险类型并决定是否采取控制措施。"),
 ("G08", "第六十八条", "风险可能严重危害患者生命安全或公众健康时，应立即采取暂停生产、销售、使用、召回等措施。"),
 ("G09", "第八十条", "定期安全性更新报告：创新药与改良型新药自取得批准证明文件起每满 1 年提交一次，至首次再注册后每 5 年一次。"),
 ("G10", "第九十六条", "药物警戒计划是上市后风险管理计划的组成部分，描述安全性特征与管理风险的方式。"),
 ("G11", "第一百一十三条", "药物警戒记录和数据至少保存至药品注册证书注销后十年，并防止损毁、丢失。"),
 ("G12", "第一百一十五条", "持有人转让药品上市许可的，应当同时移交药物警戒的所有相关记录和数据。"),
 ("G13", "第一百二十四条", "临床试验中致死或危及生命的可疑且非预期严重不良反应，申办者应首次获知后尽快报告，不得超过 7 日。"),
]

clauses, missing = [], []
for cid, art, zh in PICK:
    body = A.get(art)
    if not body:
        missing.append((cid, art))
        continue
    clauses.append({"id": cid, "source": "NMPA-GVP-2021", "clause": art, "原文": body, "zh": zh})

path = os.path.join(D, "外源条文.json")
data = json.load(io.open(path, encoding="utf-8"))
data["sources"]["NMPA-GVP-2021"] = {
    "file": "药物警戒质量管理规范.doc",
    "title": "药物警戒质量管理规范（国家药品监督管理局 2021 年第 65 号公告，2021-12-01 施行）",
    "revised": "2021",
    "url": "（用户提供官方发布件，.doc 原件）",
    "textfile": "GVP-2021.txt",
    "note": "原件为 .doc（旧版 Word）；文本副本 GVP-2021.txt 由 Word COM 转 .docx 后经 python-docx 抽取，"
            "未做任何改写；校勘走 txt 通道，原件 sha256 另行登记。",
}
data["clauses"] = data["clauses"] + clauses
data["note"] = ("药事管理学 外源条文层：只收 sources/ 下原件里逐字可查的条文（约定见 补源约定.md）。"
                "Y＝《药品注册管理办法》(2020)，M＝《药品管理法》(2019)，E＝《实施条例》(828 号令, 2026)，G＝《药物警戒质量管理规范》(2021)。"
                "原文整条照录，中文一栏为本库转述。")
json.dump(data, io.open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("G 段", len(clauses), "总条", len(data["clauses"]), "缺", missing)
for c in clauses:
    print(c["id"], c["clause"], len(c["原文"]), c["原文"][:34].replace("\n", " "))
