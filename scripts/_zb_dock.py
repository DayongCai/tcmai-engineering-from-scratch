# -*- coding: utf-8 -*-
"""19 智能毕设：从 standards/biye/instances/07-zhineng.json 现算「毕设对接.md」。"""
import io
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
J = json.load(io.open(os.path.join(ROOT, "standards/biye/instances/07-zhineng.json"), encoding="utf-8"))


def fmt(n):
    try:
        return f"{int(n):,}"
    except Exception:
        return str(n)


rows = []
for u in J.get("item4", {}).get("成本侧", []):
    rows.append(f"| {fmt(u.get('人月单价'))} | {fmt(u.get('建设'))} | {fmt(u.get('三年毛利'))} | {u.get('回本中位')} | {'是' if u.get('亏损') else '否'} |")

md = f"""# 毕设对接：智能系（模块分包定价）

> 本文所有数字**从 `standards/biye/instances/07-zhineng.json` 现算**，不是估计值；口径见 `standards/biye/METHOD.json`。

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
| SAM | {fmt(J.get('item2', {}).get('SAM'))}（来源 {J.get('item2', {}).get('SAM来源', '—')}） |
| 渗透带 | {J.get('item2', {}).get('渗透带%', '—')} %，带中位 {J.get('item2', {}).get('带中位%')} % |
| 客户数 | {J.get('item2', {}).get('客户数')}（隐含渗透率 {J.get('item2', {}).get('隐含渗透率%')} %） |
| 判定 | {J.get('item2', {}).get('判定', '—')} |

## 四、定价侧

| 项 | 值 |
|---|---|
| 客单 | {fmt(J.get('item3', {}).get('客单'))} 元 |
| 定价路径 | {J.get('item3', {}).get('定价路径', '—')} |
| 客单占整院项目 | {J.get('item3', {}).get('客单占整院项目%')} % |
| 判定 | {J.get('item3', {}).get('判定', '—')} |

## 五、成本与回本（三档人月单价）

| 人月单价（元） | 建设成本（元） | 三年毛利（元） | 回本中位（月） | 亏损 |
|---|---|---|---|---|
{chr(10).join(rows)}

## 六、用法

- 学生做毕设时，**选题要能对上一个案例**（编码翻译层 / 邻域稳定性检验 / 可审计失效包），否则交付不出去；
- 报价用本表客单（{fmt(J.get('item3', {}).get('客单'))} 元/院）与三档人月单价的对照，**不许自己另立口径**；
- 任何数字改动都要回写 `07-zhineng.json` 再重跑本脚本，本文是产物不是来源。
"""
p = os.path.join(ROOT, "departments/07-zhineng/19-zhineng-biye-sheji/毕设对接.md")
io.open(p, "w", encoding="utf-8").write(md)
print("写好", p, len(md), "字")
