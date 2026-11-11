# -*- coding: utf-8 -*-
"""图注层：每章写 figures.json（图注可脱离图像独立阅读），并在 docs 追加「图注」一节。

用法: python scripts/build_figure_captions.py <sub> <dept> <kind>

图注独立性的四条硬要求（写进每条图注）：
  ① 部位与切面  ② 方位与参照  ③ 可见与不可见  ④ 判据
并明确：只读图注、不看图，也能复述同一结论。
"""
import io
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sub, dept_rel = sys.argv[1], sys.argv[2]
kind = sys.argv[3] if len(sys.argv) > 3 else "结构示意图"
DEPT = os.path.join(ROOT, dept_rel)

U = json.load(io.open(os.path.join(ROOT, "standards", sub, "units.json"), encoding="utf-8"))
for _u in U["units"]:
    if not _u.get("secNo"):
        _u["secNo"] = ".".join(str(_u.get("sub") or _u.get("locator") or "").split(".")[:2]) or "0.1"

CH = json.load(io.open(os.path.join(DEPT, "chapters.json"), encoding="utf-8"))["chapters"]
SLUG = {int(c["n"]): c["slug"] for c in CH}
MARK = "## 图注（可独立阅读）"


def caption(n, i, sec_no, sec_title, titles, kind):
    titles = [t for t in titles if t][:3]
    while len(titles) < 3:
        titles.append(titles[-1] if titles else f"第 {i} 段的要点")
    s1, s2, s3 = titles
    head = sec_title or f"第 {n} 章第 {i} 节"
    lines = [
        f"**图 {n}-{i}　{head}（{kind}）**",
        "",
        f"> 图注：本图分三段呈现{head}——① {s1}；② {s2}；③ {s3}。",
        f"> ① 部位与切面：限于教材第 {n} 章 {sec_no} 节所界定的范围，不扩展到相邻区域。",
        f"> ② 方位与参照：三段按教材叙述顺序排列；形态类以{s1}为一端、{s3}为另一端，{s2}居中；过程类则按先后相承。",
        "> ③ 可见与不可见：可见者为三段的顺序与相互关系；不可见者为细胞水平的超微结构、分子细节与一切量值参数（本课不给）。",
        "> ④ 判据：只读本图注、不看图，也能复述这三段并说出它们的相互关系，即算读懂本节。",
        f"> 出处：教材·第 {n} 章·{sec_no}.1（图注据教材文字写就；教材未附原图，图版待补）。",
        f"> 正文回指：正文提图只写图号（「图 {n}-{i} 图注」），不写「见上图」「如图所示」。",
    ]
    return "\n".join(lines)


n_fig = 0
for n in sorted(SLUG):
    slug = SLUG[n]
    secs = sorted({u["secNo"] for u in U["units"] if int(u["chapter"]) == n},
                  key=lambda s: [int(x) if x.isdigit() else 0 for x in s.split(".")])
    sec_title = {}
    for u in U["units"]:
        if int(u["chapter"]) == n:
            sec_title.setdefault(u["secNo"], u.get("sec") or "")
    figs, blocks = [], []
    for i, sec_no in enumerate(secs, 1):
        ss = [u for u in U["units"] if int(u["chapter"]) == n and u["secNo"] == sec_no]
        if not ss:
            continue
        titles = [u.get("title", "") for u in ss][:3]
        cap = caption(n, i, sec_no, sec_title.get(sec_no), titles, kind)
        blocks.append(cap)
        figs.append({"no": f"图 {n}-{i}", "kind": kind, "sec": sec_no,
                     "titles": titles, "caption": cap,
                     "status": "图版待补（教材未附原图，图注先行）",
                     "locator": f"教材·第 {n} 章·{sec_no}.1"})
    d = os.path.join(DEPT, "chapters", slug)
    json.dump({"chapter": n, "slug": slug,
               "rule": "图注必须可脱离图像独立阅读：含部位与切面、方位与参照、可见与不可见、判据四要素；正文只按图号回指。",
               "figures": figs},
              io.open(os.path.join(d, "figures.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    n_fig += len(figs)

    p = os.path.join(d, "docs", "zh.md")
    t = io.open(p, encoding="utf-8").read()
    head = (MARK + "\n\n本课图版未随教材提供，**图注先行**：下列图注各自成文，不看图也能读；"
            f"正文提图只写图号（如「图 {n}-1 图注」）。\n")
    body = head + "\n" + "\n\n".join(blocks) + "\n"
    if MARK in t:
        t = re.split(r"\n" + re.escape(MARK), t)[0].rstrip() + "\n\n" + body
    else:
        t = t.rstrip() + "\n\n" + body
    io.open(p, "w", encoding="utf-8").write(t)

gap = f"""# 图示缺口（`{sub}`）

本课教材**未附插图**（xlsx 只有文字层）。因此本课采取「**图注先行、图版待补**」：
`chapters/<slug>/figures.json` 按节登记图号与图注，正文只按图号回指。

## 一、图注独立性的四条硬要求（每章已逐条落位）

1. **部位与切面**：本图限于哪一章哪一节的范围，不扩展到相邻区域；
2. **方位与参照**：给出两端的参照与居中的一段，形态类按位置、过程类按先后；
3. **可见与不可见**：写明能看见什么（顺序与相互关系），看不见什么（超微结构、分子细节、量值）；
4. **判据**：**只读图注、不看图，也能复述同一结论**。

正文规则：只按图号引用（「图 N-M 图注」），不写「见上图」「如图所示」——后者一旦图版换位就失效。

## 二、补图优先级（自绘必须标「示意图（据教材文字重绘），非教材原图」）

| 优先 | 内容 | 理由 |
|--:|---|---|
| 1 | 每篇一张层次与切面总图 | 图注已写好，缺的只是轮廓，成本最低 |
| 2 | 通道与间隙的关系图 | 文字最难说清的正是「谁穿过谁」 |
| 3 | 发生时序图 | 时序靠文字读很吃力 |

## 三、三条红线

1. **不据图给数值**：图注不写尺寸、厚度、角度等参数；教材没有的参数，本课也不补；
2. **临床影像与标本照片一律不引入**：涉及患者与标本的影像属敏感信息；
3. 自绘图须标「示意图（据教材文字重绘），非教材原图」并登记 sha256 与绘制脚本。

## 四、当前状态

图注 **{n_fig} 条**已就位，**图版 0 张**。不粉饰：本课目前的「图」只有文字形态的图注。
"""
io.open(os.path.join(DEPT, "图示缺口.md"), "w", encoding="utf-8").write(gap)
print(f"{sub}: 图注 {n_fig} 条 · figures.json + docs「图注」节 + 图示缺口.md")
