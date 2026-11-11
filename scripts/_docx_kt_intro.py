# -*- coding: utf-8 -*-
"""生成《中医药领域知识树 · 项目简介》Word 文档 v1.1（架构 / 目录结构 / 落地路线），存到桌面。"""
import os
from docx import Document
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.shared import Pt, RGBColor, Cm

OUT = os.path.join(os.environ["USERPROFILE"], "Desktop", "中医药领域知识树-项目简介-v1.1.docx")

doc = Document()
for s in doc.sections:
    s.left_margin = s.right_margin = Cm(2.4)
    s.top_margin = s.bottom_margin = Cm(2.3)

normal = doc.styles["Normal"]
normal.font.name = "宋体"
normal.font.size = Pt(10.5)
normal.element.rPr.rFonts.set(qn("w:eastAsia"), "宋体")
normal.paragraph_format.line_spacing = 1.45
normal.paragraph_format.space_after = Pt(4)


def set_ea(run, font):
    run.font.name = font
    run._element.rPr.rFonts.set(qn("w:eastAsia"), font)


def h(text, level=1, size=14.5):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(12 if level == 1 else 8)
    p.paragraph_format.space_after = Pt(5)
    r = p.add_run(text)
    r.bold = True
    r.font.size = Pt(size)
    set_ea(r, "黑体")
    r.font.color.rgb = RGBColor.from_string("1F3864")
    return p


def para(text, size=10.5, indent=True, bold=False):
    p = doc.add_paragraph()
    if indent:
        p.paragraph_format.first_line_indent = Pt(21)
    r = p.add_run(text)
    r.font.size = Pt(size)
    r.bold = bold
    return p


def bullet(text, size=10.5):
    p = doc.add_paragraph(style="List Bullet")
    p.paragraph_format.space_after = Pt(2)
    r = p.add_run(text)
    r.font.size = Pt(size)
    return p


def mono(lines):
    for line in lines:
        p = doc.add_paragraph()
        p.paragraph_format.space_after = Pt(0)
        p.paragraph_format.line_spacing = 1.0
        r = p.add_run(line)
        r.font.size = Pt(8.5)
        set_ea(r, "Consolas")
    doc.add_paragraph().paragraph_format.space_after = Pt(2)


def table(headers, rows, widths=None, fs=9.5):
    t = doc.add_table(rows=1, cols=len(headers))
    t.style = "Table Grid"
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    for i, hd in enumerate(headers):
        c = t.rows[0].cells[i]
        c.text = ""
        r = c.paragraphs[0].add_run(hd)
        r.bold = True
        r.font.size = Pt(fs)
        set_ea(r, "黑体")
    for row in rows:
        cells = t.add_row().cells
        for i, val in enumerate(row):
            cells[i].text = ""
            r = cells[i].paragraphs[0].add_run(str(val))
            r.font.size = Pt(fs)
    if widths:
        for row in t.rows:
            for i, w in enumerate(widths):
                row.cells[i].width = Cm(w)
    doc.add_paragraph().paragraph_format.space_after = Pt(2)
    return t


# ---------------- 封面 ----------------
p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = p.add_run("网络软件工程 · 项目简介")
r.font.size = Pt(10)
r.font.color.rgb = RGBColor.from_string("7F7F7F")

p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = p.add_run("中医药领域知识树")
r.bold = True
r.font.size = Pt(26)
set_ea(r, "黑体")
r.font.color.rgb = RGBColor.from_string("1F3864")

p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = p.add_run("面向智能体的中医药知识组织平台 · 项目架构 / 目录结构 / 落地路线")
r.font.size = Pt(12)
r.font.color.rgb = RGBColor.from_string("404040")

p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = p.add_run("版本 v1.1　·　2026 年 11 月　·　内部资料")
r.font.size = Pt(9)
r.font.color.rgb = RGBColor.from_string("808080")

# ---------------- 一 ----------------
h("一、项目概述")
para("「中医药领域知识树」是一个面向智能体（Agent）的中医药知识组织与检索平台。它把分散在 9 个院系、188 门学科、"
     "2,110 个已建章节中的知识，组织成一棵「须—根—干—枝—叶」五级知识树：树承载从属与教学先后，图承载跨枝关系，"
     "朝代与学派作为两张正交视图叠加其上。")
para("项目要解决的不是「再做一套课程网站」，而是四个工程问题：知识点重复、院系割裂、历史脉络无处安放、"
     "学派经验无法聚合。四个问题分别对应四条设计线索，每条线索都由数据结构与门禁来保证，而不是靠人工校对的自觉。")

# ---------------- 二 ----------------
h("二、建设背景：四个真实痛点")
table(["痛点", "现状表现", "后果"], [
    ["知识点重复", "同一概念（如「肝主疏泄」「辨证论治」）在 3–5 门课里各写一遍，写法不同、口径不一", "检索到多个版本，智能体无法判断以哪条为准"],
    ["院系割裂", "知识按课程存，跨院系调用只能整章搬用", "「按系取知识」做不到，只能按课取"],
    ["历史脉络缺失", "朝代信息散落在《中国医学史》一课内，其他课没有年代坐标", "无法回答「这个说法最早出自哪、后来怎么变」"],
    ["学派无法聚合", "各家学说的经验以文章形式存在，未与具体知识点挂钩", "学派对比只能靠人读，不能查询"],
], widths=[3.0, 8.2, 5.0])

# ---------------- 三 ----------------
h("三、目标与设计原则：四条线索 → 四条硬机制")
para("项目目标：让智能体能按「院系 / 朝代 / 学派 / 查重」四种方式，取到不重复、可溯源、带出处的中医药知识点。", bold=True)
table(["设计线索", "结构机制", "门禁判据"], [
    ["① 知识点不重复", "叶的身份由概念定、不由位置定：叶 ID = K-<概念哈希>；同一概念在多门课只记 occurs[]，不复制节点；跨枝只允许 ref 边",
     "同 ID 唯一；同义标题归并；正文相似度 ≥0.92 判重；每叶 owner 唯一"],
    ["② 院系专业功能靠近分布", "L2 干 = 院系，L3 枝 = 学科，L4 叶 = 章内知识点；目录镜像这三级；跨院系公用概念升到 L1 根或概念丛",
     "每叶 owner 必须挂在某一枝；跨院系引用须登记理由"],
    ["③ 尽可能类似历史演进", "与时序正交的 dynasty 轴（先秦→当代）+ firstAttested（典籍·篇名）+ derives_from 源流边；历史视图为投影，不复制节点",
     "有出处的叶须有 firstAttested 或显式 unknown；derives_from 不得成环"],
    ["④ 学派聚集知识树枝叶", "学派 = 簇文件，记录其占据的叶集合；叶上留 schools[] 反查；簇只聚合、不新建节点",
     "每簇 ≥3 叶；每叶学派归属 ≤2；簇内叶须同一时代窗；判据用主张句而非词频"],
], widths=[3.4, 8.4, 4.4])

# ---------------- 四 ----------------
h("四、总体架构：七层单向派生")
para("依赖只能朝一个方向：源层 → 单元层 → 叶层 → 关系/簇层 → 视图层 → 交付层。视图回写上游一律视为缺陷，"
     "与既有工程规范（ARCHITECTURE.md 的 L1 条）一致。")
table(["层", "名称", "内容", "状态"], [
    ["L0", "源层", "原始资料（xlsx / pdf），只读、带指纹，不改原文", "已有"],
    ["L1", "单元层", "standards/<学科>/units.json：章节 → 单元 → 正文", "180 学科 / 18,065 单元"],
    ["L2", "骨架层", "须 6 / 根 4 / 干 9（院系）/ 枝 188（学科）", "已落盘并通过回账"],
    ["L3", "叶层", "知识点：概念身份 + 出现位置 + 出处 + 朝代 + 学派", "M1–M2 建设中"],
    ["L4", "关系层", "六类边：nourish / spine / leaf / ref / derives_from / dsu", "M3 建设中"],
    ["L5", "簇层", "学派簇：先接现有 8 学派，目标 20+", "M4 建设中"],
    ["L6", "视图层", "history（朝代）/ school（学派）/ dept（院系）/ path（学习路径）", "M5 建设中"],
    ["L7", "交付层", "站点、目录、智能体工具（query_tree / find_dup / path_between）", "规划"],
], widths=[1.2, 2.4, 9.4, 4.0])

# ---------------- 五：目录结构 ----------------
h("五、项目目录结构")
para("目录与树的层级一一对应：院系（干）→ 学科（枝）→ 一学科一文件（叶）。标记 ☑ 为已有，＋ 为本次规划新增。")
mono([
    "standards/knowledge-tree/",
    "☑ sources/中医知识树.xlsx              原始骨架源（18 表，sha 81728b32…）",
    "☑ 规范-中医知识树五级骨架.md          五级定义与构建规模",
    "☑ tree-schema.json                    骨架 schema（8 域 / 120 枝 / 5 级）",
    "☑ source-map.json                     源文件指纹与表结构映射",
    "☑ skeleton/                           ★ 本轮新增：机器可读的 L0–L3",
    "    ☑ L0-need.json                    6 须（哲学根基）",
    "    ☑ L1-root.json                    4 根（核心公理）",
    "    ☑ L2-domain.json                  9 干（院系，含学科数/章数）",
    "    ☑ L3-branch.json                188 枝（学科，含单元数/字数密度）",
    "    ☑ mapping.json                    源 8 域 ↔ 本库 9 院系 + 差额 68",
    "＋ leaves/                             ★ 叶层：一学科一文件",
    "    ＋ D01/<branch>.json              ~22 个（中医系）",
    "    ＋ D02 … D09/<branch>.json        其余八院系",
    "＋ edges/                              六类边，分文件存",
    "    ＋ nourish.json  spine.json  ref.json  derives_from.json  dsu.json",
    "＋ clusters/school/                    学派簇：liu-wansu.json 等，8 → 20+",
    "＋ views/                              视图层（可删可重建的投影）",
    "    ＋ history/<dynasty>.json         先秦 / 汉 / 晋唐 / 宋金元 / 明清 / 近现代 / 当代",
    "    ＋ school/<key>.json              学派视图",
    "    ＋ dept/<Dxx>.json                院系视图（按系取枝）",
    "    ＋ path/<program>.json            学习路径（复用 data/prereq-roots.json）",
    "＋ scripts/build_kt_leaves.js          叶候选抽取（M1）",
    "＋ scripts/check_knowledge_tree.js     叶唯一性/近重/边无环/视图可重建（M5）",
    "☑ scripts/build_kt_skeleton.js         骨架生成与回账（--check 已可用）",
])

# ---------------- 六：数据结构 ----------------
h("六、关键数据结构")
para("叶（L4）——身份由概念定，出现位置只作属性：")
mono([
    "{",
    '  "id": "K-8f3a91c2",',
    '  "name": "肝主疏泄",',
    '  "aliases": ["疏泄失职", "肝失疏泄"],',
    '  "owner": "01-zhongyi/01-zhongyi-jichu-lilun",',
    '  "occurs": [',
    '    {"branch": "01-zhongyi/01-zhongyi-jichu-lilun", "chapter": 2, "unit": "2.3"},',
    '    {"branch": "01-zhongyi/14-zhongyi-zhenghou-xue", "chapter": 5, "unit": "5.1"}',
    "  ],",
    '  "firstAttested": {"book": "素问", "chapter": "五常政大论", "disp": "战国至汉"},',
    '  "dynasty": "先秦—汉",',
    '  "schools": ["liu-wansu"],',
    '  "evidence": {"units": 3, "hanzi": 1840, "refs": 2},',
    '  "src": ["standards/zhongyi-jichu-lilun/units.json#2.3"]',
    "}",
])
para("边（L4 关系层）六类语义固定，不许混用：")
table(["边", "方向", "含义", "规模"], [
    ["nourish", "须 → 根", "哲学根基滋养核心公理", "6×4"],
    ["spine", "根 → 干", "每条公理在每个院系域各落一条", "4×9 = 36"],
    ["leaf", "枝 → 叶", "学科包含哪些知识点", "188 枝"],
    ["ref", "叶 ↔ 叶（跨枝）", "同一概念在别的课出现，只引用不复制", "按需，须记理由"],
    ["derives_from", "叶 → 叶", "历史源流（谁源于谁），带年代", "按需，禁止成环"],
    ["dsu", "叶 ↔ 病证", "知识点与证候单元的挂接", "接证候库"],
], widths=[2.6, 3.4, 7.6, 3.0])

# ---------------- 七：学派 ----------------
h("七、学派簇：把「学派」挂到枝叶上")
para("学派不是新层，而是簇。每簇记录「这个学派占据哪些叶」，叶上再留 schools[] 反查。现有 8 个学派来自各家学说底本，"
     "可直接建成首批簇：")
table(["学派", "朝代", "主张", "语料命中", "证 / 病"], [
    ["刘完素（河间）", "金", "六气皆从火化，主寒凉", "637", "37 / 61"],
    ["张从正（攻邪）", "金", "病由邪生，汗吐下三法", "1,476", "39 / 70"],
    ["李杲（补土）", "金元", "内伤脾胃，百病由生；升阳益气", "68", "23 / 31"],
    ["朱震亨（滋阴）", "元", "阳常有余，阴常不足", "50", "35 / 62"],
    ["张景岳（温补）", "明", "阳非有余，真阴不足", "7", "34 / 45"],
    ["叶天士（温病）", "清", "卫气营血辨证", "824", "37 / 50"],
    ["王清任（活血）", "清", "气虚血瘀，补气活血", "803", "23 / 50"],
    ["张锡纯（汇通）", "清末民国", "衷中参西", "49", "43 / 73"],
], widths=[3.6, 2.2, 6.2, 2.4, 2.2])
para("判据提示：上表命中数是按术语统计的（如「火」→ 河间），若直接拿来挂叶，凡提「火」的叶都会被吸进河间簇。"
     "M4 必须把判据换成「主张句 + 方证族」，否则学派簇会变成词频聚类。")

# ---------------- 八：数据基础 ----------------
h("八、数据基础与已有资产")
table(["资产", "实测规模"], [
    ["课程体系", "9 院系 · 188 学科 · 2,110 个已建章节（目标 2,130）"],
    ["单元层", "180 个学科有 units.json，合计 18,065 单元、33,820,147 汉字"],
    ["五级骨架源", "4 篇 10 章 49 节 / 296 单元；源构建 3,063 节点 · 3,370 边 · 2,489 叶 + 103 病证（共 2,592 叶）、概念丛 333"],
    ["骨架落盘", "L0 6 · L1 4 · L2 9 · L3 188；build_kt_skeleton.js --check 通过"],
    ["学派库", "8 学派 · 三类语料命中 2,792（伤寒 1,760 / 金匮 402 / 温病 630）"],
    ["口径差异", "源骨架 8 域 120 枝 vs 本库 9 院系 188 枝，差额 68 已逐条记录，不做静默对齐"],
], widths=[3.2, 12.4])

# ---------------- 九：落地路线 ----------------
h("九、落地路线：六阶段，每阶段有量化判据")
table(["阶段", "产物", "判据"], [
    ["M0 对齐（已完成）", "骨架 L0–L3 + 源域/院系映射表", "回账通过：6 / 4 / 9 / 188；差额 68 已记录"],
    ["M1 叶候选抽取", "各学科叶文件（从单元标题层抽取）", "180 学科全覆盖；每叶至少 1 处 occurs；候选量 2,000–3,000"],
    ["M2 去重与归并", "归并表 + 重复对清单", "18,065 单元压到约 2.5k 叶；未决重复组为 0"],
    ["M3 关系与朝代", "六类边 + 每叶 firstAttested", "spine 36 条齐全；derives_from 无环；有出处叶 ≥60%"],
    ["M4 学派簇", "学派簇 8 → 20", "每簇 ≥3 叶；同朝代窗；判据改为主张句"],
    ["M5 视图与工具", "四类视图 + 查询工具", "按院系/朝代/学派/查重各 5 条样例可用，并接入 npm run check"],
], widths=[3.6, 6.6, 6.2])

# ---------------- 十：应用 ----------------
h("十、应用场景：智能体的四种取法")
table(["场景", "取法", "输出"], [
    ["排课与出题", "query_tree --dept 03-zhenjiu", "该系全部学科 + 各枝叶数/字数密度"],
    ["医学史与专题串讲", "query_tree --dynasty 宋金元", "该时段首次出现的知识点 + 源流关系"],
    ["各家学说对比", "query_tree --school liu-wansu", "簇内叶 + 核心术语 + 原文命中"],
    ["建课前查重", "check_knowledge_tree --dup", "重复/近重叶清单，避免两门课写同一知识点"],
], widths=[3.6, 5.4, 7.4])

# ---------------- 十一：风险 ----------------
h("十一、风险与边界")
bullet("源骨架 120 枝 ≠ 本库 188 枝：多出的 68 枝（护理 27、基础 17、源未设枝的学科）需补写语义，源骨架只给了编号。")
bullet("89 个学科尚无单元层：枝在、叶空，只能标「待补源」，不拿别的课内容顶替。")
bullet("叶粒度是最大不确定性：一单元一叶会得到 1.8 万叶，远超源骨架 2,592；必须归并，抽检 200 叶、判准率 ≥90% 才进 M3。")
bullet("学派判据要防「术语绑学派」：现有学派库靠词频，需加主张句判据。")
bullet("知识树是投影，单元层是事实源：树的任何视图都不得成为其他构建的输入。")

# ---------------- 十二：交付 ----------------
h("十二、当前交付物")
table(["类别", "内容", "状态"], [
    ["架构文档", "《中医药领域知识树·项目架构与落地路线（v1）》", "已完成"],
    ["机器可读骨架", "L0-need / L1-root / L2-domain / L3-branch / mapping", "已完成"],
    ["生成与回账脚本", "scripts/build_kt_skeleton.js（支持 --check）", "已完成"],
    ["叶层与关系层", "leaves / edges / clusters / views", "规划中（M1–M5）"],
    ["Word 简介", "本文件", "v1.1"],
], widths=[3.4, 9.0, 3.6])

doc.save(OUT)
print("saved:", OUT, os.path.getsize(OUT), "bytes")
