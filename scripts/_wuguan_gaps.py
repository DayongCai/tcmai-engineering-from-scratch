# -*- coding: utf-8 -*-
"""五官系：6 门缺源登记 + 17 毕设对接（从 instances/08-wuguan.json 现算）。"""
import io
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S = os.path.join(ROOT, "standards")


def load_text(sub):
    U = json.load(io.open(os.path.join(S, sub, "units.json"), encoding="utf-8"))
    return "".join(u.get("body") or "" for u in U["units"])


KEYS = ["口腔", "牙", "修复", "正畸", "种植", "影像", "CT", "MRI", "超声", "手术", "麻醉", "皮", "肤", "美容"]
TEXTS = {s: load_text(s) for s in ("zhongyi-kouqiang-kexue", "zhongyi-yanke-xue", "zhongyi-erbihou-xue")}
hits = {s: {k: t.count(k) for k in KEYS} for s, t in TEXTS.items()}

GAPS = {
    "09-kouqiang-neike-xue": ("口腔内科学", "龋病、牙髓病、牙周病、黏膜病的诊断与治疗规范",
                             "口腔内科学", ["牙髓", "根管", "龈", "黏膜", "龋"]),
    "10-yanke-yingxiang-jiancha": ("眼科影像检查", "OCT、FFA、B 超、CT/MRI 的眼科适应证与读片",
                                   "眼科影像", ["OCT", "荧光", "造影", "B 超", "读片"]),
    "11-kouqiang-hemian-waike": ("口腔颌面外科", "拔牙、颌面创伤、肿瘤、正颌与麻醉",
                                 "口腔颌面外科", ["拔牙", "颌面", "肿瘤", "正颌", "麻醉"]),
    "12-kouqiang-xiufu-xue": ("口腔修复学", "固定义齿、可摘义齿、种植修复与咬合重建",
                              "口腔修复学", ["固定义齿", "可摘", "种植", "咬合", "修复"]),
    "13-kouqiang-zhengji-xue": ("口腔正畸学", "错𬌗畸形分类、矫治器与支抗设计",
                                "口腔正畸学", ["错", "矫治", "支抗", "托槽", "头影"]),
    "15-zhongyi-meirong-pifu": ("中医美容皮肤", "损容性皮肤病、外治与美容处置规范",
                                "中医美容皮肤", ["面", "斑", "疹", "肤", "美容"]),
}

TPL = """# 缺口登记：{title}（0/{n} 章，未建）

## 为什么没建

本课要的是**{need}**，`F:/textbooks` 里没有对应教材。现有单元层里能查到的只是零散提法：

| 来源 | 命中 | 判定 |
|---|---|---|
{gaps}

按「不注水」口径，凑 {n} 章只能靠模板话术把一句话撑成一千字——那不算正文，所以**不建**。

## 需要补什么

1. {title}的现行教材或行业规范（人民卫生出版社或中华医学会/中华口腔医学会系列）；
2. 与专科对应的诊疗指南（含适应证、禁忌证与操作要点）；
3. 如涉中医，需中医药管理局口径的专科诊疗方案。

补源按 `补源约定.md` 落盘（文本层 + 五项指纹 + 九字段条文 + 「外源·<标题> 第N条」标注），
再按 1,000 字/章重排章节。
"""

for d, (title, need, kw_title, kws) in GAPS.items():
    n = 10 if d.startswith(("09", "11", "12", "13")) else 8
    rows = []
    for s, t in hits.items():
        hits_s = "、".join(f"「{k}」{t.get(k, 0)} 次" for k in kws)
        rows.append(f"| {s}（{len(t):,} 字） | {hits_s} | 无系统章节 |")
    md = TPL.format(title=title, need=need, n=n, gaps="\n".join(rows))
    p = os.path.join(ROOT, "departments/08-wuguan", d, "缺口登记.md")
    os.makedirs(os.path.dirname(p), exist_ok=True)
    io.open(p, "w", encoding="utf-8").write(md)
    print("写入", d)

# 17 毕设对接
J = json.load(io.open(os.path.join(S, "biye/instances/08-wuguan.json"), encoding="utf-8"))


def f(n):
    try:
        return f"{int(n):,}"
    except Exception:
        return str(n)


rows = [f"| {f(u.get('人月单价'))} | {f(u.get('建设'))} | {f(u.get('三年毛利'))} | {u.get('回本中位')} | {'是' if u.get('亏损') else '否'} |"
        for u in J.get("item4", {}).get("成本侧", [])]
md = f"""# 毕设对接：五官系

> 数字从 `standards/biye/instances/08-wuguan.json` 现算，不是估计；口径见 `standards/biye/METHOD.json`。

## 一、方法
{J.get('method', '—')}

**锚**：{J.get('item2', {}).get('锚', '—')}

## 二、产品与案例
- 产品：{J.get('product', '—')}
- 案例：{'、'.join(J.get('cases', [])) or '—'}

## 三、市场侧
| 项 | 值 |
|---|---|
| 客群 | {J.get('item2', {}).get('客群', '—')} |
| SAM | {f(J.get('item2', {}).get('SAM'))}（来源 {J.get('item2', {}).get('SAM来源', '—')}） |
| 客户数 | {J.get('item2', {}).get('客户数')}（隐含渗透率 {J.get('item2', {}).get('隐含渗透率%')} %） |
| 判定 | {J.get('item2', {}).get('判定', '—')} |

## 四、定价侧
| 项 | 值 |
|---|---|
| 客单 | {f(J.get('item3', {}).get('客单'))} 元 |
| 定价路径 | {J.get('item3', {}).get('定价路径', '—')} |
| 判定 | {J.get('item3', {}).get('判定', '—')} |

## 五、成本与回本
| 人月单价（元） | 建设成本（元） | 三年毛利（元） | 回本中位（月） | 亏损 |
|---|---|---|---|---|
{chr(10).join(rows)}

## 六、用法
选题须对上一个案例；报价用本表客单与三档人月单价的对照，**不许另立口径**；数字改动要回写 JSON 再重跑本页。
"""
io.open(os.path.join(ROOT, "departments/08-wuguan/17-wuguan-biye-sheji/毕设对接.md"), "w", encoding="utf-8").write(md)
print("17 毕设对接写好", len(md))
