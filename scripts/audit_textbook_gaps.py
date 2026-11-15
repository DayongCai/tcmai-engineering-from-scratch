# -*- coding: utf-8 -*-
"""盘点 9 院系 189 学科的教材编写缺口（底本层 / 单元层 / 正文层），输出 CSV + Markdown 到桌面。

三层分别独立判定，互不代偿：
  底本层  standards/<x>/底本.json 存在          → 有底本登记（可校勘）
  单元层  standards/<x>/units.json 存在          → 能由底本现算（章代码可复算）
          派生/合成课按 chapters/*/code/main.js 里的 standards/<x> 引用解析到父课
  正文层  chapters/<章>/docs/zh.md 存在          → 已写正文（磁盘口径，与 audit_curriculum 一致）

类别：
  A 三层齐全          B 有底本·无单元层·有正文（正文写在章代码里）
  C 有底本·有单元层·无正文   D 无底本·无正文（缺教材，需补源）
  E 无底本·有单元层·有正文（派生/合成课，逐字复用父课）
"""
import csv, io, json, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CUR = json.load(io.open(os.path.join(ROOT, 'curriculum.json'), encoding='utf-8'))
STD_REF = re.compile(r'standards/([A-Za-z0-9_\-]+)')
# 课程 slug 与底本目录不同名的，单元层会「看不见」——与 build_kt_sphere_data.py 同一张表。
# 2026-11-13 补：中药学的 340 单元在 standards/zhongyao-xue（母本同一本 xlsx），
# 不登记别名，缺口清单会把它算成「有底本·无单元层」，是清单的错，不是课的错。
STD_ALIAS = {
    'shanghanlun': 'shanghan', 'jingui-yaolue': 'jingui', 'wenbing-xue': 'wenbing',
    'zhongyi-neike-xue': 'neike', 'zhongyaoxue': 'zhongyao-xue',
    'bingli-shengli-xue': 'binglishengli', 'zhongcan-xilu-xuandu': 'zhongcan-xilu',
    'zhongyi-jichu-lilun': 'jichu', 'zhongyi-zhen-duan-xue': 'zhenduan',
    'fangjixue': 'fangji', 'yaoli-xue': 'yaoli',
    'zhongyi-zhenghou-xue': 'zhenghou',
}
HANZI = re.compile(r'[\u4e00-\u9fff]')


def std_candidates(slug):
    bare = re.sub(r'^\d{2}-', '', slug)
    out = [slug, bare]
    if STD_ALIAS.get(bare):
        out.append(STD_ALIAS[bare])
    return out


def source_kind(name):
    """底本状态：'file' 有教材底本；'external' 外源课（无教材，按补源登记逐条引文）；
    'derived' 派生/合成；None 未登记。

    2026-11-13：原先只认 dict 形态的 source，而 11 门课把来源写成**字符串**
    （「派生：…」「外源课：无教材；…」）——清单于是把已登记来源的课算成「底本未登记」。
    字符串是合法登记，只是当时没被读。字符串里既没有「派生」也没有「外源」的，按未登记处理。
    """
    d = os.path.join(ROOT, 'standards', name)
    p = os.path.join(d, 'units.json')
    src = None
    if os.path.exists(p):
        try:
            src = json.load(io.open(p, encoding='utf-8')).get('source')
        except Exception:
            src = None
    if isinstance(src, str):
        text = src.strip()
        if '派生' in text:
            return 'derived'
        if '外源' in text:
            return 'external'
    if isinstance(src, dict):
        if src.get('file'):
            return 'file'
        if src.get('derived') or src.get('kind') == '派生' or src.get('from'):
            return 'derived'
    # 流程课（轮转／毕设）把来源登记在 METHOD.json 的 why/sources 里，units.json 不带 source。
    # METHOD.json 有 sources 就是已登记来源，按派生层计（不猜、不当成有教材底本）。
    mp = os.path.join(d, 'METHOD.json')
    if os.path.exists(mp):
        try:
            m = json.load(io.open(mp, encoding='utf-8'))
        except Exception:
            m = None
        if isinstance(m, dict) and (m.get('sources') or m.get('why')):
            return 'derived'
    if os.path.exists(os.path.join(d, '底本.json')) or os.path.exists(os.path.join(d, '底本.md')):
        return 'file'
    return None


def has_source(name):
    return source_kind(name) is not None


def own_std(slug):
    """返回 (units_name, diben_name)：两者可分别命中同一目录。"""
    units = diben = None
    for name in std_candidates(slug):
        d = os.path.join(ROOT, 'standards', name)
        if not os.path.isdir(d):
            continue
        if units is None and os.path.exists(os.path.join(d, 'units.json')):
            units = name
        if diben is None and has_source(name):
            diben = name
    return units, diben


def ref_std(dept_slug, slug):
    base = os.path.join(ROOT, 'departments', dept_slug, slug, 'chapters')
    if not os.path.isdir(base):
        return None, None
    units = diben = None
    for ch in sorted(os.listdir(base)):
        p = os.path.join(base, ch, 'code', 'main.js')
        if not os.path.exists(p):
            continue
        txt = io.open(p, encoding='utf-8', errors='ignore').read()
        for m in STD_REF.finditer(txt):
            x = m.group(1)
            d = os.path.join(ROOT, 'standards', x)
            if units is None and os.path.exists(os.path.join(d, 'units.json')):
                units = x
            if diben is None and has_source(x):
                diben = x
        if units or diben:
            break
    return units, diben


def body_stats(dept_slug, slug):
    base = os.path.join(ROOT, 'departments', dept_slug, slug, 'chapters')
    built = hanzi = 0
    if os.path.isdir(base):
        for ch in os.listdir(base):
            p = os.path.join(base, ch, 'docs', 'zh.md')
            if os.path.exists(p):
                built += 1
                hanzi += len(HANZI.findall(io.open(p, encoding='utf-8', errors='ignore').read()))
    return built, hanzi


rows = []
usage = {}   # 单元层目录被几门课引用：≥2 = 合成/派生
for dept in CUR['departments']:
    for sub in dept['subjects']:
        u1, _ = own_std(sub[0]); u2, _ = ref_std(dept['slug'], sub[0])
        name = u1 or u2
        if name:
            usage[name] = usage.get(name, 0) + 1

for dept in CUR['departments']:
    for sub in dept['subjects']:
        slug, title, sem, target = sub[0], sub[1], sub[4], sub[6]
        u1, d1 = own_std(slug)
        u2, d2 = ref_std(dept['slug'], slug)
        units_name, diben_name = u1 or u2, d1 or d2
        kind = source_kind(units_name) if units_name else None
        derived = (kind == 'derived') or (bool(units_name) and usage.get(units_name, 1) >= 2)
        external = (kind == 'external')
        built, hanzi = body_stats(dept['slug'], slug)
        has_diben, has_units, has_body = bool(diben_name) or external, bool(units_name), built > 0

        if derived and has_body:
            cls = 'E 派生/合成（无独立底本）'
        elif has_diben and has_units and has_body:
            cls = 'A 三层齐全'
        elif has_diben and not has_units and has_body:
            cls = 'B 有底本·无单元层'
        elif has_diben and has_units and not has_body:
            cls = 'C 有底本·无正文'
        elif (not has_diben) and has_units and has_body:
            cls = 'F 有单元层·底本未登记'
        elif (not has_diben) and (not has_units) and has_body:
            cls = 'G 手写正文·无底本无单元层'
        else:
            cls = 'D 无底本·无正文'

        notes = []
        gp = os.path.join(ROOT, 'departments', dept['slug'], slug, '缺口登记.md')
        if os.path.exists(gp):
            notes.append('有缺口登记')
        if has_diben and not has_units:
            notes.append('底本有、单元层缺（正文写在章代码里，不能现算）')
        if kind == 'derived':
            notes.append('派生/合成层，无教材底本')
        if external:
            notes.append('外源课：无教材，逐条引文见 补源登记.json')
        if not has_diben and not has_units:
            notes.append('两层皆无')
        if target and built < target:
            notes.append(f'章缺口 {target - built}')

        rows.append({
            '院系': dept.get('title') or dept['slug'], 'dept': dept['slug'],
            '学科': title, 'slug': slug, '学期': sem,
            '目标章': target or 0, '已建章': built, '章缺口': max(0, (target or 0) - built),
            '底本': ('—（派生）' if kind == 'derived' else ('外源（补源登记）' if external else (diben_name or '—'))), '单元层': units_name or '—',
            '中文正文汉字': hanzi, '类别': cls, '备注': '；'.join(notes),
        })

dept_rows = []
for d in CUR['departments']:
    rs = [r for r in rows if r['dept'] == d['slug']]
    get = lambda p: sum(1 for r in rs if r['类别'].startswith(p))
    dept_rows.append({
        '院系': d.get('title') or d['slug'], '学科数': len(rs),
        'A': get('A'), 'B': get('B'), 'C': get('C'), 'D': get('D'), 'E': get('E'), 'F': get('F'), 'G': get('G'),
        '目标章': sum(r['目标章'] for r in rs), '已建章': sum(r['已建章'] for r in rs),
        '章缺口': sum(r['章缺口'] for r in rs),
        '汉字': sum(r['中文正文汉字'] for r in rs),
        '缺底本学科': get('D') + get('E'),
        '缺单元层学科': get('B') + get('D'),
    })

out_dir = os.environ.get('GAP_OUT') or os.path.join(os.environ['USERPROFILE'], 'Desktop')
STAMP = os.environ.get('GAP_STAMP', '2026-11-09')
os.makedirs(out_dir, exist_ok=True)
csv_path = os.path.join(out_dir, '学科教材编写缺口清单-%s.csv' % STAMP)
fields = ['院系', '学科', 'slug', '学期', '目标章', '已建章', '章缺口', '底本', '单元层', '中文正文汉字', '类别', '备注']
with io.open(csv_path, 'w', encoding='utf-8-sig', newline='') as f:
    w = csv.DictWriter(f, fieldnames=fields, extrasaction='ignore')
    w.writeheader()
    for r in rows:
        w.writerow(r)

md = ['# 9 院系 · 学科教材编写缺口清单（%s）' % STAMP, '',
      '三层独立判定：**底本层**＝`standards/<x>/底本.json`；**单元层**＝`standards/<x>/units.json`（派生课按章代码引用解析到父课）；'
      '**正文层**＝`chapters/<章>/docs/zh.md` 在磁盘上存在。', '',
      '| 院系 | 学科 | A 教材底本+正文 | B 有底本无单元层 | C 有底本无正文 | D 无底本无正文 | E 派生/合成 | F 底本未登记 | G 手写 | 章缺口 |',
      '|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|']
for d in dept_rows:
    md.append(f"| {d['院系']} | {d['学科数']} | {d['A']} | {d['B']} | {d['C']} | {d['D']} | {d['E']} | {d['F']} | {d['G']} | {d['章缺口']} |")
md += ['', f"合计：{len(rows)} 学科 · 目标 {sum(d['目标章'] for d in dept_rows)} 章 · 已建 "
           f"{sum(d['已建章'] for d in dept_rows)} 章 · 章缺口 {sum(d['章缺口'] for d in dept_rows)} · "
           f"正文 {sum(d['汉字'] for d in dept_rows):,} 汉字", '']

md += ['## 一、真正缺教材的学科（D 类：无底本、无正文）', '']
drows = [r for r in rows if r['类别'].startswith('D')]
if drows:
    md += ['| 院系 | 学科 | 目标章 | 备注 |', '|---|---|--:|---|']
    for r in drows:
        md.append(f"| {r['院系']} | {r['学科']} | {r['目标章']} | {r['备注'] or '—'} |")
else:
    md.append('（无）')
md.append('')

md += ['## 二、有底本但无单元层（B 类：正文写在章代码里，不能由底本现算）', '']
brows = [r for r in rows if r['类别'].startswith('B')]
md += ['| 院系 | 学科 | 底本 | 已建章 | 汉字 |', '|---|---|---|--:|--:|']
for r in brows:
    md.append(f"| {r['院系']} | {r['学科']} | {r['底本']} | {r['已建章']} | {r['中文正文汉字']:,} |")
md.append('')

md += ['## 三、派生/合成课（E 类：无独立底本，逐字复用父课单元层）', '']
erows = [r for r in rows if r['类别'].startswith('E')]
md += ['| 院系 | 学科 | 单元层（父课） | 已建章 | 汉字 |', '|---|---|---|--:|--:|']
for r in erows:
    md.append(f"| {r['院系']} | {r['学科']} | {r['单元层']} | {r['已建章']} | {r['中文正文汉字']:,} |")
md.append('')

md_path = os.path.join(out_dir, '学科教材编写缺口清单-%s.md' % STAMP)
io.open(md_path, 'w', encoding='utf-8').write('\n'.join(md))

print('saved:', csv_path)
print('saved:', md_path)
for d in dept_rows:
    print(f"  {d['院系']:6s} 学科{d['学科数']:3d} A{d['A']:3d} B{d['B']:2d} C{d['C']:2d} D{d['D']:2d} E{d['E']:3d} F{d['F']:3d} G{d['G']:2d} 章缺口{d['章缺口']:3d} 汉字{d['汉字']:>9,}")
print('总计', len(rows), '学科 · 章缺口', sum(d['章缺口'] for d in dept_rows), '· D类', sum(d['D'] for d in dept_rows), '· B类', sum(d['B'] for d in dept_rows), '· E类', sum(d['E'] for d in dept_rows))
