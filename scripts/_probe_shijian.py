import json, re, sys, os, glob
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def hz(t): return len(re.findall(r'[\u4e00-\u9fa5]', t))

def scan(subject):
    d = os.path.join(ROOT, 'departments', '02-zhongyao', subject, 'chapters')
    for c in sorted(os.listdir(d)):
        p = os.path.join(d, c, 'docs', 'zh.md')
        if not os.path.exists(p): continue
        t = open(p, encoding='utf-8').read()
        h1 = re.findall(r'^#\s+(.+)$', t, re.M)
        secs = re.findall(r'^##\s+(.+)$', t, re.M)
        flags = []
        for pat in ['三辨', '四位面', '单元规模', '逐单元读', '本章实测', '这一章要回答什么']:
            if pat in t: flags.append(pat)
        print(f"{c}\t{hz(t)}\tsections={len(secs)}\tflags={flags}\tH1={h1[:1]}")
        for s in secs: print('    ##', s)

if __name__ == '__main__':
    scan(sys.argv[1] if len(sys.argv) > 1 else '18-yaoshi-guanli-xue')
