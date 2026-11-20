# -*- coding: utf-8 -*-
"""把 data/textbook-chain.json 出成桌面交付物：CSV（189 行）+ 单文件 HTML 看板。"""
import csv
import io
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = json.load(io.open(os.path.join(ROOT, 'data', 'textbook-chain.json'), encoding='utf-8'))
DESK = os.path.join(os.environ['USERPROFILE'], 'Desktop')
T = D['totals']
rows = D['subjects']

csv_path = os.path.join(DESK, '教材编写×视频落地台账-2026-11-17.csv')
with io.open(csv_path, 'w', encoding='utf-8-sig', newline='') as f:
    w = csv.DictWriter(f, fieldnames=list(rows[0].keys()), extrasaction='ignore')
    w.writeheader()
    for r in rows:
        w.writerow(r)

KIND_ORDER = ['教材', '派生', '外源（已按补源约定登记）', '手写', '合成']
KIND_COLOR = {'教材': '#c8a55b', '派生': '#6fae9a', '外源（已按补源约定登记）': '#c0736a',
              '手写': '#9b7fc4', '合成': '#7f8fa6'}
kind_count = {k: sum(1 for r in rows if r['底本种类'] == k) for k in KIND_ORDER}

def dept_table():
    out = []
    for d in D['departments']:
        out.append(
            f"<tr><td class='l'>{d['title']}</td><td>{d['subjects']}</td>"
            f"<td>{d['chaptersBuilt']}/{d['chaptersTarget']}</td>"
            f"<td>{d['units']:,}</td><td>{d['bodyHanzi']:,}</td>"
            f"<td>{d['textbookBase']}</td><td>{d['derived']}</td>"
            f"<td>{d['withVideo']}</td><td>{d['lectures']}</td><td>{d['linked']}</td></tr>")
    return '\n'.join(out)

gaps = [r for r in rows if r['链条状态'] == '待补']
gap_rows = '\n'.join(
    f"<tr><td class='l'>{r['学科']}<span class='dim'> · {r['院系']}</span></td>"
    f"<td>{r['底本种类']}</td><td>{r['视频讲数']}</td><td>{r['对齐讲数']}</td>"
    f"<td class='l'>{r['问题']}</td></tr>" for r in gaps)

bars = '\n'.join(
    f"<div class='bar'><span class='dot' style='background:{KIND_COLOR[k]}'></span>"
    f"<span class='nm'>{k.replace('（已按补源约定登记）','')}</span>"
    f"<span class='val'>{kind_count[k]}</span></div>" for k in KIND_ORDER)

html = f"""<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="utf-8">
<title>教材编写 × 教育视频 · 落地台账</title>
<style>
 :root{{--bg:#0d0a07;--panel:#1a1610;--line:#2a2218;--ink:#e8e0d2;--dim:#9a8f7d;--gold:#c8a55b}}
 *{{box-sizing:border-box;margin:0;padding:0}}
 body{{background:var(--bg);color:var(--ink);font-family:"Noto Serif SC","Source Han Serif CN",SimSun,serif;
   padding:34px 40px 60px;line-height:1.6}}
 h1{{font-size:23px;letter-spacing:.04em;font-weight:600}}
 h1 em{{color:var(--gold);font-style:normal}}
 .sub{{color:var(--dim);font-size:12.5px;margin-top:6px}}
 .kpis{{display:grid;grid-template-columns:repeat(6,1fr);gap:12px;margin:24px 0 8px}}
 .kpi{{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:14px 16px}}
 .kpi .n{{font-size:22px;color:var(--gold);font-weight:600}}
 .kpi .t{{font-size:11.5px;color:var(--dim);margin-top:4px}}
 h2{{font-size:14px;color:var(--gold);margin:30px 0 10px;letter-spacing:.1em}}
 table{{width:100%;border-collapse:collapse;font-size:12.5px;background:var(--panel);
   border:1px solid var(--line);border-radius:10px;overflow:hidden}}
 th,td{{padding:8px 10px;border-bottom:1px solid var(--line);text-align:right}}
 th{{color:var(--dim);font-weight:400;font-size:11.5px}}
 td.l,th.l{{text-align:left}}
 tr:last-child td{{border-bottom:none}}
 .dim{{color:var(--dim);font-size:11px}}
 .bars{{display:flex;gap:18px;flex-wrap:wrap;margin-top:6px}}
 .bar{{display:flex;align-items:center;gap:8px;background:var(--panel);border:1px solid var(--line);
   border-radius:20px;padding:6px 14px;font-size:12.5px}}
 .dot{{width:9px;height:9px;border-radius:50%}}
 .val{{color:var(--gold)}}
 .note{{margin-top:26px;color:#7d7362;font-size:11.5px;line-height:1.9;
   border-top:1px solid var(--line);padding-top:14px}}
 .note b{{color:#cfc4b0}}
</style></head><body>
<h1>教材编写 × 教育视频 · <em>落地台账</em></h1>
<div class="sub">9 院系 · {T['subjects']} 学科 · 生成于 2026-11-17 · 数据源 data/textbook-chain.json（三层与视频均按磁盘现算）</div>

<div class="kpis">
 <div class="kpi"><div class="n">{T['chaptersBuilt']}<span class="dim">/{T['chaptersTarget']}</span></div><div class="t">已建章节</div></div>
 <div class="kpi"><div class="n">{T['bodyHanzi']/10000:.0f} 万</div><div class="t">正文汉字</div></div>
 <div class="kpi"><div class="n">{T['units']:,}</div><div class="t">单元层单元数</div></div>
 <div class="kpi"><div class="n">{T['lectures']}</div><div class="t">视频讲数（{T['withVideo']} 学科）</div></div>
 <div class="kpi"><div class="n">{T['videoHours']}</div><div class="t">视频小时</div></div>
 <div class="kpi"><div class="n">{T['linkedLectures']}</div><div class="t">已对齐教材的讲</div></div>
</div>
<div class="bars">{bars}</div>

<h2>一、院系总览</h2>
<table>
<tr><th class="l">院系</th><th>学科</th><th>章（已建/目标）</th><th>单元</th><th>正文汉字</th>
<th>教材底本</th><th>派生</th><th>有视频学科</th><th>讲数</th><th>已对齐</th></tr>
{dept_table()}
</table>

<h2>二、待补清单（{len(gaps)} 门）</h2>
<table>
<tr><th class="l">学科</th><th>底本种类</th><th>视频讲数</th><th>已对齐</th><th class="l">问题</th></tr>
{gap_rows}
</table>

<div class="note">
<b>口径（全部可复核）</b><br>
底本层＝<code>standards/&lt;x&gt;/units.json</code> 的 source.file（教材）／source 内含「派生」字样（派生）／
<code>补源登记.json</code>（外源）／<code>standards/textbook-sources.json</code>（手写、合成）。<br>
单元层＝<code>units.json</code> 的实际单元数与汉字；正文层＝<code>chapters/&lt;章&gt;/docs/zh.md</code> 在磁盘上的章数与汉字；
视频＝<code>data/video-lessons.json</code>；对齐＝<code>data/video-textbook-links.json</code> 的 linkedLectures。<br>
<b>门禁</b>：<code>python scripts/build_textbook_chain.py --check</code> 已接入 <code>npm run check</code>，台账与磁盘不一致即红。
</div>
</body></html>"""

html_path = os.path.join(DESK, '教材编写×视频落地台账-2026-11-17.html')
io.open(html_path, 'w', encoding='utf-8').write(html)
print('csv :', csv_path)
print('html:', html_path, round(os.path.getsize(html_path) / 1024), 'KB')
print('待补', len(gaps), [g['学科'] for g in gaps])
