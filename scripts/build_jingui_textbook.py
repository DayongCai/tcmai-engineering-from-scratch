# -*- coding: utf-8 -*-
"""scripts/build_jingui_textbook.py —— 《金匮要略》教材线（[textbooks]）24 章生成器

与课程线（[tcmP]）同源：章号、章名、覆盖篇都与 `departments/01-zhongyi/08-jingui-yaolue/chapters.json` 一致。
体例按 `textbooks/README.md` 的章契约：N.1 概念与出处 / N.2 为什么可以这样翻译 /
N.3 这个翻译丢掉了什么 / N.4 与相邻学科的接口 / N.5 争议与本项目立场 / 小结 / 思考题 / 延伸阅读。

分工：
  · 人工层（N.2-N.5、小结、思考题、延伸阅读、前言）= `scripts/jingui_textbook_content.py`
  · 生成层（N.1 条文全录、表 1-4 统计、章首块）= 本脚本，数字全部从 `standards/jingui/底本.json` 现算
  · 章节里出现的每个数（条 / 方 / 字 / 字面分类 / 药味）都与课程 docs 同源，改一处必须两处一起改

产物：
  textbooks/01-zhongyi/08-jingui-yaolue/00-前言.md
  textbooks/01-zhongyi/08-jingui-yaolue/NN-第N章-<标题>.md   × 24
  departments/01-zhongyi/08-jingui-yaolue/meta.json 的 textbook 块（chaptersWritten / words / status）

用法：
  python scripts/build_jingui_textbook.py            # 生成/更新 24 章 + 前言 + meta
  python scripts/build_jingui_textbook.py --check    # 幂等校验（不写盘）
"""
from __future__ import annotations

import io
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from jingui_textbook_content import CHAPTERS  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SUBJ = os.path.join(ROOT, "departments", "01-zhongyi", "08-jingui-yaolue")
OUT = os.path.join(ROOT, "textbooks", "01-zhongyi", "08-jingui-yaolue")
BEN = json.load(io.open(os.path.join(ROOT, "standards", "jingui", "底本.json"), encoding="utf-8"))
GS = json.load(io.open(os.path.join(ROOT, "standards", "jingui", "gushiwen", "gushiwen.json"), encoding="utf-8"))
CH = {c["n"]: c for c in json.load(io.open(os.path.join(SUBJ, "chapters.json"), encoding="utf-8"))["chapters"]}

# ── 词解层（**本项目自撰**，不引外源）────────────────────────────────────────
# 只在「本条原文里真出现过」的词上挂解释；一条最多挂 8 个，按出现先后排。
sys.path.insert(0, os.path.join(ROOT, "scripts"))
from jingui_cidian import CIDIAN as _CIDIAN  # noqa: E402

CIDIAN = {}
for _w, _g in _CIDIAN:
    CIDIAN.setdefault(_w, _g)          # 重复词形取首次定义（谷气、当归芍药散各有两处写法）
from jingui_shiyi import SHIYI as _SY1  # noqa: E402
from jingui_shiyi2 import SHIYI2 as _SY2  # noqa: E402
from jingui_shiyi3 import SHIYI3 as _SY3  # noqa: E402
from jingui_shiyi4 import SHIYI4 as _SY4  # noqa: E402

SHIYI = {**_SY1, **_SY2, **_SY3, **_SY4}   # 条号 → 一句话串讲（自撰）
from jingui_fangjie import FANGJIE as _FJ1  # noqa: E402
from jingui_fangjie2 import FANGJIE2 as _FJ2  # noqa: E402

FANGJIE = {**_FJ1, **_FJ2}     # 方名（不含末尾「方」）→ (功用, 方义)
CIDIAN_MAX = 8


def cidian_of(text: str) -> list:
    """本条能解的词：先按出现位置排，同位置取长词优先。"""
    hits = []
    for w in CIDIAN:
        pos = text.find(w)
        if pos >= 0:
            hits.append((pos, -len(w), w))
    hits.sort()
    return [(w, CIDIAN[w]) for _, _, w in hits][:CIDIAN_MAX]


# ── 注家层（外源·笈成；逐字引用，只做 t2s 字形转换）────────────────────────────
import opencc  # noqa: E402

T2S = opencc.OpenCC("t2s")
ZD = os.path.join(ROOT, "standards", "jingui", "zhujia")
ZHU_ALIGN = json.load(io.open(os.path.join(ZD, "align.json"), encoding="utf-8"))
ZHU_BOOKS = {}
for _slug in ("yizong", "xindian", "qianzhu", "jiyi"):
    _p = os.path.join(ZD, "books", _slug + ".json")
    if os.path.exists(_p):
        ZHU_BOOKS[_slug] = json.load(io.open(_p, encoding="utf-8"))

# tiao → [(order, 作者, 书名, 卷, 篇, 注文简体)]
ZHU_OF = {}
ORDER = {"yizong": 0, "xindian": 1, "qianzhu": 2, "jiyi": 3}
for _slug, _bk in ZHU_BOOKS.items():
    for _sec in _bk["sections"]:
        for _blk in _sec["blocks"]:
            _t = _blk.get("tiao")
            if not _t or not _blk.get("notes"):
                continue
            _txt = chr(10).join(_blk["notes"]).strip()
            if not _txt:
                continue
            ZHU_OF.setdefault(_t, []).append({
                "order": ORDER.get(_slug, 9),
                "author": _bk["author"],
                "book": _bk["book"],
                "juan": _sec["juan"],
                "pian": _sec["title"],
                "text": T2S.convert(_txt),
            })
for _t in ZHU_OF:
    ZHU_OF[_t].sort(key=lambda x: x["order"])
META_PATH = os.path.join(SUBJ, "meta.json")

BY_NO = {p["no"]: p for p in BEN["pian"] if p.get("no")}
TAIL = [p for p in BEN["pian"] if not p.get("no")]  # 序 + 23/24/25
BOOK = BEN["counts"]

# 章 → 篇（与课程线同一张指派表；第 10 章跨篇统计，不给全录）
PIAN_OF = {
    1: [], 2: [1], 3: [2], 4: [3], 5: [4, 5], 6: [6], 7: [12], 8: [13], 9: [20, 21, 22], 10: [],
    11: [7], 12: [8], 13: [9], 14: [10], 15: [11], 16: [14], 17: [15], 18: [16], 19: [17],
    20: [18], 21: [19], 22: [23], 23: [24], 24: [25],
}
XU_IN_CH1 = True


def pn(no: int) -> dict:
    return BY_NO[no] if no <= 22 else TAIL[no - 22]


def articles(no: int):
    return sorted(pn(no)["articles"], key=lambda a: a["idx"])


def stats(n: int) -> dict:
    no_list = PIAN_OF[n]
    arts = [a for no in no_list for a in articles(no)]
    fangles = [f for a in arts for f in (a.get("formulas") or [])]
    herbs = [h for f in fangles for h in (f.get("ingredients") or [])]
    freq = {}
    for h in herbs:
        freq[h["herbSimp"]] = freq.get(h["herbSimp"], 0) + 1
    top = sorted(freq.items(), key=lambda kv: (-kv[1], kv[0]))[:5]
    tiao = len(arts)
    fang = len(fangles)
    chars = sum(pn(no).get("chars", 0) for no in no_list)
    dead = sum(1 for a in arts if re.search(r"死|不治", a["zhHans"]))
    harder = sum(1 for a in arts if "难治" in a["zhHans"])
    ban = sum(1 for a in arts if re.search(r"不可|禁|勿", a["zhHans"]))
    heal = sum(1 for a in arts if re.search(r"自愈|欲解|乃愈|即愈", a["zhHans"]))
    return {
        "tiao": tiao, "fang": fang, "chars": chars,
        "ratio": "%.2f" % (fang / tiao) if tiao else "—",
        "chu": sum(1 for a in arts if a.get("formulas")),
        "dead": dead, "hard": harder, "ban": ban, "heal": heal,
        "herb_tok": len(herbs), "herb_dis": len(freq),
        "top": "、".join("%s×%d" % (k, v) for k, v in top) or "（无方文）",
        "arts": arts, "fangles": fangles,
    }


def pian_names(no_list) -> str:
    if not no_list:
        return "跨篇（第 2、4、12、22 篇抽样）"
    return "、".join("第 %d 篇" % no for no in no_list)


def render_n1(n: int, st: dict) -> list:
    out = ["## N.1 概念与出处", ""]
    no_list = PIAN_OF[n]
    if not no_list and n == 10:
        out += [
            "> 本章跨篇：不做单篇全录，原文分见第 2、5、7、9 章（篇 1-6、12、13、20-22 已逐条全录），"
            "本章只做全书 174 方的方—篇交叉统计。方数口径见 `standards/jingui/README.md` §五（174 = 165 有方文 + 9 互见）。",
            "",
        ]
        return out
    if n == 1 and XU_IN_CH1:
        out += [
            "> **序（无条号）**：底本 `tiao: null`，整段录出；`notes`（雙行夾注）不混进正文。",
            "",
            "**序**　" + TAIL[0]["articles"][0]["zhHans"].strip(),
            "",
        ]
    for no in no_list:
        p = pn(no)
        arts = articles(no)
        if no >= 23:
            gs = next(x for x in GS["pian"] if x["no"] == no)
            out += [
                "> **第 %d 篇（附）· %s**：底本整篇 1 条、无条号；古诗文网本 %d 段 / %d 字。"
                "附篇不编条号，引用写「第 %d 篇（附）」。下列段落按古诗文网本顺序，段号只作行文定位。"
                % (no, p.get("nameSimp", ""), gs["paraCount"], gs["chars"], no),
                "",
            ]
            for i, para in enumerate(gs["paras"], 1):
                if para["kind"] in ("tiao", "herb"):
                    out.append("**段 %d**　%s" % (i, para["text"]))
                    out.append("")
                    _ci = cidian_of(para["text"])
                    if _ci:
                        out.append("**【词解】**　" + "；".join("%s：%s" % (w, g.rstrip("。")) for w, g in _ci) + "。")
                        out.append("")
                        out.append("<sub>本项目自撰词解（不引注本）；附篇只解字义与服法，不作辨证结论。</sub>")
                        out.append("")
            continue
        out += [
            "> **第 %d 篇 · %s**：%d 条 · %d 方 · %d 字。条号即源页 `<p id=\"X.Y\">`，不等于宋本分条；"
            "逐字取自 `standards/jingui/底本.json`（外源·笈成）。与古诗文网本的分篇/分字差异见 "
            "`standards/jingui/gushiwen/校勘.md`。"
            % (no, p.get("nameSimp", ""), len(arts),
               sum(len(a.get("formulas") or []) for a in arts), p.get("chars", 0)),
            "",
        ]
        for a in arts:
            out.append("**第%s条**　%s" % (a["tiao"], a["zhHans"]))
            out.append("")
            _sy = SHIYI.get(a["tiao"])
            if _sy:
                out.append("**【释义】**　" + _sy)
                out.append("")
                out.append("<sub>本项目自撰串讲（不引注本）；一句话概述本条主证与主方，不作辨证结论、不引申治法。</sub>")
                out.append("")
            _ci = cidian_of(a["zhHans"])
            if _ci:
                out.append("**【词解】**　" + "；".join("%s：%s" % (w, g.rstrip("。")) for w, g in _ci) + "。")
                out.append("")
                out.append("<sub>本项目自撰词解（不引注本）；只解字义/病名/脉象/服法，不作辨证结论。</sub>")
                out.append("")
            for _f in a.get("formulas") or []:
                _nm = _f["nameSimp"].replace("方", "")
                if _nm not in FANGJIE:
                    continue
                _gy, _fy = FANGJIE[_nm]
                out.append("**【方解·%s】**　功用：%s；方义：%s" % (_nm, _gy.rstrip("。"), _fy.rstrip("。")))
                out.append("")
                out.append("<sub>本项目自撰方解（不引注本）；药味与底本本方一致，未作汉制剂量折算%s。</sub>"
                           % ("；本方底本仅存方名（方见他篇）" if _f.get("refOnly") else ""))
                out.append("")
            for z in ZHU_OF.get(a["tiao"], []):
                out.append("**【注·%s】**　%s" % (z["author"], z["text"]))
                out.append("")
                _where = ("%s·%s" % (z["juan"], z["pian"])) if z["juan"] else z["pian"]
                out.append("<sub>外源·笈成·%s %s（逐字引用，仅 t2s 字形转换；注家观点，非原文判词）</sub>"
                           % (z["book"], _where))
                out.append("")
    return out


def render_tables(st: dict) -> list:
    out = ["### 本章数据（由 `standards/jingui/底本.json` 现算）", ""]
    out.append("| 口径 | 条 | 方 | 字 | 方条比 |")
    out.append("|---|--:|--:|--:|--:|")
    out.append("| 本章覆盖 | %d | %d | %d | %s |" % (st["tiao"], st["fang"], st["chars"], st["ratio"]))
    out.append("| 全书（正文 22 篇 + 附篇 3） | %d | %d | %d | %.2f |"
               % (BOOK["articles"], BOOK["formulas"], BOOK["charsHans"], BOOK["formulas"] / BOOK["articles"]))
    out.append("")
    out.append("| 字面分类（可重叠，不相加） | 条数 |")
    out.append("|---|--:|")
    out.append("| 出方条 | %d |" % st["chu"])
    out.append("| 标「死／不治」 | %d |" % st["dead"])
    out.append("| 标「难治」 | %d |" % st["hard"])
    out.append("| 禁忌句（不可／禁／勿） | %d |" % st["ban"])
    out.append("| 自愈／欲解 | %d |" % st["heal"])
    out.append("")
    out.append("**药味**：%s（合计 %d 味次 / %d 味）" % (st["top"], st["herb_tok"], st["herb_dis"]))
    out.append("")
    if st["fangles"]:
        out.append("**方证表（%d 方）**" % st["fang"])
        out.append("")
        out.append("| 方名 | 味数 | 条号 |")
        out.append("|---|--:|---|")
        for a in st["arts"]:
            for f in a.get("formulas") or []:
                k = len(f.get("ingredients") or [])
                out.append("| %s | %s | %s |" % (f["nameSimp"], k if k else "—", a["tiao"]))
        out.append("")
    return out


def render_chapter(n: int) -> str:
    b = next(c for c in CHAPTERS if c["n"] == n)
    st = stats(n)
    title = CH[n]["title"]
    lines = []
    lines.append("# 第 %d 章 · %s" % (n, title))
    lines.append("")
    lines.append("> **本章要回答的问题:** %s" % b["q"])
    lines.append(">")
    lines.append("> **覆盖**：%s ｜ %d 条 · %d 方 · %d 字 ｜ 源：`standards/jingui/底本.json`（外源·笈成）"
                 "＋ 校勘 `standards/jingui/gushiwen/`（外源·古诗文网）" % (pian_names(PIAN_OF[n]), st["tiao"], st["fang"], st["chars"]))
    lines.append(">")
    lines.append("> **同源**：章号、章名、覆盖篇与课程线 `departments/01-zhongyi/08-jingui-yaolue/chapters.json` 一致；"
                 "N.1 与数据表由 `python scripts/build_jingui_textbook.py` 现算，与课程 docs 的数字同源。")
    lines.append("")
    lines += render_n1(n, st)
    lines.append("## N.2 为什么可以这样翻译")
    lines.append("")
    lines.append(b["n2"])
    lines.append("")
    lines.append("## N.3 这个翻译丢掉了什么")
    lines.append("")
    lines.append(b["n3"])
    lines.append("")
    lines.append("## N.4 与相邻学科的接口")
    lines.append("")
    lines.append(b["n4"])
    lines.append("")
    lines.append("## N.5 争议与本项目立场")
    lines.append("")
    lines.append(b["n5"])
    lines.append("")
    lines.extend(render_tables(st))
    lines.append("## 本章小结")
    lines.append("")
    lines.append(b["summary"])
    lines.append("")
    lines.append("## 思考题")
    lines.append("")
    for i, q in enumerate(b["qs"], 1):
        lines.append("%d. %s" % (i, q))
    lines.append("")
    lines.append("## 延伸阅读")
    lines.append("")
    for r in b["rd"]:
        lines.append("- %s" % r)
    lines.append("")
    lines.append("---")
    lines.append("")
    lines.append("> **边界**：本章只做文本与结构的整理，**不构成诊疗建议**；"
                 "凡涉方药剂量与适应证，须由具备合法执业资格的医师按现行规范复核。"
                 "条号为本库 `篇.条` 体系，不等于宋本分条；引用须写明「外源·笈成·金匱要略方論 第N篇·第M条」。")
    lines.append("")
    return "\n".join(lines)


PREFACE = """# 《金匮要略》工程读本 · 前言

> 学科：01-zhongyi/08-jingui-yaolue ｜ 学期 5（🌿 长·积累）｜ 24 章 ｜ 覆盖 25 篇 402 条
> 生成：`python scripts/build_jingui_textbook.py`（N.1 与数据表）＋ `scripts/jingui_textbook_content.py`（N.2-N.5 人工层）
> 同源：课程线 `departments/01-zhongyi/08-jingui-yaolue/`

## 一、这本书与课程的分工

课程线（[tcmP]）回答「怎么读、怎么算」：每一讲给一个可执行的问题，用代码把条文结构现算一遍，最后落到视频。
教材线（[textbooks]）回答「为什么可以这样读」：条文从哪来、哪一层是原文、哪一层是注家、哪一层是本项目的解读。

两线共用同一份底本与同一套计数：

| 项 | 值 | 出处 |
|---|--:|---|
| 正文条数 | **402**（398 带条号 + 序 1 + 附篇 3） | `standards/jingui/底本.json` `counts.articles` |
| 方数 | **174**（165 有方文 + 9 互见） | 同上 `counts.formulas` |
| 汉字 | **34,462**（含方文与注文，口径见该目录 README） | 同上 `counts.charsHans` |
| 药味 | **728 次 / 165 味**（药名格原样；清洗写法后 154 味） | 同上 |
| 第二见证 | 古诗文网本 25 篇 · 1,282 段 · 29,929 字 | `standards/jingui/gushiwen/gushiwen.json` |

## 二、体例

每章八节，前五节是 `textbooks/README.md` 的章契约：

- **N.1 概念与出处** —— 本条覆盖的篇下**逐条录原文**（序与附篇另行说明），条号即源页编号。
- **N.2 为什么可以这样翻译** —— 把条文结构翻成可计算的形式（分类、决策树、二部图），写清推理过程。
- **N.3 这个翻译丢掉了什么** —— 必须写。丢掉的通常是注家补写的部分、方文缺失、或口径本身的代价。
- **N.4 与相邻学科的接口** —— 与伤寒、诊断、方剂、内外妇儿各科的接口，写到具体条或具体方。
- **N.5 争议与本项目立场** —— 学界分歧 + 本项目采用哪一说、为什么。

其后四节：本章数据（现算表）、小结、思考题、延伸阅读。

## 三、三条硬规则

1. **原文不许改。** N.1 的每一个字都是底本 `zhHans` 的逐字拷贝；`tests/test_jingui_quanwen.js` 校验 398 条
   各出现一次且与底本逐字相等。
2. **数字不许写两遍。** 章内所有计数由生成器现算；`python scripts/build_jingui_textbook.py --check` 会因为
   底本或人工层改动而变红。
3. **注家与原文分栏。** 凡「后世补出」「注家认为」的判断，必须与原文判词分句标注；不分栏就等于伪造原文。

## 四、已知缺口

| 缺口 | 影响 | 处理 |
|---|---|---|
| 篇 5 方数只解析到 2（源页把主治写进方名行） | 篇级方数不可横向比较 | 在 `standards/jingui/README.md` §七 登记；教材引用处带限制 |
| 篇 19 藜芦甘草汤方文缺失 | 该方药味为 0 | 按「有方名无方文」单列（refOnly） |
| 附篇 23-25 分条无统一标准 | 条数不可与正文合并 | 不编条号、不进 402 统计 |
| 无教材底本（qhzy-*.xlsx 不含金匮） | 无「源教材正文层」 | 本读本的原文层用外源双本（笈成＋古诗文网），注家层四家（见下） |

## 五、注家层（已落，附口径）

每一条原文之后，按「先金鑑、次心典、再淺註、后輯義」的顺序挂四家注文，逐字引用，只做 t2s 字形转换：

| 书 | 作者 | 形态 | 注文汉字 | 命中条 |
|---|---|---|--:|--:|
| 醫宗金鑑·訂正仲景全書金匱要略註 | 吳謙等（清·乾隆七年敕撰） | 官修集註（按／註／集註三段） | 75,350 | 383 块 |
| 金匱要略心典 | 尤怡（清·雍正十年） | 义理，逐条串讲 | 50,737 | 339 块 |
| 金匱要略淺註 | 陳念祖（清·嘉慶） | 训释，夹注在句 | 53,856 | 345 块 |
| 金匱玉函要略輯義 | 丹波元簡（日本·寬政） | 考据，校异文 | 121,388 | 402 块 |
| **合计**（落在 402 条上的部分） | — | — | **301,331** | **392 / 398 条** |

留档与对齐全部可复算：`standards/jingui/zhujia/`（raw 按字节 + sha256 + `校勘登记.md`）。
四家注与底本分条不同，对齐按文本相似度（≥0.60）而非条号，一条多块、一块多条都如实登记；
《醫宗金鑑》另有「編號」（藏府001…）可与底本条号交叉验证，篇按名字匹配（金鑑篇序与底本不同）。
**注家的话不是原文**：凡「按、」「註：」「集註：」「〔鉴〕」之后都是注家判断，引用行下方单列出处。

## 六、自撰层：词解与方解（本项目的话，不是注家的话）

| 层 | 单位 | 覆盖 | 写法 | 出处标注 |
|---|---|--:|---|---|
| 【词解】 | 426 个词条 | 402 / 402 条每条至少一个词 | 只解字义、病名、脉象、服法；不解释病机、不作辨证结论 | `<sub>本项目自撰词解（不引注本）</sub>` |
| 【方解】 | 168 首（174 方去重） | 174 / 174 方 | 功用 + 方义；**方义里的药必须是本方自有的药** | `<sub>本项目自撰方解（不引注本）…未作汉制剂量折算</sub>` |

三道机器约束（`tests/test_jingui_shiyi.js`、`tests/test_jingui_cidian.js`、`tests/test_jingui_fangjie.js`）：

1. 【释义】提到的方名，必须见于**本条原文或本条自带的方**，且与原文最长公共片段 ≤18 字（不许抄书）——
   把某条的话说到别条去，测试直接红；
2. 每个词条的词形，必须在**本条原文里逐字出现**——把某词的解释贴到不相干的条下，测试直接红；
3. 每首方解提到的药名，必须**属于本方组成**（底本简称如「五味／牡丹／术」已归一）——
   把别方的药写进这一方，测试直接红。这道门当场查出三处**底本解析缺陷**（大建中汤缺胶饴、
   十枣汤缺大枣、百合洗组成被错切），已在测试里登记、待底本层修。

**为什么不许用注家顶替**：注家解的是「条文何意」，这两层要的是「字词何义、方药何配」。前者可以引，
后者必须自己说——说不准就写「未详」，不许编。

## 七、还缺什么（明确写在这里）

| 层 | 单位 | 现状 | 说明 |
|---|---|--:|---|
| 注家层 | 398 条 | **392 条有注** | 缺 6 条，不补写；四家之外（徐彬《論註》等）未收 |
| 词解层 | 426 词条 | 覆盖 402/402 条 | 生僻字音读只标常见者；异体字未逐字校 |
| 方解层 | 168 首 | 覆盖 174/174 方 | 未作汉制剂量折算（本项目无该标准）；服法只写次序 |
| 释义层 | 398 条 | 已全覆盖（12164 字，中位 29 字） | 一句话串讲；未做逐条病机推演 |
| 篇目精读章 | 14 章 | 已含全录+释义+词解+方解+四家注 | 仍未做逐方类方比较表 |

所以本读本现在是「**原文 + 释义 + 词解 + 方解 + 四家注 + 结构 + 论述**」七层。
---|---|--:|---|
| 注家层 | 398 条 | **392 条有注** | 缺 6 条，不补写；四家之外（徐彬《論註》等）未收 |
| 逐条【词解】 | 398 条 | 0 | 字词训释（「几几然」「口父咀」等）需本项目自撰，注家不替代 |
| 逐方【方解】 | 174 方 | 0 | 配伍与剂量折算，须先定折算标准 |

所以本读本现在是「**原文 + 四家注 + 结构 + 论述**」四层；词解与方解仍未做，且这两层不能靠注家顶上。

---

> **边界**：本书为古籍文本研究与教学整理，**不构成诊疗建议**。凡涉方药与剂量，须由具备合法执业资格的医师复核。
"""


def safe_title(title: str) -> str:
    return re.sub(r"[\\/:*?\"<>|]", "·", title).strip()


def build() -> dict:
    files = {}
    files["00-前言.md"] = PREFACE
    for n in range(1, 25):
        title = safe_title(CH[n]["title"])
        files["%02d-第%d章-%s.md" % (n, n, title)] = render_chapter(n)
    return files


def word_count(text: str) -> int:
    return len(re.sub(r"!\[[^\]]*\]\([^)]*\)", "", text).replace(" ", "").replace("\n", "").replace("\t", ""))


def main() -> int:
    files = build()
    check = "--check" in sys.argv[1:]
    changed = []
    total = 0
    for name, text in files.items():
        if name.startswith("00-"):
            continue
        total += word_count(text)
        p = os.path.join(OUT, name)
        old = io.open(p, encoding="utf-8").read() if os.path.exists(p) else None
        if old != text:
            changed.append(name)
            if not check:
                os.makedirs(OUT, exist_ok=True)
                io.open(p, "w", encoding="utf-8", newline="\n").write(text)
    # 前言
    p0 = os.path.join(OUT, "00-前言.md")
    old0 = io.open(p0, encoding="utf-8").read() if os.path.exists(p0) else None
    if old0 != PREFACE:
        changed.append("00-前言.md")
        if not check:
            os.makedirs(OUT, exist_ok=True)
            io.open(p0, "w", encoding="utf-8", newline="\n").write(PREFACE)

    if check:
        if changed:
            print("✗ 教材与生成器不一致（%d 个文件）：%s" % (len(changed), ", ".join(changed[:6])))
            return 1
        print("✓ 教材 24 章与生成器一致（%d 字）" % total)
        return 0

    # meta.json 的 textbook 块
    meta = json.load(io.open(META_PATH, encoding="utf-8"))
    meta["textbook"] = {
        "id": "textbooks",
        "path": "textbooks/01-zhongyi/08-jingui-yaolue",
        "chaptersWritten": 24,
        "words": total,
        "status": "wip",
        "layer": "source-body+commentary",
        "source": "standards/jingui/底本.json（外源·笈成）+ standards/jingui/gushiwen/（外源·古诗文网，校勘）",
        "generatedAt": "2026-11-11",
        "_note": "24 章 = N.1 原文全录（402 条）+ N.2-N.5 人工论述 + 现算数据表；逐条词解/释义与逐方方解未做，见 00-前言.md §五。",
    }
    io.open(META_PATH, "w", encoding="utf-8", newline="\n").write(json.dumps(meta, ensure_ascii=False, indent=2) + "\n")

    print("✓ 教材 24 章 + 前言：%d 字（%.1f 万字）" % (total, total / 10000))
    if changed:
        print("  写/更新 %d 个文件" % len(changed))
    print("  → textbooks/01-zhongyi/08-jingui-yaolue/")
    print("  → departments/01-zhongyi/08-jingui-yaolue/meta.json（textbook 块：chaptersWritten=24 / words=%d）" % total)
    return 0


if __name__ == "__main__":
    sys.exit(main())
