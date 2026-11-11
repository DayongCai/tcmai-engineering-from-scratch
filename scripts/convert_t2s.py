#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""scripts/convert_t2s.py —— 繁體 → 简体 字形转换（opencc t2s）

为什么单独一个脚本：外源古籍是繁體，教材正文要求简体；但**转换只允许动字形，不许动字词**，
所以用 opencc 的 t2s（非 tw2sp，不做地区词替换），并保留繁體原文一并留档，
任何人可以 `python scripts/convert_t2s.py < source.txt` 复算。

依赖：pip install opencc-python-reimplemented（本机已装；缺失时明确报错，不静默跳过）

用法：
  python scripts/convert_t2s.py < in.txt > out.txt
  python scripts/convert_t2s.py --check        # 只测依赖与自检
"""

import sys

try:
    import opencc  # noqa: F401
except ImportError:  # pragma: no cover
    sys.stderr.write(
        '缺依赖 opencc：pip install opencc-python-reimplemented -i https://mirrors.aliyun.com/pypi/simple/\n'
    )
    sys.exit(2)

CONVERTER = opencc.OpenCC('t2s')

PROBES = [
    ('醫宗金鑑', '医宗金鉴'),
    ('正骨心法要旨', '正骨心法要旨'),
    ('骨斷筋傷', '骨断筋伤'),
]


def main():
    if '--check' in sys.argv[1:]:
        bad = [(a, CONVERTER.convert(a), b) for a, b in PROBES if CONVERTER.convert(a) != b]
        if bad:
            for a, got, want in bad:
                sys.stderr.write(f'✗ {a} → {got}（期望 {want}）\n')
            return 1
        print('✓ opencc t2s 可用，三个探针均按字形转换')
        return 0

    data = sys.stdin.buffer.read().decode('utf-8')
    sys.stdout.buffer.write(CONVERTER.convert(data).encode('utf-8'))
    return 0


if __name__ == '__main__':
    sys.exit(main())
