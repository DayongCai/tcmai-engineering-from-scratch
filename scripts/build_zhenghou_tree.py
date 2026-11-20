#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""scripts/build_zhenghou_tree.py —— 把《中医证候学》辞典落成「四级编码目录树」

## 为什么要有这棵树

辞典的数据层是扁平的：`结构.json`（目录树）+ `正文-M01…M12.json`（十二门的候级正文）。
读起来没问题，但**浏览**不行——想看「风门之下有哪些类、每一类有哪些证、每个证有哪些候」，
只能自己写脚本查 JSON。

这棵树把四级编码直接变成目录层级，一个编码一段目录名，一个候一个文件：

    standards/zhenghou-cidian/四级目录/
      README.md                      总索引（四码规则 + 统计）
      M01-风证门/README.md           门：类表 + 门内规模
        L01-风寒证类/README.md       类：证表 + 类内规模
          L01-Z01-肺卫风寒证/README.md       证：位 + 候表
            H001-卫气失宣候.md              候：frontmatter + 原书七字段全文

目录名一律「编码-名称」，编码与 `结构.json` 一字不差（M01 / L01 / L01-Z01 / L01-Z01-H001），
所以任何一条候都能从（a）全码、（b）页面路径、（c）印张页码三条路找回。

## 幂等

产物里不写生成时间；`--check` 只读比对（增删改任一文件都会报 DRIFT）。
正文取 `正文-M*.json` 的 fields 原样，一个字不改（错字另见 `缺口登记.json` 与校勘记录）。

用法：
    python scripts/build_zhenghou_tree.py            # 写树
    python scripts/build_zhenghou_tree.py --check    # 只比对
"""
import argparse
import io
import json
import os
import re
import shutil

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STD = os.path.join(ROOT, "standards", "zhenghou-cidian")
TREE = os.path.join(STD, "四级目录")
INDEX = os.path.join(STD, "四级目录索引.json")
HANZI = re.compile(r"[\u4e00-\u9fff]")

FIELDS = ["通称", "内含病例", "病因病机", "证象组合", "主症", "副症", "宾症", "舌象", "脉象", "治则", "方症", "摘录"]
SAFE = re.compile(r'[\\/:*?"<>|]')


def safe(name):
    return SAFE.sub("·", name).strip()


def load_bodies():
    """候级正文：{全码: {zh, page, fields, chars}}，同码多条时按出现次序编号。"""
    out = {}
    for p in sorted(os.listdir(STD)):
        if not re.match(r"^正文-M\d{2}\.json$", p):
            continue
        d = json.load(io.open(os.path.join(STD, p), encoding="utf-8"))
        for code, it in d["items"].items():
            key = code
            if key in out:
                k = 2
                while "%s-%d" % (code, k) in out:
                    k += 1
                key = "%s-%d" % (code, k)
            out[key] = {"zh": it.get("zh", ""), "page": it.get("page"), "chars": it.get("chars", 0),
                        "fields": it.get("fields") or {}, "src": p}
    return out


def hou_path(h, base="M01-L01-Z01"):
    return h


def render_hou(full, meta, hou):
    f = meta.get("fields") or {}
    lines = ["---",
             "code: " + full,
             "name: " + hou["zh"],
             "men: " + hou["men"] + "（" + hou.get("place", "") + "）",
             "lei: " + hou["lei"],
             "zheng: " + hou["zheng"] + "（" + hou.get("zhengName", "") + "）",
             "wei: " + (hou.get("wei") or ""),
             "tai: " + (hou.get("tai") or ""),
             "printed: %s" % hou.get("page"),
             "chars: %s" % meta.get("chars", 0),
             "source: standards/zhenghou-cidian/%s#%s" % (meta.get("src", ""), full),
             "---", "",
             "# " + full + " " + hou["zh"], ""]
    first = True
    for k in FIELDS:
        v = (f.get(k) or "").strip()
        if not v:
            continue
        lines.append("**" + k + "**")
        lines.append("")
        lines.append("> " + v.replace("\n", "\n> "))
        lines.append("")
        first = False
    if first:
        if meta:
            lines.append("> （原书此候未分字段，正文见 `%s` 的 `%s`）" % (meta.get("src", ""), full))
        else:
            lines.append("> （本候正文未进正文层：OCR 缺失或未收，登记见 `standards/zhenghou-cidian/缺口登记.json`）")
        lines.append("")
    lines.append("——")
    lines.append("")
    lines.append("印张 %s · 汉字 %s · 上级 %s（%s）" % (hou.get("page"), meta.get("chars", 0),
                                                hou["zheng"], hou.get("zhengName", "")))
    lines.append("")
    return "\n".join(lines)


def render_zheng(men, lei, zheng):
    lines = ["# " + zheng["full"] + " " + zheng["zh"], "",
             "| 项 | 值 |", "|---|---|",
             "| 全码 | `%s` |" % zheng["full"],
             "| 门 / 类 | %s %s / %s %s |" % (men["code"], men["zh"], lei["code"], lei["zh"]),
             "| 病位 | %s（%s） |" % (zheng.get("wei", ""), "·".join(zheng.get("weiParts") or [])),
             "| 印张 | %s |" % zheng.get("page"),
             "| 候数 | %d（书上声明 %s） |" % (len(zheng["houList"]), zheng.get("declareHou")),
             "", "## 候", "",
             "| 码 | 候名 | 位 | 态 | 印张 |", "|---|---|---|---|---|"]
    for h in zheng["houList"]:
        lines.append("| [`%s`](%s-%s.md) | %s | %s | %s | %s |" % (
            h["code"].split("-")[-1], h["code"].split("-")[-1], safe(h["zh"]),
            h["zh"], h.get("wei", ""), h.get("tai", ""), h.get("page")))
    lines.append("")
    return "\n".join(lines)


def render_lei(men, lei):
    lines = ["# " + lei["code"] + " " + lei["zh"] + "证类", "",
             "上级：[" + men["code"] + " " + men["zh"] + "证门](../README.md)", "",
             "| 证 | 码 | 病位 | 候数 | 印张 |", "|---|---|---|---|---|"]
    for z in lei["zhengList"]:
        lines.append("| [%s](%s-%s/README.md) | `%s` | %s | %d | %s |" % (
            z["zh"], z["code"], safe(z["zh"]), z["code"], z.get("wei", ""), len(z["houList"]), z.get("page")))
    lines.append("")
    lines.append("类内合计：%d 证 · %d 候。" % (len(lei["zhengList"]), sum(len(z["houList"]) for z in lei["zhengList"])))
    lines.append("")
    return "\n".join(lines)


def render_men(men):
    lines = ["# " + men["code"] + " " + men["zh"] + "证门", "",
             "书内位置：" + men.get("book", "") + "（印张 " + str(men.get("page")) + "）", "",
             "上级：[四级目录总索引](../README.md)", "",
             "| 类 | 码 | 证 | 候 | 印张 |", "|---|---|---|---|---|"]
    for l in men["lei"]:
        lines.append("| [%s](%s-%s证类/README.md) | `%s` | %d | %d | %s |" % (
            l["zh"], l["code"], safe(l["zh"]), l["code"], len(l["zhengList"]),
            sum(len(z["houList"]) for z in l["zhengList"]), l.get("page")))
    lines.append("")
    lines.append("门内合计：%d 类 · %d 证 · %d 候。" % (
        len(men["lei"]), sum(len(l["zhengList"]) for l in men["lei"]),
        sum(len(z["houList"]) for l in men["lei"] for z in l["zhengList"])))
    lines.append("")
    return "\n".join(lines)


def render_root(struct, hou_n, char_n):
    c = struct["counts"]
    lines = ["# 《中医证候学》四级编码目录树", "",
             "一个编码一段目录，一条候一个文件。四码与 `结构.json` 一字不差：", "",
             "```",
             "门 M01…M12      第 N 章    风证门",
             "类 L01…L45      第 N 节    风寒证类",
             "证 Lnn-Zmm      一、       肺卫风寒证",
             "候 Lnn-Zmm-Hnnn （一）     卫气失宣候",
             "```", "",
             "目录名 = 「编码-名称」；候文件名 = 「H 号-候名.md」；上一级 README 一律列出本级清单与计数。",
             "", "## 规模", "",
             "| 级 | 数量 |", "|---|---|",
             "| 门 | %d |" % c["men"],
             "| 类 | %d |" % c["lei"],
             "| 证 | %d（唯一码 %d） |" % (c["zhengInstances"], c["zhengCodes"]),
             "| 候 | %d（唯一码 %d） |" % (c["houInstances"], c["houCodes"]),
             "| 候文件 | %d（%s 汉字） |" % (hou_n, format(char_n, ",")),
             "", "## 十二门", "",
             "| 门 | 名称 | 书内 | 类 | 证 | 候 | 印张 |", "|---|---|---|---|---|---|---|"]
    for m in struct["men"]:
        lines.append("| [`%s`](%s-%s证门/README.md) | %s证门 | %s | %d | %d | %d | %s |" % (
            m["code"], m["code"], safe(m["zh"]), m["zh"], m.get("book", ""), len(m["lei"]),
            sum(len(l["zhengList"]) for l in m["lei"]),
            sum(len(z["houList"]) for l in m["lei"] for z in l["zhengList"]), m.get("page")))
    lines += ["", "## 怎么用", "",
              "1. **按码找**：从总索引进 `M01-风证门/`，逐级落到候文件；文件名里带码，`grep -r 'L18-Z12-H005' .` 也能直接命中。",
              "2. **按页码找**：候文件 frontmatter 的 `printed` 是印张页码，回原书可对照。",
              "3. **按名称找**：目录名与文件名都是「码-名」，「卫气失宣」直接可见。",
              "", "数据源：`结构.json`（目录树）+ `正文-M01…M12.json`（候级正文）；",
              "本树由 `scripts/build_zhenghou_tree.py` 生成，`--check` 只读比对，**不要手改**。",
              "", "**声明**：本树为教学与工程用途的证候结构重建，不构成诊疗建议。", ""]
    return "\n".join(lines)


def build():
    struct = json.load(io.open(os.path.join(STD, "结构.json"), encoding="utf-8"))
    bodies = load_bodies()
    files = {}
    idx = []
    hou_n = char_n = 0
    for men in struct["men"]:
        mdir = "%s-%s证门" % (men["code"], safe(men["zh"]))
        files[os.path.join(TREE, mdir, "README.md")] = render_men(men)
        for lei in men["lei"]:
            ldir = "%s-%s证类" % (lei["code"], safe(lei["zh"]))
            files[os.path.join(TREE, mdir, ldir, "README.md")] = render_lei(men, lei)
            for z in lei["zhengList"]:
                zd = "%s-%s" % (z["code"], safe(z["zh"]))
                files[os.path.join(TREE, mdir, ldir, zd, "README.md")] = render_zheng(men, lei, z)
                for hou in z["houList"]:
                    full = hou["full"]
                    key = full if full in bodies else None
                    if key is None:
                        for k in bodies:
                            if k.startswith(full):
                                key = k
                                break
                    meta = bodies.get(key or "", {})
                    hname = "%s-%s.md" % (hou["code"].split("-")[-1], safe(hou["zh"]))
                    path = os.path.join(TREE, mdir, ldir, zd, hname)
                    if path in files:
                        path = path[:-3] + "-2.md"
                    files[path] = render_hou(full, meta, hou)
                    hou_n += 1
                    char_n += len(meta.get("fields", {}).get("通称", "")) and 0 or 0
                    idx.append({"full": full, "name": hou["zh"], "path": os.path.relpath(path, STD).replace("\\", "/"),
                                "printed": hou.get("page"), "chars": meta.get("chars", 0),
                                "men": men["code"], "lei": lei["code"], "zheng": z["code"]})
    char_n = sum(i["chars"] for i in idx)
    files[os.path.join(TREE, "README.md")] = render_root(struct, hou_n, char_n)
    idx.sort(key=lambda x: x["full"])
    files[INDEX] = json.dumps({"$about": "《中医证候学》四级编码目录树的机器索引：全码 → 路径 / 印张 / 字数。",
                               "tree": "standards/zhenghou-cidian/四级目录/",
                               "counts": {"men": struct["counts"]["men"], "lei": struct["counts"]["lei"],
                                          "zheng": struct["counts"]["zhengInstances"], "hou": hou_n,
                                          "chars": char_n},
                               "entries": idx}, ensure_ascii=False, indent=1) + "\n"
    return files


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true")
    a = ap.parse_args()
    files = build()
    drift = []
    on_disk = set()
    if os.path.isdir(TREE):
        for dirpath, _dirs, names in os.walk(TREE):
            for n in names:
                on_disk.add(os.path.join(dirpath, n))
    for p, txt in files.items():
        old = io.open(p, encoding="utf-8").read() if os.path.exists(p) else None
        if old != txt:
            drift.append(p)
    extra = sorted(p for p in on_disk if p not in files)
    if a.check:
        if drift or extra:
            print("DRIFT: %d 个文件需重写 · %d 个多余文件（树与结构.json 不一致）" % (len(drift), len(extra)))
            for p in (drift + extra)[:10]:
                print("   " + os.path.relpath(p, ROOT))
            print("   请跑 python scripts/build_zhenghou_tree.py")
            return 1
        print("✓ 四级目录树一致：%d 文件" % len(files))
        return 0
    if os.path.isdir(TREE):
        shutil.rmtree(TREE)
    for p, txt in files.items():
        os.makedirs(os.path.dirname(p), exist_ok=True)
        io.open(p, "w", encoding="utf-8", newline="\n").write(txt)
    c = json.loads(files[INDEX])["counts"]
    print("✓ 四级目录树：门 %d · 类 %d · 证 %d · 候 %d · 文件 %d → standards/zhenghou-cidian/四级目录/" % (
        c["men"], c["lei"], c["zheng"], c["hou"], len(files)))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
