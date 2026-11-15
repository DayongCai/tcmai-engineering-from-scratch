# -*- coding: utf-8 -*-
"""scripts/build_zhongcan_xilu_text.py —— 《醫學衷中參西錄》网页文字化本 → 底本 + 单元层

母本（外源·一次性抓取并留档）：
  中醫笈成（漢リポ 文字化本）https://jicheng.tw/tcm/book/醫學衷中參西錄/index.html
  底本声明：《医学衷中参西录》，河北人民出版社 1977 年 2 版。
  与 standards/jingui、standards/wenbing 同一 provider、同一 t2s 口径。

产出：
  standards/zhongcan-xilu/sources/source.html   原始留档（sha256 登记在底本.json）
  standards/zhongcan-xilu/底本.json             五大類 → 篇 → 條目 → 段（繁/简双栏）
  standards/zhongcan-xilu/units.json            单元层：一条目一单元
  standards/zhongcan-xilu/README.md             出处、口径、规模（每次重建同步刷新）

口径：
  1. 层级取网页自身的语义结构，不另立：`<h1 data-sec>`＝大類（醫方/藥物/醫論/醫話/醫案），
     `<h2 data-sec>`＝篇（治陰虛勞熱方、石膏解、虛勞喘嗽門…），`<h3 data-sec>`＝條目（資生湯…），
     `<div data-sec="p">`＝段。57 篇有條目，208 篇本身就是條目（藥解/醫論/醫話/醫案）。
  2. 单元＝條目（无條目时＝篇）。篇首若有正文（方类导语），单列一条「篇首」，不并入第一个方。
  3. 字形：正文统一走 opencc t2s（与 scripts/convert_t2s.py 同一转换器，只动字形），
     底本.json 同时保留 zhHant / zhHans；网页里 `<span data-rev="今版">` 只包标点，照原样保留。
  4. 三条轴按本书自身的写法取（不套教材三辨）：证候 / 药理 / 参西；面＝五大類（本书原生分部）。
     其中「参西」是本书区别于其他典籍的可测特征（西人、西医、化验、血压、细菌、解剖、生理…）。

用法：
  python scripts/build_zhongcan_xilu_text.py --fetch   # 首次：抓取（断点续传直到 </html>）并留档
  python scripts/build_zhongcan_xilu_text.py           # 用留档重建
  python scripts/build_zhongcan_xilu_text.py --check   # 幂等校验，不写盘
"""
from __future__ import annotations

import difflib
import hashlib
import io
import json
import os
import re
import subprocess
import sys
import time
import urllib.parse

try:
    import opencc
except ImportError:  # 与 scripts/convert_t2s.py 一致：缺依赖就明确报错，不静默降级
    sys.stderr.write(
        "缺依赖 opencc：pip install opencc-python-reimplemented -i https://mirrors.aliyun.com/pypi/simple/\n"
    )
    raise SystemExit(2)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "standards", "zhongcan-xilu")
SRC_DIR = os.path.join(OUT, "sources")
SRC = os.path.join(SRC_DIR, "source.html")

BOOK = "醫學衷中參西錄"
BOOK_SIMP = "医学衷中参西录"
URL = "https://jicheng.tw/tcm/book/" + urllib.parse.quote(BOOK) + "/index.html"
EDITION = "《医学衷中参西录》，河北人民出版社1977年2版。"
CONVERTER = opencc.OpenCC("t2s")
# 汉字统计必须含扩展区：t2s 会把罕见异体转成 Ext-A/B 的字
# （藭→䓖 U+44D6、瞤→𥆧 U+251A7），只认基本区会静默少数 43 字。
HANZI = re.compile(r"[\u3400-\u4dbf\u4e00-\u9fff\U00020000-\U0003ffff]")

VIEWS = {
    "证候": ["脈", "脉", "證", "证", "症", "發熱", "发热", "寒", "熱", "热", "咳", "喘", "嘔", "呕",
             "吐", "瀉", "泻", "痢", "痛", "汗", "渴", "舌", "眩", "痿", "腫", "肿", "吐血", "衄"],
    "药理": ["味", "性", "氣", "气", "溫", "温", "涼", "凉", "補", "补", "瀉", "泻", "升", "降",
             "歸經", "归经", "主治", "功效", "煎", "服", "錢", "钱", "兩", "两", "分", "斤", "枚"],
    # 「参西」不只指称西方：本书真正搬进来的是清末那套化学/生理词汇
    # （石膏解开篇就是「硫养轻钙化合而成」）。成员词按全书实测选，出现次数见 README。
    "参西": ["西人", "西医", "西藥", "西药", "西說", "西说", "泰西", "化验", "化驗", "血压", "血壓",
             "细菌", "細菌", "解剖", "生理", "化学", "化學", "科学", "科學", "化合", "原质", "原質",
             "养气", "養氣", "氧气", "氧氣", "炭气", "炭氣", "轻气", "輕氣", "淡气", "淡氣",
             "脑筋", "腦筋", "血管", "铁锈", "鐵鏽", "蛋白质", "蛋白質", "微丝", "微絲"],
}
LEVELS = {
    "医方": ["方"],
    "药物": ["藥", "药", "解"],
    "医论": ["論", "论"],
    "医话": ["話", "话"],
    "医案": ["案", "門", "门"],
}


def sha256_of(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def recorded_fetched_at() -> str:
    """抓取日期是**事实记录**，不是「今天」。

    原实现写 time.strftime("%Y-%m-%d")，于是 --check 每天必然报 DRIFT（底本 sha 变 →
    单元层 sha 变 → README 变），整条 npm run check 在每个新的一天都从这一步断掉。
    改为：已有底本里记的日期照旧沿用，只有首次建库（无底本）才落到今天。
    """
    p = os.path.join(OUT, "底本.json")
    if os.path.exists(p):
        try:
            old = json.load(io.open(p, encoding="utf-8"))
            v = (old.get("source") or {}).get("fetchedAt")
            if isinstance(v, str) and re.match(r"^\d{4}-\d{2}-\d{2}$", v):
                return v
        except Exception:
            pass
    return time.strftime("%Y-%m-%d")


def fetch() -> None:
    """抓取并留档。服务器会在 ~3MB 处重置连接，所以用 Range 续传直到 </html>。"""
    os.makedirs(SRC_DIR, exist_ok=True)
    for attempt in range(1, 9):
        if os.path.exists(SRC) and open(SRC, "rb").read()[-64:].strip().endswith(b"</html>"):
            print(f"source.html 已完整（{os.path.getsize(SRC):,} B），跳过抓取")
            return
        size = os.path.getsize(SRC) if os.path.exists(SRC) else 0
        print(f"  第 {attempt} 次抓取（已有 {size:,} B，续传）")
        subprocess.run(
            ["curl", "-sS", "-m", "180", "-C", "-", "-A", "Mozilla/5.0", URL, "-o", SRC],
            check=False,
        )
        time.sleep(2)
    if not open(SRC, "rb").read()[-64:].strip().endswith(b"</html>"):
        sys.stderr.write("抓取未完成：文件末尾不是 </html>，拒绝据此建库\n")
        raise SystemExit(3)


def text_of(html: str) -> str:
    """去标签取文；<span data-rev> 里只是今版标点，照取。"""
    t = re.sub(r"<[^>]+>", "", html)
    t = t.replace("\r", "").replace("\xa0", " ")
    return t.strip()


def simp(s: str) -> str:
    """opencc t2s 只许换形，不许删字。

    实测坑：`芎藭`→`芎`、`懊憹`→`懊`、`瞤` 整字消失（27 条、43 字，全是药名与症状字）。
    转换后按字符对齐，把被吃掉的原文补回来 —— 宁留一个繁体异体，也不许正文缺字。
    """
    out = CONVERTER.convert(s)
    if len(out) == len(s):
        return out
    parts = []
    for tag, i1, i2, j1, j2 in difflib.SequenceMatcher(None, s, out, autojunk=False).get_opcodes():
        if tag == "equal":
            parts.append(out[j1:j2])
        elif tag == "delete":          # 原文有、转换后没了 → 补回原文
            parts.append(s[i1:i2])
        else:                           # replace / insert → 用转换结果
            parts.append(out[j1:j2])
    return "".join(parts)


def parse(html: str) -> dict:
    token = re.compile(
        r'<h1 data-sec="h1">(.*?)</h1>|<h2 data-sec="h2">(.*?)</h2>|<h3 data-sec="h3">(.*?)</h3>'
        r'|<div data-sec="p">(.*?)</div>',
        re.S,
    )
    classes: list[dict] = []
    cur1 = cur2 = cur3 = None
    cur_paras: list[str] = []

    def flush() -> None:
        if not cur_paras:
            return
        target = cur3 if cur3 is not None else cur2
        if target is not None:
            target["paras"].extend(cur_paras)
        cur_paras.clear()

    for m in token.finditer(html):
        h1, h2, h3, p = m.groups()
        if h1 is not None:
            flush()
            cur1 = {"no": len(classes) + 1, "name": text_of(h1), "pian": []}
            classes.append(cur1)
            cur2 = cur3 = None
        elif h2 is not None:
            flush()
            cur2 = {"no": len(cur1["pian"]) + 1, "name": text_of(h2), "entries": [], "paras": []}
            cur1["pian"].append(cur2)
            cur3 = None
        elif h3 is not None:
            flush()
            cur3 = {"no": len(cur2["entries"]) + 1, "name": text_of(h3), "paras": []}
            cur2["entries"].append(cur3)
        else:
            body = text_of(p)
            if body:
                cur_paras.append(body)
    flush()

    # 篇 → 条目：无 h3 的篇，自身就是一条；有 h3 的篇，篇首正文单列「篇首」
    for c in classes:
        for pian in c["pian"]:
            if not pian["entries"]:
                pian["entries"] = [{"no": 1, "name": pian["name"], "paras": pian["paras"]}]
                pian["paras"] = []
            elif pian["paras"]:
                head = {"no": 0, "name": f"{pian['name']}·篇首", "paras": pian["paras"]}
                pian["entries"] = [head] + pian["entries"]
                pian["paras"] = []
    return {"classes": classes}


def build() -> tuple[dict, dict, dict]:
    raw = open(SRC, "rb").read()
    html = raw.decode("utf-8", errors="replace")
    parsed = parse(html)

    # 底本.json（繁 + 简）
    ben: dict = {
        "book": BOOK,
        "bookSimp": BOOK_SIMP,
        "author": "張錫純",
        "dynasty": "清",
        "year": "1909",
        "editionEditionNote": EDITION,
        "source": {
            "provider": "jicheng",
            "providerTitle": "中醫笈成（漢リポ 文字化本）",
            "url": URL,
            "rawUrl": "https://gitlab.com/jicheng/jc.data/-/raw/master/pages/book/" + BOOK + "/index.html",
            "edition": EDITION,
            "bytes": len(raw),
            "sha256": sha256_of(SRC),
            "fetchedAt": recorded_fetched_at(),
        },
        "t2s": "opencc t2s（仅字形）",
        "structure": "五大類（醫方·藥物·醫論·醫話·醫案）→ 篇 → 條目 → 段（div data-sec=p）",
        "counts": {},
        "classes": [],
    }
    paras_total = 0
    chars_hant = 0
    entries_total = 0
    for c in parsed["classes"]:
        c_out = {"no": c["no"], "name": c["name"], "nameSimp": simp(c["name"]), "pian": []}
        for pian in c["pian"]:
            p_out = {
                "no": pian["no"],
                "name": pian["name"],
                "nameSimp": simp(pian["name"]),
                "entries": [],
            }
            for e in pian["entries"]:
                if not e["paras"]:
                    continue
                hant = "\n".join(e["paras"])
                hans = "\n".join(simp(x) for x in e["paras"])
                paras_total += len(e["paras"])
                chars_hant += len(HANZI.findall(hant))
                entries_total += 1
                p_out["entries"].append({
                    "no": e["no"],
                    "name": e["name"],
                    "nameSimp": simp(e["name"]),
                    "zhHant": hant,
                    "zhHans": hans,
                })
            if p_out["entries"]:
                c_out["pian"].append(p_out)
        if c_out["pian"]:
            ben["classes"].append(c_out)

    ben["counts"] = {
        "classes": len(ben["classes"]),
        "pian": sum(len(c["pian"]) for c in ben["classes"]),
        "entries": entries_total,
        "paras": paras_total,
        "charsHant": chars_hant,
        "charsHans": chars_hant,
    }

    # units.json（一条目一单元）
    units = []
    chapters = []
    chap_no = 0
    for c in ben["classes"]:
        for pian in c["pian"]:
            chap_no += 1
            ctitle = f"{c['nameSimp']}·{pian['nameSimp']}"
            cnt = 0
            hz = 0
            for e in pian["entries"]:
                body = e["zhHans"]
                v = {k: sum(body.count(w) for w in ws) for k, ws in VIEWS.items()}
                # 面取本书原生分部：大類（去掉「一、」序号后）直接记 1，不靠词频猜
                cls_name = re.sub(r"^[一二三四五六七八九十]+、", "", c["nameSimp"])
                lv = {k: (1 if k == cls_name else 0) for k in LEVELS}
                assert sum(lv.values()) == 1, f"大类 {cls_name!r} 不在 LEVELS 里"
                vb = max(v.values()) or 1
                u = {
                    "chapter": str(chap_no),
                    "chapterTitle": ctitle,
                    "sec": c["nameSimp"],
                    "sub": str(e["no"]),
                    "title": e["nameSimp"],
                    # 无 h3 的篇，条目名＝篇名，locator 不再重复一次
                    "locator": (f"{BOOK_SIMP}·{c['nameSimp']}·{pian['nameSimp']}"
                                + (f"·{e['nameSimp']}" if e["nameSimp"] != pian["nameSimp"] else "")),
                    "brief": re.split(r"[。！？]", re.sub(r"\s+", "", body))[0][:46],
                    "goals": [],
                    "rawBody": body,
                    "body": body,
                    "prose": body,
                    "segments": [{"title": e["nameSimp"], "hanzi": len(HANZI.findall(body))}],
                    "hanzi": len(HANZI.findall(body)),
                }
                u["measure"] = {
                    "digits": len(re.findall(r"\d", body)),
                    "valueLike": len(re.findall(
                        r"(?:\d+(?:\.\d+)?|[一二三四五六七八九十百半]+)\s*(?:两|兩|钱|錢|分|斤|枚|个|片|寸|日|服|次)",
                        body)),
                    "valueSamples": [],
                    "listItems": 0,
                    "views": v,
                    "levels": lv,
                }
                u["tri"] = {
                    "view": {"primary": max(v, key=v.get) if max(v.values()) else "none",
                             "share": round((max(v.values()) if v else 0) / vb, 3),
                             "mix": ">".join(f"{k}{val}" for k, val in sorted(v.items(), key=lambda kv: -kv[1])[:3])},
                    "level": {"primary": max(lv, key=lv.get), "share": 1.0,
                              "mix": f"{max(lv, key=lv.get)}1"},
                }
                units.append(u)
                cnt += 1
                hz += u["hanzi"]
            chapters.append({"no": str(chap_no), "title": ctitle, "units": cnt, "hanzi": hz})

    body_all = "".join(u["body"] for u in units)
    by_view: dict = {}
    by_level: dict = {}
    for u in units:
        by_view[u["tri"]["view"]["primary"]] = by_view.get(u["tri"]["view"]["primary"], 0) + 1
        by_level[u["tri"]["level"]["primary"]] = by_level.get(u["tri"]["level"]["primary"], 0) + 1

    uni = {
        "source": {
            "file": "standards/zhongcan-xilu/底本.json",
            "sha256": "",
            "script": "scripts/build_zhongcan_xilu_text.py",
            "label": "外源·文字化本",
            "provider": "jicheng",
            "providerTitle": "中醫笈成（漢リポ 文字化本）",
            "url": URL,
            "edition": EDITION,
            "rawSha256": ben["source"]["sha256"],
            "rawBytes": ben["source"]["bytes"],
            "evidence": "正文逐段取自笈成文字化本（底本声明为河北人民出版社1977年2版）；"
                        "字形统一走 opencc t2s（与 scripts/convert_t2s.py 同一转换器），"
                        "底本.json 同时保留 zhHant / zhHans 双栏，可逐条回核。",
        },
        "basis": {
            "unit": "一条目一单元（方/药解/医论/医话/医案按网页 h3 与 h2 取；篇首正文单列）",
            "views": "证候 / 药理 / 参西（「参西」= 西人·西医·西药 + 清末化学生理词汇：化合·养气·氧气·原质·脑筋·血管·铁锈…）",
            "levels": "医方 / 药物 / 医论 / 医话 / 医案（本书原生五分部，按所属大類直记，不靠词频猜）",
        },
        "views": VIEWS,
        "levels": LEVELS,
        "chapters": chapters,
        "units": units,
        "counts": {
            "chapters": len(chapters),
            "units": len(units),
            "hanzi": len(HANZI.findall(body_all)),
            "digits": len(re.findall(r"\d", body_all)),
            "valueLike": sum(u["measure"]["valueLike"] for u in units),
            "formulas": 0,
            "formulaMentions": len(re.findall(r"[\u4e00-\u9fff]{1,6}(?:汤|湯|散|丸|膏|丹|饮|飲)\s*方?", body_all)),
        },
        "triaxis": {"byPrimaryView": by_view, "byPrimaryLevel": by_level},
    }
    return ben, uni, {"classes": ben["counts"]["classes"], "pian": ben["counts"]["pian"],
                      "entries": len(units)}


def readme(ben: dict, uni: dict) -> str:
    c = ben["counts"]
    u = uni["counts"]
    return f"""# 醫學衷中參西錄 · 底本与单元层

| 项 | 值 |
|---|---|
| 作者 | 張錫純（清，1909） |
| 底本声明 | {EDITION} |
| 来源 | 中醫笈成（漢リポ 文字化本）· {URL} |
| 留档 | `sources/source.html` · {ben['source']['bytes']:,} B · sha256 `{ben['source']['sha256']}` |
| 抓取 | {ben['source']['fetchedAt']}（服务器在 ~3MB 处重置连接，脚本用 Range 续传直到 `</html>`） |
| 规模 | {c['classes']} 大类 · {c['pian']} 篇 · {u['units']} 单元 · {c['paras']} 段 · {c['charsHant']:,} 汉字 |

## 口径

1. **层级取网页语义结构**：`<h1 data-sec>`＝大類（醫方/藥物/醫論/醫話/醫案），`<h2>`＝篇，`<h3>`＝條目，
   `<div data-sec="p">`＝段。不另立层级。
2. **一条目一单元**：有 h3 的篇按條目切；无 h3 的篇（藥解/醫論/醫話/醫案）自身即一条；篇首正文单列「篇首」。
3. **字形**：正文 opencc t2s（只动字形，与 `scripts/convert_t2s.py` 同一转换器）；`底本.json` 同时存繁简两栏。
4. **三条轴**：证候 / 药理 / **参西**（西人、西医、化验、血压、细菌、解剖、生理…）；面＝五大類，按所属大類直记。

## 复算

```bash
python scripts/build_zhongcan_xilu_text.py --fetch   # 首次抓取并留档
python scripts/build_zhongcan_xilu_text.py           # 重建底本与单元层
python scripts/build_zhongcan_xilu_text.py --check    # 幂等校验
node tests/test_zhongcan_xilu_text.js                # 指纹与规模测试
```
"""


def main() -> int:
    check = "--check" in sys.argv
    if "--fetch" in sys.argv:
        fetch()
    if not os.path.exists(SRC):
        sys.stderr.write("缺 sources/source.html，先跑 --fetch\n")
        return 3
    ben, uni, stat = build()
    uni["source"]["sha256"] = sha256_of(os.path.join(OUT, "底本.json")) if os.path.exists(
        os.path.join(OUT, "底本.json")) else ""
    ben_text = json.dumps(ben, ensure_ascii=False, indent=1)
    # 底本 sha256 由底本内容自身决定：先写再回填单元层的 source.sha256
    ben_sha = hashlib.sha256(ben_text.encode("utf-8")).hexdigest()
    uni["source"]["sha256"] = ben_sha
    uni_text = json.dumps(uni, ensure_ascii=False, indent=1)
    readme_text = readme(ben, uni)

    files = {
        os.path.join(OUT, "底本.json"): ben_text,
        os.path.join(OUT, "units.json"): uni_text,
        os.path.join(OUT, "README.md"): readme_text,
    }
    if check:
        drift = []
        for path, text in files.items():
            old = io.open(path, encoding="utf-8").read() if os.path.exists(path) else ""
            if old != text:
                drift.append(os.path.basename(path))
        if drift:
            print("DRIFT:", ", ".join(drift), "—— 请跑 npm run zhongcan:text")
            return 1
        print(f"[zhongcan-xilu] ✓ {stat['classes']} 大类 · {stat['pian']} 篇 · {stat['entries']} 单元")
        return 0

    os.makedirs(OUT, exist_ok=True)
    for path, text in files.items():
        io.open(path, "w", encoding="utf-8").write(text)
    print(f"[zhongcan-xilu] {stat['classes']} 大类 · {stat['pian']} 篇 · {stat['entries']} 单元 · "
          f"{ben['counts']['charsHant']:,} 汉字 · 段 {ben['counts']['paras']}")
    print(f"  底本 sha256 {ben_sha[:16]}… · units {uni['counts']['units']} · "
          f"字 {uni['counts']['hanzi']:,}")
    for path in files:
        print(f"  saved {path}  {round(os.path.getsize(path) / 1024)} KB")
    return 0


if __name__ == "__main__":
    sys.exit(main())
