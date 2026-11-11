#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""398 条「一穴一图」记忆卡生成

规则：一条 = 一桩 = 一图。
  左：有视频切图（69 条）就用真图；没有就按桩位（东厢/南窗/西壁/北案/中庭）画方位图。
  右：条号 / 宫·穴·桩位 / 记忆图像（自动换行）/ 语义主轴 / 认知钩。
输出 assets/shanghan-palace/cards/cNNN.jpg，供 xlsx 内嵌。
"""
import json
import os
import textwrap

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MAT = os.path.join(ROOT, "standards", "materials", "shanghan-quannao")
AST = os.path.join(ROOT, "assets", "shanghan-palace")
OUTD = os.path.join(AST, "cards")
FONT = "C:/Windows/Fonts/simsun.ttc"
FONT_B = "C:/Windows/Fonts/msyhbd.ttc"

W, H = 560, 300
INK = (59, 47, 34)
PAPER = (251, 246, 234)
LINE = (201, 184, 154)
ACCENT = (138, 106, 47)
LEFT_W = 210


def f(size, bold=False):
    return ImageFont.truetype(FONT_B if bold else FONT, size)


def wrap(draw, text, font, max_w):
    lines, cur = [], ""
    for ch in text:
        if ch == "\n":
            lines.append(cur)
            cur = ""
            continue
        if draw.textlength(cur + ch, font=font) > max_w:
            lines.append(cur)
            cur = ch
        else:
            cur += ch
    if cur:
        lines.append(cur)
    return lines


DIR_POS = {"东厢": (0.78, 0.35), "南窗": (0.30, 0.14), "西壁": (0.12, 0.42),
           "北案": (0.32, 0.78), "中庭": (0.50, 0.50)}


def draw_palace(d, box, xue, zhuang):
    x0, y0, x1, y1 = box
    d.rectangle(box, fill=(243, 235, 218), outline=LINE, width=2)
    # 房间平面：四面墙 + 五方标记
    d.rectangle([x0 + 14, y0 + 14, x1 - 14, y1 - 14], outline=(196, 176, 140), width=2)
    for k, (fx, fy) in DIR_POS.items():
        cx, cy = x0 + (x1 - x0) * fx, y0 + (y1 - y0) * fy
        r = 15 if k == zhuang else 8
        col = ACCENT if k == zhuang else (196, 176, 140)
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=col if k == zhuang else None,
                  outline=col, width=2)
        if k == zhuang:
            d.text((cx, cy), xue, font=f(17, True), fill=(255, 250, 240), anchor="mm")
    d.text((x0 + 10, y0 + 4), "桩位图（本表自绘）", font=f(12), fill=(150, 130, 100))


def card(no, z, a, s, img_path):
    im = Image.new("RGB", (W, H), PAPER)
    d = ImageDraw.Draw(im)
    d.rectangle([0, 0, W - 1, H - 1], outline=LINE, width=2)
    d.rectangle([0, 0, W - 1, 40], fill=INK)
    d.text((10, 20), f"第{no}条 · {z['gongName']} · {z['zhuang']}",
           font=f(15, True), fill=(255, 247, 232), anchor="lm")
    v = z.get("video")
    if v:
        same = (v == z["xue"])
        pre = "推定桩：" if z.get("src") == "推定" else "口播桩："
        label = pre + v + ("" if same else "（≠本表）")
        d.text((W - 10, 20), label, font=f(12, not same), fill=(226, 200, 150) if same else (255, 176, 120),
               anchor="rm")
    box = (8, 48, 8 + LEFT_W, H - 8)
    if img_path and os.path.exists(img_path):
        try:
            vi = Image.open(img_path).convert("RGB")
            vi.thumbnail((LEFT_W - 8, H - 60))
            im.paste(vi, (8 + (LEFT_W - 8 - vi.width) // 2, 48 + (H - 56 - vi.height) // 2))
            d.rectangle(box, outline=LINE, width=2)
        except Exception:  # noqa: BLE001
            draw_palace(d, box, z["xue"], z["zhuang"])
    else:
        draw_palace(d, box, z["xue"], z["zhuang"])
    x = 8 + LEFT_W + 12
    mw = W - x - 10
    y = 52
    d.text((x, y), f"{z['xue']}", font=f(24, True), fill=INK)
    d.text((x + d.textlength(z["xue"], font=f(24, True)) + 8, y + 8),
           f"{z['jing']}", font=f(13), fill=ACCENT)
    y += 34
    for ln in wrap(d, a.get("image", ""), f(15), mw)[:6]:
        d.text((x, y), ln, font=f(15), fill=(40, 32, 24))
        y += 21
    y += 6
    d.line([x, y, W - 12, y], fill=LINE, width=1)
    y += 6
    d.text((x, y), f"语义主轴：{s['main']}", font=f(13, True), fill=ACCENT)
    y += 20
    hook = a.get("hook", "")
    if hook:
        d.text((x, y), "提取线索：" + hook, font=f(12), fill=(110, 95, 72))
    return im


def main():
    tiao = {t["no"]: t for t in json.load(open(os.path.join(ROOT, "standards", "shanghan", "tiao-398.json"),
                                               encoding="utf-8"))["tiao"]}
    route = json.load(open(os.path.join(MAT, "palace-route.json"), encoding="utf-8"))
    zi = {int(k): v for k, v in route["assign"].items()}
    sem = {r["no"]: r for r in json.load(open(os.path.join(ROOT, "standards", "shanghan", "semtensor-398.json"),
                                              encoding="utf-8"))["rows"]}
    auth = {}
    ad = os.path.join(MAT, "authoring")
    for fn in sorted(os.listdir(ad)):
        if fn.startswith("out-") and fn.endswith(".json"):
            for r in json.load(open(os.path.join(ad, fn), encoding="utf-8"))["rows"]:
                auth[int(r["no"])] = r
    vz = {}
    vp = os.path.join(MAT, "video-zhuang.json")
    if os.path.exists(vp):
        vz = {int(r["no"]): r for r in json.load(open(vp, encoding="utf-8"))["rows"]}
    pi = json.load(open(os.path.join(MAT, "palace-images.json"), encoding="utf-8")) if \
        os.path.exists(os.path.join(MAT, "palace-images.json")) else {"images": {}}

    os.makedirs(OUTD, exist_ok=True)
    idx = {}
    for no in range(1, 399):
        z = dict(zi[no])
        z["video"] = vz.get(no, {}).get("xue")
        z["src"] = vz.get(no, {}).get("src", "")
        vimg = None
        for pno, m in pi["images"].items():
            if str(no) in m:
                vimg = os.path.join(AST, m[str(no)]["file"])
                break
        im = card(no, z, auth.get(no, {}), sem[no], vimg)
        dest = os.path.join(OUTD, f"c{no:03d}.jpg")
        im.save(dest, quality=84, optimize=True)
        idx[no] = {"file": f"c{no:03d}.jpg", "video": bool(vimg)}
    json.dump({"$generated": "python scripts/build_quannao_cards.py", "counts": len(idx),
               "withVideo": sum(1 for v in idx.values() if v["video"]), "cards": idx},
              open(os.path.join(MAT, "cards-index.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)
    size = sum(os.path.getsize(os.path.join(OUTD, v["file"])) for v in idx.values())
    print(f"cards {len(idx)} · 含视频切图 {sum(1 for v in idx.values() if v['video'])} · "
          f"合计 {size/1048576:.1f} MB · 均 {size/len(idx)/1024:.0f} KB")


if __name__ == "__main__":
    main()
