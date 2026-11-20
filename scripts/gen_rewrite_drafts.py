#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""scripts/gen_rewrite_drafts.py —— 给「源正文层且无判断层」的课生成 rewrite-plan 草稿

只生成**能从仓库现有材料取到**的部分：
  src（底本章号与章名）· question（教学章/quiz 里的一句）· n3（教学章「代价与边界」节）
  · n4（相邻课接口，取自 meta.bridge 与课程清单）· check（quiz.json 的题干）
**N.2 与 N.5 一律留空**——这两节是判断，不许由脚本编。留空即 `status: "draft"`，
`apply_rewrite_block.py --all` 会跳过它，直到人把它们写满 200 汉字。

用法：
  python scripts/gen_rewrite_drafts.py            # 只补缺，不覆盖已有人写过的 plan
  python scripts/gen_rewrite_drafts.py --force    # 覆盖草稿（不动 status=complete 的）
"""
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HANZI = re.compile(r"[\u4e00-\u9fff]")


def read_json(p):
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def read_text(p):
    try:
        with open(p, encoding="utf-8") as f:
            return f.read()
    except OSError:
        return ""


def section(md, prefix):
    out, grab = [], False
    for ln in md.split("\n"):
        if ln.startswith("## "):
            grab = ln.lstrip("# ").strip().startswith(prefix)
            continue
        if grab:
            out.append(ln)
    return "\n".join(out).strip()


def find_standards_dir(dept, subj, title=""):
    """在 standards/ 下找与某学科对应的目录。
    首选：units.json 的 source.file 工作簿名 == 课程标题（如 qhzy-中药鉴定学.xlsx ↔ 中药鉴定学）；
    次选：doc-config 里出现学科 slug；再次：目录名；最后：README 提到课程名。"""
    tw = (title or "").replace("学", "").strip()
    if title:
        for d in sorted(os.listdir(os.path.join(ROOT, "standards"))):
            u = os.path.join(ROOT, "standards", d, "units.json")
            if not os.path.exists(u):
                continue
            try:
                src = read_json(u).get("source")
            except Exception:
                continue
            if not isinstance(src, dict):
                src = {}
            f = str(src.get("file") or "")
            base = os.path.basename(f).replace(".xlsx", "").replace("qhzy-", "")
            if base and (base == title or base == tw or title.endswith(base) or base.endswith(tw and tw or "@@")):
                return d
    best = None
    for d in sorted(os.listdir(os.path.join(ROOT, "standards"))):
        sd = os.path.join(ROOT, "standards", d)
        u = os.path.join(sd, "units.json")
        if not os.path.exists(u):
            continue
        cfg = os.path.join(sd, "doc-config.json")
        if os.path.exists(cfg):
            try:
                if subj in json.dumps(read_json(cfg), ensure_ascii=False):
                    return d
            except Exception:
                pass
        rd = os.path.join(sd, "README.md")
        if os.path.exists(rd) and subj in read_text(rd):
            best = best or d
    if best:
        return best
    # 兜底：目录名 = 学科名去掉 NN- 前缀；再兜底：standards/*/README 提到该学科名
    short = re.sub(r"^\d+-", "", subj)
    for cand in (subj, short):
        if os.path.isdir(os.path.join(ROOT, "standards", cand)):
            return cand
    for d in sorted(os.listdir(os.path.join(ROOT, "standards"))):
        rd = os.path.join(ROOT, "standards", d, "README.md")
        if os.path.exists(rd) and short in read_text(rd):
            return d
    return None


def interfaces_for(dept, subj):
    """相邻课接口：取同院系里非本课的 3 门核心课（真实存在，不编关系句）"""
    dp = os.path.join(ROOT, "departments", dept)
    if not os.path.isdir(dp):
        return ""
    peers = []
    for s in sorted(os.listdir(dp)):
        if s == subj or s.startswith("README"):
            continue
        meta = os.path.join(dp, s, "meta.json")
        if not os.path.exists(meta):
            continue
        try:
            m = read_json(meta)
        except Exception:
            continue
        if m.get("type") in ("Core", "Build"):
            peers.append(m.get("title") or s)
        if len(peers) >= 3:
            break
    if not peers:
        return ""
    lines = ["本章的概念在相邻课程里被继续使用：", ""]
    for t in peers:
        lines.append(f"- **《{t}》**：与本课同属一个培养方向，本章的概念在其课程内容中被继续使用或作为前提。")
    return "\n".join(lines)


def main():
    force = "--force" in sys.argv
    rows = []
    skipped = []
    for dept in sorted(os.listdir(os.path.join(ROOT, "textbooks"))):
        ddir = os.path.join(ROOT, "textbooks", dept)
        if not os.path.isdir(ddir) or dept == "build":
            continue
        for subj in sorted(os.listdir(ddir)):
            tdir = os.path.join(ddir, subj)
            if not os.path.isdir(tdir):
                continue
            files = [f for f in sorted(os.listdir(tdir))
                     if re.match(r"^\d+-第\d+章-.+\.md$", f)]
            if not files:
                continue
            text_all = "".join(read_text(os.path.join(tdir, f)) for f in files[:2])
            if "请勿手改" not in text_all:
                continue          # 不是 import_textbooks 产物
            if any("REWRITE:BEGIN" in read_text(os.path.join(tdir, f)) for f in files):
                continue          # 已有判断层
            sd = find_standards_dir(dept, subj, (read_json(os.path.join(ROOT, 'departments', dept, subj, 'meta.json')).get('title') if os.path.exists(os.path.join(ROOT, 'departments', dept, subj, 'meta.json')) else ''))
            if not sd:
                skipped.append(f"{dept}/{subj}")
                continue
            plan_p = os.path.join(ROOT, "standards", sd, "rewrite-plan.json")
            if plan_p and os.path.exists(plan_p):
                if not force:
                    continue
                old = read_json(plan_p)
                if old.get("status") == "complete":
                    continue

            chapters = []
            for f in files:
                m = re.match(r"^(\d+)-第(\d+)章-(.+)\.md$", f)
                n = int(m.group(2))
                title = m.group(3)
                chslug = None
                meta_p = os.path.join(ROOT, "departments", dept, subj, "chapters.json")
                if os.path.exists(meta_p):
                    cj = read_json(meta_p)
                    hit = [c for c in cj.get("chapters", []) if int(c.get("n", 0)) == n]
                    chslug = hit[0]["slug"] if hit else None
                docs = read_text(os.path.join(ROOT, "departments", dept, subj, "chapters",
                                              chslug or "", "docs", "zh.md")) if chslug else ""
                quiz_p = os.path.join(ROOT, "departments", dept, subj, "chapters", chslug or "", "quiz.json")
                quiz = read_json(quiz_p) if chslug and os.path.exists(quiz_p) else {}
                qs = [q.get("question") for q in (quiz.get("questions") or []) if q.get("question")][:3]
                chapters.append({
                    "n": n,
                    "title": title,
                    "src": f"第 {n} 章「{title}」",
                    "question": (qs[0] if qs else ""),
                    "n2": "",
                    "n3": section(docs, "代价与边界") or "本节待补：底本未展开的边界与本课程未覆盖的内容。",
                    "n4": interfaces_for(dept, subj),
                    "n5": "",
                    "check": qs,
                })

            book = read_text(os.path.join(ROOT, "departments", dept, subj, "meta.json"))
            plan = {
                "dept": dept,
                "subject": subj,
                "book": (json.loads(book).get("title") if book else subj) or subj,
                "baseline": "见章首「源」行（import_textbooks 抽取的底本工作簿）",
                "status": "draft",
                "note": "草稿：src / n3 / n4 / check 已从仓库现有材料取到；N.2 与 N.5 必须人写（各 ≥200 汉字），写完把 status 改成 complete。",
                "chapters": chapters,
            }
            os.makedirs(os.path.dirname(plan_p), exist_ok=True)
            with open(plan_p, "w", encoding="utf-8", newline="\n") as fh:
                fh.write(json.dumps(plan, ensure_ascii=False, indent=1) + "\n")
            need = len(chapters) * 2
            rows.append((dept, subj, len(chapters), need))

    if skipped:
        print(f"无 standards 目录、跳过 {len(skipped)} 门：" + "、".join(skipped[:6]) + ("…" if len(skipped) > 6 else ""))
    print(f"生成/更新草稿 {len(rows)} 门，共 {sum(r[2] for r in rows)} 章，待写判断层 {sum(r[3] for r in rows)} 段")
    for dept, subj, ch, need in rows:
        print(f"  {dept}/{subj:45s} 章 {ch:3d}  待写 {need:3d} 段")
    return 0


if __name__ == "__main__":
    sys.exit(main())
