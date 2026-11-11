# -*- coding: utf-8 -*-
"""为「知识树语义张量·三维极坐标球面」准备真实数据。

要点：派生/合成课没有自己的 standards 目录，其 code/main.js 读的是父课的 units.json，
因此「学科 → 单元层目录」按两级解析：① 自己的 standards/<slug>；② code/main.js 里引用的 standards/<x>。
点（points）按 (单元层目录, 章号) 去重，避免同一教材章被多门派生课重复计入。

产出 data/kt-sphere.json；数字全部来自 units.json 与 学派库.json。
"""
import io, json, os, re, unicodedata
from collections import defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CUR = json.load(io.open(os.path.join(ROOT, 'curriculum.json'), encoding='utf-8'))
SCHOOLS = json.load(io.open(os.path.join(ROOT, 'standards/gejia/学派库.json'), encoding='utf-8'))['schools']

STD_REF = re.compile(r'standards/([A-Za-z0-9_\-]+)/units\.json')

# 课程 slug 与底本目录不同名的情况（底本目录按书名起，不按课程名）：
# 07-shanghanlun 的 units 在 standards/shanghan，08-jingui-yaolue 在 standards/jingui，
# 09-wenbing-xue 在 standards/wenbing。不登记这三条，这三门课就永远显示「单元 0」。
STD_ALIAS = {
    'shanghanlun': 'shanghan',
    'jingui-yaolue': 'jingui',
    'wenbing-xue': 'wenbing',
    # 同一类坑（2026-11-10 复查补上）：底本目录按教材/书名起，不按课程 slug 起。
    # 不补这三条，中医内科学 384 单元、中药学 340 单元、病理生理学 216 单元就是隐形的。
    'zhongyi-neike-xue': 'neike',
    'zhongyaoxue': 'zhongyao-xue',
    'bingli-shengli-xue': 'binglishengli',
    # 汇通期：课程名带「选读」，底本目录按书名起（zhongcan-xilu）。不补这条，534 单元挂不上课。
    'zhongcan-xilu-xuandu': 'zhongcan-xilu',
}


def own_std(slug):
    bare = re.sub(r'^\d{2}-', '', slug)
    for name in (slug, bare, STD_ALIAS.get(bare)):
        if name and os.path.exists(os.path.join(ROOT, 'standards', name, 'units.json')):
            return name
    return None


def ref_std(dept_slug, slug):
    """章代码在 chapters/<章>/code/main.js，代理层会引用 standards/<x>/units.json 或直接拼路径。"""
    base = os.path.join(ROOT, 'departments', dept_slug, slug, 'chapters')
    if not os.path.isdir(base):
        return None
    tally = {}
    for ch in sorted(os.listdir(base)):
        p = os.path.join(base, ch, 'code', 'main.js')
        if not os.path.exists(p):
            continue
        txt = io.open(p, encoding='utf-8', errors='ignore').read()
        for m in STD_REF.finditer(txt):
            name = m.group(1)
            if os.path.exists(os.path.join(ROOT, 'standards', name, 'units.json')):
                tally[name] = tally.get(name, 0) + 1
        if tally:
            break
    return max(tally, key=tally.get) if tally else None


def _is_han(ch: str) -> bool:
    r"""汉字口径：按 Unicode 块名判定。

    只用 [\u4e00-\u9fff] 会漏掉扩展区（内经选读实测少 132 字 / 13.6 万字），
    与 build_neijing_text.py、前端 \p{Script=Han} 同口径。
    """
    return unicodedata.name(ch, '').startswith('CJK UNIFIED IDEOGRAPH')


CACHE = {}


def load_units(name):
    if name in CACHE:
        return CACHE[name]
    U = json.load(io.open(os.path.join(ROOT, 'standards', name, 'units.json'), encoding='utf-8'))
    per = defaultdict(lambda: {'units': 0, 'hanzi': 0})
    text = []
    for u in U.get('units', []):
        c = int(u.get('chapter') or 0)
        body = u.get('body') or ''
        hz = sum(1 for ch in body if _is_han(ch))
        per[c]['units'] += 1
        per[c]['hanzi'] += hz
        text.append(body)
    CACHE[name] = (per, ''.join(text), len(U.get('units', [])))
    return CACHE[name]


school_terms = [(s['key'], s['name'], s['terms']) for s in SCHOOLS]

# 典籍底本不是"某学派著作"：拿学派词频去判《伤寒论》《金匮》《温病》，得到的是
# 「攻邪学派」（汗/吐/下三法在条文里高频），这是文本亲和度，不是源流，且会被球面
# 配色渲染成事实。这三门的学派一律记 none，schoolHits 照旧保留可查。
CLASSIC_STDS = {'shanghan', 'jingui', 'wenbing'}
subjects = []
points_seen = set()
points = []

for di, dept in enumerate(CUR['departments']):
    for sub in dept['subjects']:
        slug, title, sem, chapters = sub[0], sub[1], sub[4], sub[6]
        name = own_std(slug) or ref_std(dept['slug'], slug)
        units_n = hanzi_n = 0
        top_key, top_hit = 'none', 0
        if name:
            per, text, total_units = load_units(name)
            units_n = sum(v['units'] for v in per.values())
            hanzi_n = sum(v['hanzi'] for v in per.values())
            hits = {k: sum(text.count(t) for t in terms) for k, _, terms in school_terms}
            best = max(hits.items(), key=lambda kv: kv[1])
            if best[1] >= 60:
                if name in CLASSIC_STDS:
                    # 记下亲和度分数，但不给学派名——经典底本不属于任何一家
                    top_key, top_hit = 'none', best[1]
                else:
                    top_key, top_hit = best[0], best[1]
            idx = len(subjects)
            for c in sorted(per):
                key = (name, c)
                if key in points_seen:
                    continue
                points_seen.add(key)
                points.append({'s': idx, 'c': c, 'u': per[c]['units'], 'h': per[c]['hanzi'], 'src': name})
        idx = len(subjects)
        subjects.append({
            'i': idx, 'd': di, 'slug': slug, 'title': title, 'sem': sem or 0,
            'chapters': chapters or 0, 'units': units_n, 'hanzi': hanzi_n,
            'std': name or '', 'school': top_key, 'schoolHits': top_hit,
        })

# 未挂课底本：有 units.json、却没有任何学科解析到它。这类目录会让整门课静默显示「单元 0」，
# 2026-11-10 就靠这条查出中医内科学/中药学/病理生理学三门（940 单元）在统计里隐形。
_used = {s['std'] for s in subjects if s['std']}
_fingerprint = {}
for _name in sorted(os.listdir(os.path.join(ROOT, 'standards'))):
    _up = os.path.join(ROOT, 'standards', _name, 'units.json')
    if not os.path.isfile(_up):
        continue
    try:
        _u = json.load(io.open(_up, encoding='utf-8'))
    except Exception:
        continue
    _c = _u.get('counts') or {}
    if not _c.get('units'):
        continue
    _src = _u.get('source')
    _v = _src.get('file') if isinstance(_src, dict) else _src
    _src_file = (str(_v) if _v else '')[:80]
    _key = (json.dumps(_c, ensure_ascii=False, sort_keys=True), _src_file)
    _fingerprint.setdefault(_key, []).append(_name)
unmapped, duplicate_dirs = [], []
for _key, _names in _fingerprint.items():
    _names = sorted(_names)
    if len(_names) > 1:
        duplicate_dirs.append({'dirs': _names, 'note': '字节级同源副本（同一 counts 与 source.file）'})
    for _n in _names:
        if _n in _used or _n.startswith('_'):
            continue
        if len(_names) > 1 and any(x in _used for x in _names):
            continue  # 副本本身不算未挂课
        _u = json.load(io.open(os.path.join(ROOT, 'standards', _n, 'units.json'), encoding='utf-8'))
        unmapped.append({'dir': _n, 'units': (_u.get('counts') or {}).get('units', 0)})
if unmapped:
    print('⚠ 未挂课底本（有 units 但无学科解析到）：', ', '.join(f"{u['dir']}({u['units']})" for u in unmapped))

# 章题跨学科重名（去重风险的真实口径）：一门课的章标题被几门课共用
def norm_title(t):
    t = re.sub(r'^[\d\.\s　]+', '', t or '')
    return re.sub(r'[（(].*?[)）]', '', t).strip()

chapter_titles = {}
for dept in CUR['departments']:
    for sub in dept['subjects']:
        p = os.path.join(ROOT, 'departments', dept['slug'], sub[0], 'chapters.json')
        if not os.path.exists(p):
            continue
        try:
            C = json.load(io.open(p, encoding='utf-8'))
        except Exception:
            continue
        chapter_titles[(dept['slug'], sub[0])] = [norm_title(c.get('title', '')) for c in C.get('chapters', [])]

title_count = defaultdict(int)
for titles in chapter_titles.values():
    for t in set(titles):
        if t:
            title_count[t] += 1

dup_titles = {k: v for k, v in title_count.items() if v > 1}
for s in subjects:
    titles = [t for t in set(chapter_titles.get((CUR['departments'][s['d']]['slug'], s['slug']), [])) if t]
    s['dupMax'] = max([title_count[t] for t in titles] or [1])
    s['dupCount'] = sum(1 for t in titles if title_count[t] > 1)
    top = sorted(((title_count[t], t) for t in titles), reverse=True)
    s['dupTop'] = top[0][1] if top else ''

data = {
    'generated': 'scripts/build_kt_sphere_data.py',
    'note': ('数字取自 standards/<学科>/units.json（派生课按 code/main.js 引用解析到父课单元层）与 standards/gejia/学派库.json；'
             '学派归属=该学科正文对学派术语的命中次数，阈值 60，低于阈值记 none；points 按(单元层,章号)去重。'),
    'depts': [{'slug': d['slug'], 'title': d.get('title') or d['slug'], 'subjects': len(d['subjects'])} for d in CUR['departments']],
    'schools': [{'key': s['key'], 'name': s['name'], 'dynasty': s['dynasty'], 'claim': s['claim']} for s in SCHOOLS],
    'subjects': subjects,
    'points': points,
    'dupTitles': dup_titles,
    'dupStats': {
        'distinctTitles': len(title_count),
        'sharedTitles': len(dup_titles),
        'maxShared': max(dup_titles.values()) if dup_titles else 1,
        'topTitles': sorted(((v, k) for k, v in dup_titles.items()), reverse=True)[:6],
        'hotSubjects': sum(1 for s in subjects if s.get('dupMax', 1) >= 2),
    },
    'unmapped': unmapped,
    'duplicateDirs': duplicate_dirs,
    'totals': {
        'depts': len(CUR['departments']),
        'subjects': len(subjects),
        'withUnits': sum(1 for s in subjects if s['units']),
        'chapters': len(points),
        'units': sum(s['units'] for s in subjects),
        'hanzi': sum(s['hanzi'] for s in subjects),
        'dedupChapters': len(points),
    },
}

out = os.path.join(ROOT, 'data', 'kt-sphere.json')
os.makedirs(os.path.dirname(out), exist_ok=True)
json.dump(data, io.open(out, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('saved', out, round(os.path.getsize(out) / 1024), 'KB')
print(data['totals'])
print('主导学派分布:', {k: sum(1 for s in subjects if s['school'] == k) for k in [x['key'] for x in SCHOOLS] + ['none']})
