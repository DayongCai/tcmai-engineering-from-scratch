def fig_axis_heat(path):
    """F8 病机轴索引热图：51 个语义群 × 九轴（0-3），按主轴分块排序。"""
    AX = ["热势", "津伤", "阳衰", "水饮", "气滞", "血瘀", "神乱", "里实", "表郁"]
    AXC = {"热势": "#B4553C", "津伤": "#B08A2E", "阳衰": "#3E5C7A", "水饮": "#3E7A6E",
           "气滞": "#7A6A2E", "血瘀": "#6B4A8A", "神乱": "#8C3B2E", "里实": "#7A4A22",
           "表郁": "#8A6A2F"}
    d = json.load(open(os.path.join(MAT, "axis-index.json"), encoding="utf-8"))
    gs = [g for g in d["groups"] if g["main"] != "（无轴）"]
    gs.sort(key=lambda g: (AX.index(g["main"]), -g["vec"][g["main"]], g["sheet"], g["i"]))
    M = np.array([[g["vec"][a] for a in AX] for g in gs], dtype=float)

    fig = plt.figure(figsize=(13.6, 0.30 * len(gs) + 2.4))
    fig.patch.set_facecolor(PAPER)
    ax = fig.add_axes([0.335, 0.045, 0.47, 0.895])
    im = ax.imshow(M, cmap="YlOrBr", vmin=0, vmax=3.4, aspect="auto")
    ax.set_xticks(range(len(AX)))
    ax.set_xticklabels(AX, fontsize=10.5, color=INK)
    ax.set_yticks(range(len(gs)))
    ax.set_yticklabels([f"{g['sheet']}·{_cut(g['name'], 20)}" for g in gs], fontsize=6.9)
    for tick, g in zip(ax.get_yticklabels(), gs):
        tick.set_color(AXC.get(g["main"], INK))
    for i in range(len(gs)):
        for j, a in enumerate(AX):
            v = M[i, j]
            if v <= 0:
                continue
            ax.text(j, i, (f"{v:g}"), ha="center", va="center", fontsize=6.4,
                    color="#FFFFFF" if v >= 2.0 else "#3A2E1E")
    # 主轴分块线
    prev = None
    for i, g in enumerate(gs):
        if prev is not None and g["main"] != prev:
            ax.axhline(i - 0.5, color="#7A6A55", lw=1.1)
            ax.text(-0.62, i - 0.5, "▲", fontsize=6.5, color=ACCENT, va="center", ha="right")
        prev = g["main"]
    ax.set_xticks(np.arange(-.5, len(AX), 1), minor=True)
    ax.set_yticks(np.arange(-.5, len(gs), 1), minor=True)
    ax.grid(which="minor", color="#EADFCB", lw=0.6)
    ax.tick_params(which="minor", length=0)
    for s in ax.spines.values():
        s.set_color("#C8B79A")
    cax = fig.add_axes([0.815, 0.72, 0.015, 0.20])
    cb = fig.colorbar(im, cax=cax)
    cb.set_label("轴分 0-3", fontsize=8, color="#5C4B33")
    cb.ax.tick_params(labelsize=7)

    fig.text(0.335, 0.972, "F8 病机轴索引 · 51 个语义群 × 九轴", ha="center", fontsize=16.5,
             color=INK, fontweight="bold")
    fig.text(0.335, 0.947,
             "行＝语义群（按主轴分块，行首颜色即主轴）；列＝九轴；数值＝该组条目的轴均分，"
             "人工裁定组在该轴取 1 档。空白＝该组不涉此轴。",
             ha="center", fontsize=8.6, color="#5C4B33")

    # 右侧：九轴计数与代表方
    axr = fig.add_axes([0.800, 0.10, 0.190, 0.58])
    axr.set_xlim(0, 1)
    axr.set_ylim(0, 1)
    axr.axis("off")
    axr.text(0, 1.0, "按轴检索（组数 / 强档 / 代表方）", fontsize=9.2, color=ACCENT,
             fontweight="bold", va="top")
    y = 0.905
    for t in d["axes"]:
        axr.plot([0.00, 0.06], [y + 0.018, y + 0.018], color=AXC[t["axis"]], lw=4.0, clip_on=False)
        axr.text(0.10, y, t["axis"], fontsize=8.6, color=INK, va="center", fontweight="bold")
        axr.text(0.985, y, f"{t['n_groups']} 组 / 强档 {t['n_strong']}", fontsize=7.4,
                 color="#5C4B33", va="center", ha="right")
        axr.text(0.10, y - 0.052, _cut("、".join(t["top_fang"][:4]) or "（无）", 26),
                 fontsize=6.6, color="#7A6A55", va="center")
        y -= 0.104

    c = d["counts"]
    fig.text(0.020, 0.020,
             f"口径：82 个语义群中 {c['with_axis']} 个归轴、{c['no_axis']} 个判为「无轴」（结构·数据表与方法组，不硬挂病机）；"
             f"归轴者中 {c['overridden']} 组为人工裁定（自动口径全 0 或与组名冲突，理由见 axis-overrides.json），其余取 semtensor 条向量均值。",
             fontsize=7.8, color="#6B5740")
    fig.text(0.020, 0.044,
             f"主轴分布：阳衰 {c['by_axis_main']['阳衰']}、表郁 {c['by_axis_main']['表郁']}、热势 {c['by_axis_main']['热势']}、"
             f"水饮 {c['by_axis_main']['水饮']}、气滞 {c['by_axis_main']['气滞']}、神乱 {c['by_axis_main']['神乱']}、"
             f"津伤 {c['by_axis_main']['津伤']}、里实 {c['by_axis_main']['里实']}、血瘀 {c['by_axis_main']['血瘀']}",
             fontsize=7.8, color="#6B5740")

    fig.savefig(path, dpi=150, facecolor=PAPER, bbox_inches="tight")
    plt.close(fig)
    return path


def _cut(s, n):
    s = str(s)
    return s if len(s) <= n else s[: n - 1] + "…"
