# -*- coding: utf-8 -*-
"""把 data/kt-sphere.json 注入模版，生成桌面 HTML（单文件、离线可开）。"""
import io, json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
tpl = io.open(os.path.join(ROOT, 'assets', 'kt-sphere.template.html'), encoding='utf-8').read()
data = io.open(os.path.join(ROOT, 'data', 'kt-sphere.json'), encoding='utf-8').read()

# 防止把 </script> 提前闭合
payload = data.replace('</', '<\\/')
html = tpl.replace('__DATA__', payload)

out = os.path.join(os.environ['USERPROFILE'], 'Desktop', '中医药领域知识树-语义张量球面.html')
io.open(out, 'w', encoding='utf-8').write(html)
print('saved', out, round(os.path.getsize(out)/1024), 'KB')
