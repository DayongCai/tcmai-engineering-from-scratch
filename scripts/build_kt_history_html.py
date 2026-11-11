# -*- coding: utf-8 -*-
"""把 data/kt-history.json 注入模版，生成 kt-history.html（单文件、离线可开）。

--check 时不写盘，只比对现有产物是否与重建结果一致（供 npm run kt:history:check 用）。
"""
import io
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def build() -> str:
    tpl = io.open(os.path.join(ROOT, "assets", "kt-history.template.html"), encoding="utf-8").read()
    data = io.open(os.path.join(ROOT, "data", "kt-history.json"), encoding="utf-8").read()
    # 防止把 </script> 提前闭合
    payload = data.replace("</", "<\\/")
    return tpl.replace("__DATA__", payload)


def main() -> int:
    out = os.path.join(ROOT, "kt-history.html")
    html = build()
    if "--check" in sys.argv:
        old = io.open(out, encoding="utf-8").read() if os.path.exists(out) else ""
        if old == html:
            print("kt-history.html 与模板重建结果一致 ✓")
            return 0
        print("DRIFT kt-history.html 与重建结果不一致 —— 请跑 npm run kt:history")
        return 1
    io.open(out, "w", encoding="utf-8").write(html)
    print("saved", out, round(os.path.getsize(out) / 1024), "KB")
    return 0


if __name__ == "__main__":
    sys.exit(main())
