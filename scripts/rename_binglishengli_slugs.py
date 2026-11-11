#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""scripts/rename_binglishengli_slugs.py —— 把病理生理学章 slug 重算成整词版本

第一版 slug 按 [:52] 硬切，切出过 `…-trauma-infectio`、`…-hypothalamic-pituita`
这类半截词。本脚本从讲义题名重算 slug（整词截断），并把目录、outputs 文件名、
章内文本里的旧 slug 一起改掉，保持三者一致。

用法：python scripts/rename_binglishengli_slugs.py [--write]
"""
import io
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SUB = os.path.join(ROOT, 'departments/09-jichu/11-bingli-shengli-xue')
sys.path.insert(0, os.path.join(ROOT, 'scripts'))

spec = __import__('importlib.util').util.spec_from_file_location(
    'plan', os.path.join(ROOT, 'scripts/plan_binglishengli_53.py'))
plan = __import__('importlib.util').util.module_from_spec(spec)
spec.loader.exec_module(plan)


def main():
    write = '--write' in sys.argv
    idx = json.load(io.open(os.path.join(
        ROOT, 'standards/binglishengli/supplements/jiangyi.json'), encoding='utf-8'))
    full = {int(c['no']): c['title'] for u in idx['units'] for c in u['chapters']}

    cj = os.path.join(SUB, 'chapters.json')
    doc = json.load(io.open(cj, encoding='utf-8'))
    changes = []
    for c in doc['chapters']:
        new = plan.slug_of(c['n'], full[c['n']])
        if new != c['slug']:
            changes.append((c['n'], c['slug'], new))

    for n, old, new in changes:
        print('%2d  %s\n    -> %s' % (n, old, new))
    if not write:
        print('\n（未写入；加 --write 落地）')
        return

    for n, old, new in changes:
        old_dir = os.path.join(SUB, 'chapters', old)
        new_dir = os.path.join(SUB, 'chapters', new)
        if os.path.isdir(old_dir):
            os.rename(old_dir, new_dir)
        # outputs 文件名带 slug
        od = os.path.join(new_dir, 'outputs')
        if os.path.isdir(od):
            for f in os.listdir(od):
                if old in f:
                    os.rename(os.path.join(od, f), os.path.join(od, f.replace(old, new)))
        # 章内文本引用（docs 的「运行与验证」里有 prompt-/skill- 文件名）
        for dirpath, _, files in os.walk(new_dir):
            for f in files:
                if not f.endswith(('.md', '.js', '.json')):
                    continue
                p = os.path.join(dirpath, f)
                s = io.open(p, encoding='utf-8', errors='surrogateescape').read()
                if old in s:
                    io.open(p, 'w', encoding='utf-8', newline=os.linesep).write(s.replace(old, new))
        for c in doc['chapters']:
            if c['n'] == n:
                c['slug'] = new

    io.open(cj, 'w', encoding='utf-8', newline='\n').write(
        json.dumps(doc, ensure_ascii=False, indent=2) + '\n')
    print('\n改名 %d 章完成' % len(changes))


if __name__ == '__main__':
    main()
