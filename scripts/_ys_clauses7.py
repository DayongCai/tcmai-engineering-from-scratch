# -*- coding: utf-8 -*-
"""18 第七步：从《中药注册分类及申报资料要求》(2020 年第 68 号) 抽 Z01–Z11。

该文件不是「第X条」体例，按段落锚点截取（锚点＝段落开头若干字）。
"""
import io
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = os.path.join(ROOT, "standards", "yaoshi-guanli")
TXT = os.path.join(D, "sources", "中药注册分类-2020-68.txt")

PARAS = [p.strip() for p in io.open(TXT, encoding="utf-8").read().split("\n") if p.strip()]


def pick(anchor, extra=0):
    for i, p in enumerate(PARAS):
        if p.startswith(anchor):
            tail = PARAS[i + 1: i + 1 + extra]
            return "\n".join([p] + [x for x in tail if len(x) > 4])
    return None


PICK = [
 ("Z01", "中药是指在我国中医药理论指导下", "中药的定义：在中医药理论指导下使用的药用物质及其制剂。"),
 ("Z02", "1.中药创新药。", "创新药定义：处方未收载于国家药品标准、注册标准及《古代经典名方目录》，有临床价值且未在境外上市的新处方制剂。"),
 ("Z03", "1.1中药复方制剂", "创新药情形之一：多味饮片/提取物在中医药理论指导下组方而成的制剂。"),
 ("Z04", "1.3新药材及其制剂", "创新药情形之三：未被国家标准/注册标准/省级药材标准收载的药材，及其新的药用部位。"),
 ("Z05", "2.中药改良型新药。", "改良型新药定义：改变给药途径或剂型且有临床应用优势，或增加功能主治等。"),
 ("Z06", "2.3中药增加功能主治。", "改良型情形之一：增加功能主治（从补充申请改为新药申报路径）。", 1),
 ("Z07", "2.4已上市中药生产工艺", "改良型情形之一：工艺或辅料改变引起药用物质基础或吸收利用明显改变的。"),
 ("Z08", "3.古代经典名方中药复方制剂。", "古代经典名方定义与复方制剂范围（依《中医药法》口径）。"),
 ("Z09", "3.1按古代经典名方目录管理", "3.1 类：按古代经典名方目录管理的中药复方制剂。"),
 ("Z10", "3.2其他来源于古代经典名方", "3.2 类：未按目录管理的经典名方制剂 + 基于经典名方加减化裁的制剂。"),
 ("Z11", "4.同名同方药。", "同名同方药：通用名称、处方、剂型、功能主治、用法及日用饮片量与被仿药相同，且三项性质不低于被仿药。"),
 ("Z12", "天然药物是指在现代医药理论指导下", "天然药物定义，且参照中药注册分类。"),
 ("Z13", "本申报资料项目及要求适用于", "申报资料要求总则：按项目编号提供；无内容的编号与名称仍保留并注明「无相关研究内容」或「不适用」；减免须说明理由。"),
 ("Z14", "1.3.4古代经典名方关键信息", "经典名方制剂应提供处方、基原、药用部位、炮制方法、剂量、用法用量、功能主治等关键信息；3.1 类须与国家发布信息一致。", 1),
]

clauses, missing = [], []
for item in PICK:
    cid, anchor, zh = item[0], item[1], item[2]
    extra = item[3] if len(item) > 3 else 0
    body = pick(anchor, extra)
    if not body:
        missing.append((cid, anchor))
        continue
    clauses.append({"id": cid, "source": "NMPA-ZYFENLEI-2020", "clause": anchor.rstrip("。")[:18], "原文": body, "zh": zh})

path = os.path.join(D, "外源条文.json")
data = json.load(io.open(path, encoding="utf-8"))
data["sources"]["NMPA-ZYFENLEI-2020"] = {
    "file": "中药注册分类-2020-68.doc",
    "title": "中药注册分类及申报资料要求（国家药监局 2020 年第 68 号通告附件）",
    "revised": "2020",
    "url": "https://www.nmpa.gov.cn/directory/web/nmpa/images/1601282559497048444.doc",
    "textfile": "中药注册分类-2020-68.txt",
    "note": "原件为 .doc（NMPA 附件直链可取，页面本体 412）；文本副本由 Word COM→docx→python-docx 抽取，未改写。"
            "该文件非「第X条」体例，条文 id 按段落锚点编号（Z01–Z14）。",
}
data["clauses"] = data["clauses"] + clauses
data["note"] = ("药事管理学 外源条文层：只收 sources/ 下原件里逐字可查的条文（约定见 补源约定.md）。"
                "Y＝注册办法，M＝药品管理法，E＝实施条例，G＝GVP，P＝GMP，S＝GSP，Z＝中药注册分类(68 号)。")
json.dump(data, io.open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("Z 段", len(clauses), "总条", len(data["clauses"]), "缺", missing)
for c in clauses:
    print(c["id"], len(c["原文"]), c["原文"][:34])
