#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""一次性把补源层接进中医诊断学 04/05/06/12 四章（可重跑，已接过则跳过）。

为什么用脚本而不是手改四份 main.js：
  四处注入点结构一致（ROOT / doc / main() 末 / module.exports），脚本可控且不会漏章。
注入内容：
  1. SUPP 常量 + supplements(id) 读取器（读 standards/zhenduan/supplements/补源.json）
  2. main() 里在教学边界声明之前打印「教材缺口的外源补录」块
  3. module.exports 加 supplements
"""

import io
import os
import re

BASE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                    'departments', '01-zhongyi', '05-zhongyi-zhen-duan-xue', 'chapters')

CH = {
    '04-wenzhen-shengyin': {
        'gap': 'z3-qiwei-wu-chou',
        'block': """  const g = supplements('z3-qiwei-wu-chou');
  console.log(String.fromCharCode(10) + '── 教材缺口的外源补录（气味无分级）──');
  console.log('  教材 3.2 只有 ' + g.textbookSeen.subs.length + ' 小节 / ' + g.textbookSeen.items.length
    + ' 个段标题，覆盖 ' + g.textbookSeen.count + ' 个气源：' + g.textbookSeen.sources.join('、') + '；没有分级。');
  console.log('  外源 ' + g.locator + '：五臭各归一脏 —— '
    + g.entries.map((e) => e.chou + '(' + e.zang + ')').join('、'));
  console.log('  引用格式：' + g.citeAs + '（不是「底本」「原文」）');
""",
    },
    '05-wenzhen-wenjuan': {
        'gap': 'z2-shiwen-ba-jie',
        'block': """  const g = supplements('z2-shiwen-ba-jie');
  console.log(String.fromCharCode(10) + '── 教材缺口的外源补录（十问只到八节）──');
  console.log('  教材 4.2 有 ' + g.textbookSeen.count + ' 个小节；《景岳全書》十問篇正文也是 '
    + g.heads.length + ' 问：' + g.heads.join('/') + '。');
  console.log('  十問歌：' + g.entries[0].text);
  const only = (g.songOnly || []).map((x) => x.num + '（' + x.keyword + '）').join('、');
  console.log('  歌诀点名但两书都没有问答段的：' + (only || '无') + ' —— 教材没漏抄，景岳原书亦只到八问。');
  console.log('  引用格式：' + g.citeAs + '（不是「底本」「原文」）');
""",
    },
    '06-qiezhen-maixiang': {
        'gap': 'z1-mai-ming-que-huan',
        'block': """  const g = supplements('z1-mai-ming-que-huan');
  console.log(String.fromCharCode(10) + '── 教材缺口的外源补录（标题漏「缓」）──');
  console.log('  教材 5.1.2：标题 ' + g.textbookSeen.titleCount + ' 名 / 正文 ' + g.textbookSeen.bodyCount
    + ' 名；只在前者缺席的是「' + g.textbookSeen.onlyInBody.join('、') + '」。');
  const cmp = g.comparison;
  console.log('  外源 ' + g.locator + '：' + cmp.maijingCount + ' 種，与教材同名 ' + cmp.inBoth.length
    + ' 名（软≡濡），教材多出 ' + cmp.onlyTextbook.join('、') + '。');
  const huan = g.entries.find((e) => e.name === '緩脈');
  console.log('  緩脈原文：' + huan.text);
  console.log('  引用格式：' + g.citeAs.replace('%d', '19') + '（不是「底本」「原文」）');
""",
    },
    '12-zhenduan-wucha': {
        'gap': 'z4-wucha-lu',
        'block': """  const g = supplements('z4-wucha-lu');
  console.log(String.fromCharCode(10) + '── 教材缺口：误差率（拒补）──');
  console.log('  教材有名称无数值：' + g.evidence.namesOnly.join('、') + '；全书百分号出现 '
    + g.evidence.percentInTextbook + ' 次。');
  console.log('  拒补理由：' + g.reason);
  console.log('  替代口径：' + g.alternative);
""",
    },
}

READER = """
const SUPP = path.join(ROOT, 'standards', 'zhenduan', 'supplements', '补源.json');

/** 读补源层：教材缺什么、外源补在哪。返回该章对应的那一处缺口。 */
function supplements(id) {
  const d = JSON.parse(fs.readFileSync(SUPP, 'utf8'));
  const g = d.gaps.find((x) => x.id === id);
  if (!g) throw new Error('补源层里没有 ' + id);
  return g;
}
"""


def wire(name, cfg):
    p = os.path.join(BASE, name, 'code', 'main.js')
    s = io.open(p, encoding='utf-8').read()
    if 'function supplements(' in s:
        print('  %-22s 已接过，跳过' % name)
        return False

    # 1) 读入器：插在 ch 定义之后（各章都有 const ch = ... 或 BOOK = JSON.parse）
    anchor = None
    for pat in [r"const ch = doc\.chapters\.find\(\(c\) => c\.no === '[^']+'\);\n",
                r"const ch = doc\.chapters\.find\(\(c\) => c\.no === CH_NO\);\n",
                r"const chapter = \(no\) => BOOK\.chapters\.find\(\(c\) => c\.no === no\);\n",
                r"const BOOK = JSON\.parse\(fs\.readFileSync\(path\.join\(ROOT, 'standards', 'zhenduan', '底本\.json'\), 'utf8'\)\);\n"]:
        m = re.search(pat, s)
        if m:
            anchor = m.end()
            break
    if anchor is None:
        raise SystemExit('%s: 找不到插入读入器的锚点' % name)
    s = s[:anchor] + READER + s[anchor:]

    # 2) main() 里：教学边界声明之前插入补录块
    lines = s.split('\n')
    idx = next((i for i, l in enumerate(lines) if "console.log('教学边界" in l), None)
    if idx is None:
        raise SystemExit('%s: 找不到教学边界行' % name)
    lines.insert(idx, cfg['block'].rstrip('\n'))
    s = '\n'.join(lines)

    # 3) 导出
    s = re.sub(r"module\.exports = \{(.*?)\};",
               lambda m: "module.exports = {" + m.group(1).rstrip() + ('' if m.group(1).rstrip().endswith(',') else '')
               + (', supplements };' if not m.group(1).rstrip().endswith(',') else ' supplements };'),
               s, count=1, flags=re.S)
    io.open(p, 'w', encoding='utf-8').write(s)
    print('  %-22s 已接入 %s' % (name, cfg['gap']))
    return True


def main():
    print('═══ 接入补源层 ═══')
    n = 0
    for name, cfg in CH.items():
        n += 1 if wire(name, cfg) else 0
    print('  改动 %d 章' % n)


if __name__ == '__main__':
    main()
