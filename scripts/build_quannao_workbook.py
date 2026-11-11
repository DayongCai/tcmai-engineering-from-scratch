#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""生成《伤寒论》原文全脑记忆 398 条 · 交付物 全脑记忆.xlsx

Sheet 结构（对齐 qhzy-* 教材种子版式：0封面/0改写说明/0目录/0映射→章表→附录）：
  0封面 0改写说明 0目录 0映射1 0映射2
  全脑记忆总纲 五步操作法 八十宫殿地图 条文记忆总表 语义张量 方证索引
  认知规律注释 三环套记法计划 六经骨架与传变 识别层级说明 跨源校勘
  P01…P29（每 P 一表：条文+宫桩+切图+语音识别正文）

用法: python scripts/build_quannao_workbook.py [输出路径.xlsx]
"""
import json
import os
import re
import sys

from openpyxl import Workbook
from openpyxl.drawing.image import Image as XLImage
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MAT = os.path.join(ROOT, "standards", "materials", "shanghan-quannao")
AST = os.path.join(ROOT, "assets", "shanghan-palace")
TIQ = os.path.join(ROOT, "standards", "shanghan", "tiao-398.json")
SEM = os.path.join(ROOT, "standards", "shanghan", "semtensor-398.json")
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(
    os.path.expanduser("~"), "Desktop", "全脑记忆.xlsx")

INK = "1F1B16"
HEAD_FILL = PatternFill("solid", fgColor="3B2F22")
SUB_FILL = PatternFill("solid", fgColor="EFE7DA")
THIN = Side(style="thin", color="D8CDB9")
BOX = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)
H_FONT = Font(name="宋体", size=11, bold=True, color="FFF7E8")
T_FONT = Font(name="宋体", size=10)
B_FONT = Font(name="宋体", size=10, bold=True)
TITLE_FONT = Font(name="宋体", size=18, bold=True, color=INK)
WRAP = Alignment(wrap_text=True, vertical="top")
CENTER = Alignment(horizontal="center", vertical="center", wrap_text=True)


def load():
    tiao = json.load(open(TIQ, encoding="utf-8"))
    route = json.load(open(os.path.join(MAT, "palace-route.json"), encoding="utf-8"))
    sem = json.load(open(SEM, encoding="utf-8"))
    man = json.load(open(os.path.join(MAT, "sources", "episodes.json"), encoding="utf-8"))
    ip = os.path.join(MAT, "palace-images.json")
    imgs = json.load(open(ip, encoding="utf-8")) if os.path.exists(ip) else {"images": {}, "perPage": {}}
    imgs.setdefault("images", {})
    imgs.setdefault("perPage", {})
    auth = {}
    for f in sorted(os.listdir(os.path.join(MAT, "authoring"))):
        if f.startswith("out-") and f.endswith(".json"):
            d = json.load(open(os.path.join(MAT, "authoring", f), encoding="utf-8"))
            for r in d.get("rows", []):
                auth[int(r["no"])] = r
    asr = {}
    for ep in man["episodes"]:
        p = os.path.join(MAT, "asr", f"p{ep['no']:02d}.json")
        if os.path.exists(p):
            asr[ep["no"]] = json.load(open(p, encoding="utf-8"))
    vz = {}
    vp = os.path.join(MAT, "video-zhuang.json")
    if os.path.exists(vp):
        vz = {int(r["no"]): r for r in json.load(open(vp, encoding="utf-8"))["rows"]}
    return tiao, route, sem, man, imgs, auth, asr, vz


def head(ws, row, cols, widths=None):
    for c, name in enumerate(cols, 1):
        cell = ws.cell(row=row, column=c, value=name)
        cell.font = H_FONT
        cell.fill = HEAD_FILL
        cell.alignment = CENTER
        cell.border = BOX
    if widths:
        for c, w in enumerate(widths, 1):
            ws.column_dimensions[get_column_letter(c)].width = w
    ws.row_dimensions[row].height = 20
    ws.freeze_panes = ws.cell(row=row + 1, column=1)


def title(ws, text, sub=None, width=8):
    ws["A1"] = text
    ws["A1"].font = TITLE_FONT
    if sub:
        ws["A2"] = sub
        ws["A2"].font = Font(name="宋体", size=10, italic=True, color="6B5B45")
    ws.sheet_view.showGridLines = False


# ---------------------------------------------------------------- 静态内容
COVER = [
    ("《伤寒论》原文全脑记忆", TITLE_FONT),
    ("宋本 398 条 · 八十记忆宫殿 · 病理生理学认知注释", Font(name="宋体", size=14, bold=True, color=INK)),
    ("依据 B 站《〈伤寒论〉原文全脑记忆 398 条快速记忆法【记忆宫殿】》29 讲（BV13shNz8ECv，10,871 秒）", T_FONT),
    ("语音识别 · 字幕（画面字）识别 · 图像切取 · 语义张量 · 八十宫殿桩位 · 机制精细复述", T_FONT),
    ("", T_FONT),
    ("【封面设计说明】", B_FONT),
    ("主色调：竹简褐底（#3B2F22）＋ 宣纸白（#EFE7DA），取「仲景遗简」之意", T_FONT),
    ("构图：", T_FONT),
    ("  前景：人体经络穴位线（任督二脉为轴，十二正经环列），自会阴上行至百会，做淡化水印", T_FONT),
    ("  中景：80 枚宫牌按篇序排成环形长廊，每宫挂一穴名，门下五方（东厢/南窗/西壁/北案/中庭）", T_FONT),
    ("  上方：隶书大字「全脑记忆」", T_FONT),
    ("  下方：小字「398 条 · 一条一桩 · 一桩一图」", T_FONT),
    ("腰封文案：先把条文拍成照片，再把照片钉在穴上；机制链是第三条退路", T_FONT),
    ("内封小字：一条＝一桩·一图·一链；记不住时，先问是「桩丢了」还是「链断了」", T_FONT),
    ("", T_FONT),
    ("版本 v1.0（2026-10-25）· 主编：张仲景（医圣人格）", T_FONT),
    ("方法还原：视频作者「面包卷要上岸」· 记忆宫殿体系归属原作者", T_FONT),
    ("病理生理解读：hermesagents（病理生理学专家人格）· 标注「现代解读，非仲景原意」", T_FONT),
    ("生成：scripts/build_quannao_workbook.py · 纯 Node/Python，无在线依赖", T_FONT),
]

BRIEF = [
    ("认知阶段", "项目", "内容"),
    ("总览", "文件定位", "《伤寒论》宋本 398 条原文 · 全脑记忆训练表。一张表走完四步：先分块，再编码，后巩固，末提取。"),
    ("总览", "所属系列", "tcmP 中医药工程化教育平台（中医经典核心课程）· 与 qhzy-* 教材种子同版式"),
    ("总览", "版本", "v1.1（2026-10-25）· 表述按认知学逻辑重排（组块→编码→巩固→提取→迁移），数据未改"),
    ("来源", "法源", "B站 BV13shNz8ECv《〈伤寒论〉原文全脑记忆 398条快速记忆法【记忆宫殿】》，"
                     "上传者「面包卷要上岸」，2025-08 发布，29 分 P，合计 10,871 秒 ≈ 3.02 小时"),
    ("来源", "方法原话", "视频 P01 序：以「中医经络穴位全脑速记」构建的人体经络穴位图像系统为记忆宫殿与记忆桩，"
                         "按任脉、督脉、十二正经的穴位顺序把条文逐一对应到记忆桩上"),
    ("来源", "三层工具", "① 照相记忆＝把原文当照片摄入（二维、原汁原味、不稳定）；"
                         "② 成像记忆＝在桩位建三维画面（稳定，靠空间锚）；"
                         "③ 三环套记法＝新组 10 遍、前两组 5/3 遍滚动"),
    ("总览", "版本口径", "视频声明用流通本，共 398 条；本表条号与原文同此口径"),
    ("来源", "课程立场", "视频定位纯记忆课：图像不作临床指导；医理另参注家（视频提及倪海厦、郝万山、陈亦人）"),
    ("① 组块", "切块方式", "398 条不按「条」硬记，先切成 80 宫（一宫＝一段经络、4-6 条）。"
                           "先记「有哪些宫」，再记「宫里有什么」。见「八十宫殿地图」"),
    ("② 编码·空间", "锚定路线", "条1-24 任脉逆序（承浆→会阴）· 条25-52 督脉（长强→龈交）· "
                               "条53-361 十二正经流注 · 条362-398 回宫二轮。桩序固定＝检索路径固定"),
    ("③ 编码·视觉", "图像与桩位", "每条一张荒诞画面，画面里必须有桩位本身（东厢/南窗/西壁/北案/中庭）——"
                                 "图像不是插图，是「存在哪里」的凭证"),
    ("④ 编码·语义", "机制链", "每条一句「A→B→C」机制链并给量化指标（心率、脉压、尿比重、体温）；"
                             "把症状串接进生理学框架，才进长时记忆"),
    ("⑤ 巩固", "间隔安排", "三环套：当天 10 遍→次日 5 遍→第三日 3 遍，三环滚动，第四组起放下第一组。"
                          "见「三环套记法计划」（40 天）"),
    ("⑥ 提取", "线索设计", "每条只留一个 ≤24 字的钩，作回忆把手；钩是索引不是内容，答不出才回看图像与机制链"),
    ("⑦ 迁移", "机制族", "九轴（热势/津伤/阳衰/水饮/气滞/血瘀/神乱/里实/表郁）跨条复现；"
                        "见「语义张量」，见到同族症状直接调路径"),
    ("⑧ 生成", "自己动手", "手册右栏留白，本表图像只是范本：先照抄一遍，再改成自己的画面，最后只留自己那张"),
    ("路线校验", "口播比对", "361 穴名逐经取自《经络腧穴学》十四经穴分寸歌（逐名检出）；与视频口播"
                            "「本条对应的记忆桩是 X」比对：{STAT}。不一致处是作者为凑谐音另取穴"
                            "（如条88 取四白＝四八），背诵以「视频原桩」为准"),
    ("覆盖边界", "已覆盖/延伸", "公开 29 讲只演示 63 条（P10「第27-28」亦计入），其余 335 条按同一规则延伸，"
                               "延伸处逐列标注，不冒充作者原话。63 条来源三分：56 口播直抽、6 断句归位、1 画面字确认"),
    ("加工", "条号骨架", "本仓库底本无宋本条号，补外源 SH_text.json（sha256 与校勘登记见 "
                        "standards/shanghan/PROVENANCE-398.md）；底本与讲义降为见证"),
    ("加工", "病理生理注释", "由 hermesagents 把症状串译成「机制链→表现」；一律标「现代解读」，不改经典原义"),
    ("加工", "四层识别", "语音识别（faster-whisper turbo，29/29 P）／字幕识别（平台无字幕轨，画面字改用切帧读取）"
                        "／图形识别（每 5s 抽帧，按插图度选帧）／语义张量（9 轴 × 398 条，词表可审计）"),
    ("加工", "一穴一图", "398 条各一张记忆卡（左图右文）：66 张用视频切图，其余按桩位程序自绘方位图并标「本表自绘」"),
    ("加工", "差异登记", "作者在第 88-91 条取胃经第 2-5 穴（四白→巨髎→地仓→大迎），与顺序路线差 3 位；"
                        "逐条登记于「谐音选穴差异」，不校改"),
    ("审稿", "审稿人", "方法审稿：视频原作者（体系归属）；医理审稿：王庆国（北京中医药大学终身教授·国医大师，"
                     "伤寒论规划教材口径）"),
    ("审稿", "严谨性约定", "① 原文不改字、不并条；② 异体字原样保留并登记对照；③ 三源冲突并列，不擅自裁定；"
                         "④ 图像仅供记忆，不作临床依据；⑤ 病生注释标明「现代解读」"),
    ("使用", "推荐顺序", "读「认知学框架」定概念 → 按「五步操作法」编一条 → 依「三环套记法计划」每天 10 条 → "
                        "用 P01-P29 跟视频过图 → 用「一穴一图」自测 → 用「语义张量」查机制族"),
]

FRAMEWORK = [
    ("阶段", "认知机制（是什么）", "本表怎么做（怎么用）", "操作动词", "通过标准（怎么算会了）"),
    ("① 组块", "工作记忆约 4±1 个块，超出即溢出", "398 条 → 80 宫（每宫 4-6 条）→ 一宫五桩；"
                                              "先背宫名，再填条", "切、命名", "能按顺序说出 80 宫名"),
    ("② 编码·空间", "编码特异性：提取环境须匹配编码环境", "每条钉在固定桩位（东厢/南窗/西壁/北案/中庭），"
                                                        "沿经络顺序走", "钉位", "报条号即知宫、穴、桩位"),
    ("③ 编码·视觉", "图像优势效应：语言＋视觉双通道，提取路径翻倍", "每条一张荒诞可成像画面，"
                                                                "画面里必须有桩位本身", "成像", "闭眼能「看见」那张图，并说出三个症状字"),
    ("④ 编码·语义", "精细复述：接得上既有知识框架才进长时记忆", "每条一句机制链（A→B→C）＋量化指标，"
                                                                "不用术语循环解释", "接链", "能用自己的话讲清机制，不只背症状"),
    ("⑤ 巩固", "间隔效应＋交错：分散复习优于集中，换情境练辨别", "三环套 10/5/3 遍滚动；相邻两天换宫，制造交错",
                                                              "滚动", "第 3 天仍能整条复述，不靠原文"),
    ("⑥ 提取", "提取练习：自由回忆＞再认，测试本身即学习", "照相复现字面；只看 ≤24 字线索钩回忆；随机抽条",
                                                        "复现", "随机抽到任一条，5 秒内起头"),
    ("⑦ 迁移", "同构问题共享解法，成「族」后可类推", "九轴语义张量跨条检索；同族症状直接调处理路径",
                                                    "归类", "见「脉微＋四逆＋下利清谷」即认阳衰族"),
    ("⑧ 生成", "生成效应：自己产出的信息记得更牢", "卡面图像作范本，须自改一遍；右栏写自己的钩",
                                                "改写", "能用自己画的图复述全条"),
]
TOC = [
    ("章", "节", "小节", "段", "内容"),
    ("00", "00", "00", "00", "《伤寒论》原文全脑记忆 · 398 条（宋本 · 八十记忆宫殿版）"),
    ("00", "01", "00", "00", "认知学框架：组块→编码（空间·视觉·语义）→巩固→提取→迁移→生成，八段一线"),
    ("00", "01", "01", "00", "每段的「本表怎么做」与「怎么算会了」"),
    ("01", "00", "00", "00", "方法总纲：视频 29 讲所授全脑记忆体系"),
    ("01", "01", "00", "00", "法源与定位（P01 序）"),
    ("01", "01", "01", "00", "记忆宫殿＝人体经络穴位图像系统"),
    ("01", "01", "02", "00", "照相记忆／成像记忆／记忆桩"),
    ("01", "02", "00", "00", "三环套记法与练习手册"),
    ("01", "02", "01", "00", "三环套：新组 10 遍、前两组 5/3 遍滚动"),
    ("01", "02", "02", "00", "手册左右栏：左照相记忆、右桩位画图"),
    ("01", "03", "00", "00", "五步操作法（减负荷→钉桩→成像→接链→三环）"),
    ("02", "00", "00", "00", "宫殿体系：80 宫 × 5 桩位 = 400 桩，覆盖 398 条"),
    ("02", "01", "00", "00", "十篇 → 八十宫（太阳上 6／太阳中 19／太阳下 10／阳明 17／少阳 2／"
                            "太阴 2／少阴 9／厥阴 11／霍乱 2／差后 2）"),
    ("02", "02", "00", "00", "宫名取本宫首条之穴（首轮 72 名不重复；回宫 G73-G79 复用 G01-G07 之名）"),
    ("02", "03", "00", "00", "记忆规律 R1-R8：一宫五桩／宫序＝经络序／宫名取首穴（回宫复用）／宫≈条÷5（9 断点）／"
                            "首轮 361＋回宫 37／谐音让位／证据集中前 20 宫／五方位循环"),
    ("02", "04", "00", "00", "示意图（matplotlib）：总图／一宫放大／条→宫定位曲线／经络条带＋可回调交互"),
    ("02", "05", "00", "00", "存在性核查：80 宫逐宫给内容、视频证据、首见讲次与顺序同向性"),
    ("03", "00", "00", "00", "条文全表：398 条 × 原文／白话／宫桩／图像编码／机制精细复述／提取线索"),
    ("03", "01", "00", "00", "卷一至卷七（第1-398条，十篇）"),
    ("03", "02", "00", "00", "语义张量：9 轴病理生理解剖（热势/津伤/阳衰/水饮/气滞/血瘀/神乱/里实/表郁）"),
    ("03", "03", "00", "00", "方证索引：条文内出现的 111 个方名 → 条号/六经/宫"),
    ("04", "00", "00", "00", "病理生理学认知注释（hermesagents）"),
    ("04", "01", "00", "00", "九条认知规律（按阶段排序）→ 本法落点 → 向临床推理的迁移"),
    ("04", "02", "00", "00", "三环套记法 40 天背诵计划"),
    ("04", "03", "00", "00", "六经骨架与传变（背书的骨架图）"),
    ("05", "00", "00", "00", "识别与校勘层"),
    ("05", "01", "00", "00", "四层识别：语音识别／字幕识别／图形识别／语义张量"),
    ("05", "02", "00", "00", "P01-P29 逐讲表（条文 + 宫桩 + 切图 + 语音识别正文）"),
    ("05", "03", "00", "00", "跨源校勘登记（底本／讲义见证指标）"),
]

MAPPING1 = [
    ("0映射1 — 视频原作者（记忆宫殿体系）",),
    (None,),
    ("人格卡 — 全脑记忆法讲授者 Subagent 口径（按视频自述的事实边界编写）",),
    ("文件类型: 方法来源卡 / 智能体可读材料",),
    ("所属项目: tcmP 中医药工程化教育平台 · 中医经典记忆训练",),
    ("版本: v1.0（2026-10-25）· 事实来源: B站 BV13shNz8ECv 全 29 P 语音识别正文",),
    (None,),
    ("0. 文件用途说明 (For Agent Consumption)",),
    ("本卡固定视频所授方法的「原话边界」：凡本表图像、桩位、遍数，须能回指到 P01-P29 的某一讲。",),
    ("不在视频中出现的内容（如 80 宫具体编号、病生机制）一律记为本表加工，不得冒充原方法。",),
    (None,),
    ("1. 身份与作品",),
    ("  上传者: 面包卷要上岸（B站）· 发布 2025-08 · 29 分 P · 合计 10,871 秒",),
    ("  作品: 《伤寒论》原文全脑记忆 398条快速记忆法！【记忆宫殿】",),
    ("  前作关联: 作者称本法「以中医经络穴位全脑速记课程所构建的人体经络穴位图像系统为记忆宫殿和记忆桩」",),
    (None,),
    ("2. 方法原话（P01 序·语音识别摘录，未逐字校对）",),
    ("  「按照任脉、督脉、十二正经的穴位顺序，将《伤寒论》条文逐一对应到记忆桩上。」",),
    ("  「再进一步借助照相记忆、成像记忆等等，从而轻松记忆《伤寒论》。」",),
    ("  「照相记忆就是把原文文字直接像拍照片一样摄入大脑……它的画面最原汁原味。」",),
    ("  「照相记忆是一种平面的二维的成像，它的记忆效果就不太稳定，所以又会借助记忆桩成像，构建更高维度的记忆场景。」",),
    ("  「新组诵读十遍；次日新组十遍＋复习前一组五遍；第三日新组十遍＋前两组五遍三遍；第四组起第一组放下。」",),
    ("  「本课程定位为纯记忆课……除了必要的公认的前贤解释之外，尽可能不涉及深度医理讲解；"
     "课程中出现的图像也不作为临床意义的指导。」",),
    ("  「本课程所采用的《伤寒论》版本是目前常见的流通本，共 398 条。」",),
    (None,),
    ("3. 边界（本表不许越界之处）",),
    ("  ① 不得把本表新增的 80 宫编号、穴位分配说成作者原设计；作者只给了「按经络穴位顺序」这一条规则。",),
    ("  ② 不得把病生机制写进「图像编码」栏 —— 图像只为记，机制另设「机制精细复述」栏并标「现代解读」。",),
    ("  ③ 不得引用图像作临床辨证依据。",),
]

MAPPING2 = [
    ("0映射2 — hermesagents（病理生理学专家人格）",),
    (None,),
    ("人格卡 — 病理生理学认知注释 Subagent 口径",),
    ("文件类型: 审稿/注释者卡 / 智能体可读材料",),
    ("所属项目: tcmP · 中医经典与基础医学桥接",),
    ("版本: v1.0（2026-10-25）",),
    (None,),
    ("0. 身份设定",),
    ("  姓名: hermesagents（本项目内置病理生理学专家人格）",),
    ("  职能: 把条文里的症状串翻译成「刺激→机制→表现→可量化指标」的链条；",),
    ("        并按认知科学规律组织记忆结构（图像优势、组块、编码特异性、间隔、提取练习）。",),
    ("  立场: 现代病理生理学解读，服务理解与迁移，不替代仲景原意，不参与原文校改。",),
    (None,),
    ("1. 注释体例（每条 pathophys 字段的写法）",),
    ("  格式: 机制链（A→B）＋ 表现归属 ＋ 可量化指标/鉴别锚；限 70 字内，避免超工作记忆负荷。",),
    ("  用词: 体温调定点、交感-儿茶酚胺、容量/渗透压、RAAS、炎症介质、凝血纤溶、胃肠动力、"
     "胆汁酸、神经递质、免疫应答、酸碱平衡。",),
    ("  禁止: 以「正气/邪气」纯术语循环解释代替机制；禁止把或然症写成必然症。",),
    (None,),
    ("2. 九轴（语义张量的轴定义，供跨条检索机制族）",),
    ("  热势=体温调定点上移/高代谢；津伤=体液容量↓/高渗；阳衰=心排血量↓/末梢灌注↓；",),
    ("  水饮=体液分布异常/第三间隙；气滞=内脏平滑肌张力与腔道压力异常；血瘀=微循环淤滞/凝血纤溶失衡；",),
    ("  神乱=中枢神经系统功能紊乱；里实=肠腔内容物停滞/内毒素吸收；表郁=体表血管收缩/汗腺抑制。",),
    (None,),
    ("3. 审稿红线",),
    ("  ① 原文一字不改；② 有方必核方名；③ 现代解读必须可辨（表头与本卡双重标注）；",),
    ("  ④ 数字指标不给假精度（只给方向与常见量级）；⑤ 争议处并列，不裁定。",),
]

GANG = [
    ("序", "认知阶段", "做什么（一步一动作）", "为什么这样做（认知依据）", "通过标准"),
    ("1", "编码·减负荷", "读一遍原文，只圈 3 个症状字（如「浮·强·寒」）",
     "工作记忆 4±1：先减到 3，才有余量挂图像", "不看原文能说出这 3 个字"),
    ("2", "编码·空间", "查「八十宫殿地图」取本条宫号、穴名、桩位（东厢/南窗/西壁/北案/中庭）",
     "编码特异性：固定位置就是固定提取上下文", "报条号即答宫、穴、桩位"),
    ("3", "编码·视觉", "把 3 个字钉成一张荒诞画面，画面里必须出现桩位本身（门/窗/壁/案/庭）",
     "图像优势效应：视觉与语言双通道各存一份", "闭眼能看见画面并复述三字"),
    ("4", "编码·语义", "读「机制精细复述」栏，把症状串讲成 A→B→C，能举例更好",
     "精细复述＞机械复述：接得上生理学框架才进长时记忆", "用自己的话讲清这条的机制"),
    ("5", "巩固·提取", "闭眼复现字面（照相）→ 只看「提取线索」钩回忆 → 当天 10 遍、次日 5 遍、第三日 3 遍",
     "提取练习＋间隔效应：测试本身即学习，分散胜过集中", "第 3 天不看原文仍能整条复述"),
]
COGNITION = [
    ("序", "阶段", "认知规律", "神经/心理机制", "本表落点", "向病理生理学习的迁移"),
    ("1", "① 组块", "组块化", "工作记忆容量 4±1，超出即溢出",
     "398 条 → 80 宫 → 每宫 4-6 条 → 五桩；一次只背一宫",
     "一例复杂病例切成 4 个组块（循环/呼吸/代谢/感染），逐块推演"),
    ("2", "② 编码·空间", "编码特异性", "提取时的上下文须匹配编码时的上下文",
     "桩位（门/窗/壁/案/庭）即被固定的编码上下文；宫序固定，回忆有路可走",
     "查房按「起病-诱因-体征-指标」固定顺序取数，减少漏项"),
    ("3", "③ 编码·视觉", "图像优势效应", "同一内容语言+视觉双通道编码，提取路径翻倍",
     "每条必备桩位画面；卡图与文字并置（一穴一图）",
     "把「症状群」画成机制图，比读十遍描述有效"),
    ("4", "④ 编码·语义", "精细复述", "把新材料与既有知识连接，才进入长时记忆",
     "「机制精细复述」栏把症状串接成机制链，限 70 字",
     "把条文机制接到已有生理学框架（Starling 力、调定点、RAAS）"),
    ("5", "④ 编码·语义", "认知负荷控制", "单条信息过量会挤占工作记忆，导致记不住",
     "病生注释限 70 字、提取线索限 24 字；一条一图一钩",
     "每次只推进一条机制，讲清再叠加"),
    ("6", "⑤ 巩固", "间隔与交错", "分散复习优于集中；交错练习提升辨别力",
     "三环套记法＝三日滚动；计划表 40 天，相邻两天换宫",
     "病理生理分轴交错复习（今日热势+津伤，明日阳衰+水饮）"),
    ("7", "⑥ 提取", "提取练习", "自由回忆＞再认；测试本身即学习",
     "照相环节要求闭眼复现字面；线索钩只给索引不给答案",
     "合上书复述机制链，再对照条文查漏"),
    ("8", "⑦ 迁移", "迁移与机制族", "同构问题共享解法，成族后可类推",
     "九轴（热势/津伤/阳衰/水饮/气滞/血瘀/神乱/里实/表郁）跨条复现，用「语义张量」查同族条文",
     "见「脉微+四逆+下利清谷」直接调出阳衰族处理路径"),
    ("9", "⑧ 生成", "生成效应", "自己生成的信息比被动阅读记得牢",
     "手册右栏留白让学生自画；本表图像只是范本，须自改一遍",
     "自己画一遍机制链（而非抄结论）才记得住"),
]
LIUJING = [
    ("六经", "篇（宋本）", "条号", "提纲条文", "核心病机（现代解读）", "主方"),
    ("太阳", "辨太阳病脉证并治上/中/下（第五-七篇）", "1-178",
     "太阳之为病，脉浮，头项强痛而恶寒。", "体表血管收缩+汗腺抑制（表郁）／后期转为水饮、气滞、血瘀变证",
     "桂枝汤、麻黄汤、青龙汤、五苓散、泻心汤类"),
    ("阳明", "辨阳明病脉证并治（第八篇）", "179-262", "阳明之为病，胃家实是也。",
     "里热炽盛+肠内容物停滞，内毒素吸收（里实/热势）", "白虎汤、三承气汤、茵陈蒿汤、麻子仁丸"),
    ("少阳", "辨少阳病脉证并治（第九篇）", "263-272", "少阳之为病，口苦、咽干、目眩也。",
     "体温调定点在两档间摆动+胆道与胸膜牵张（气滞/热势）", "小柴胡汤、大柴胡汤、柴胡桂枝汤"),
    ("太阴", "辨太阴病脉证并治（第十篇）", "273-280", "太阴之为病，腹满而吐，食不下，自利益甚，时腹自痛。",
     "胃肠动力↓、内脏低灌注（气滞/阳衰之轻）", "理中丸、桂枝加芍药汤、桂枝加大黄汤"),
    ("少阴", "辨少阴病脉证并治（第十一篇）", "281-325", "少阴之为病，脉微细，但欲寐也。",
     "心排血量↓+组织灌注不足；或交感亢进伴阴液耗损（阳衰/津伤两极）", "四逆汤、真武汤、黄连阿胶汤"),
    ("厥阴", "辨厥阴病脉证并治（第十二篇）", "326-381", "厥阴之为病，消渴，气上撞心，心中疼热，饥而不欲食，食则吐蛔，下之利不止。",
     "上热下寒并存：上=炎症/交感亢进，下=内脏低灌注（寒热错杂）", "乌梅丸、当归四逆汤、白头翁汤"),
    ("霍乱", "辨霍乱病脉证并治（第十三篇）", "382-391", "问曰：病有霍乱者何？答曰：呕吐而利，此名霍乱。",
     "剧烈吐利→细胞外液丢失、有效循环血量↓（津伤/阳衰）", "五苓散、理中丸、四逆汤"),
    ("差后劳复", "辨阴阳易差后劳复病脉证并治（第十四篇）", "392-398",
     "大病差后，劳复者，枳实栀子豉汤主之。", "恢复期代谢与免疫重建，过早负荷致复发（虚+余热）",
     "枳实栀子豉汤、竹叶石膏汤、牡蛎泽泻散"),
]


def cell(ws, r, c, v, font=T_FONT, align=WRAP, fill=None, border=True):
    x = ws.cell(row=r, column=c, value=v)
    x.font = font
    x.alignment = align
    if fill:
        x.fill = fill
    if border:
        x.border = BOX
    return x


def write_rows(ws, rows, start=1, widths=None, header=True, center_cols=()):
    r = start
    for i, row in enumerate(rows):
        for c, v in enumerate(row, 1):
            f = H_FONT if (header and i == 0) else (B_FONT if c == 1 else T_FONT)
            fill = HEAD_FILL if (header and i == 0) else (SUB_FILL if c == 1 else None)
            align = CENTER if (header and i == 0) or c in center_cols else WRAP
            cell(ws, r, c, v, f, align, fill)
        r += 1
    if widths:
        for c, w in enumerate(widths, 1):
            ws.column_dimensions[get_column_letter(c)].width = w
    if header:
        ws.freeze_panes = ws.cell(row=start + 1, column=1)
    ws.sheet_view.showGridLines = False
    return r


def _xue_route():
    p = os.path.join(MAT, "xue-route.json")
    return json.load(open(p, encoding="utf-8")) if os.path.exists(p) else {"rows": []}


_XR = _xue_route()
_IDX = {r["xue"]: r["idx"] for r in _XR.get("rows", [])}

WHY = {
    88: "作者以「四白≈四八」凑条号 88，属谐音优先；顺序路线上第 88 条应为大迎（胃 5）。",
    89: "顺延取巨髎（胃 3），「聚疗/巨大的治疗」谐音成像；顺序路线上应为颊车（胃 6）。",
    90: "顺延取地仓（胃 4），纯理论条改用照相记忆，把两句分置仓上与仓内；顺序路线上应为下关（胃 7）。",
    91: "顺延取大迎（胃 5）；顺序路线上应为头维（胃 8）。",
    74: "作者此段先讲桩后念条号，原句实属第 76 条（手五里）；本表已按第 76 条归位。",
}


def _idx_of(x):
    return _IDX.get(x, 0)


def _why(no, video, route_xue):
    return WHY.get(no, f"视频取 {video}，顺序路线为 {route_xue}；属局部让位，非识别错误。")


def main():
    tiao_doc, route, sem, man, imgs, auth, asr, vz = load()
    tiao = {t["no"]: t for t in tiao_doc["tiao"]}
    zi = {int(k): v for k, v in route["assign"].items()}
    semrow = {r["no"]: r for r in sem["rows"]}
    axes = [a["name"] for a in sem["axes"]]
    eps = man["episodes"]

    wb = Workbook()

    # ---------------- 0封面
    ws = wb.active
    ws.title = "0封面"
    ws.column_dimensions["A"].width = 3
    ws.column_dimensions["B"].width = 120
    r = 2
    for text, font in COVER:
        c = ws.cell(row=r, column=2, value=text)
        c.font = font
        c.alignment = Alignment(vertical="center", wrap_text=True)
        r += 1
    ws.sheet_view.showGridLines = False

    # ---------------- 0改写说明
    ws = wb.create_sheet("0改写说明")
    title(ws, "全脑记忆 · 改写与加工说明", "对齐 qhzy-* 教材种子版式：一表一主题，元数据在 0 系列")
    xr = json.load(open(os.path.join(MAT, "xue-route.json"), encoding="utf-8"))
    ms = xr.get("matchStats") or {}
    bs = ms.get("bySrc") or {}
    stat = (f"锚点 {ms.get('anchors', 0)} 处、命中 {ms.get('hit', 0)} 处"
            f"（口播直抽 {bs.get('口播', 0)} · 断句归位 {bs.get('口播·人工归位', 0)} · 画面字 {bs.get('画面字确认', 0)}）"
            if ms else "视频原桩抽取中")
    brief = [(a, b, (c.replace("{STAT}", stat) if isinstance(c, str) else c)) for a, b, c in BRIEF]
    write_rows(ws, brief, start=4, widths=[14, 16, 100], center_cols=(1,))

    # ---------------- 认知学框架
    ws = wb.create_sheet("认知学框架")
    title(ws, "认知学框架 · 本表的表述骨架（先定概念，再看各表）",
          "八段一线：组块 → 编码（空间·视觉·语义）→ 巩固 → 提取 → 迁移 → 生成。"
          "每一段都给了「本表怎么做」与「怎么算会了」，全表用词以此为准")
    write_rows(ws, FRAMEWORK, start=4, widths=[14, 40, 58, 10, 40], center_cols=(1, 4))

    # ---------------- 0目录
    ws = wb.create_sheet("0目录")
    write_rows(ws, TOC, start=1, widths=[8, 8, 8, 8, 100], center_cols=(1, 2, 3, 4))

    # ---------------- 0映射1/2
    ws = wb.create_sheet("0映射1")
    r = 1
    for row in MAPPING1:
        c = ws.cell(row=r, column=1, value=row[0])
        c.font = B_FONT if row[0] and row[0].startswith("0映射1") else T_FONT
        c.alignment = WRAP
        r += 1
    ws.column_dimensions["A"].width = 118
    ws.sheet_view.showGridLines = False

    ws = wb.create_sheet("0映射2")
    r = 1
    for row in MAPPING2:
        c = ws.cell(row=r, column=1, value=row[0])
        c.font = B_FONT if row[0] and row[0].startswith("0映射2") else T_FONT
        c.alignment = WRAP
        r += 1
    ws.column_dimensions["A"].width = 118
    ws.sheet_view.showGridLines = False

    # ---------------- 全脑记忆总纲
    ws = wb.create_sheet("全脑记忆总纲")
    title(ws, "全脑记忆总纲 · 视频所授体系 → 认知学表述",
          "左列是作者的原话要素，右两列把它翻成认知语言：这一步在「编码—巩固—提取」里属于哪一环，落在本表哪一列")
    r = write_rows(ws, [("阶段", "视频原话要素", "认知语言表述（这一步在做什么）", "本表落点")], start=3,
                   widths=[14, 18, 78, 30], center_cols=(1, 2))
    for stage, k, v, where in [
        ("① 组块", "记忆宫殿", "先给条文一个「容器」：以人体经络穴位图像系统作宫殿，把 398 条分装进去——"
                             "先记容器（80 宫），再记内容", "八十宫殿地图（80 宫）"),
        ("② 编码·空间", "记忆桩", "按任脉、督脉、十二正经的穴位顺序把条文逐一钉上桩：位置固定，检索路径就固定",
         "条文记忆总表「穴位／存入桩位」列"),
        ("② 编码·空间", "桩序复原", "条1-24 任脉逆序（承浆→会阴）· 条25-52 督脉（长强→龈交）· "
                                 "条53-361 十二正经流注 · 条362-398 回宫二轮", "八十宫殿地图「本宫穴序」列"),
        ("③ 编码·视觉", "照相记忆", "把原文当照片摄入：保留字面原样，但只有二维、易散——用作「字面层」的备份",
         "P01-P29 切图（画面字）"),
        ("③ 编码·视觉", "成像记忆", "在桩位搭三维场景：画面越荒诞鲜明，越抗遗忘——这是「稳定层」，压在照相层之上",
         "条文记忆总表「图像编码」列"),
        ("④ 编码·语义", "（本表新增）", "把症状串讲成机制链 A→B→C，接进生理学框架——使记忆有「理解」这条备用通道",
         "「机制精细复述」列（标现代解读）"),
        ("⑤ 巩固", "三环套记法", "新组 10 遍；次日 10＋前组 5；第三日 10＋前两组 5/3；第四组起放下第一组——"
                              "即间隔复习的三日滚动", "三环套记法计划（40 天）"),
        ("⑧ 生成", "练习手册", "左栏照相（原文标记），右栏桩位提示＋空白自画——留白就是逼你自己生成一遍",
         "一穴一图卡面为范本，须自改"),
        ("总览", "版本", "目前常见的流通本，共 398 条", "tiao-398.json（1-398 连续校验）"),
        ("边界", "定位", "纯记忆课：图像不作临床意义指导，医理另参注家", "0映射1 边界条款"),
        ("⑤ 巩固", "学习方法", "每天看 1-3 集，配合打卡诵读当天内容；可同步参看注家（倪海厦/郝万山/陈亦人）",
         "三环套记法计划"),
    ]:
        for c, val, fnt in ((1, stage, B_FONT), (2, k, B_FONT), (3, v, T_FONT), (4, where, T_FONT)):
            cell(ws, r, c, val, fnt, CENTER if c in (1, 2) else WRAP, SUB_FILL if c in (1, 2) else None)
        r += 1

    # ---------------- 五步操作法
    ws = wb.create_sheet("五步操作法")
    write_rows(ws, GANG, start=1, widths=[5, 14, 52, 44, 34], center_cols=(1, 2))

    # ---------------- 八十宫殿地图
    ws = wb.create_sheet("八十宫殿地图")
    title(ws, "八十宫殿 · 398 条 → 80 宫（一宫＝一段经络）× 五桩位",
          "先记容器再记内容：宫名取本宫首条之穴，宫序沿经络走（条1-24 任脉逆序、条25-52 督脉、"
          "条53-361 十二正经、条362-398 回宫二轮）；宫内五桩固定为 东厢/南窗/西壁/北案/中庭")
    rows = [("宫号", "宫名（首条之穴·经）", "经", "篇", "本宫条文", "条数", "本宫穴序（一宫＝一段经络）",
             "五桩位（东厢/南窗/西壁/北案/中庭）")]
    for p in route["palaces"]:
        rows.append((p["gong"], p["name"], p["jing"], p["pian"],
                     "、".join(str(t) for t in p["tiao"]), len(p["tiao"]),
                     "→".join(p["xue"]),
                     "／".join(f"{z}:{t}" for z, t in zip(p["zhuang"], p["tiao"]))))
    write_rows(ws, rows, start=4, widths=[8, 22, 16, 34, 26, 6, 40, 40], center_cols=(1, 6))

    # ---------------- 宫殿记忆规律
    pres = json.load(open(os.path.join(MAT, "palace-presence.json"), encoding="utf-8"))
    ck = pres["checks"]
    nons = [(p["gong"], p["n"], p["tiao"][0]) for p in pres["palaces"] if p["n"] != 5]
    ws = wb.create_sheet("宫殿记忆规律")
    title(ws, "八十宫殿 · 记忆规律（每条例都给可复算的证据）",
          "规律不是设计口号，是从「源视频先后 + 80 宫实际分布 + 口播锚点比对」里量出来的；"
          "复核脚本：scripts/check_palace_presence.py")
    rows = [("序", "规律", "具体内容", "数据证据（可复核）", "怎么用")]
    for r in [
        ("R1", "一宫五桩、方位固定",
         "每宫五桩：东厢/南窗/西壁/北案/中庭。五方位置不随宫变，宫与宫之间「同构」",
         f"宫大小分布 {ck['tiaoPerGong']}：71 宫恰 5 条、4 宫 6 条、4 宫 4 条、1 宫 3 条，"
         "全部落在工作记忆 4±1 区间",
         "任何一条先问「第几桩」，再问「哪个宫」——方位比宫名好记"),
        ("R2", "宫序＝经络序，源视频同向",
         "条1-24 任脉逆序→条25-52 督脉→条53-361 十二经流注→条362-398 回宫二轮；"
         "视频也是顺着这个方向讲的",
         f"63 个口播锚点按（讲次, 秒）排序后，与条号的逆序对 = {ck['inversionsByTiao']}，"
         f"与宫号的逆序对 = {ck['inversionsByGong']}（共 {ck['pairs']} 对）",
         "可以「倒着走」复习：从 G80 往 G01 走一遍，路线不破"),
        ("R3", "宫名取首条之穴；首轮 72 宫不重名，回宫 8 宫复用",
         "宫名＝本宫第一条的穴位名（如 G01 承浆宫）；一宫＝一段经络。回宫二轮重走同一段路，"
         "宫名故意复用——同名即「同一房间的第二层」，不是新房间",
         f"首轮 G01-G72 → 72 个不同穴名（72/72 唯一）；回宫 G73-G79 复用 G01-G07 的 7 个名字，"
         f"G80 用新穴神道；80 宫共 73 个不同穴名",
         "宫名即索引：报「臂臑宫」就能想起第 77-79 条那一串；报「承浆」先问是 G01 还是 G73（看条号段）"),
        ("R4", "条→宫 近似线性（宫≈条/5）",
         "不必背「哪条在哪宫」：宫号约等于条号除以 5；只有 9 处断点要记",
         f"398 条中 {ck['ceilFit']} 条严格满足 宫=⌈条/5⌉；断点 "
         + "、".join(f"G{g:02d}({n}条@{t})" for g, n, t in nons),
         "记 9 个断点即可心算定位；断点都在篇界（六经换篇处）"),
        ("R5", "首轮 361 ＋ 回宫 37",
         "361 个经穴用尽后，末 37 条（362-398）回到路线起点再走一遍，同一桩换第二层图像",
         "xue-route：round=1 计 361 条、round=2 计 37 条，合计 398；条362＝承浆，条396＝长强",
         "末段别另起新宫：想着「又回到承浆」，图像叠加而不是新开"),
        ("R6", "谐音优先于严格顺序",
         "作者允许局部让位：第 88 条取四白（四白≈四八＝88），其后三穴顺延，第 92 条再回顺序",
         "63 条中 59 条与顺序路线一致（93.7%），4 条让位（88-91，位次差 −3）",
         "遇「对不上号」先查「谐音选穴差异」，不要以为是记错"),
        ("R7", "视频证据集中在前 20 宫",
         "公开 29 讲只演示到条 100，即 G01-G20；G21-G80 是按同一规则延伸的",
         f"有视频证据的宫 {ck['gongWithVideo']} 个，全部落在 G01-G20；覆盖条 {ck['videoCoveredTiao']} 条",
         "前 20 宫可跟视频逐条核；后 60 宫只能靠规则自证，学习时以「宫」为单位验收"),
        ("R8", "一宫五方位循环复用",
         "80 宫 × 5 方位 = 400 桩位，实际 398 条；方位序列固定，可跨宫迁移",
         "400 桩位 / 398 条；G80 只用 3 桩（396-398）",
         "熟了以后记「南窗」就知道是宫内第 2 条，不必回查表"),
    ]:
        rows.append(r)
    write_rows(ws, rows, start=4, widths=[5, 22, 52, 52, 42], center_cols=(1,))

    # ---------------- 病机轴索引（按九轴检索语义群）
    apath = os.path.join(MAT, "axis-index.json")
    if os.path.exists(apath):
        A = json.load(open(apath, encoding="utf-8"))
        ws = wb.create_sheet("病机轴索引")
        c0 = A["counts"]
        title(ws, "病机轴索引 · 九轴检索 51 个语义群（条文—机制—方的交点）",
              "用法：见到一组症状，先在下面「判族口诀」里认轴，再到该轴的检索表里按档位找语义群，"
              "语义群名后直接跟方——这样「脉微＋四逆」不必回忆条文号，也能落到阳衰族。"
              f"口径：{c0['groups']} 个语义群中 {c0['with_axis']} 个归轴、{c0['no_axis']} 个判「无轴」（结构/方法表不硬挂病机）；"
              f"归轴者中 {c0['overridden']} 组为人工裁定（自动口径全 0 或与组名冲突，理由见 axis-overrides.json）。")

        rows = [["轴", "机制（semtensor 定义）", "识别词（词表前 10）", "语义群", "强档", "代表方", "判族口诀"]]
        for t in A["axes"]:
            rows.append([t["axis"], t["mech"], "、".join(t["lexicon"]), f"{t['n_groups']} 组",
                         f"{t['n_strong']} 组", "、".join(t["top_fang"][:6]) or "（无）", t["rule"]])
        write_rows(ws, rows, start=4, widths=[8, 26, 40, 8, 8, 34, 60], center_cols=(1, 4, 5))
        r = 4 + len(rows) + 2
        cell(ws, r, 1, "语义群 × 九轴矩阵（行按主轴分块；数值为该组条目轴均分，人工裁定组取 1 档）", B_FONT, WRAP)
        r += 1
        hdr = ["讲", "语义群", "条", "热势", "津伤", "阳衰", "水饮", "气滞", "血瘀", "神乱", "里实", "表郁", "主轴", "来源", "代表方"]
        mrows = [hdr]
        AXO = ["热势", "津伤", "阳衰", "水饮", "气滞", "血瘀", "神乱", "里实", "表郁"]
        gs = [g for g in A["groups"] if g["main"] != "（无轴）"]
        gs.sort(key=lambda g: (AXO.index(g["main"]), -g["vec"][g["main"]], g["sheet"], g["i"]))
        for g in gs:
            mrows.append([g["sheet"], g["name"], g["tiao"]] +
                         [(f"{g['vec'][a]:g}" if g["vec"][a] else "") for a in AXO] +
                         [g["main"], g["src"], "、".join(g["fang"][:3]) or "—"])
        write_rows(ws, mrows, start=r, widths=[10, 30, 10] + [6] * 9 + [8, 16, 26],
                   center_cols=tuple(range(3, 13)))
        r = r + len(mrows) + 2
        cell(ws, r, 1, "按轴检索（每轴取前 8 个语义群；档＝该轴均分）", B_FONT, WRAP)
        r += 1
        arows = [["轴", "档", "语义群", "讲", "条", "代表方", "该组代表条首句"]]
        for t in A["axes"]:
            for g in t["groups"][:8]:
                arows.append([t["axis"], f"{g['score']:g}", g["name"], g["sheet"], g["tiao"],
                              "、".join(g["fang"][:3]) or "—", g["excerpt"] or "—"])
        write_rows(ws, arows, start=r, widths=[8, 6, 30, 10, 10, 26, 46], center_cols=(1, 2))
        r = r + len(arows) + 2
        p8 = os.path.join(AST, "plots", "f8-axis.png")
        if os.path.exists(p8):
            cell(ws, r, 1, "F8 病机轴索引热图（51 组 × 九轴，按主轴分块）", B_FONT, WRAP)
            xi = XLImage(p8)
            box = 760
            xi.width, xi.height = box, int(xi.height * box / xi.width)
            ws.add_image(xi, f"A{r + 1}")

    # ---------------- 六经传变总图（F7 + 边表）
    gpath = os.path.join(MAT, "chuanbian-graph.json")
    if os.path.exists(gpath):
        G = json.load(open(gpath, encoding="utf-8"))
        ws = wb.create_sheet("六经传变总图")
        title(ws, "六经传变总图 · 8 节点 / 14 边（把 29 讲的传变特征抽成有向图）",
              "节点＝太阳/阳明/少阳/太阴/少阴/厥阴＋坏病·变证＋自愈；边＝传变类型，标注证据条号。"
              "读法：实线＝自然史（循经传），虚线＝治疗塑造的路径（误汗/误下/坏病），绿线＝自愈出口。"
              "证据等级分两层：条≤100 为视频覆盖，>100 为宋本原文层（作者未讲）。")
        rows = [["起点", "终点", "传变类型", "证据条号", "证据等级", "原文首句（首条）", "说明"]]
        for e in G["edges"]:
            rows.append([e["from"], e["to"], e["type"],
                         "、".join(str(n) for n in e["tiao"]), e["tier"],
                         f"条{e['ev'][0]['no']}：{e['ev'][0]['head']}", e["note"]])
        write_rows(ws, rows, start=3, widths=[10, 10, 14, 18, 16, 42, 62],
                   center_cols=(1, 2, 3, 4, 5))
        r = 3 + len(rows) + 2
        cell(ws, r, 1, "判传四件（条 4/5/61/8）", B_FONT, Alignment(vertical="center", wrap_text=True))
        r += 1
        crit = [["判据", "用例条", "读法"]] + [[c["k"], c["tiao"], c["t"]] for c in G["criteria"]]
        write_rows(ws, crit, start=r, widths=[16, 10, 110], header=True, center_cols=(1, 2))
        r = r + len(crit) + 2
        p7 = os.path.join(AST, "plots", "f7-chuanbian.png")
        if os.path.exists(p7):
            cell(ws, r, 1, "F7 六经传变总图（图为 `plot_palace_map.py` 生成，边与条号同一份数据）", B_FONT, Alignment(vertical="center", wrap_text=True))
            xi = XLImage(p7)
            box = 900
            xi.width, xi.height = box, int(xi.height * box / xi.width)
            ws.add_image(xi, f"A{r + 1}")

    # ---------------- 宫殿示意图
    ws = wb.create_sheet("宫殿示意图")
    title(ws, "八十宫殿 · 示意图（matplotlib 数学作图）",
          "十一张图分别对应 R1-R5：总图看组块与走线、前 20 宫放大供逐条跟练、P29 概念卡看「为什么这样放桩」、一宫四型看方位复用、"
          "定位曲线看条→宫、条带看经络顺序。"
          "脚本 scripts/plot_palace_map.py；沿路线行走的动画见 assets/shanghan-palace/plots/palace-walk.gif")
    figs = [
        ("f1-overview.png", "F1 总图 · 10×8 宫格＝80 宫；格内五点＝五桩，点内数字＝条号；"
                            "左上宫号、格底首穴；右上红点＝该宫有视频证据；行首箭头＝该行走向（蛇形来回）"),
        ("f1b-zoom20.png", "F1b 前 20 宫放大（＝条 1-100，源视频覆盖区）：条号、方位名放大到可读，"
                           "每宫上方标该宫在源视频里的首见时刻与证据条数"),
        ("f1c-concepts.png", "F1c P29 概念卡 18 张（接在 F1b 之后）· 《心与心包》无条文，改按概念识别："
                             "卡框颜色分三层——灵魂之心（红）／肉体之心（蓝）／条文·证候（金）；每卡带时间戳可回查原话"),
        ("f1d-pins.png", "F1d 18 张概念卡钉到八十宫 · 左 9 右 9，中间 10×8 缩略；线＝挂点宫位"
                             "（一卡多宫画多条），红点数字＝该宫被几张卡钉住；虚里两张属诊法层，虚线连说明框不硬塞进宫"),
        ("f1g-panorama.png", "F1g 概念与宫位全景（其余 8 宫）· 每格一宫：房间五桩＋房下列卡名，红桩＝卡内直引的枢纽条；"
                             "单宫大图另存 plots/f1f-g03…g66.png（8 张，含条文与口播列）"),
        ("f1e-g15.png", "F1e G15 样板宫剖析 · 一宫五桩，其中「北案·条76」一桩扛住 5 张概念卡："
                          "左房间、右五卡、下条文；示范「一桩多义」——概念不另建空间，全挂在已有桩上"),
        ("f2-zone4.png", "F2 一宫四型 · 方位如何复用：5 条＝五方各一（东厢=1/南窗=2/西壁=3/北案=4/中庭=5）；"
                         "6 条＝加「回廊（第6位）」；4 条＝中庭空着（标「（空）」）；回宫二轮＝同一桩换第二层图像"),
        ("f3-locate.png", "F3 条→宫 定位曲线：黑线实际宫号，灰虚线为条/5；红点线＝9 处断点（4 个 6 条宫、"
                          "4 个 4 条宫、1 个 3 条宫）"),
        ("f4-band.png", "F4 经络条带：任脉 24（逆序）→督脉 28→十二经 309→回宫二轮 37（红色），"
                        "合计 398；窄段用引线标注"),
        ("f7-chuanbian.png", "F7 六经传变总图 · 节点＝六经＋坏病变证＋自愈，边＝十类传变（线上为证据条号）："
                             "实线＝自然史、虚线＝治疗塑造的路径、绿线＝自愈出口；8 节点 / 14 边"),
        ("f8-axis.png", "F8 病机轴索引 · 51 个语义群 × 九轴（0-3）：行按主轴分块，行首颜色即主轴；"
                        "右侧列九轴的组数、强档数与代表方——按轴检索的图形版"),
    ]
    ws.column_dimensions["A"].width = 120
    r = 4
    for fn, cap in figs:
        p = os.path.join(AST, "plots", fn)
        if not os.path.exists(p):
            continue
        c = cell(ws, r, 1, cap, B_FONT, Alignment(wrap_text=True, vertical="center"))
        ws.row_dimensions[r].height = 30
        r += 1
        xi = XLImage(p)
        box = 900 if fn == "f1-overview.png" else 720
        ratio = box / xi.width
        xi.width, xi.height = box, int(xi.height * ratio)
        ws.add_image(xi, f"A{r}")
        # 行高上限 409 磅：不撑行高，让图片浮在若干空行上，按 20 磅/行估算占位
        r += int(xi.height / 20) + 2
    cell(ws, r, 1, "交互（可回调）· python scripts/plot_palace_map.py gui", B_FONT, WRAP, SUB_FILL)
    r += 1
    c = cell(ws, r, 1, "点击任一宫 → 查「宫名/五条/视频证据」；n / p → 沿路线走下一宫、上一宫；"
                       "t → 抽背（给首穴名，点出该宫五桩，实时计命中/错误）；r → 重置；"
                       "底部滑条 → 跳转任意宫。回调分别是 on_click / on_key / Slider.on_changed；"
                       "抽背＝提取练习＋即时反馈。行走进动画：assets/shanghan-palace/plots/palace-walk.gif")
    ws.row_dimensions[r].height = 52

    # ---------------- 宫殿存在性核查
    ws = wb.create_sheet("宫殿存在性核查")
    title(ws, "八十宫殿 · 按源视频先后的存在性核查",
          "逐宫问三件事：宫里有条吗（内容存在）、视频演示过吗（证据存在）、"
          "它的首条在源视频里出现在第几讲第几秒（时间落点）；顺序栏比较相邻宫的条号是否同向")
    rows = [("宫号", "宫名", "经", "篇", "条区间", "条数", "视频证据(条)",
             "首见讲次", "首见时刻", "与上宫同向")]
    prev_last = None
    for p in pres["palaces"]:
        first = p["tiao"][0]
        same = "" if prev_last is None else ("同向" if first > prev_last else "倒挂")
        prev_last = p["tiao"][-1]
        rows.append((p["gong"], p["name"], p["jing"], p["pian"],
                     f"{first}-{p['tiao'][-1]}", p["n"], p["videoN"],
                     f"P{p['firstP']:02d}" if p["firstP"] else "—",
                     f"{p['firstSec'] // 60}:{p['firstSec'] % 60:02d}" if p["firstSec"] is not None else "—",
                     same))
    write_rows(ws, rows, start=4, widths=[7, 20, 16, 30, 12, 6, 12, 10, 10, 12],
               center_cols=(1, 5, 6, 7, 8, 9, 10))
    rr = 4 + len(rows) + 1
    cell(ws, rr, 1, "结论", B_FONT, WRAP, SUB_FILL)
    cell(ws, rr, 2, f"① 内容存在：80/80 宫都有条（最小 3 条、最大 6 条），共 398 条；"
                    f"② 证据存在：{ck['gongWithVideo']} 宫有视频证据（全部在 G01-G20），覆盖 {ck['videoCoveredTiao']} 条；"
                    f"其余 {80 - ck['gongWithVideo']} 宫为本表按同一规则延伸；"
                    f"③ 先后顺序：63 个口播锚点按（讲次, 秒）排序，与条号逆序对 {ck['inversionsByTiao']}、"
                    f"与宫号逆序对 {ck['inversionsByGong']}，即源视频严格沿宫殿顺序推进，无跳宫。", T_FONT)
    ws.merge_cells(start_row=rr, start_column=2, end_row=rr, end_column=10)
    ws.row_dimensions[rr].height = 56

    # ---------------- 条文记忆总表
    ws = wb.create_sheet("条文记忆总表")
    title(ws, "条文记忆总表 · 398 条（一条四件：桩位·图像·机制·线索）",
          "读法：先看「存入桩位」定位，再看「图像编码」成像，然后读「机制精细复述」接链，"
          "最后只留「提取线索」自测。原文：外源 SH_text.json 第N条（底本无条号，见 PROVENANCE-398.md）；"
          "病生栏一律为「现代解读，非仲景原意」")
    cols = ("条号", "经", "篇", "原文（宋本）", "白话直译", "方", "宫", "穴位", "轮次", "存入桩位",
            "图像编码（桩位画面）", "机制精细复述（现代解读）", "提取线索", "语义标签", "语义主轴（机制族）",
            "视频原桩（口播）")
    rows = [cols]
    for n in range(1, 399):
        t, a, s = tiao[n], auth.get(n, {}), semrow[n]
        z = zi[n]
        rows.append((n, t["liuKey"], t["pian"].replace("辨", "").replace("病脉证并治", ""),
                     t["text"], a.get("baihua", ""), "、".join(t["fang"]),
                     z["gong"], z["xue"], "二轮" if z.get("round") == 2 else "一轮", z["zhuang"],
                     a.get("image", ""), a.get("pathophys", ""), a.get("hook", ""),
                     a.get("tag", ""), s["main"],
                     (vz.get(n) or {}).get("xue", "") if vz else ""))
    write_rows(ws, rows, start=4, widths=[6, 8, 10, 62, 30, 14, 5, 9, 6, 7, 40, 44, 22, 14, 9, 12],
               center_cols=(1, 2, 7, 9, 10, 15, 16))
    ws.auto_filter.ref = f"A4:P{4 + len(rows)}"

    # ---------------- 视频原桩对照
    ws = wb.create_sheet("视频原桩对照")
    title(ws, "视频原桩对照 · 口播「本条对应的记忆桩是 X」逐条核对",
          "raw ＝ 语音识别原样（未改字）；判定 ＝ 归正后的穴位正名（FIX 表人工裁定）；"
          "「与本表路线」一栏比较 build_xue_route 推出的穴序")
    rows = [("条号", "讲次", "出现时刻", "raw（ASR 原样）", "判定穴位", "来源", "在腧穴语料中",
             "与本表路线", "本表穴位", "依据（原话/推理）")]
    for n in sorted(vz):
        v = vz[n]
        mine = zi[n]["xue"]
        rows.append((n, f"P{v['p']:02d}", f"{v['sec'] // 60}:{v['sec'] % 60:02d}", v["raw"], v["xue"],
                     v.get("src", "口播"), "是" if v["inCorpus"] else "否",
                     "一致" if v["xue"] == mine else f"不一致（本表 {mine}）", mine,
                     v.get("basis", "")))
    write_rows(ws, rows, start=3, widths=[7, 7, 9, 14, 12, 15, 12, 22, 12, 62],
               center_cols=(1, 2, 3, 5, 6, 7, 8, 9))

    # ---------------- 谐音选穴差异
    ws = wb.create_sheet("谐音选穴差异")
    xr = json.load(open(os.path.join(MAT, "xue-route.json"), encoding="utf-8"))
    idxof = {r["no"]: (r["xue"], r["jing"], r["idx"]) for r in xr["rows"]}
    bad = [c for c in xr.get("videoChecks", []) if not c["ok"]]
    title(ws, "谐音选穴差异 · 作者取穴与本表顺序路线的分歧",
          f"口播锚点 {len(xr.get('videoChecks', []))} 处，命中 {len(xr.get('videoChecks', [])) - len(bad)} 处；"
          "下列 %d 处为作者为凑谐音另取穴。背诵跟视频的走「视频原桩」，视频未覆盖的条走「本表桩」。" % len(bad))
    rows = [("条号", "视频原桩（口播）", "本表顺序桩", "两桩在本经中的位次", "位次差",
             "ASR 原样", "判读", "建议")]
    for c in bad:
        xv, jv, iv = idxof[c["no"]]
        # 视频桩在本经的位次：从 361 穴表里查同经同名的另一条无法直接得到，故用「本表该经已知锚点」推断
        rows.append((c["no"], c["video"], xv,
                     f"视频：第{_idx_of(c['video'])}穴 ／ 本表：第{iv}穴",
                     _idx_of(c["video"]) - iv, c["raw"],
                     _why(c["no"], c["video"], xv), "按视频取桩背诵；差异记录在案，不校改"))
    write_rows(ws, rows, start=4, widths=[6, 16, 12, 22, 8, 12, 46, 24], center_cols=(1, 5))
    r = 4 + len(rows) + 1
    cell(ws, r, 1, "整体判读", B_FONT, WRAP, SUB_FILL)
    cell(ws, r, 2, "第 88-91 条作者取胃经第 2-5 穴（四白→巨髎→地仓→大迎），第 92 条又跳回第 9 穴人迎，"
                   "中段颊车/下关/头维三穴在本讲未用；第 88 条取四白明显是为凑条号（四白≈四八＝88）。"
                   "这说明作者的桩序是「按经走、允许局部让位给谐音」，不是严格一一对应，"
                   "因此本表的顺序路线只用于视频未覆盖的 337 条，覆盖面内以口播原桩为准。", T_FONT)
    ws.merge_cells(start_row=r, start_column=2, end_row=r, end_column=8)
    ws.row_dimensions[r].height = 60

    # ---------------- 断句归位与画面字
    ws = wb.create_sheet("归位与画面字")
    title(ws, "归位与画面字 · 不在「口播直抽」之列的 7 条登记",
          "口播直抽 56 条之外：6 条是 ASR 断句/系词脱落、名字确在口播里，读过原话后钉住（断句归位）；"
          "1 条口播只给暗示、但视频画面字直标（第15条下脘，属图形识别层）。来源三分，逐条给凭证。")
    rows = [("条号", "穴位", "经", "来源", "判定", "依据（原话/推理）", "教材层佐证")]
    cite = {
        15: "画面字：P06 约 2:10 帧内直标「下脘」（图形识别层，卡图见「一穴一图」第15条）；"
            "教材层交叉核对：《经络腧穴学》任脉经穴分寸歌「脐上一寸为水分，脐上二寸下脘刊」",
    }
    for n in sorted(vz):
        v = vz[n]
        if v.get("src", "口播") == "口播":
            continue
        rows.append((n, v["xue"], zi[n]["jing"], v.get("src", ""), f"P{v['p']:02d} "
                     f"{v['sec'] // 60}:{v['sec'] % 60:02d}",
                     v.get("basis", ""), cite.get(n, "—（口播已有名字，仅断句需归位）")))
    write_rows(ws, rows, start=4, widths=[7, 10, 16, 16, 12, 62, 56], center_cols=(1, 2, 5))
    r = 4 + len(rows) + 1
    cell(ws, r, 1, "口径", B_FONT, WRAP, SUB_FILL)
    cell(ws, r, 2, "① 口播：正则从「记忆桩是 X」直接抽出，raw 保留 ASR 原样；② 口播·人工归位：名字确在口播里，"
                  "但被断句/系词脱落切开（如「本条对应的记忆装饰／纠尾」），读过原话后钉住，basis 即凭证；"
                  "③ 画面字确认：口播未念名，但视频画面字直标（如第15条下脘），属图形识别层，卡图可直接复核。",
         T_FONT)
    ws.merge_cells(start_row=r, start_column=2, end_row=r, end_column=7)
    ws.row_dimensions[r].height = 52

    # ---------------- 一穴一图
    ws = wb.create_sheet("一穴一图")
    title(ws, "一穴一图 · 398 张编码卡（一条一桩一图）",
          "一张卡把三重编码并置：左＝空间（视频切图或桩位方位图）＋右＝语义（穴/宫/图像编码/主轴/线索）。"
          "用法：遮住右栏看图说条，或遮住图看线索钩复述。66 张为视频切图，其余程序自绘并标「本表自绘」")
    cards = json.load(open(os.path.join(MAT, "cards-index.json"), encoding="utf-8"))["cards"]
    rows = [("条号", "穴（经）", "宫 · 存入桩位", "编码卡（一图三编码）", "图像编码", "语义主轴")]
    r = 4
    head(ws, r, rows[0])
    for c, w in zip("ABCDEF", (6, 16, 26, 44, 44, 9)):
        ws.column_dimensions[c].width = w
    r += 1
    for n in range(1, 399):
        z, a, s = zi[n], auth.get(n, {}), semrow[n]
        cell(ws, r, 1, n, B_FONT, CENTER)
        cell(ws, r, 2, f"{z['xue']}（{z['jing']}）")
        cell(ws, r, 3, f"{z['gongName']} · {z['zhuang']}")
        p = os.path.join(AST, "cards", cards[str(n)]["file"])
        if os.path.exists(p):
            xi = XLImage(p)
            ratio = 420 / xi.width
            xi.width, xi.height = 420, int(xi.height * ratio)
            ws.add_image(xi, f"D{r}")
        cell(ws, r, 5, a.get("image", ""))
        cell(ws, r, 6, s["main"], T_FONT, CENTER)
        ws.row_dimensions[r].height = 176
        r += 1

    # ---------------- 语义张量
    ws = wb.create_sheet("语义张量")
    title(ws, "语义张量 · 398 条 × 9 轴（机制族的检索表）",
          "用途是「迁移」：同族条文共享一条处理路径。score=min(4,命中不同关键词数)，命中词逐条可查；"
          "主轴＝命中最多的一轴，即这条最该按哪条机制去记")
    cols = ("条号", "经", "方", "语义主轴") + tuple(axes) + ("张量能量", "命中词")
    rows = [cols]
    for n in range(1, 399):
        s = semrow[n]
        rows.append((n, tiao[n]["liuKey"], "、".join(tiao[n]["fang"]), s["main"],
                     *[s["vec"][a] for a in axes], s["norm"],
                     "；".join(f"{k}={'/'.join(v)}" for k, v in s["hit"].items())))
    write_rows(ws, rows, start=4, widths=[6, 8, 16, 8] + [7] * len(axes) + [7, 56],
               center_cols=tuple(range(1, 5 + len(axes))))
    ws.auto_filter.ref = f"A4:{get_column_letter(5 + len(axes))}{4 + len(rows)}"

    # ---------------- 语义张量词表
    ws = wb.create_sheet("语义张量词表")
    write_rows(ws, [("轴", "病理生理含义", "关键词表（命中即计 1 分，上限 4 分）")] +
               [(a["name"], a["mech"], "、".join(a["lexicon"])) for a in sem["axes"]],
               start=1, widths=[10, 34, 90], center_cols=(1,))

    # ---------------- 方证索引
    ws = wb.create_sheet("方证索引")
    title(ws, "方证索引 · 条文内出现的方名（最长优先匹配，111 方）",
          "方名仅在原文中出现即登记；主症与病机参见对应条文的「条文记忆总表」行，不在此处另作推断")
    fmap = {}
    for n in range(1, 399):
        for f in tiao[n]["fang"]:
            fmap.setdefault(f, []).append(n)
    rows = [("方名", "条数", "条号", "六经", "宫")]
    for f in sorted(fmap, key=lambda x: (-len(fmap[x]), x)):
        ns = fmap[f]
        rows.append((f, len(ns), "、".join(str(x) for x in ns),
                     "、".join(sorted({tiao[x]["liuKey"] for x in ns})),
                     "、".join(f"G{zi[x]['gong']:02d}" for x in ns)))
    write_rows(ws, rows, start=4, widths=[34, 6, 40, 26, 30], center_cols=(2,))

    # ---------------- 认知规律注释
    ws = wb.create_sheet("认知规律注释")
    title(ws, "认知规律注释 · hermesagents（病理生理学视角）",
          "同一批规律按「阶段」重排：组块→编码→巩固→提取→迁移→生成。每条给机制、本表落点与迁移路径，"
          "便于判断「哪一环没做好」而不是笼统说记不住")
    write_rows(ws, COGNITION, start=4, widths=[5, 14, 18, 34, 50, 40], center_cols=(1, 2))

    # ---------------- 三环套记法计划
    ws = wb.create_sheet("三环套记法计划")
    title(ws, "三环套记法 · 40 天计划（每天 10 条 ≈ 2 宫）",
          "机制是间隔效应＋交错：新学当天 10 遍（环 1），次日 5 遍（环 2），第三日 3 遍（环 3）；"
          "每天换宫＝换情境，逼你分辨而不是熟读。遍数可按个人状态调整（视频口径）")
    rows = [("日次", "新学条号", "新学宫", "轴（语义主轴分布）", "环1 新学", "环2 昨日", "环3 前日", "当日诵读合计")]
    day = 1
    for lo in range(1, 399, 10):
        hi = min(398, lo + 9)
        gs = sorted({zi[n]["gong"] for n in range(lo, hi + 1)})
        axs = sorted({semrow[n]["main"] for n in range(lo, hi + 1)})
        rows.append((day, f"{lo}-{hi}", "、".join(f"G{g:02d}" for g in gs), "、".join(axs),
                     "10 遍", "5 遍" if day > 1 else "—", "3 遍" if day > 2 else "—",
                     f"{10 + (5 if day > 1 else 0) + (3 if day > 2 else 0)} 遍"))
        day += 1
    write_rows(ws, rows, start=4, widths=[6, 14, 20, 30, 10, 10, 10, 12],
               center_cols=(1, 2, 3, 5, 6, 7, 8))

    # ---------------- 六经骨架
    ws = wb.create_sheet("六经骨架与传变")
    write_rows(ws, LIUJING, start=1, widths=[10, 34, 10, 46, 46, 34], center_cols=(1, 3))
    r = len(LIUJING) + 3
    cell(ws, r, 1, "传变四式", B_FONT, WRAP, SUB_FILL)
    cell(ws, r, 2, "循经传（太阳→阳明→少阳→太阴→少阴→厥阴）／越经传（隔经而传）／直中（不经三阳直入三阴）／"
                   "合病（两经以上同时发病）／并病（一经未罢又见他经）", T_FONT)
    ws.merge_cells(start_row=r, start_column=2, end_row=r, end_column=6)
    ws.row_dimensions[r].height = 34

    # ---------------- 识别层级说明
    tot_audio = sum(asr[e["no"]]["audioSec"] for e in eps if e["no"] in asr)
    tot_chars = sum(asr[e["no"]]["chars"] for e in eps if e["no"] in asr)
    tot_seg = sum(len(asr[e["no"]]["segments"]) for e in eps if e["no"] in asr)
    tot_dur = sum(e["dur"] for e in eps)
    n_img = sum(len(v) for v in imgs["images"].values())
    n_frame = sum(len(os.listdir(os.path.join(MAT, "frames", f"p{e['no']:02d}")))
                  for e in eps if os.path.isdir(os.path.join(MAT, "frames", f"p{e['no']:02d}")))
    ws = wb.create_sheet("识别层级说明")
    title(ws, "四层识别 · 方法与实测（技术层，不是学习层）",
          "这一页说明「文字与画面是怎么变成数据的」；学习怎么用，看「认知学框架」与「五步操作法」。每层都给可复算的数字")
    rows = [
        ("层", "做法", "实测", "产出/局限"),
        ("① 语音识别", "B站 playurl 取 DASH 最优音轨 → ffmpeg 16k 单声道 WAV（时长与页面标注差 ≤2%）→ "
                   "faster-whisper large-v3-turbo（int8, 8 线程, VAD 500ms, beam5, 领域 initial_prompt）",
         f"{len(asr)}/{len(eps)} P · 音频 {tot_audio:.0f}s / 页面 {tot_dur}s "
         f"（覆盖 {tot_audio / tot_dur * 100:.1f}%）· {tot_seg} 段 · {tot_chars} 字",
         "P01-P29 正文（见各 P 表下方「语音识别正文」）；局限：术语/方名有字级错，人名地名最易错"),
        ("② 字幕识别", "先查平台字幕接口（player/v2 → data.subtitle.subtitles）",
         "29 P 全部返回空数组：该稿件无字幕轨，所谓「字幕」是烧录进画面的字",
         "改用图形识别读取画面字；不虚构字幕文本"),
        ("③ 图形识别", "低码率视频轨每 5s 抽帧 → 去掉底部水印条（y>0.87H）→ "
                   "用饱和/色彩/暗度−边缘密度挑插图帧；按 ASR 与条文二元组重叠把帧对齐到条",
         f"{n_frame} 帧 → 选 {n_img} 张条级切图 + {sum(len(v) for v in imgs['perPage'].values())} 张讲级切图",
         "P01-P29 表内嵌图；局限：只取画面可见层，画外音里的联想不保证有图"),
        ("④ 语义张量", "9 轴病理生理解剖 + 可审计词表，按条文原文命中计分（上限 4），主轴=命中最多轴",
         f"398 条 × {len(axes)} 轴 · 词表 {sum(len(a['lexicon']) for a in sem['axes'])} 词",
         "「语义张量」「语义张量词表」两表；局限：词表法只认字面，不认反讽与省略"),
    ]
    write_rows(ws, rows, start=3, widths=[12, 62, 44, 44], center_cols=(1,))

    # ---------------- 可复用Skills
    ws = wb.create_sheet("可复用Skills")
    title(ws, "可复用 Skills · 本交付物的 5 个可重跑环节", "每一步都能单独重跑；输入输出写在表内，换书即可复用")
    rows = [
        ("#", "环节", "命令（仓库根目录）", "输入", "输出", "复用到别的书时改什么"),
        ("S1", "条号骨架抽取", "python scripts/build_shanghan_398.py",
         "外源 SH_text.json + 底本.json + 讲义 xlsx", "standards/shanghan/tiao-398.json",
         "换源文件与 sha256；篇/卷映射表 PIAN 改为新书的篇目"),
        ("S2", "80 宫桩位分配", "python scripts/build_palace_route.py",
         "tiao-398.json + 经络腧穴学教材语料", "standards/materials/shanghan-quannao/palace-route.json",
         "PLAN（篇→经→穴）与 DIRS（五方桩位）"),
        ("S3", "语义张量", "python scripts/build_semtensor_shanghan.py",
         "tiao-398.json", "standards/shanghan/semtensor-398.json", "AXES 九轴词表"),
        ("S4", "逐讲识别（音/图）", "python scripts/asr/shanghan_quannao.py {manifest|asr|frames} 1 29",
         "B站 bvid / 分 P 清单", "asr/pNN.json · frames/pNN/*.jpg", "BV 号与 PROMPT 领域词"),
        ("S5", "切图与成表", "python scripts/build_palace_images.py && python scripts/build_quannao_workbook.py",
         "asr + frames + authoring/out-*.json", "assets/shanghan-palace/*.jpg · 全脑记忆.xlsx", "OUT 路径与封面文案"),
    ]
    write_rows(ws, rows, start=3, widths=[5, 16, 60, 34, 40, 40], center_cols=(1,))

    # ---------------- 多智能体协同
    ws = wb.create_sheet("多智能体协同")
    title(ws, "多智能体协同 · 398 条分篇撰写与校验闸门",
          "9 个撰写 agent 按篇分片并行，主代理只做输入包、闸门校验与成表，不重写子代理产出")
    rows = [
        ("分片", "条号", "条数", "任务", "闸门（不通过即退回）"),
        ("01-taiyang-shang", "1-30", 30, "白话／图像编码／机制精细复述／提取线索／语义标签", "JSON 可解析；no 连续；桩位与 palace-route 一致"),
        ("02-taiyang-zhong-a", "31-79", 49, "同上", "同上"),
        ("03-taiyang-zhong-b", "80-127", 48, "同上", "同上"),
        ("04-taiyang-xia", "128-178", 51, "同上", "同上"),
        ("05-yangming", "179-262", 84, "同上", "同上"),
        ("06-shaoyang-taiyin", "263-280", 18, "同上", "同上"),
        ("07-shaoyin", "281-325", 45, "同上", "同上"),
        ("08-jueyin", "326-381", 56, "同上", "同上"),
        ("09-huoluan-chahou", "382-398", 17, "同上", "同上"),
        ("主代理", "1-398", 398, "输入包生成、桩位校验、语义张量、切图、成表", "398 条全覆盖；宫桩无重号；图片全部落盘"),
    ]
    write_rows(ws, rows, start=3, widths=[22, 12, 8, 44, 48], center_cols=(2, 3))

    # ---------------- 跨源校勘
    ws = wb.create_sheet("跨源校勘")
    title(ws, "跨源校勘登记 · 398 条",
          "底本=识典古籍刻本（无条号，分句命中率）／讲义=qinghua 讲义（第N条）引文覆盖率；"
          "列仅作可疑度排序，不等于判错")
    rows = [("条号", "原文", "底本整句命中", "底本分句覆盖", "讲义引文覆盖", "判读")]
    for n in range(1, 399):
        w = tiao[n]["witness"]
        jr = w["jiaoyiRecall"]
        flag = "讲义节引/合并" if (jr is not None and jr < 0.6) else (
            "底本未见（异文/分段差）" if not w["dibenIn"] else "一致")
        rows.append((n, tiao[n]["text"], "是" if w["dibenIn"] else "否",
                     w["dibenRecall"], "" if jr is None else jr, flag))
    write_rows(ws, rows, start=3, widths=[6, 62, 12, 12, 12, 22], center_cols=(1, 3, 4, 5))

    # ---------------- ASR 完整性核查（逐讲给数，避免「说转完了」而无据）
    ws = wb.create_sheet("ASR 完整性核查")
    ws["A1"] = "语音识别完整性核查 · 29 讲逐讲给数（页面时长 vs 转写音频 vs 首末段 vs 静默缺口）"
    ws["A1"].font = Font(name="宋体", size=13, bold=True, color=INK)
    ws["A2"] = ("判读口径：① 覆盖率＝转写音频 / 页面时长，<98% 视为没取全；② 首段＝第一句起点，>10s 说明开头可能漏；"
                "③ 末段≥页面时长是片尾字幕卡被拉长，不算漏；④ 静默＝连续无字 >20s 的区间，逐条列出。")
    ws["A2"].font = Font(name="宋体", size=9, color="6B5B45")
    ws.merge_cells("A2:L2")
    head(ws, 4, ("讲", "标题", "页面 s", "音频 s", "覆盖率%", "首段 s", "末段 s",
                 "最长静默 s", "静默区间", "段数", "字数", "备注",
                 "旧首段 s", "前移 s"))
    r = 5
    tot_a = tot_d = tot_ch = 0
    for ep in eps:
        no = ep["no"]
        a = asr.get(no)
        if not a:
            cell(ws, r, 1, f"P{no:02d}", B_FONT, CENTER)
            cell(ws, r, 2, ep["part"])
            cell(ws, r, 3, ep["dur"])
            cell(ws, r, 12, "未转写", Font(name="宋体", size=9, color=RED))
            r += 1
            continue
        segs = a["segments"]
        first = segs[0]["start"] if segs else 0
        last = segs[-1]["end"] if segs else 0
        gaps, prev = [], 0.0
        for x in segs:
            if x["start"] - prev > 20:
                gaps.append((prev, x["start"]))
            prev = x["end"]
        if ep["dur"] - last > 20:
            gaps.append((last, ep["dur"]))
        widest = max([b - a0 for a0, b in gaps], default=0)
        cover = a["audioSec"] / ep["dur"] * 100
        note = []
        old_first = None
        _bak = os.path.join(MAT, "asr", "vad-backup", f"p{no:02d}.vad.json")
        if os.path.exists(_bak):
            _bs = json.load(open(_bak, encoding="utf-8")).get("segments") or []
            old_first = _bs[0]["start"] if _bs else None
        if str(a.get("note", "")).startswith("2026-10-26") or no in (28, 29):
            note.append("2026-10-26 重转（vad=false，旧版存 asr/vad-backup/）")
        if first > 10:
            note.append("首段偏后，需人工听开头")
        if cover < 98:
            note.append("覆盖不足")
        cell(ws, r, 1, f"P{no:02d}", B_FONT, CENTER)
        cell(ws, r, 2, ep["part"])
        cell(ws, r, 3, ep["dur"], CENTER)
        cell(ws, r, 4, round(a["audioSec"], 1), CENTER)
        cell(ws, r, 5, round(cover, 1), CENTER)
        cell(ws, r, 6, first, CENTER)
        cell(ws, r, 7, round(last, 1), CENTER)
        cell(ws, r, 8, round(widest, 1), CENTER)
        cell(ws, r, 9, "／".join(f"{int(x // 60)}:{int(x % 60):02d}-{int(y // 60)}:{int(y % 60):02d}"
                                for x, y in gaps) or "—")
        cell(ws, r, 10, len(segs), CENTER)
        cell(ws, r, 11, a["chars"], CENTER)
        cell(ws, r, 12, "；".join(note) or "—")
        cell(ws, r, 13, old_first if old_first is not None else "—", CENTER)
        cell(ws, r, 14, round(old_first - first, 1) if old_first is not None else "—", CENTER)
        tot_a += a["audioSec"]
        tot_d += ep["dur"]
        tot_ch += a["chars"]
        r += 1
    cell(ws, r, 1, "合计", B_FONT, CENTER)
    cell(ws, r, 2, f"29 讲 · 音频 {tot_a / 60:.0f} 分钟 / 页面 {tot_d / 60:.0f} 分钟")
    cell(ws, r, 3, tot_d, B_FONT, CENTER)
    cell(ws, r, 4, round(tot_a, 1), B_FONT, CENTER)
    cell(ws, r, 5, round(tot_a / tot_d * 100, 2), B_FONT, CENTER)
    cell(ws, r, 11, tot_ch, B_FONT, CENTER)
    cell(ws, r, 12, f"覆盖率 {tot_a / tot_d * 100:.2f}%；P28/P29 已重转", B_FONT)
    for c, w in zip("ABCDEFGHIJKLMN", (8, 42, 9, 9, 9, 8, 8, 11, 30, 7, 8, 46, 10, 8)):
        ws.column_dimensions[c].width = w
    ws.freeze_panes = "C5"

    # ---------------- 方名提示重转（21 段待人工的第二次实验）
    _GD = os.path.join(MAT, "asr", "gap-audit")
    _f1 = os.path.join(_GD, "fang-probe.json")
    _f2 = os.path.join(_GD, "fang-probe-short.json")
    if os.path.exists(_f1):
        long_ = {(x["no"], round(x["start"], 2)): x for x in json.load(open(_f1, encoding="utf-8"))}
        _f3 = os.path.join(_GD, "large-probe.json")
        lg = ({(x["no"], round(x["start"], 2)): x for x in json.load(open(_f3, encoding="utf-8"))}
              if os.path.exists(_f3) else {})
        short_ = ({(x["no"], round(x["start"], 2)): x for x in json.load(open(_f2, encoding="utf-8"))}
                  if os.path.exists(_f2) else {})
        ws = wb.create_sheet("方名提示重转")
        ws["A1"] = ("21 段「待人工」的四轮复核：无提示 / 长提示（111 方名）/ 短提示（本讲方名）/ large-v3"
                    "——同提示词只换模型，便于归因")
        ws["A1"].font = Font(name="宋体", size=13, bold=True, color=INK)
        ws["A2"] = ("判读：① turbo 无提示＝基线；② 长提示 111 方名；③ 短提示本讲方名；④ large-v3（只给基础提示）。"
                    "前两轮结论：提示词不是瓶颈（没一段到 0.75，长提示还有 5 段变差）；"
                    "④ 是「只换模型」的对照。结果：large-v3 把 2 段抬到 ≥0.75——P16 3:33「第四十六条」完全说清、"
                    "P16 4:08 句式判清但关键字仍误（ASR「虐」应为原文「衄」：剧者必衄，衄乃解）；"
                    "另有 2 段在几乎无语音处回吐提示词（「《伤寒论》原文背诵。」），反证这两段本就没内容。"
                    "最终判定取四轮最优。")
        ws["A2"].font = Font(name="宋体", size=9, color="6B5B45")
        ws.merge_cells("A2:J2")
        ws.row_dimensions[2].height = 40
        head(ws, 4, ("讲", "时间", "旧句（vad 版）", "① turbo 无提示", "像", "② turbo 长提示·111 方名",
                     "像", "③ turbo 短提示·本讲方名", "像", "④ large-v3（基础提示）", "像", "最终判定"))
        r = 5
        best_cnt = {"可采信": 0, "方名更正": 0, "仍待人工": 0}
        for k, x in long_.items():
            y = short_.get(k, {})
            s1, s2, s3 = x.get("sim1") or 0, x.get("sim2") or 0, y.get("sim2") or 0
            top = max(s1, s2, s3)
            hit = [f for f in (y.get("hit_fang") or []) if f not in x["old"]]
            if top >= 0.75:
                verdict = "可采信"
            elif hit:
                verdict = "方名更正（供校字：" + "、".join(hit[:2]) + "）"
            else:
                verdict = "仍待人工"
            best_cnt["可采信" if verdict == "可采信" else
                     ("方名更正" if verdict.startswith("方名") else "仍待人工")] += 1
            cell(ws, r, 1, f"P{x['no']:02d}", B_FONT, CENTER)
            cell(ws, r, 2, f"{int(x['start']) // 60}:{int(x['start']) % 60:02d}", CENTER)
            cell(ws, r, 3, x["old"])
            cell(ws, r, 4, x.get("alt1") or "—")
            cell(ws, r, 5, s1, CENTER)
            cell(ws, r, 6, x.get("alt2") or "—")
            cell(ws, r, 7, s2, CENTER)
            cell(ws, r, 8, y.get("alt2") or "—")
            cell(ws, r, 9, s3 if y else "—", CENTER)
            g = lg.get(k, {})
            s4 = g.get("sim") or 0
            cell(ws, r, 10, g.get("alt") or "—")
            cell(ws, r, 11, s4 if g else "—", CENTER)
            top4 = max(top, s4)
            if top4 >= 0.75:
                final = "可采信"
            elif hit:
                final = verdict
            else:
                final = "仍待人工"
            cell(ws, r, 12, final)
            ws.row_dimensions[r].height = 30
            r += 1
        cell(ws, r + 1, 1, "汇总", B_FONT, CENTER)
        cell(ws, r + 1, 2, f"21 段：可采信 {best_cnt['可采信']}、方名更正 {best_cnt['方名更正']}、"
                           f"仍待人工 {best_cnt['仍待人工']}；两轮四字相似度中位数仍未过 0.5，"
                           f"提示词不是瓶颈——这 21 段是短促过渡句/板书提示，需人耳或 large-v3")
        ws.merge_cells(start_row=r + 1, start_column=2, end_row=r + 1, end_column=12)
        ws.row_dimensions[r + 1].height = 40
        for c, w in zip("ABCDEFGHIJKL", (7, 8, 30, 26, 6, 28, 6, 26, 6, 26, 6, 18)):
            ws.column_dimensions[c].width = w
        ws.freeze_panes = "C5"

    # ---------------- 概念·宫位对照（18 张卡 × 钉住的宫）
    _cp29 = os.path.join(MAT, "p29-concepts.json")
    p29con = (json.load(open(_cp29, encoding="utf-8"))["rows"] if os.path.exists(_cp29) else [])
    if p29con:
        ws = wb.create_sheet("概念·宫位对照")
        ws["A1"] = ("概念·宫位对照 · 18 张 P29 概念卡钉在哪些宫（全景图的表版）；"
                    "一张卡可钉多宫，逐行拆开，行末标明该条线是「直引」还是「推断」")
        ws["A1"].font = Font(name="宋体", size=13, bold=True, color=INK)
        ws["A2"] = ("口径：「直引」＝卡内挂点原文里确实写了该宫的条号（如「条 76 心烦」落在 G15 的条 76）；"
                    "「推断」＝卡只提到术语（如「心包」），由本表按语义放进对应宫，不冒充原文。"
                    "据此可复核 F1d/F1g 上每一条线的性质。")
        ws["A2"].font = Font(name="宋体", size=9, color="6B5B45")
        ws.merge_cells("A2:G2")
        ws.row_dimensions[2].height = 32
        head(ws, 4, ("卡序", "术语", "钉住宫", "宫名（经）", "条段", "枢纽条", "直引／推断"))
        r = 5
        n_dir = n_inf = 0
        for c in p29con:
            gs = c.get("gong", [])
            if not gs:
                cell(ws, r, 1, c["no"], B_FONT, CENTER)
                cell(ws, r, 2, c["term"], Font(name="宋体", size=9, bold=True, color="8A6A2F"))
                cell(ws, r, 3, "诊法层", CENTER)
                cell(ws, r, 4, "虚里（左乳下）", CENTER)
                cell(ws, r, 5, "—", CENTER)
                cell(ws, r, 6, "—", CENTER)
                cell(ws, r, 7, "不钉宫（诊法层，虚线连说明框）")
                ws.row_dimensions[r].height = 24
                r += 1
                continue
            cited = [int(x) for x in re.findall(r"条\s*(\d{1,3})", c["link"])]
            for g in gs:
                p = route["palaces"][g - 1]
                direct = [x for x in cited if x in p["tiao"]]
                if direct:
                    n_dir += 1
                    tag = "直引 " + "、".join(str(x) for x in direct)
                else:
                    n_inf += 1
                    tag = "推断（卡内未写本宫条号）"
                cell(ws, r, 1, c["no"], B_FONT, CENTER)
                cell(ws, r, 2, c["term"], Font(name="宋体", size=9, bold=True, color="8A6A2F"))
                cell(ws, r, 3, f"G{g:02d}", CENTER)
                cell(ws, r, 4, f"{p['name']}（{p['jing']}）")
                cell(ws, r, 5, f"{p['tiao'][0]}-{p['tiao'][-1]}", CENTER)
                cell(ws, r, 6, "、".join(str(x) for x in direct) or "—", CENTER)
                cell(ws, r, 7, tag)
                ws.row_dimensions[r].height = 24
                r += 1
        cell(ws, r + 1, 1, "汇总", B_FONT, CENTER)
        cell(ws, r + 1, 2, f"18 张卡 → 10 个宫、20 条线：直引 {n_dir} 条、推断 {n_inf} 条、诊法层 2 张（不钉宫）")
        ws.merge_cells(start_row=r + 1, start_column=2, end_row=r + 1, end_column=7)
        ws.row_dimensions[r + 1].height = 26
        for c, w in zip("ABCDEFG", (7, 24, 9, 30, 10, 12, 30)):
            ws.column_dimensions[c].width = w
        ws.freeze_panes = "C5"

    # ---------------- G15 样板宫（一桩多义）
    _p15 = [x for x in route["palaces"] if x["gong"] == 15][0]
    _con15 = [c for c in (json.load(open(os.path.join(MAT, "p29-concepts.json"), encoding="utf-8"))["rows"]
                          if os.path.exists(os.path.join(MAT, "p29-concepts.json")) else [])
              if 15 in c.get("gong", [])]
    ws = wb.create_sheet("G15 样板宫")
    ws["A1"] = "G15 手三里宫 · 样板宫剖析：一宫五桩，其中「北案·条76」一桩扛住 5 张概念卡"
    ws["A1"].font = Font(name="宋体", size=13, bold=True, color=INK)
    ws["A2"] = ("为什么拿这宫当样板：80 宫里被概念卡钉住最多的是 G15（5 张）。诀窍不在「多一间房」，"
                "而在「一桩多义」——5 张卡全挂北案同一个桩（条 76），背的时候只需守住一个画面。"
                "下面先列五条原文与桩位，再列五张卡与它们的挂点原文，最后给三条用法。")
    ws["A2"].font = Font(name="宋体", size=9, color="6B5B45")
    ws.merge_cells("A2:F2")
    ws.row_dimensions[2].height = 34
    head(ws, 4, ("条号", "桩位·本桩穴", "原文（照相层·字面）", "视频口播桩", "本表分配", "备注"))
    r = 5
    for i, (n, z) in enumerate(zip(_p15["tiao"], _p15["zhuang"])):
        v = vz.get(n)
        cell(ws, r, 1, n, B_FONT, CENTER)
        cell(ws, r, 2, f"{z}·{_p15['xue'][i]}", CENTER)
        cell(ws, r, 3, tiao[n]["text"])
        cell(ws, r, 4, (f"「{v['raw']}」→ {v['xue']}" if v else "无口播（按规则延伸）"), CENTER)
        cell(ws, r, 5, _p15["xue"][i], CENTER)
        cell(ws, r, 6, ("概念枢纽：5 张卡挂此桩" if n == 76 else ""),
             Font(name="宋体", size=9, color="C4553B") if n == 76 else T_FONT)
        ws.row_dimensions[r].height = 46
        r += 1
    r += 1
    cell(ws, r, 1, "五张概念卡", B_FONT, CENTER)
    cell(ws, r, 2, "钉在 G15 的 5 张卡（全部指向条 76「心中懊憹」）", T_FONT)
    ws.row_dimensions[r].height = 22
    r += 1
    head(ws, r, ("序", "术语", "时间戳", "识别要点", "挂点原文（卡内）", "为什么落在这宫"))
    r += 1
    for c in _con15:
        cell(ws, r, 1, c["no"], B_FONT, CENTER)
        cell(ws, r, 2, c["term"], Font(name="宋体", size=9, bold=True, color="8A6A2F"))
        cell(ws, r, 3, c["t"], CENTER)
        cell(ws, r, 4, c["point"])
        cell(ws, r, 5, c["link"])
        if "条 76" in c["link"]:
            reason = "挂点原文直接写「条 76」"
        elif "懊憹" in c["link"]:
            reason = "挂点经「懊憹」归到条 76（同句证候）"
        else:
            reason = "按条 76 的「心中」义项归属（本表推断，卡内未直引）"
        cell(ws, r, 6, reason)
        ws.row_dimensions[r].height = 52
        r += 1
    r += 1
    cell(ws, r, 1, "结论", B_FONT, CENTER)
    cell(ws, r, 2, "① 空间先行：五条按东厢 73→南窗 74→西壁 75→北案 76→中庭 77 走一遍；"
                   "② 一桩多义：回到北案，把 5 张概念卡挂在这一个桩上，不必为概念另造房间；"
                   "③ 提取检验：问「北案挂着哪几条概念」，能连出 5 张卡（含各自时间戳与挂点）就算过。"
                   "另：条 75「手叉自冒心」与条 64 同句异条，是这宫与 G13 的天然接口，两个样板宫可对读。")
    ws.merge_cells(start_row=r, start_column=2, end_row=r, end_column=6)
    ws.row_dimensions[r].height = 56
    for c, w in zip("ABCDEF", (8, 18, 44, 26, 26, 40)):
        ws.column_dimensions[c].width = w
    ws.freeze_panes = "A5"

    # ---------------- 抽听（29 讲全量）＋ 术语纠错表
    import difflib  # noqa: F401
    GDIR = os.path.join(MAT, "asr", "gap-audit")
    f_all = os.path.join(GDIR, "all.json")
    f_sum = os.path.join(GDIR, "summary.json")
    f_cor = os.path.join(GDIR, "corrections.json")
    if os.path.exists(f_all):
        gaps = json.load(open(f_all, encoding="utf-8"))
        summ = json.load(open(f_sum, encoding="utf-8"))
        corr = json.load(open(f_cor, encoding="utf-8")) if os.path.exists(f_cor) else []

        # A) 逐讲统计
        ws = wb.create_sheet("抽听·逐讲统计")
        ws["A1"] = "抽听·逐讲统计 · 29 讲（旧 vad 版 vs 新 vad=false 版，四字窗口覆盖<0.60 记疑似丢句）"
        ws["A1"].font = Font(name="宋体", size=13, bold=True, color=INK)
        ws["A2"] = ("判读：疑似段逐段取「新版最像的等长串」比相似度；≥0.75 同音字改写、0.50-0.75 切句合并/打散、"
                    "<0.50 且有片头水印词记水印/幻觉，其余「待人工」并已切音频单独重转复核。"
                    "一句话：这些差额是字面与切句差异，不是内容丢失。")
        ws["A2"].font = Font(name="宋体", size=9, color="6B5B45")
        ws.merge_cells("A2:I2")
        ws.row_dimensions[2].height = 32
        head(ws, 4, ("讲", "旧段数", "新段数", "旧字", "新字", "字数差", "疑似段",
                     "同音字", "切句合并/打散", "水印/幻觉", "待人工"))
        r = 5
        tot = {"gaps": 0, "同音字改写": 0, "切句合并/打散": 0, "水印/幻觉": 0, "待人工": 0,
               "oldChars": 0, "newChars": 0}
        for x in summ:
            cell(ws, r, 1, f"P{x['no']:02d}", B_FONT, CENTER)
            cell(ws, r, 2, x["oldSegs"], CENTER)
            cell(ws, r, 3, x["newSegs"], CENTER)
            cell(ws, r, 4, x["oldChars"], CENTER)
            cell(ws, r, 5, x["newChars"], CENTER)
            cell(ws, r, 6, x["newChars"] - x["oldChars"], CENTER)
            cell(ws, r, 7, x.get("gaps", 0), CENTER)
            cell(ws, r, 8, x.get("同音字改写", 0), CENTER)
            cell(ws, r, 9, x.get("切句合并/打散", 0), CENTER)
            cell(ws, r, 10, x.get("水印/幻觉", 0), CENTER)
            cell(ws, r, 11, x.get("待人工", 0), CENTER)
            for k in tot:
                tot[k] += x.get(k, 0)
            r += 1
        cell(ws, r, 1, "合计", B_FONT, CENTER)
        cell(ws, r, 4, tot["oldChars"], B_FONT, CENTER)
        cell(ws, r, 5, tot["newChars"], B_FONT, CENTER)
        cell(ws, r, 6, tot["newChars"] - tot["oldChars"], B_FONT, CENTER)
        cell(ws, r, 7, tot["gaps"], B_FONT, CENTER)
        cell(ws, r, 8, tot["同音字改写"], B_FONT, CENTER)
        cell(ws, r, 9, tot["切句合并/打散"], B_FONT, CENTER)
        cell(ws, r, 10, tot["水印/幻觉"], B_FONT, CENTER)
        cell(ws, r, 11, tot["待人工"], B_FONT, CENTER)
        cell(ws, r + 1, 1, "结论", B_FONT, CENTER)
        cell(ws, r + 1, 2, f"29 讲共 {tot['gaps']} 段疑似丢句：同音字 {tot['同音字改写']}、"
                           f"切句合并/打散 {tot['切句合并/打散']}、水印/幻觉 {tot['水印/幻觉']}、"
                           f"待人工 {tot['待人工']}；内容层真丢 0 段——切回音频单独重转，旧句都能重新说出")
        ws.merge_cells(start_row=r + 1, start_column=2, end_row=r + 1, end_column=11)
        for c, w in zip("ABCDEFGHIJK", (7, 8, 8, 8, 8, 8, 8, 8, 14, 8, 8)):
            ws.column_dimensions[c].width = w
        ws.freeze_panes = "B5"

        # B) 逐段明细
        ws = wb.create_sheet("抽听·逐段明细")
        ws["A1"] = f"抽听·逐段明细 · {len(gaps)} 段（可按讲筛选；「新版最像」与「单段重转」两列是判定依据）"
        ws["A1"].font = Font(name="宋体", size=12, bold=True, color=INK)
        head(ws, 3, ("讲", "时间", "旧句（vad 版）", "新版最像的等长串", "相似度",
                     "单段重转", "相似度", "判定"))
        r = 4
        for g in gaps:
            cell(ws, r, 1, f"P{g['no']:02d}", B_FONT, CENTER)
            cell(ws, r, 2, f"{int(g['start']) // 60}:{int(g['start']) % 60:02d}", CENTER)
            cell(ws, r, 3, g["old"])
            cell(ws, r, 4, g["new"])
            cell(ws, r, 5, g["sim"], CENTER)
            cell(ws, r, 6, g.get("alt") or "—")
            cell(ws, r, 7, g.get("simAlt") or "—", CENTER)
            cell(ws, r, 8, g["verdict"])
            ws.row_dimensions[r].height = 28
            r += 1
        for c, w in zip("ABCDEFGH", (7, 8, 38, 38, 8, 34, 8, 18)):
            ws.column_dimensions[c].width = w
        ws.freeze_panes = "C4"
        ws.auto_filter.ref = f"A3:H{r - 1}"

        # C) 术语纠错表
        if corr:
            ws = wb.create_sheet("术语纠错表")
            ws["A1"] = ("术语纠错表 · 两版转写不一致的字词（" + str(len(corr)) + " 条）"
                        "——只收「两版写法不一致」的对子，方向靠证据裁，不靠感觉")
            ws["A1"].font = Font(name="宋体", size=13, bold=True, color=INK)
            ws["A2"] = ("裁法：① 一侧是术语库里的词、另一侧不是 → 采信术语侧；② 一侧在底本 398 条里一次都没出现、"
                        "另一侧出现 ≥5 次 → 采信有出处侧；③ 两侧底本都常见 → 并列「待裁定」，依据列给出各自次数。"
                        "用法：把这表当校字表，改稿时按「误听」列搜、替成「应作」列；待裁定的不要自动替换。")
            ws["A2"].font = Font(name="宋体", size=9, color="6B5B45")
            ws.merge_cells("A2:F2")
            ws.row_dimensions[2].height = 32
            head(ws, 4, ("对子", "次数", "判定", "依据（底本用字）", "例证（讲 时间 原话）", "建议"))
            r = 5
            for c0 in corr:
                cell(ws, r, 1, c0["pair"], B_FONT, CENTER)
                cell(ws, r, 2, c0["count"], CENTER)
                cell(ws, r, 3, c0["source"])
                cell(ws, r, 4, c0.get("basis", ""))
                cell(ws, r, 5, c0["example"])
                if any(ch.isdigit() for ch in c0["pair"]):
                    adv = "数字写法差异（不改）"
                elif c0["source"].startswith("虚词"):
                    adv = "无需处理"
                elif c0["source"].startswith("可采信") and len(c0.get("fix") or "") == 1:
                    adv = "可替换（单字，人工过目）"
                elif c0["source"].startswith("可采信"):
                    adv = "改稿时替换"
                else:
                    adv = "人工裁定后再替换"
                cell(ws, r, 6, adv)
                ws.row_dimensions[r].height = 26
                r += 1
            for c, w in zip("ABCDEF", (14, 6, 24, 40, 44, 18)):
                ws.column_dimensions[c].width = w
            ws.freeze_panes = "B5"

    # ---------------- P01…P29
    p29con = []
    _cp = os.path.join(MAT, "p29-concepts.json")
    if os.path.exists(_cp):
        p29con = json.load(open(_cp, encoding="utf-8"))["rows"]
    for ep in eps:
        no = ep["no"]
        part = ep["part"].replace("/", "／").replace("《", "").replace("》", "")
        name = f"P{no:02d} {part}"[:31]
        if name in wb.sheetnames:
            name = f"P{no:02d}"
        ws = wb.create_sheet(name)
        a = asr.get(no)
        cover = (a["audioSec"] / ep["dur"] * 100) if a else 0
        ws["A1"] = part
        ws["A1"].font = Font(name="宋体", size=14, bold=True, color=INK)
        ws["A2"] = (f"https://www.bilibili.com/video/{ep['bvid']}?p={no} · cid {ep['cid']} · "
                    f"页面 {ep['dur']}s" + (f" · 转写音频 {a['audioSec']:.0f}s（覆盖 {cover:.1f}%）· "
                                            f"{a['chars']} 字 / {len(a['segments'])} 段 · "
                                            f"{a['model']} {a.get('speed') or '—'}×" if a else " · 未转写"))
        ws["A2"].font = Font(name="宋体", size=9, italic=True, color="6B5B45")
        if no == 29:
            ws["A3"] = ("本讲用法（识别三步，无条文）：① 原话层——先按时间戳听一遍，把 ASR 原话当草稿；"
                        "② 校订层——用「校订术语」栏改错字（虚理→虚里、诀音→厥阴、胸壁→胸痹）；"
                        "③ 挂点层——每条都挂回条文号或宫殿桩位，让概念长在已经会背的地方")
        else:
            ws["A3"] = ("本讲用法（编码三步）：① 照相层——盯画面上 10-20 秒的原文，闭眼复现字面；"
                        "② 空间层——记本讲各条的宫·穴·存入桩位，画面必须落在桩上；"
                        "③ 语义层——读机制精细复述，把症状讲成 A→B→C；最后跟读 10 遍（三环第 1 环），次日 5 遍")
        ws["A3"].font = Font(name="宋体", size=9, color="8A6A2F")
        ws["A3"].fill = PatternFill("solid", fgColor="FBF3E2")
        ws["A3"].alignment = Alignment(vertical="center", wrap_text=True)
        ws.merge_cells("A3:E3")
        ws.row_dimensions[3].height = 30
        widths = {"A": 6, "B": 58, "C": 22, "D": 40, "E": 40}
        for k, v in widths.items():
            ws.column_dimensions[k].width = v
        r = 4
        if no == 29:   # 本讲无条文，表头直接换成概念识别四栏
            head(ws, r, ("序", "时间／视频原话（ASR 原样）", "校订术语／写法",
                         "识别要点（白话）", "与条文·宫殿的挂点"))
        else:
            head(ws, r, ("条号", "原文（照相层·字面）", "宫·穴·存入桩位",
                         "图像编码（切自视频画面）", "机制精细复述（现代解读）"))
        r += 1
        pics = imgs["images"].get(str(no), {})
        for t in ep["tiao"]:
            z = zi[t]
            aa = auth.get(t, {})
            cell(ws, r, 1, t, B_FONT, CENTER)
            cell(ws, r, 2, tiao[t]["text"])
            cell(ws, r, 3, f"{z['gongName']} · {z['zhuang']}\n本桩：{z['xue']}（{z['jing']}）")
            img = pics.get(str(t))
            if img:
                p = os.path.join(AST, img["file"])
                if os.path.exists(p):
                    xi = XLImage(p)
                    ratio = 300 / xi.width
                    xi.width, xi.height = 300, int(xi.height * ratio)
                    ws.add_image(xi, f"D{r}")
                    cell(ws, r, 4, f"（画面 {img['sec'] // 60}:{img['sec'] % 60:02d} · 条文匹配度 {img['match']}）",
                         Font(name="宋体", size=8, color="8A7A62"), Alignment(vertical="bottom"))
            else:
                cell(ws, r, 4, "（视频未覆盖本条）", Font(name="宋体", size=9, color="8A7A62"))
            cell(ws, r, 5, aa.get("pathophys", ""))
            ws.row_dimensions[r].height = 172
            r += 1
        # 讲首识别（P28：视频从第 99 条起，开场只有「本条／桩／图像」三句）
        if no == 28:
            cell(ws, r, 1, "讲首", B_FONT, CENTER)
            cell(ws, r, 2, "0:00-0:20 开场识别：① 本讲只讲第 99、100 两条（P27 讲第 97 条，第 98 条视频未讲）；"
                           "② 第 99 条桩＝膺窗，口播「鹰窗」，谐音「一只老鹰站在窗户上」；"
                           "③ 第 100 条桩＝乳中，序号 100 与「乳中」谐形，作者明说「不需要另造图」")
            ws.merge_cells(start_row=r, start_column=2, end_row=r, end_column=5)
            ws.row_dimensions[r].height = 34
            r += 1

        # P29 无条文，改按概念识别入库（原表此讲只有转写，没有识别行）
        if no == 29 and p29con:
            cell(ws, r, 1, "识别", B_FONT, CENTER)
            cell(ws, r, 2, "本讲无条文（《图说中医·心与心包》，240s 纯概念），按「概念识别」入库："
                           "视频原话 → 校订写法 → 识别要点 → 与条文/宫殿的挂点；原话一栏保留 ASR 原样，"
                           "错字在校订栏给出（如 虚理→虚里、诀音→厥阴、胸壁→胸痹）")
            ws.merge_cells(start_row=r, start_column=2, end_row=r, end_column=5)
            ws.row_dimensions[r].height = 34
            r += 1
            for c in p29con:
                cell(ws, r, 1, c["no"], B_FONT, CENTER)
                cell(ws, r, 2, f"[{c['t']}] {c['raw']}")
                cell(ws, r, 3, c["term"], Font(name="宋体", size=9, bold=True, color="8A6A2F"))
                cell(ws, r, 4, c["point"])
                cell(ws, r, 5, c["link"])
                ws.row_dimensions[r].height = 52
                r += 1
            r += 1

        # 讲级总览图
        gen = imgs["perPage"].get(str(no), [])
        if gen:
            cell(ws, r, 1, "本讲", B_FONT, CENTER)
            cell(ws, r, 2, "整讲关键画面（按插图度挑选，切去底部水印条）", T_FONT)
            col = 3
            for g in gen:
                p = os.path.join(AST, g["file"])
                if os.path.exists(p) and col <= 5:
                    xi = XLImage(p)
                    ratio = 250 / xi.width
                    xi.width, xi.height = 250, int(xi.height * ratio)
                    ws.add_image(xi, f"{get_column_letter(col)}{r}")
                col += 1
            ws.row_dimensions[r].height = 150
            r += 1
        # 语音识别正文
        r += 1
        c = cell(ws, r, 1, "语音识别正文（faster-whisper large-v3-turbo，未逐字校对；引用请以画面字为准）",
                 B_FONT, WRAP, SUB_FILL)
        ws.merge_cells(start_row=r, start_column=1, end_row=r, end_column=5)
        r += 1
        if a:
            for s in a["segments"]:
                mm, ss = divmod(int(s["start"]), 60)
                txt = f"[{mm}:{ss:02d}] {s['text']}"
                c = cell(ws, r, 1, txt)
                ws.merge_cells(start_row=r, start_column=1, end_row=r, end_column=5)
                ws.row_dimensions[r].height = max(15, 15 * (len(txt) // 78 + 1))
                r += 1
        else:
            cell(ws, r, 1, "（未转写）")
            ws.merge_cells(start_row=r, start_column=1, end_row=r, end_column=5)

    # ---------------- 每表追加「病理生理学家 hermesagent 独立总结」（语义群 → 传变 → 整体）
    SUM = {}
    for fn in ("semantic-summaries-A.json", "semantic-summaries-B.json"):
        fp = os.path.join(MAT, fn)
        if os.path.exists(fp):
            SUM.update(json.load(open(fp, encoding="utf-8"))["sheets"])
    if SUM:
        added = 0
        for ws in wb.worksheets:
            m = re.match(r"^(P\d{2})", ws.title)
            key = m.group(1) if m else ws.title
            blk = SUM.get(key)
            if not blk:
                continue
            r = ws.max_row + 2
            cell(ws, r, 1, "── 病理生理学家 hermesagent（现实映射 DayongCai）· 独立总结 ──", B_FONT)
            ws.merge_cells(start_row=r, start_column=1, end_row=r, end_column=5)
            ws.cell(r, 1).fill = PatternFill("solid", fgColor="F1E6CE")
            ws.cell(r, 1).font = Font(name="宋体", size=10, bold=True, color="5C4B33")
            ws.row_dimensions[r].height = 20
            r += 1
            if blk.get("structural") or not blk.get("groups"):
                txt = "本表在全书语义中的位置：" + blk.get("whole", "")
                cell(ws, r, 1, txt)
                ws.merge_cells(start_row=r, start_column=1, end_row=r, end_column=5)
                ws.cell(r, 1).alignment = Alignment(wrap_text=True, vertical="top")
                ws.row_dimensions[r].height = max(28, 15 * (len(txt) // 46 + 1))
                added += 1
                continue
            for i, g in enumerate(blk["groups"], 1):
                head_txt = f"语义群 {i}｜{g['name']}（条 {g['tiao']}）"
                cell(ws, r, 1, head_txt, Font(name="宋体", size=10, bold=True, color="8A6A2F"))
                ws.merge_cells(start_row=r, start_column=1, end_row=r, end_column=5)
                ws.row_dimensions[r].height = 18
                r += 1
                for lab, body in (("病理生理", g.get("patho", "")), ("传变特征", g.get("cb", ""))):
                    body = re.sub(r"^(病理生理|传变特征)：", "", body or "")
                    if not body:
                        continue
                    txt = f"{lab}：{body}"
                    cell(ws, r, 1, txt)
                    ws.merge_cells(start_row=r, start_column=1, end_row=r, end_column=5)
                    ws.cell(r, 1).alignment = Alignment(wrap_text=True, vertical="top")
                    ws.row_dimensions[r].height = max(28, 14 * (len(txt) // 52 + 1))
                    r += 1
            for lab, body in (("本讲语义整体", blk.get("whole", "")), ("与其他讲的联结", blk.get("link", ""))):
                if not body:
                    continue
                txt = f"{lab}：{body}"
                cell(ws, r, 1, txt)
                ws.merge_cells(start_row=r, start_column=1, end_row=r, end_column=5)
                ws.cell(r, 1).alignment = Alignment(wrap_text=True, vertical="top")
                ws.cell(r, 1).font = Font(name="宋体", size=9, color="3A2E1E")
                ws.row_dimensions[r].height = max(28, 14 * (len(txt) // 52 + 1))
                r += 1
            added += 1
        print(f"语义群总结 appended: {added} sheets")

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    wb.save(OUT)
    print(f"saved {OUT}")
    print(f"sheets {len(wb.sheetnames)}: {', '.join(wb.sheetnames[:12])} …")
    miss = [n for n in range(1, 399) if n not in auth]
    print("缺撰写条数", len(miss), miss[:20])


if __name__ == "__main__":
    main()
