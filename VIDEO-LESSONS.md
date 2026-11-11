# 188 门学科 · 网络视频教案台账

> 由 `node scripts/build_video_lessons.js` 生成，逐份实测语料后落账。

| 指标 | 值 |
|---|---|
| 学科 | 189 |
| 有网络视频/音频语料 | **8** |
| 无（缺口） | **181** |
| 讲次合计 | 428 |
| 逐句语句合计 | 177,254 |
| 时长合计 | 165.1 小时 |

## 一、有语料的学科

| 学科 | 院系 | 学期 | 状态 | 讲 | 语句 | 时长 | 教案 |
|---|---|--:|---|--:|--:|--:|---|
| 中医基础理论 | 01-zhongyi | 1 | platform | 10 | — | 0.8h | [教案](departments/01-zhongyi/01-zhongyi-jichu-lilun/video/教案.md) |
| 内经选读 | 01-zhongyi | 3 | lectures | 196 | 160078 | 90.0h | [教案](departments/01-zhongyi/06-neijing-xuandu/video/教案.md) |
| 伤寒论 | 01-zhongyi | 4 | lectures | 53 | 3774 | 23.3h | [教案](departments/01-zhongyi/07-shanghanlun/video/教案.md) |
| 金匮要略 | 01-zhongyi | 5 | platform | 24 | — | 5.7h | [教案](departments/01-zhongyi/08-jingui-yaolue/video/教案.md) |
| 中医内科学 | 01-zhongyi | 5 | platform | 14 | — | 4.6h | [教案](departments/01-zhongyi/10-zhongyi-neike-xue/video/教案.md) |
| 医学人工智能导论 | 07-zhineng | 3 | lectures | 29 | 13402 | 0.0h | [教案](departments/07-zhineng/01-yixue-rengong-zhineng-daolun/video/教案.md) |
| 病理生理学 | 09-jichu | 4 | platform | 53 | — | 22.6h | [教案](departments/09-jichu/11-bingli-shengli-xue/video/教案.md) |
| 药理学 | 09-jichu | 4 | platform | 49 | — | 18.0h | [教案](departments/09-jichu/12-yaoli-xue/video/教案.md) |

## 二、缺口（按院系）

| 院系 | 学科数 | 有语料 | 缺 |
|---|--:|--:|--:|
| 01-zhongyi | 23 | 5 | 18 |
| 02-zhongyao | 21 | 0 | 21 |
| 03-zhenjiu | 22 | 0 | 22 |
| 04-gushang | 17 | 0 | 17 |
| 05-huli | 27 | 0 | 27 |
| 06-guanli | 26 | 0 | 26 |
| 07-zhineng | 19 | 1 | 18 |
| 08-wuguan | 17 | 0 | 17 |
| 09-jichu | 17 | 2 | 15 |

## 三、语料里有、课里没有的

| 目录 | 形态 |
|---|---|
| `standards/materials/chenruchun-shanghan` | other |
| `standards/materials/leijing-tuyi` | text/subtitle |
| `standards/materials/n-lectures` | other |
| `standards/materials/neijing-quanwen` | text/subtitle |
| `standards/materials/neijing-yuyi` | text/subtitle |
| `standards/materials/neiyin-qiqing` | text/subtitle |
| `standards/materials/shanghan-jiagou` | text/subtitle |
| `standards/materials/shanghan-qilv` | other |
| `standards/materials/tcmscheme` | text/subtitle |
| `standards/materials/textbooks-batch` | other |
| `standards/materials/waiyin-liuyin` | text/subtitle |

> 这些多是**文本底本**（全文/讲义/图谱），不是视频课，所以不进台账；但一个都不许静默丢，故全部列在这里。

## 四、补源约定（怎么把一门空缺的课补进台账）

bilibili 的搜索 API 对本机返回 412（风控），**不能**批量抓；页面本身可达。所以补源只能一门一门来，且必须按这条链：

1. 人给 **视频页/合集页 URL**（或本地已存的页面 HTML）；
2. 落 `standards/materials/<slug>/sources/`：页面 HTML 原样 + `episodes.json`（讲号/BV/标题/页面标注时长）；
3. 记 `source-map.json`：URL、抓取日期、sha256、封面数；
4. 在 `scripts/build_video_lessons.js` 的 `SOURCES` 里挂到学科，重跑 `npm run video:lessons`；
5. 讲数、时长与页面标注差 > 5s 要当错误处理（防止把别的视频当成某讲——陈瑞春那门就是这么抓出来的）。

> 不接受「搜索到一个看起来像的合集就写进去」：没留档、没 sha256、没逐讲对时长，就是注水。
