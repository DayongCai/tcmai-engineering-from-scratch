#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""scripts/fill_rewrite_from_docs.py —— 从已出版教学章回收判断层材料（不新撰）

边界：只做**搬运 + 标注**，一个字都不造。
  · N.3「这个翻译丢掉了什么」← 教学章 `docs/zh.md` 的「代价与边界」节
  · N.2「为什么可以这样翻译」← 教学章「这一章的问题」节（≥200 汉字才收）
  · N.5「争议与本项目立场」——教学章里没有这一节，**不回收**，留给人工
每段搬运都在段首写清来源（`来源：departments/.../docs/zh.md「…」节，逐字未改`），
门 `tests/test_rewrite_blocks.js` 会核这条来源行。

用法：
  python scripts/fill_rewrite_from_docs.py            # 只填草稿，不注入
  python scripts/fill_rewrite_from_docs.py --dry-run  # 只看能填多少
"""
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STD = os.path.join(ROOT, "standards")
han = lambda s: len(re.findall(r"[\u4e00-\u9fff]", s or ""))

SEC_N2 = re.compile(r"^##\s*[一二三四五六七八九十]+[、.．]\s*(这一章的问题|本章的问题|为什么要这样|判据)")
SEC_N3 = re.compile(r"^##\s*[一二三四五六七八九十]+[、.．]\s*(代价与边界|代价与局限|边界与代价)")


def read(p):
    with open(p, encoding="utf-8") as f:
        return f.read()


def split_sections(md):
    parts = re.split(r"\n(?=## )", md)
    out = []
    for p in parts:
        head = p.split("\n", 1)[0].strip()
        out.append((head, p))
    return out


def clean(body):
    """去掉标题行与代码块/表格，保留正文段落。"""
    lines = body.split("\n")[1:]
    keep, in_code = [], False
    for ln in lines:
        if ln.startswith("```"):
            in_code = not in_code
            continue
        if in_code:
            continue
        if ln.startswith("|") or ln.strip().startswith("图") or not ln.strip():
            continue
        keep.append(ln.strip())
    return "\n\n".join(keep).strip()


def tail_to_sentence(txt, limit):
    """截到 limit 汉字以内，且停在句号/问号，不加省略号。"""
    if han(txt) <= limit:
        return txt
    n, cut = 0, len(txt)
    for i, ch in enumerate(txt):
        if re.match(r"[\u4e00-\u9fff]", ch):
            n += 1
        if n >= limit and ch in "。！？":
            cut = i + 1
            break
    return txt[:cut]


def chapter_map(std):
    p = os.path.join(STD, std, "chapter-map.json")
    if not os.path.exists(p):
        return None
    m = json.loads(read(p)).get("chapters") or {}
    d = {}
    items = m.items() if isinstance(m, dict) else [
        (str(x.get("slug") or x.get("dir") or x.get("id") or ""), x) for x in m if isinstance(x, dict)]
    for slug, v in items:
        v = v if isinstance(v, dict) else {}
        if not slug:
            continue
        for sc in v.get("srcChapters") or []:
            m2 = re.match(r"\d+", str(sc))
            if m2:
                d.setdefault(int(m2.group()), []).append(slug)
    return d


def main():
    dry = "--dry-run" in sys.argv
    filled_n2 = filled_n3 = 0
    completed_courses = []
    rows = []
    for plan_p in sorted((STD and [os.path.join(STD, d, "rewrite-plan.json") for d in os.listdir(STD)])):
        if not os.path.exists(plan_p):
            continue
        plan = json.loads(read(plan_p))
        if plan.get("status") != "draft":
            continue
        std = os.path.basename(os.path.dirname(plan_p))
        dept, subj = plan["dept"], plan["subject"]
        cmap = chapter_map(std)
        cdir = os.path.join(ROOT, "departments", dept, subj, "chapters")
        slugs = sorted(os.listdir(cdir)) if os.path.isdir(cdir) else []
        n2c = n3c = 0
        for c in plan["chapters"]:
            n = c["n"]
            if cmap is not None:
                tslugs = cmap.get(n, [])
            else:
                tslugs = [slugs[n - 1]] if len(slugs) == len(plan["chapters"]) and n - 1 < len(slugs) else []
            if not tslugs:
                continue
            docs = []
            for s in tslugs:
                zp = os.path.join(cdir, s, "docs", "zh.md")
                if os.path.exists(zp):
                    docs.append((s, read(zp)))
            if not docs:
                continue
            src = "、".join(f"`departments/{dept}/{subj}/chapters/{s}/docs/zh.md`" for s, _ in docs)
            # N.3 ← 代价与边界
            if han(c.get("n3")) < 200:
                body = ""
                for s, md in docs:
                    for head, sec in split_sections(md):
                        if SEC_N3.match(head):
                            body += clean(sec) + "\n\n"
                if han(body) >= 200:
                    c["n3"] = f"（搬运：本节取自已出版教学章 {src} 的「代价与边界」节，逐字未改，未加新论断。）\n\n" + tail_to_sentence(body, 900)
                    n3c += 1
            # N.2 ← 这一章的问题
            if han(c.get("n2")) < 200:
                body = ""
                for s, md in docs:
                    for head, sec in split_sections(md):
                        if SEC_N2.match(head):
                            body += clean(sec) + "\n\n"
                if han(body) >= 200:
                    c["n2"] = f"（搬运：本节取自已出版教学章 {src} 的「这一章的问题」节，逐字未改。）\n\n" + tail_to_sentence(body, 900)
                    n2c += 1
        filled_n2 += n2c
        filled_n3 += n3c
        ok = all(han(c.get("n2")) >= 200 and han(c.get("n5")) >= 200 and han(c.get("n3")) >= 60 and (c.get("check") or []) for c in plan["chapters"])
        if ok:
            plan["status"] = "complete"
            completed_courses.append(std)
        rows.append((std, len(plan["chapters"]), n2c, n3c, ok))
        if not dry:
            with open(plan_p, "w", encoding="utf-8") as f:
                f.write(json.dumps(plan, ensure_ascii=False, indent=1) + "\n")
    print(f"回收 N.2 {filled_n2} 段、N.3 {filled_n3} 段" + ("（dry-run，未落盘）" if dry else ""))
    print(f"因此凑齐四段（N.2/N.3/N.5/思考题）的课：{len(completed_courses)} 门" + ("：" + "、".join(completed_courses[:8]) if completed_courses else ""))
    for r in rows:
        if r[2] or r[3]:
            print(f"  {r[0]}: 章 {r[1]}，回收到 N.2 {r[2]} / N.3 {r[3]}")


if __name__ == "__main__":
    main()
