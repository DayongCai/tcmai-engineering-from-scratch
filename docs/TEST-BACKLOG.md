# 测试失败清单与归类（2026-11-27）

> 生成方式：`bash scratch/scan_suites.sh`，逐个套件实跑，记录 `rc` 与首条错误。
> 背景：`npm run check`（100+ 道门）全绿，但 `npm test`（80 个套件）仍有失败。
> 两者覆盖不同：check 走 `audit_curriculum` 契约层，npm test 里有一批**单科专用套件**，
> 它们把旧版正文的形状（章数、字数、关键词、末行文案）写死在断言里。

## 一、已修（本轮）

| 套件 | 病根 | 改法 | 结果 |
|---|---|---|---|
| test_bingli_chapters | 只读 `explanation` | 双读 `explain \|\| explanation` | 14/0 |
| test_fangji_chapters | 同上 | 同上 | 9/0 |
| test_shengli_chapters | 同上 | 同上 | 12/0 |
| test_binglishengli_chapters | 同上 | 同上 | 3/0 |
| test_zhongyao_chapters | 章号区间正则过窄；14 章缺「教学边界」四字 | 正则放宽到 `第\d+(?:[–—-]\d+)?章`；14 章末行加标签 | 4 fail → 2 fail |

**这一类不是「题变差」，是读法落后于数据**：新题写 `explain`（全库 11,233 处），旧题写
`explanation`（2,688 处），门 `check_chapter_exercises.js` 早已双读，8 个套件没跟上。

## 二、待处理：三类，处理方式不同

### 已修（2026-11-27 当天收口）

| 套件 | 修法 | 性质 |
|---|---|---|
| test_bingli / fangji / shengli / binglishengli_chapters | 解析字段双读 `explain \|\| explanation`（新题写 explain，旧套件只读 explanation） | 判据过期 |
| test_curriculum_contract #12 | 40 章免责声明补「不构成…依据」 | 内容缺口 |
| test_knowledge_tree | 数文件时排除派生目录 `00-目录-四级编码.md` | 判据过期 |
| test_zhongyao_chapters（4→2 项） | 章号区间正则 + 14 章「教学边界」措辞 + 14 章教材字数 | 判据 + 内容 |
| test_jingui_chapters | 一处**拼接引文**改逐字原句；引文比较加异体折叠（著→着） | **内容真错** |
| test_jichu_supplements | 4 章补「外源补录」节（44 条，照抄台账） | 内容缺口 |

### 一条教训：自指数字不要写进正文

给中基 10 章加「规模：N 节 / M 汉字」后，**行内汉字数当场失真**——写入这一行本身让字数变了
（与 05-中药鉴定 08/09/10 章「单元 4 · 汉字 11243」同一个坑）。已全部撤回。
要写就写「由脚本现场打印」，或让产物只报不写回正文。

### A. 判据过期（测试写死了旧形状、可改测试）

| 套件 | 首条错误 | 说明 |
|---|---|---|
| test_knowledge_tree | `期望 11 个，得到 12: …00-目录-四级编码.md` | 四级目录是后来新增的派生文件，套件仍按「10 章 + 前言」数 |
| test_curriculum_contract #12 | `已建章节的 docs/zh.md 含四个必备关键词` | 关键词表是旧写作模板；新正文换了论证结构 |
| test_site_artifacts #3 | `content.js 里每个章节都带齐 html / code / quiz / outputs` | 派生文件过期或字段改名，需核 `site/build.js` 输出 |

### B. 内容缺口（要补正文，不能改测试）

| 套件 | 首条错误 | 性质 |
|---|---|---|
| test_jingui_chapters | `脉数……反吐者，胃中虚冷… → 缺「反吐者胃中虚冷」` | 正文引文用省略号截断，测试要求底本原句逐字 |
| test_jichu_supplements #11 | `落点章真实存在，且 docs 引到「外源·笈成·」` | 补源登记了、正文没引到 |
| test_content_review（咨询性） | `经典引文必须写到篇名级别`；`每章必须出现临床免责/边界声明` | 内容规则，非阻塞 |

### C. 口径冲突（必须先定规则，不能凑数）

| 套件 | 冲突 |
|---|---|
| test_zhongyao_chapters #4 | 测试的 `MAP` 认为 12 章只映射教材第 5 章（2,126）；正文引第 5–8 章（5,038） |
| test_zhongyao_chapters #2 | 正文标注「教材·第N章」的行里，引语在底本查不到逐字匹配 |
| test_zhenduan_chapters #4 | 每章要报教材规模，docs 与两份产物不一致 |
| test_jichu_chapters #5 | prompt/skill 里的规模数字在 docs 找不到同值 |
| test_dashboard | KPI「扫描 md」11,689 vs check_links 11,755（两处各数一份） |

**建议**：把「课程章 → 教材章」映射落成数据文件（如 `standards/<slug>/chapter-map.json`），
正文的出处行与测试的 MAP 都从它取数。否则今天调平、下次重写正文又会分叉。

### D. 未定性

| 套件 | 现象 |
|---|---|
| test_textbooks_source | 12 通过 / 1 失败（失败项待逐条读） |
| test_math_render #3 | `渲染器没有遇到任何未知命令` —— 正文用了渲染器不支持的 LaTeX 命令 |
| test_site_render #16 | `[chapter] 图形挂载点在正文里被渲染为可挂载的 div` |
| test_chapter_code | 638 秒后失败，需单独跑定位（2169 章逐章执行） |

## 三、口径

- 本清单只记录**现象与归类**，不改任何断言与内容；每条都可用上面的套件名复现。
- 「门全绿 ≠ 全绿」：`npm run check` 通过不代表 `npm test` 通过，发版前两者都要看。
- 归类为 A 的（判据过期）改测试；B 的（内容缺口）补正文；C 的（口径冲突）先定规则。
  三类混在一起改，会把「内容没写」伪装成「判据太严」。
