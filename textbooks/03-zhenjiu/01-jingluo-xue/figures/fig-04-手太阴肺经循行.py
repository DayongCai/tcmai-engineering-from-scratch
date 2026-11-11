# -*- coding: utf-8 -*-
"""图 4-1 手太阴肺经 · 循行路线与属络

内容依据：textbooks/03-zhenjiu/01-jingluo-xue/03-第4章-手太阴肺经.md §4.1.1.1
  《灵枢·经脉》原文：「肺手太阴之脉，起于中焦，下络大肠，还循胃口，上膈属肺，
  从肺系横出腋下；行少阴、心主之前，下肘中，循臂内上骨下廉，入寸口，上鱼，
  循鱼际，出大指之端。」
  「其支者：从腕后，直出次指内廉，出其端。」

每一格都是原文的一个分句，顺序未改、未合并、未增补；括注取同节对
「胃口（贲门部）」「肺系（气管、喉咙）」「上骨（桡骨）」的释义。
本经走向「自胸走手」，属阴经，行上肢内侧前缘 —— 与 §1.2.2 走向规律一致。
"""

import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[3] / "scripts" / "figures"))

from flowchain import chain

chain(
    title="手太阴肺经 · 循行路线与属络（自胸走手）",
    steps=[
        ("起于中焦（胃脘部）", "inner"),
        ("下络大肠", "inner"),
        ("还循胃口（贲门部）", "inner"),
        ("上膈", "inner"),
        ("属肺", "inner"),
        ("从肺系横出腋下", "outer"),
        ("行少阴、心主之前", "outer"),
        ("下肘中", "outer"),
        ("循臂内上骨下廉", "outer"),
        ("入寸口", "outer"),
        ("上鱼，循鱼际", "outer"),
        ("出大指之端（少商）", "outer"),
        ("支者：从腕后分出", "branch"),
        ("直出次指内廉", "branch"),
        ("出其端，与手阳明大肠经相接", "joint"),
    ],
    per_row=4,
    width=8.4,
    legend={"inner": "体内联系", "outer": "体表路线", "branch": "支脉", "joint": "交接"},
)
