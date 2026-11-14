# OCR 管线：三册扫描件 → 候级正文层

这条管线把桌面《中医证候学》三册（2,408 页扫描件、无文字层）变成
`standards/zhenghou-cidian/正文-M01…M12.json`（1,854/1,866 条候的原书正文，331.7 万字，带印张页码）。

**代码在本目录（进 git），中间产物在 `scratch/zgh_ocr/`（不进 git，可重建）。**

## 依赖

```bash
pip install pymupdf rapidocr_onnxruntime      # 只有这两条
```

PDF 默认找 `~/Desktop/中医证候学/{1-上,2-中,3-下}.pdf`；换位置用 `ZGH_PDF`。
数据目录默认 `<repo>/scratch/zgh_ocr`；换盘用 `ZGH_DATA`。

## 六步

| 步 | 脚本 | 干什么 | 产物 |
|---|---|---|---|
| 1 | `scan_headers.py --vol shang --step 6` | 只裁页眉 7% 识别，量出「每页属第几章」 | `headers-*.json` |
| 2 | `build_doors.py` | 章界 → 门区间（第N章 → M(N-1)） | `门区间.json` |
| 3 | `run_ocr.py --vol zhong --from 205 --to 598 --workers 2` | 整页 OCR，一页一 JSON，存在即跳过（断点续跑） | `ocr/{vol}-{page}.json` |
| 4 | `parse_records.py` / `merge_bodies.py` | 版面→段落→候条目→与结构.json 对码 | `standards/…/正文-M*.json` |
| 5 | `recover_missing.py M06 M12` | 三遍兜底：按码 → 按名+(Z,H) → 按 H | `recovered-*.json` |
| 6 | `verify_bodies.py` / `report.py` | 核对「真进书了没」「每门覆盖率」 | 控制台 |

编排脚本：`run_ten.sh`（十二门串行）、`finish_pipeline.sh`（等页数齐 → merge → 重出辞典 → 看板 → 门禁）。

## 踩过的坑（都已写进代码注释，别再试）

1. **`det_limit_type` 用 `min` 会把页眉长条放大**：160px 高的条子放大到 2000px 高，19 s/页；改 `max` 后 1.3 s/页。
2. **step 采样有奇偶陷阱**：`--from 1 --step 6` 永远只落同一奇偶页；下册章名在另一侧，127 页只认出 25 页。补 `--from 4 --step 6`。
3. **目录页会冒充正文**：中册/下册最前面是本册目录，里面同样印着「（二）脾阴消涸候（L44-Z02-H272）」。
   不拦会从 5 页目录里"解出" 145 条候 —— 现在 `parse_records.is_toc_page()` 整页跳过。
4. **并行不加速**：4/6/8 进程合计 3.5/3.0/3.6 页/分（CPU 100% 已满），单页 PP-OCRv4 识别 17.6 s。
   768 页约 141 分钟，串行即可。
5. **连接号会被认成「一」、`L42` 会被认成 `LA2`**：`merge_bodies._norm_code()` 统一处理，
   一号两用的 `a/b` 后缀**不参与大写**，且在重码判定之前按候名分派。

## 换书怎么办

同一体例的扫描件，改三处即可：`_paths.PDF_DIR`、`门区间.json`（章界）、`结构.json`（目录层）。
`parse_records.py` 的字段名表（`FIELD_RE`）是按本书版式定的，换书要先抽两页核对字段名。
