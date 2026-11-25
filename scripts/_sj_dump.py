import json, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
d = json.load(open(os.path.join(ROOT, 'standards/zhongyao-shijian/units.json'), encoding='utf-8'))
out = os.path.join(ROOT, 'scripts', '_sj_units')
os.makedirs(out, exist_ok=True)
byc = {}
for u in d['units']:
    byc.setdefault(u['chapter'], []).append(u)
for ch, us in byc.items():
    p = os.path.join(out, f'ch{ch}.txt')
    with open(p, 'w', encoding='utf-8') as f:
        for u in us:
            f.write(f"=== {u['sub']} {u['title']} | locator={u['locator']} | hanzi={u['hanzi']}\n")
            f.write(f"BRIEF: {u['brief']}\n")
            f.write('BODY:\n' + u['rawBody'] + '\n\n')
    print(p, sum(x['hanzi'] for x in us))
