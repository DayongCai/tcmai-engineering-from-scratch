# 附录 C · 把辞典接进程序：数据形状、查询、CI

> 这一附录是给「百姓应用 APP」的数据层准备的：你要用的不是 Markdown，是三个 JSON。

## C.1 三个数据文件

| 文件 | 形状 | 用途 |
|---|---|---|
| `standards/zhenghou-cidian/结构.json` | 四级树 + 校对差异 | 目录树、码表、回查页码 |
| `standards/zhenghou-cidian/张量.json` | 稀疏计数 + 两张切片 | 相似度、推荐、可视化 |
| `standards/zhenghou-cidian/语素-{位,性,态}.json` | 词表 | 命名生成、释义合成、术语归一 |

## C.2 一条记录长什么样

```json
{
  "full": "M01-L01-Z01",           // 四级全码（门-类-证）
  "code": "L01-Z01",               // 书内原码（不改）
  "zh": "肺卫风寒证",
  "men": "M01", "lei": "L01",      // 父链：唯一归属
  "wei": "肺卫",                    // 位轴取值
  "declareHou": 25,                 // 书内声明候数
  "page": "85",                     // 目录页（606 页之后书签失效记 -1）
  "houList": [ {"full": "M01-L01-Z01-H001", "zh": "卫气失宣候", "wei": "卫气", "tai": "失宣"} ]
}
```

## C.3 三个查询（无需数据库）

```bash
# 1) 按全码取一条证及其全部候
node scripts/zhenghou_query.js M01-L01-Z01

# 2) 按证名模糊查（含候名）
node scripts/zhenghou_query.js 肺卫风寒

# 3) 按张量坐标取候选：位=肺卫，态=失宣
node scripts/zhenghou_query.js --wei 肺卫 --tai 失宣

# 4) 四诊 → 候选证（/encode 的参考实现，见附录 E）
node scripts/zhenghou_encode.js --ctx "恶寒重 无汗 脉浮紧"
```

## C.4 APP 侧建议的三个接口

| 接口 | 输入 | 输出 | 为什么这样切 |
|---|---|---|---|
| `/unit/{full}` | 全码 | 证 + 候 + 见症 + 治法 + 方 | 详情页 |
| `/search?q=` | 自由词 | 候选证候（按同名 > 同候 > 同位排序） | 搜索框 |
| `/near?wei=&tai=` | 位/态 | 若干证候 + 张量距离 | 鉴别与相似推荐 |

## C.5 CI：这本辞典怎么保证不烂掉

| 门 | 命令 | 挡什么 |
|---|---|---|
| 生成物一致 | `python scripts/build_zhenghou_cidian.py --check` | 有人手改了正文却没改底本，或反之 |
| 章契约 | `node scripts/audit_curriculum.js` | 12 章缺 docs/quiz/outputs、篇幅不足 |
| 章代码 | `node tests/test_chapter_code.js` | 每章的 main.js 跑不通、测试空跑 |
| 插图出处 | `node scripts/figures/check_provenance.js` | 图里的话在正文里找不到 |

全部由 `npm run check` 串起来 —— 也就是说，这本辞典的每一次修改都必须过一遍上面四道。

**免责声明**：上述接口与命令是数据层的工程说明，不含任何诊疗逻辑；任何面向患者的输出都需要医生端复核。
