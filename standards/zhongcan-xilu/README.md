# 醫學衷中參西錄 · 底本与单元层

| 项 | 值 |
|---|---|
| 作者 | 張錫純（清，1909） |
| 底本声明 | 《医学衷中参西录》，河北人民出版社1977年2版。 |
| 来源 | 中醫笈成（漢リポ 文字化本）· https://jicheng.tw/tcm/book/%E9%86%AB%E5%AD%B8%E8%A1%B7%E4%B8%AD%E5%8F%83%E8%A5%BF%E9%8C%84/index.html |
| 留档 | `sources/source.html` · 3,990,177 B · sha256 `6e7c559bd57b0c4f0cc5af3db859d168d269e1894f8937729806edd169e8098b` |
| 抓取 | 2026-11-12（服务器在 ~3MB 处重置连接，脚本用 Range 续传直到 `</html>`） |
| 规模 | 5 大类 · 265 篇 · 534 单元 · 4346 段 · 459,728 汉字 |

## 口径

1. **层级取网页语义结构**：`<h1 data-sec>`＝大類（醫方/藥物/醫論/醫話/醫案），`<h2>`＝篇，`<h3>`＝條目，
   `<div data-sec="p">`＝段。不另立层级。
2. **一条目一单元**：有 h3 的篇按條目切；无 h3 的篇（藥解/醫論/醫話/醫案）自身即一条；篇首正文单列「篇首」。
3. **字形**：正文 opencc t2s（只动字形，与 `scripts/convert_t2s.py` 同一转换器）；`底本.json` 同时存繁简两栏。
4. **三条轴**：证候 / 药理 / **参西**（西人、西医、化验、血压、细菌、解剖、生理…）；面＝五大類，按所属大類直记。

## 复算

```bash
python scripts/build_zhongcan_xilu_text.py --fetch   # 首次抓取并留档
python scripts/build_zhongcan_xilu_text.py           # 重建底本与单元层
python scripts/build_zhongcan_xilu_text.py --check    # 幂等校验
node tests/test_zhongcan_xilu_text.js                # 指纹与规模测试
```
