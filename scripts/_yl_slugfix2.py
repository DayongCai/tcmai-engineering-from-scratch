# -*- coding: utf-8 -*-
"""补完 slug 对齐（上一步在 17 章被占用中断，1–16 已进 _tmp_）。幂等可重跑。"""
import io
import json
import os
import re
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEPT = os.path.join(ROOT, "departments", "09-jichu", "12-yaoli-xue")
CHD = os.path.join(DEPT, "chapters")
PLAT = os.path.join(ROOT, "platform", "courses", "09-jichu", "12-yaoli-xue")
S = os.path.join(ROOT, "standards", "yaoli-xue")

plat = sorted(d for d in os.listdir(PLAT) if os.path.isdir(os.path.join(PLAT, d)))
assert len(plat) == 49, len(plat)
by_num = {int(p[:2]): p for p in plat}

names = os.listdir(CHD)
remap = {}  # 现名 -> 目标名
for name in names:
    if name.startswith("_tmp_"):
        cur = name[5:]
        n = int(cur[:2])
        remap[name] = by_num[n]
    else:
        n = int(name[:2])
        remap[name] = by_num[n]


def mv(a, b, tries=8):
    for i in range(tries):
        try:
            os.rename(os.path.join(CHD, a), os.path.join(CHD, b))
            return True
        except PermissionError:
            time.sleep(0.6 * (i + 1))
    return False


# 先全部退到 _tmp_，再一次性落最终名，避免目标名被占
stage = {}
for cur, tgt in remap.items():
    if cur.startswith("_tmp_"):
        stage[cur] = tgt
for cur, tgt in remap.items():
    if not cur.startswith("_tmp_"):
        tmp = "_tmp_" + tgt
        ok = mv(cur, tmp)
        if not ok:
            raise SystemExit(f"改名失败: {cur} -> {tmp}")
        stage[tmp] = tgt
done = 0
for tmp, tgt in stage.items():
    if not mv(tmp, tgt):
        raise SystemExit(f"落名失败: {tmp} -> {tgt}")
    done += 1

# 文件内路径引用（拼音旧名 -> 英文新名）
OLD = {  # 与 _yl_plan.py 的 SLUGS 对应
 1:"01-xulun",2:"02-yaoxiao-donglixue",3:"03-yaodai-donglixue",4:"04-yingxiang-yinsu",
 5:"05-chuanchu-gailun",6:"06-ni-danjian-yao",7:"07-youji-linsuanzhi",8:"08-kang-danjian-yao",
 9:"09-ni-shenshangxiansu-yao",10:"10-kang-shenshangxiansu-yao",11:"11-jubu-mazui-yao",
 12:"12-quanshen-mazui-yao",13:"13-zhenjing-cuimian-yao",14:"14-kang-dianxian-yao",
 15:"15-kang-jingshen-shichang-yao",16:"16-tuixing-jibing-yao",17:"17-jieerre-zhentong-yao",
 18:"18-zhentong-yao",19:"19-zhongshu-xingfen-yao",20:"20-zuan-ji-kang-zuan-yao",
 21:"21-ziti-huoxing-wuzhi",22:"22-lizi-tongdao-yao",23:"23-xingongneng-buquan-yao",
 24:"24-kang-gaoxueya-yao",25:"25-kang-xinjiaotong-yao",26:"26-kang-xinlvshichang-yao",
 27:"27-kang-dongmai-zhouyangyinghua",28:"28-liniao-tuoshui-yao",29:"29-xiaohua-xitong-yao",
 30:"30-huxi-xitong-yao",31:"31-zigong-xingfen-yao",32:"32-kang-pinxue-yao",
 33:"33-ningxue-xitong-yao",34:"34-pizhi-jisu-yao",35:"35-jiazhuangxian-yao",
 36:"36-jiang-xuetang-yao",37:"37-xingjisu-biyun-yao",38:"38-kang-bingyuan-weishengwu",
 39:"39-hecheng-kangjun-yao",40:"40-beta-neixian-an-lei",41:"41-dahuanneizhi-lin-ke",
 42:"42-anjitanggan-lei",43:"43-sihuansu-lumeisu-lei",44:"44-kang-zhenjun-bingdu-yao",
 45:"45-kang-jiehe-mayifeng-yao",46:"46-kang-jishengchong-yao",47:"47-kang-exing-zhongliu-yao",
 48:"48-mianyi-yizhi-yao",49:"49-mianyi-zengqiang-yao",
}
files = 0
for base, _, fs in os.walk(DEPT):
    for f in fs:
        if not f.endswith((".md", ".js", ".json")):
            continue
        p = os.path.join(base, f)
        s = io.open(p, encoding="utf-8").read()
        t = s
        for n, old in OLD.items():
            t = t.replace(old, by_num[n])
        if t != s:
            io.open(p, "w", encoding="utf-8").write(t)
            files += 1

cm_path = os.path.join(S, "chapter-map.json")
CM = json.load(io.open(cm_path, encoding="utf-8"))
CM["chapters"] = {by_num[int(k[:2])]: v for k, v in CM["chapters"].items()}
json.dump(CM, io.open(cm_path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
ch_path = os.path.join(DEPT, "chapters.json")
CH = json.load(io.open(ch_path, encoding="utf-8"))
for c in CH["chapters"]:
    c["slug"] = by_num[int(c["slug"][:2])]
json.dump(CH, io.open(ch_path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(f"完成 {done} 章改名 · 改写 {files} 个文件")
