/* 生成物: site/build.js — 请勿手工编辑 */
window.TCMAI_SEMTENSOR_SPEC = {
  "$schema": "tcmai/semtensor/axis-colors@1.0",
  "note": "三维极坐标语义张量的颜色公理常量。单一来源 —— 站点、图注、文档一律读此文件，不得复制常量。",
  "source": "standards/semtensor/规范-三维极坐标语义张量-v1.0.md §3 §4",
  "coordinateSystem": {
    "authoritative": "v1.0-elevation",
    "r": {
      "min": 0,
      "max": 1,
      "open": "下限不含 0（r∈(0,1]）"
    },
    "theta": {
      "meaning": "仰角 elevation",
      "unit": "deg",
      "min": -90,
      "max": 90,
      "note": "赤道 0，天顶 +90，天底 −90"
    },
    "phi": {
      "meaning": "方位角 azimuth",
      "unit": "deg",
      "min": 0,
      "max": 360,
      "note": "自 +X 轴起算，绕 +Z 轴逆时针，区间半开"
    },
    "sphereToCartesian": "X = r·cosθ·cosφ ; Y = r·cosθ·sinφ ; Z = r·sinθ",
    "cartesianToSphere": "r = |v| ; θ = asin(Z/r) ; φ = atan2(Y, X)",
    "legacyPolarAngle": {
      "note": "旧稿（《中医药领域语义向量极坐标表示.docx》第 03/05 节）以 θ 为极角 0–180°，公式 X = r·sinθ·cosφ, Y = r·sinθ·sinφ, Z = r·cosθ。",
      "conversion": "θ_仰角 = 90° − θ_极角 ; φ 不变",
      "examples": [
        "旧稿「赤道 θ=90°」→「θ=0」",
        "旧稿「北极 θ=0°」→「θ=+90°」",
        "旧稿「南极 θ=180°」→「θ=−90°」"
      ]
    }
  },
  "visibleSpectrum": {
    "note": "端色基准 = 可见光波长序段中位数。序段跨度 50nm。",
    "bands": [
      {
        "order": 0,
        "name": "红外",
        "nm": null,
        "nmBound": ">750",
        "ev": "<1.80"
      },
      {
        "order": 1,
        "name": "红",
        "nm": 685,
        "ev": 1.81,
        "hex": "#DB1C1C"
      },
      {
        "order": 2,
        "name": "橙",
        "nm": 605,
        "ev": 2.05,
        "hex": "#FF8C00"
      },
      {
        "order": 3,
        "name": "黄",
        "nm": 578,
        "ev": 2.15,
        "hex": "#F2C200"
      },
      {
        "order": 4,
        "name": "绿",
        "nm": 533,
        "ev": 2.33,
        "hex": "#00B050"
      },
      {
        "order": 5,
        "name": "青",
        "nm": 493,
        "ev": 2.52,
        "hex": "#00C7C7"
      },
      {
        "order": 6,
        "name": "蓝",
        "nm": 458,
        "ev": 2.65,
        "hex": "#1F61D9"
      },
      {
        "order": 7,
        "name": "紫",
        "nm": 415,
        "ev": 2.99,
        "hex": "#8A2BE2"
      },
      {
        "order": 8,
        "name": "紫外",
        "nm": null,
        "nmBound": "<350",
        "ev": ">3.00"
      },
      {
        "order": 9,
        "name": "白光",
        "nm": 560,
        "ev": 2.21
      }
    ]
  },
  "origin": {
    "label": "O 原点基准色",
    "name": "绿",
    "nm": 533,
    "ev": 2.33,
    "hex": "#00B050",
    "rgb01": [
      0,
      0.6901960784313725,
      0.3137254901960784
    ],
    "note": "O 点三轴共有，基准色是绿不是灰。归零时任意轴都回到此色。"
  },
  "axes": {
    "X": {
      "n": 0,
      "name": "阴阳轴",
      "direction": "左右",
      "i": {
        "value": -1,
        "semantic": "阴",
        "band": "橙",
        "nm": 605,
        "hex": "#FF8C00"
      },
      "o": {
        "value": 0,
        "semantic": "中（阴阳平和）",
        "band": "绿",
        "nm": 533,
        "hex": "#00B050"
      },
      "t": {
        "value": 1,
        "semantic": "阳",
        "band": "紫",
        "nm": 415,
        "hex": "#8A2BE2"
      }
    },
    "Y": {
      "n": 1,
      "name": "表里轴",
      "direction": "前后",
      "i": {
        "value": -1,
        "semantic": "表",
        "band": "蓝",
        "nm": 458,
        "hex": "#1F61D9"
      },
      "o": {
        "value": 0,
        "semantic": "半表半里",
        "band": "绿",
        "nm": 533,
        "hex": "#00B050"
      },
      "t": {
        "value": 1,
        "semantic": "里",
        "band": "红",
        "nm": 685,
        "hex": "#DB1C1C"
      }
    },
    "Z": {
      "n": 2,
      "name": "精气神轴",
      "direction": "足→首",
      "i": {
        "value": -1,
        "semantic": "精（形质）",
        "band": "黄",
        "nm": 578,
        "hex": "#F2C200"
      },
      "o": {
        "value": 0,
        "semantic": "气（能量）",
        "band": "绿",
        "nm": 533,
        "hex": "#00B050"
      },
      "t": {
        "value": 1,
        "semantic": "神（神志情志）",
        "band": "青",
        "nm": 493,
        "hex": "#00C7C7"
      }
    }
  },
  "mirror": {
    "note": "母子父三球共用同一张轴色表。几何位置与取色坐标的整体镜像使同一语义单元在三球上同色。",
    "spheres": [
      {
        "n": 1,
        "name": "母",
        "sex": "女",
        "sign": [
          -1,
          -1,
          1
        ],
        "angleX": 180,
        "angleY": 135,
        "angleZ": 90,
        "xyFaceRad": "3π/4"
      },
      {
        "n": 2,
        "name": "子",
        "sex": "男",
        "sign": [
          1,
          1,
          1
        ],
        "angleX": 0,
        "angleY": 45,
        "angleZ": 90,
        "xyFaceRad": "π/4"
      },
      {
        "n": 3,
        "name": "父",
        "sex": "男",
        "sign": [
          1,
          1,
          1
        ],
        "angleX": 0,
        "angleY": 45,
        "angleZ": 90,
        "xyFaceRad": "π/4"
      }
    ],
    "rule": "几何位置 = M(sex)·n̂ ；取色坐标 = M(sex)·(M(sex)·n̂) = n̂ ⇒ 三球同色"
  },
  "renderSpec": {
    "defaultView": {
      "elevDeg": 20,
      "azimDeg": -60
    },
    "grid": {
      "rings": 45,
      "seg": 70,
      "vertices": 3152,
      "faces": 6300,
      "edges": 9450,
      "note": "DDG 闭合单位球，必须补极点顶点与三角扇"
    },
    "cloud": {
      "pointSizePx": 9,
      "depthShade": false,
      "note": "颜色即数据，不被深度调淡"
    },
    "depth": {
      "alphaRim": 0.95,
      "alphaFace": 0.3,
      "note": "透明度由离散法向驱动：|n·v|→0 最不透明，正对观察者处最透明"
    },
    "azimuth": {
      "stepDeg": 30,
      "note": "赤道环每 30° 一刻度并标数值，仅可见半球"
    },
    "axesRender": {
      "pipeRadius": 0.0085,
      "arrowHeadHalfAngleDeg": 13,
      "segments": 2,
      "points": [
        "I",
        "O",
        "T"
      ]
    },
    "canvasRule": "画布内不出现汉字：只用 X/Y/Z、θ/φ 数字与圈号 ①②③；汉字母语全部下沉图注"
  },
  "tensorSimilarity": {
    "cosDelta": "sinθ₁·sinθ₂ + cosθ₁·cosθ₂·cos(φ₁−φ₂)",
    "scaleSim": "min(r₁,r₂)/max(r₁,r₂)",
    "colorDiff": "ΔRGB/√3 （归一 0–1）",
    "S_T": "0.65·(cosΔ+1)/2 + 0.15·尺度相似 + 0.20·(1−色差)"
  },
  "scale": {
    "formula": "r' = clip(r × gain, 0.05, 1.00)",
    "note": "方向与颜色不变"
  },
  "sourceImplementation": {
    "note": "源实现（交付物 02）已入库：standards/semtensor/sources/。本节记录它比书面规范多出来的常量 —— 书面规范只给出了部分呈现参数。",
    "file": "standards/semtensor/sources/母子父-三维极坐标语义球面-同步旋转.html",
    "params": {
      "rings": 45,
      "seg": 70,
      "figure_mm": [
        198,
        98
      ],
      "dpi": 240,
      "axis_label_size": 9,
      "tick_size": 7,
      "arrow_head": 6.5,
      "dot_iot": 1.7,
      "dot_edge": 0.35,
      "dot_O": 1.8,
      "cloud_point_size": 4,
      "marker_point_size": 32,
      "iot_point_size": 26,
      "cloud_alpha_face": 0.3,
      "cloud_alpha_rim": 0.95,
      "marker_alpha_face": 0.72,
      "marker_alpha_rim": 1,
      "azimuth_step_deg": 30,
      "elev_ticks_deg": [
        -60,
        -30,
        0,
        30,
        60
      ],
      "view_elev_deg": 20,
      "view_azim_deg": -60,
      "meridian_phi_deg": [
        0,
        180
      ],
      "yinyang_circle_phi_deg": [
        90,
        270
      ]
    },
    "arrowHeadNote": "书面规范 §7 写「箭头锥半顶角约 13°」，而源实现的参数是 `arrow_head = 6.5`（量纲不符合角度）。本仓库按书面规范取 13°，并在图注里允许用箭注 `arrow_head` 覆盖。二者命名相同但含义不同，是待裁定项之一。",
    "elevationTicksNote": "源实现在仰角上也画刻度（elev_ticks_deg = −60/−30/0/30/60），书面规范只规定了方位刻度。本仓库暂只实现方位刻度。",
    "ruling": "θ = 仰角 elevation ∈ [−90°,+90°] ; φ = 方位角 azimuth ∈ [0°,360°) ; X = r·cosθ·cosφ , Y = r·cosθ·sinφ , Z = r·sinθ",
    "mirrorMap": {
      "男": [
        1,
        1,
        1
      ],
      "女": [
        -1,
        -1,
        1
      ]
    }
  },
  "knownDiscrepancies": {
    "colorAxiomIsUnderdefined": {
      "summary": "书面规范的颜色公理 `C = (1−k)·绿 + k·(Σ w_i·c_i / Σ w_i)` 没有定义 c_i。",
      "readings": {
        "A_endpoint": "c_i = 该轴在 sign(v_i) 一侧的端色（纯色）",
        "B_ramp": "c_i = ramp(v_i, 轴)（该分量取值处的插值色）—— 源实现 HTML 里的 JS comp() 用的是这一读法"
      },
      "measurement": "对着源数据 116 个单元实测：A 读法 2/116 吻合，B 读法 2/116 吻合。两者在 |v_i| = 1 的单轴点上相同（精 #F2C200、神 #00C7C7 命中），其余全部不一致。",
      "conclusion": "源实现自身存在两条互不相符的取色路径：DATA.units[].hex 由 Python 编码器（kg/semtensor/axioms.py + encoder.py）产出，而页面渲染时用 JS comp() 重算、并**忽略** u.hex 字段。两条路径在同一份数据上给出不同颜色 ⇒ 不能声称本仓库复现了源系统的配色。",
      "verification": "scripts/verify_semtensor_axiom.js（可复核，不需要目视）"
    },
    "degenerateUnitInRealData": {
      "summary": "源数据的「气」节点 x=y=z=0 —— 正是书面规范未定义的三轴全零情形。",
      "sourceValue": "源 hex = #00C7C7（Z 轴 T 端青）",
      "axiomValue": "按公理应回基准绿 #00B050",
      "note": "源数据在该点与自身公理不一致。本仓库对退化情形取「基准绿 + degenerate 标记 + 空心点」（见规范 §5.1），与源数据不同，也不假装相同。"
    }
  }
};
window.TCMAI_SEMTENSOR_DATA = {
  "reference": {
    "generatedBy": "scripts/build_semtensor_datasets.js",
    "sourceFile": "standards/semtensor/sources/母子父-三维极坐标语义球面-同步旋转.html",
    "convention": "v1.0-elevation（源数据已是该口径：θ=仰角、φ=方位角）",
    "colorNote": "colorSourceHex 为源系统（Python 编码器）产出的 hex；colorDerived 为按规范公理算出的值。实测二者仅 2/116 一致（只在 |v|=1 的单轴点上），且源实现自身的 JS comp() 也不复现该 hex —— 见规范 §14.1 与 scripts/verify_semtensor_axiom.js。",
    "params": {
      "rings": 45,
      "seg": 70,
      "figure_mm": [
        198,
        98
      ],
      "dpi": 240,
      "axis_label_size": 9,
      "tick_size": 7,
      "arrow_head": 6.5,
      "dot_iot": 1.7,
      "dot_edge": 0.35,
      "dot_O": 1.8,
      "cloud_alpha_face": 0.3,
      "cloud_alpha_rim": 0.95,
      "marker_alpha_face": 0.72,
      "marker_alpha_rim": 1,
      "cloud_point_size": 4,
      "marker_point_size": 32,
      "iot_point_size": 26,
      "azimuth_step_deg": 30,
      "elev_ticks_deg": [
        -60,
        -30,
        0,
        30,
        60
      ],
      "view_elev_deg": 20,
      "view_azim_deg": -60,
      "meridian_phi_deg": [
        0,
        180
      ],
      "yinyang_circle_phi_deg": [
        90,
        270
      ]
    },
    "spheres": [
      {
        "no": "①",
        "name": "母",
        "sex": "女",
        "sign": [
          -1,
          -1,
          1
        ],
        "angle_x": 180,
        "angle_y": 135,
        "angle_z": 90,
        "xy_face": "3π/4"
      },
      {
        "no": "②",
        "name": "子",
        "sex": "男",
        "sign": [
          1,
          1,
          1
        ],
        "angle_x": 0,
        "angle_y": 45,
        "angle_z": 90,
        "xy_face": "π/4"
      },
      {
        "no": "③",
        "name": "父",
        "sex": "男",
        "sign": [
          1,
          1,
          1
        ],
        "angle_x": 0,
        "angle_y": 45,
        "angle_z": 90,
        "xy_face": "π/4"
      }
    ],
    "mirror": {
      "男": [
        1,
        1,
        1
      ],
      "女": [
        -1,
        -1,
        1
      ]
    },
    "ruling": "θ = 仰角 elevation ∈ [−90°,+90°] ; φ = 方位角 azimuth ∈ [0°,360°) ; X = r·cosθ·cosφ , Y = r·cosθ·sinφ , Z = r·sinθ",
    "unitCount": 116,
    "byKind": {
      "dsu": 103,
      "six_channel": 6,
      "system": 4,
      "treasure": 3
    },
    "units": [
      {
        "uid": "DSU-00001",
        "label": "风寒束表证",
        "kind": "dsu",
        "x": 0.2,
        "y": -0.4,
        "z": 0,
        "theta": 0,
        "phi": 296.565,
        "r": 0.8195,
        "u": [
          0.4472127965897986,
          -0.8944275904545496,
          0
        ],
        "colorSourceHex": "#2374AD",
        "colorDerived": "#1B8988",
        "colorMatch": false,
        "meta": "dsu"
      },
      {
        "uid": "DSU-00002",
        "label": "风热犯表证",
        "kind": "dsu",
        "x": 1,
        "y": -0.4,
        "z": 0.1,
        "theta": 5.305,
        "phi": 338.199,
        "r": 0.7325,
        "u": [
          0.9245023278610505,
          -0.36979326668453266,
          0.0924574804668639
        ],
        "colorSourceHex": "#515DB0",
        "colorDerived": "#6444DE",
        "colorMatch": false,
        "meta": "dsu"
      },
      {
        "uid": "DSU-00003",
        "label": "痰热壅肺证",
        "kind": "dsu",
        "x": 1,
        "y": 1,
        "z": 0.2308,
        "theta": 9.268,
        "phi": 45,
        "r": 0.648,
        "u": [
          0.6978760813411351,
          0.697876081341135,
          0.1610526317198285
        ],
        "colorSourceHex": "#4E7366",
        "colorDerived": "#A03486",
        "colorMatch": false,
        "meta": "dsu"
      },
      {
        "uid": "DSU-00004",
        "label": "脾胃湿热证",
        "kind": "dsu",
        "x": 1,
        "y": 1,
        "z": -0.1,
        "theta": -4.045,
        "phi": 45,
        "r": 0.6915,
        "u": [
          0.7053453470715045,
          0.7053453470715044,
          -0.07053993712187295
        ],
        "colorSourceHex": "#556D66",
        "colorDerived": "#B62B79",
        "colorMatch": false,
        "meta": "dsu"
      },
      {
        "uid": "DSU-00005",
        "label": "脾胃虚寒证",
        "kind": "dsu",
        "x": -1,
        "y": 0.4,
        "z": 0.6,
        "theta": 29.122,
        "phi": 158.199,
        "r": 0.702,
        "u": [
          -0.8111060179936601,
          0.3244356828341479,
          0.486670849012357
        ],
        "colorSourceHex": "#5F9F41",
        "colorDerived": "#AB8741",
        "colorMatch": false,
        "meta": "dsu"
      },
      {
        "uid": "DSU-00006",
        "label": "肝郁脾虚证",
        "kind": "dsu",
        "x": 0.6,
        "y": 0.7,
        "z": 0.5333,
        "theta": 30.049,
        "phi": 49.399,
        "r": 0.752,
        "u": [
          0.563319994096338,
          0.6572134996931436,
          0.5007404518035188
        ],
        "colorSourceHex": "#358A65",
        "colorDerived": "#5A6F7C",
        "colorMatch": false,
        "meta": "dsu"
      },
      {
        "uid": "DSU-00007",
        "label": "肝胆湿热证",
        "kind": "dsu",
        "x": 1,
        "y": 1,
        "z": 0.2,
        "theta": 8.049,
        "phi": 45,
        "r": 0.8425,
        "u": [
          0.7001408489867915,
          0.7001408489867914,
          0.14001993843774477
        ],
        "colorSourceHex": "#507266",
        "colorDerived": "#A23286",
        "colorMatch": false,
        "meta": "dsu"
      },
      {
        "uid": "DSU-00008",
        "label": "肝阳上亢证",
        "kind": "dsu",
        "x": 1,
        "y": 1,
        "z": 0.4444,
        "theta": 17.446,
        "phi": 45,
        "r": 0.794,
        "u": [
          0.6745798237631366,
          0.6745798237631365,
          0.2998068090344033
        ],
        "colorSourceHex": "#427D66",
        "colorDerived": "#92418C",
        "colorMatch": false,
        "meta": "dsu"
      },
      {
        "uid": "DSU-00009",
        "label": "气滞血瘀证",
        "kind": "dsu",
        "x": 1,
        "y": 1,
        "z": 0.3684,
        "theta": 14.602,
        "phi": 45,
        "r": 0.7865,
        "u": [
          0.6842674944992676,
          0.6842674944992675,
          0.25210313751199065
        ],
        "colorSourceHex": "#477966",
        "colorDerived": "#973D8A",
        "colorMatch": false,
        "meta": "dsu"
      },
      {
        "uid": "DSU-00010",
        "label": "阴虚燥热证",
        "kind": "dsu",
        "x": 1,
        "y": 0.4,
        "z": 0.1667,
        "theta": 8.797,
        "phi": 21.801,
        "r": 0.8135,
        "u": [
          0.9175570766207823,
          0.3670152237670798,
          0.15293409255729837
        ],
        "colorSourceHex": "#5D5C9C",
        "colorDerived": "#9038AD",
        "colorMatch": false,
        "meta": "dsu"
      },
      {
        "uid": "DSU-00011",
        "label": "脾肾阳虚证",
        "kind": "dsu",
        "x": -1,
        "y": 0.4,
        "z": -0.2727,
        "theta": -14.21,
        "phi": 158.199,
        "r": 0.6615,
        "u": [
          -0.9000702178032937,
          0.3600206252124914,
          -0.24547658227443664
        ],
        "colorSourceHex": "#959422",
        "colorDerived": "#F47A07",
        "colorMatch": false,
        "meta": "dsu"
      },
      {
        "uid": "DSU-00012",
        "label": "寒湿痹阻证",
        "kind": "dsu",
        "x": -1,
        "y": 1,
        "z": -0.25,
        "theta": -10.025,
        "phi": 135,
        "r": 0.6795,
        "u": [
          -0.6963105977462443,
          0.6963105977462444,
          -0.17407786456794525
        ],
        "colorSourceHex": "#698933",
        "colorDerived": "#EE600C",
        "colorMatch": false,
        "meta": "dsu"
      },
      {
        "uid": "DSU-00013",
        "label": "湿热浸淫证",
        "kind": "dsu",
        "x": 1,
        "y": 0.3,
        "z": 0.25,
        "theta": 13.466,
        "phi": 16.699,
        "r": 0.7175,
        "u": [
          0.9314951828893359,
          0.27944422683907305,
          0.23286830686092835
        ],
        "colorSourceHex": "#585FA3",
        "colorDerived": "#8341B7",
        "colorMatch": false,
        "meta": "dsu"
      },
      {
        "uid": "DSU-00014",
        "label": "寒凝血瘀证",
        "kind": "dsu",
        "x": -1,
        "y": 1,
        "z": -0.5455,
        "theta": -21.091,
        "phi": 135,
        "r": 0.7345,
        "u": [
          -0.6597377484601183,
          0.6597377484601185,
          -0.35985025568081386
        ],
        "colorSourceHex": "#5D9135",
        "colorDerived": "#EE6C0B",
        "colorMatch": false,
        "meta": "dsu"
      },
      {
        "uid": "DSU-00015",
        "label": "气虚不摄证",
        "kind": "dsu",
        "x": -1,
        "y": 0.4,
        "z": -0.2727,
        "theta": -14.21,
        "phi": 158.199,
        "r": 0.611,
        "u": [
          -0.9000702178032937,
          0.3600206252124914,
          -0.24547658227443664
        ],
        "colorSourceHex": "#959422",
        "colorDerived": "#F47A07",
        "colorMatch": false,
        "meta": "dsu"
      },
      {
        "uid": "DSU-00016",
        "label": "湿热瘀结证",
        "kind": "dsu",
        "x": 1,
        "y": 1,
        "z": -0.2,
        "theta": -8.049,
        "phi": 45,
        "r": 0.6245,
        "u": [
          0.7001408489867915,
          0.7001408489867914,
          -0.14001993843774477
        ],
        "colorSourceHex": "#527264",
        "colorDerived": "#B83273",
        "colorMatch": false,
        "meta": "dsu"
      },
      {
        "uid": "DSU-00017",
        "label": "气滞血瘀证(颈部)",
        "kind": "dsu",
        "x": 0.2,
        "y": 1,
        "z": -0.25,
        "theta": -13.774,
        "phi": 78.69,
        "r": 0.62,
        "u": [
          0.19047743270427575,
          0.9523813268857791,
          -0.23809274627688828
        ],
        "colorSourceHex": "#965130",
        "colorDerived": "#D43B32",
        "colorMatch": false,
        "meta": "dsu"
      },
      {
        "uid": "DSU-00018",
        "label": "寒湿痹阻证(腰部)",
        "kind": "dsu",
        "x": -1,
        "y": 1,
        "z": -0.3333,
        "theta": -13.263,
        "phi": 135,
        "r": 0.638,
        "u": [
          -0.6882462842836703,
          0.6882462842836704,
          -0.22942123776896162
        ],
        "colorSourceHex": "#668B33",
        "colorDerived": "#EE640C",
        "colorMatch": false,
        "meta": "dsu"
      },
      {
        "uid": "DSU-00019",
        "label": "肝肾亏虚证",
        "kind": "dsu",
        "x": -0.6,
        "y": 0.4,
        "z": -0.0714,
        "theta": -5.657,
        "phi": 146.31,
        "r": 0.605,
        "u": [
          -0.8279987171522056,
          0.5519977352248181,
          -0.09857294101817995
        ],
        "colorSourceHex": "#898928",
        "colorDerived": "#908326",
        "colorMatch": false,
        "meta": "dsu"
      },
      {
        "uid": "DSU-00020",
        "label": "肺气虚寒证",
        "kind": "dsu",
        "x": -1,
        "y": 0.4,
        "z": -0.1111,
        "theta": -5.89,
        "phi": 158.199,
        "r": 0.8325,
        "u": [
          -0.9235776637399318,
          0.3694234087018868,
          -0.10261892683013278
        ],
        "colorSourceHex": "#A58E1E",
        "colorDerived": "#F57207",
        "colorMatch": false,
        "meta": "dsu"
      },
      {
        "uid": "DSU-00021",
        "label": "阴虚肺燥证",
        "kind": "dsu",
        "x": -0.2,
        "y": 0.4,
        "z": 0.1429,
        "theta": 17.715,
        "phi": 116.565,
        "r": 0.5925,
        "u": [
          -0.42600679443313133,
          0.8520154914341372,
          0.3042824566961646
        ],
        "colorSourceHex": "#6F743A",
        "colorDerived": "#4B8E45",
        "colorMatch": false,
        "meta": "dsu"
      },
      {
        "uid": "DSU-00022",
        "label": "心肾不交证",
        "kind": "dsu",
        "x": -0.2,
        "y": 0.4,
        "z": 0.5625,
        "theta": 51.514,
        "phi": 116.565,
        "r": 0.7645,
        "u": [
          -0.27831098398677784,
          0.5566232109244762,
          0.7827602425088014
        ],
        "colorSourceHex": "#2A9F68",
        "colorDerived": "#43965F",
        "colorMatch": false,
        "meta": "dsu"
      },
      {
        "uid": "DSU-00023",
        "label": "肝阳上亢证(头部)",
        "kind": "dsu",
        "x": 1,
        "y": 1,
        "z": 0.75,
        "theta": 27.938,
        "phi": 45,
        "r": 0.858,
        "u": [
          0.624697087089056,
          0.624697087089056,
          0.4685158468663537
        ],
        "colorSourceHex": "#338A67",
        "colorDerived": "#825093",
        "colorMatch": false,
        "meta": "dsu"
      },
      {
        "uid": "DSU-00024",
        "label": "寒哮证（冷哮）",
        "kind": "dsu",
        "x": -1,
        "y": 1,
        "z": -0.0714,
        "theta": -2.891,
        "phi": 135,
        "r": 0.821,
        "u": [
          -0.7062068407175326,
          0.7062068407175327,
          -0.050436060983416686
        ],
        "colorSourceHex": "#728430",
        "colorDerived": "#ED580E",
        "colorMatch": false,
        "meta": "dsu"
      },
      {
        "uid": "DSU-00025",
        "label": "风热犯肺证",
        "kind": "dsu",
        "x": 1,
        "y": -0.4,
        "z": 0.1,
        "theta": 5.305,
        "phi": 338.199,
        "r": 0.664,
        "u": [
          0.9245023278610505,
          -0.36979326668453266,
          0.0924574804668639
        ],
        "colorSourceHex": "#515DB0",
        "colorDerived": "#6444DE",
        "colorMatch": false,
        "meta": "dsu"
      },
      {
        "uid": "DSU-00026",
        "label": "痰湿壅肺证",
        "kind": "dsu",
        "x": -1,
        "y": 0.7,
        "z": 0,
        "theta": 0,
        "phi": 145.008,
        "r": 0.676,
        "u": [
          -0.8192321226824457,
          0.5734620555583553,
          0
        ],
        "colorSourceHex": "#8F8526",
        "colorDerived": "#F05E0C",
        "colorMatch": false,
        "meta": "dsu"
      },
      {
        "uid": "DSU-00027",
        "label": "肺肾气虚证",
        "kind": "dsu",
        "x": -1,
        "y": 0.4,
        "z": -0.1538,
        "theta": -8.129,
        "phi": 158.199,
        "r": 0.747,
        "u": [
          -0.9191501837388775,
          0.3676524534068814,
          -0.1414023098704138
        ],
        "colorSourceHex": "#A1901F",
        "colorDerived": "#F47507",
        "colorMatch": false,
        "meta": "dsu"
      },
      {
        "uid": "DSU-00028",
        "label": "肺脾肾虚、痰瘀互结证",
        "kind": "dsu",
        "x": -1,
        "y": 0.7,
        "z": -0.2143,
        "theta": -9.957,
        "phi": 145.008,
        "r": 0.6715,
        "u": [
          -0.8068926822730871,
          0.5648244537533617,
          -0.17290903890878406
        ],
        "colorSourceHex": "#7F8B2B",
        "colorDerived": "#F0690A",
        "colorMatch": false,
        "meta": "dsu"
      },
      {
        "uid": "DSU-00029",
        "label": "肺阴亏虚证",
        "kind": "dsu",
        "x": -0.2,
        "y": 0.4,
        "z": 0.0769,
        "theta": 9.76,
        "phi": 116.565,
        "r": 0.753,
        "u": [
          -0.4407400563570154,
          0.8814820810813977,
          0.1695215132507463
        ],
        "colorSourceHex": "#826831",
        "colorDerived": "#528A40",
        "colorMatch": false,
        "meta": "dsu"
      },
      {
        "uid": "DSU-00030",
        "label": "风热犯肺证",
        "kind": "dsu",
        "x": 1,
        "y": 0.3,
        "z": 0.0909,
        "theta": 4.976,
        "phi": 16.699,
        "r": 0.67,
        "u": [
          0.9542175716144652,
          0.2862608378810488,
          0.08673845005436102
        ],
        "colorSourceHex": "#6750AD",
        "colorDerived": "#9232B6",
        "colorMatch": false,
        "meta": "dsu"
      },
      {
        "uid": "DSU-00031",
        "label": "阳虚水泛证",
        "kind": "dsu",
        "x": -1,
        "y": 0.7,
        "z": 0.1429,
        "theta": 6.675,
        "phi": 145.008,
        "r": 0.6835,
        "u": [
          -0.8136789267772856,
          0.5695748213416791,
          0.11623737356013769
        ],
        "colorSourceHex": "#82892B",
        "colorDerived": "#DE661A",
        "colorMatch": false,
        "meta": "dsu"
      },
      {
        "uid": "DSU-00032",
        "label": "气阴两虚、痰瘀阻络证",
        "kind": "dsu",
        "x": -0.6,
        "y": 0.7,
        "z": -0.1667,
        "theta": -10.247,
        "phi": 130.601,
        "r": 0.6125,
        "u": [
          -0.6404074175415096,
          0.7471497630526581,
          -0.1778920209795015
        ],
        "colorSourceHex": "#708231",
        "colorDerived": "#A57621",
        "colorMatch": false,
        "meta": "dsu"
      },
      {
        "uid": "DSU-00033",
        "label": "肝阳上亢证",
        "kind": "dsu",
        "x": 1,
        "y": 1,
        "z": 0.4545,
        "theta": 17.818,
        "phi": 45,
        "r": 0.7335,
        "u": [
          0.6731892085294697,
          0.6731892085294696,
          0.3059944101432774
        ],
        "colorSourceHex": "#427D66",
        "colorDerived": "#91428C",
        "colorMatch": false,
        "meta": "dsu"
      },
      {
        "uid": "DSU-00034",
        "label": "胸阳痹阻、痰瘀互结证",
        "kind": "dsu",
        "x": -1,
        "y": 0.7,
        "z": 0.3333,
        "theta": 15.274,
        "phi": 145.008,
        "r": 0.679,
        "u": [
          -0.7902944363319857,
          0.5532056903131777,
          0.2634353205396524
        ],
        "colorSourceHex": "#6F8F34",
        "colorDerived": "#C96F2A",
        "colorMatch": false,
        "meta": "dsu"
      },
      {
        "uid": "DSU-00035",
        "label": "心脾两虚证",
        "kind": "dsu",
        "x": -1,
        "y": 0.4,
        "z": 0.6667,
        "theta": 31.757,
        "phi": 158.199,
        "r": 0.56,
        "u": [
          -0.7894747799607758,
          0.3157833669518095,
          0.5263178098473047
        ],
        "colorSourceHex": "#57A145",
        "colorDerived": "#A68946",
        "colorMatch": false,
        "meta": "dsu"
      },
      {
        "uid": "DSU-00036",
        "label": "心肾阳虚、水饮凌心证",
        "kind": "dsu",
        "x": -1,
        "y": 0.4,
        "z": 0.3125,
        "theta": 16.18,
        "phi": 158.199,
        "r": 0.768,
        "u": [
          -0.8917032192431653,
          0.3566738951538953,
          0.27865588331690305
        ],
        "colorSourceHex": "#87952C",
        "colorDerived": "#C87D2B",
        "colorMatch": false,
        "meta": "dsu"
      },
      {
        "uid": "DSU-00037",
        "label": "热毒侵心、气阴两伤证",
        "kind": "dsu",
        "x": 1,
        "y": 0,
        "z": 0.6,
        "theta": 30.964,
        "phi": 0,
        "r": 0.5765,
        "u": [
          0.8574907394492733,
          0,
          0.5144993991820966
        ],
        "colorSourceHex": "#3F77A7",
        "colorDerived": "#5666D8",
        "colorMatch": false,
        "meta": "dsu"
      },
      {
        "uid": "DSU-00038",
        "label": "痰湿内阻证",
        "kind": "dsu",
        "x": -1,
        "y": 1,
        "z": -0.1818,
        "theta": -7.326,
        "phi": 135,
        "r": 0.6505,
        "u": [
          -0.7013344425230859,
          0.701334442523086,
          -0.12751470292348457
        ],
        "colorSourceHex": "#6D8732",
        "colorDerived": "#ED5D0D",
        "colorMatch": false,
        "meta": "dsu"
      },
      {
        "uid": "DSU-00039",
        "label": "气虚血瘀证",
        "kind": "dsu",
        "x": -0.6,
        "y": 0.7,
        "z": 0,
        "theta": 0,
        "phi": 130.601,
        "r": 0.664,
        "u": [
          -0.6507874689509606,
          0.7592599490664593,
          0
        ],
        "colorSourceHex": "#7E7A2E",
        "colorDerived": "#A56D23",
        "colorMatch": false,
        "meta": "dsu"
      },
      {
        "uid": "DSU-00040",
        "label": "风寒湿痹、内含于心证",
        "kind": "dsu",
        "x": -1,
        "y": 0,
        "z": 0.4545,
        "theta": 24.444,
        "phi": 180,
        "r": 0.6005,
        "u": [
          -0.9103661508763679,
          1.1148769927228403e-16,
          0.41380366279015246
        ],
        "colorSourceHex": "#919E30",
        "colorDerived": "#AF9E3E",
        "colorMatch": false,
        "meta": "dsu"
      },
      {
        "uid": "DSU-00041",
        "label": "气阴两虚、心脉瘀阻证",
        "kind": "dsu",
        "x": -0.6,
        "y": 0.7,
        "z": 0.375,
        "theta": 22.134,
        "phi": 130.601,
        "r": 0.6715,
        "u": [
          -0.6028278242504524,
          0.7033064479161517,
          0.376774010023291
        ],
        "colorSourceHex": "#548D40",
        "colorDerived": "#807F3F",
        "colorMatch": false,
        "meta": "dsu"
      },
      {
        "uid": "DSU-00042",
        "label": "真心痛（阳衰血瘀）证",
        "kind": "dsu",
        "x": -1,
        "y": 0.7,
        "z": 0.375,
        "theta": 17.078,
        "phi": 145.008,
        "r": 0.7605,
        "u": [
          -0.783108776709566,
          0.5481757323519068,
          0.2936733053937619
        ],
        "colorSourceHex": "#6B9136",
        "colorDerived": "#C5712D",
        "colorMatch": false,
        "meta": "dsu"
      },
      {
        "uid": "DSU-00043",
        "label": "肺肾气虚、痰瘀阻络证",
        "kind": "dsu",
        "x": -1,
        "y": 0.7,
        "z": -0.0625,
        "theta": -2.931,
        "phi": 145.008,
        "r": 0.578,
        "u": [
          -0.8181604340140296,
          0.5727118740533915,
          -0.05113329181880247
        ],
        "colorSourceHex": "#8A8728",
        "colorDerived": "#F0610B",
        "colorMatch": false,
        "meta": "dsu"
      },
      {
        "uid": "DSU-00044",
        "label": "气虚便秘证",
        "kind": "dsu",
        "x": -1,
        "y": 0.4,
        "z": -0.1111,
        "theta": -5.89,
        "phi": 158.199,
        "r": 0.702,
        "u": [
          -0.9235776637399318,
          0.3694234087018868,
          -0.10261892683013278
        ],
        "colorSourceHex": "#A58E1E",
        "colorDerived": "#F57207",
        "colorMatch": false,
        "meta": "dsu"
      },
      {
        "uid": "DSU-00045",
        "label": "脾虚湿盛证",
        "kind": "dsu",
        "x": -1,
        "y": 0.4,
        "z": 0.125,
        "theta": 6.62,
        "phi": 158.199,
        "r": 0.586,
        "u": [
          -0.9222887875218331,
          0.368907868899899,
          0.11528389599264062
        ],
        "colorSourceHex": "#A28F20",
        "colorDerived": "#E17318",
        "colorMatch": false,
        "meta": "dsu"
      },
      {
        "uid": "DSU-00046",
        "label": "脾胃湿热证",
        "kind": "dsu",
        "x": 1,
        "y": 1,
        "z": 0.1,
        "theta": 4.045,
        "phi": 45,
        "r": 0.7715,
        "u": [
          0.7053453470715045,
          0.7053453470715044,
          0.07053993712187295
        ],
        "colorSourceHex": "#556D67",
        "colorDerived": "#AA2B82",
        "colorMatch": false,
        "meta": "dsu"
      },
      {
        "uid": "DSU-00047",
        "label": "肝胃不和证",
        "kind": "dsu",
        "x": 1,
        "y": 0.3,
        "z": 0.6364,
        "theta": 31.363,
        "phi": 16.699,
        "r": 0.604,
        "u": [
          0.8178765286603127,
          0.24535915847936116,
          0.5204583241882644
        ],
        "colorSourceHex": "#368191",
        "colorDerived": "#695CBA",
        "colorMatch": false,
        "meta": "dsu"
      },
      {
        "uid": "DSU-00048",
        "label": "肝胃郁热证",
        "kind": "dsu",
        "x": 1,
        "y": 1,
        "z": 0.4444,
        "theta": 17.446,
        "phi": 45,
        "r": 0.7155,
        "u": [
          0.6745798237631366,
          0.6745798237631365,
          0.2998068090344033
        ],
        "colorSourceHex": "#427D66",
        "colorDerived": "#92418C",
        "colorMatch": false,
        "meta": "dsu"
      },
      {
        "uid": "DSU-00049",
        "label": "肝郁脾虚证",
        "kind": "dsu",
        "x": 0.6,
        "y": 0,
        "z": 0.4545,
        "theta": 37.147,
        "phi": 0,
        "r": 0.759,
        "u": [
          0.7970888461570291,
          0,
          0.6038620466067196
        ],
        "colorSourceHex": "#32859D",
        "colorDerived": "#2F89A1",
        "colorMatch": false,
        "meta": "dsu"
      },
      {
        "uid": "DSU-00050",
        "label": "水湿内停证（鼓胀）",
        "kind": "dsu",
        "x": -1,
        "y": 0.7,
        "z": -0.3,
        "theta": -13.808,
        "phi": 145.008,
        "r": 0.61,
        "u": [
          -0.7955571048055401,
          0.5568895554803356,
          -0.23866905117828127
        ],
        "colorSourceHex": "#7A8E2C",
        "colorDerived": "#F06D0A",
        "colorMatch": false,
        "meta": "dsu"
      },
      {
        "uid": "DSU-00051",
        "label": "痰湿内阻证",
        "kind": "dsu",
        "x": -0.6,
        "y": 1,
        "z": -0.1818,
        "theta": -8.862,
        "phi": 120.964,
        "r": 0.6915,
        "u": [
          -0.5083574372157077,
          0.847254234768023,
          -0.15405511252512719
        ],
        "colorSourceHex": "#806F2E",
        "colorDerived": "#E95310",
        "colorMatch": false,
        "meta": "dsu"
      },
      {
        "uid": "DSU-00052",
        "label": "肝胆湿热证",
        "kind": "dsu",
        "x": 1,
        "y": 0.3,
        "z": 0.1667,
        "theta": 9.07,
        "phi": 16.699,
        "r": 0.705,
        "u": [
          0.9458512973060638,
          0.2837509944609432,
          0.1576410369379178
        ],
        "colorSourceHex": "#6057A8",
        "colorDerived": "#8B3AB6",
        "colorMatch": false,
        "meta": "dsu"
      },
      {
        "uid": "DSU-00053",
        "label": "阳明腑实证/结胸证",
        "kind": "dsu",
        "x": 1,
        "y": 1,
        "z": 0.4286,
        "theta": 16.859,
        "phi": 45,
        "r": 0.7215,
        "u": [
          0.676716294240124,
          0.6767162942401239,
          0.2900174377857785
        ],
        "colorSourceHex": "#437C66",
        "colorDerived": "#93408C",
        "colorMatch": false,
        "meta": "dsu"
      },
      {
        "uid": "DSU-00054",
        "label": "脾肾气虚、水湿内停证",
        "kind": "dsu",
        "x": -1,
        "y": 0.7,
        "z": -0.3333,
        "theta": -15.274,
        "phi": 145.008,
        "r": 0.646,
        "u": [
          -0.7902944363319857,
          0.5532056903131777,
          -0.2634353205396524
        ],
        "colorSourceHex": "#788F2D",
        "colorDerived": "#F06E0A",
        "colorMatch": false,
        "meta": "dsu"
      },
      {
        "uid": "DSU-00055",
        "label": "下焦湿热瘀阻证",
        "kind": "dsu",
        "x": 1,
        "y": 1,
        "z": -0.25,
        "theta": -10.025,
        "phi": 45,
        "r": 0.7755,
        "u": [
          0.6963105977462444,
          0.6963105977462443,
          -0.17407786456794525
        ],
        "colorSourceHex": "#507463",
        "colorDerived": "#BA3571",
        "colorMatch": false,
        "meta": "dsu"
      },
      {
        "uid": "DSU-00056",
        "label": "肾虚瘀阻证（癃闭）",
        "kind": "dsu",
        "x": -1,
        "y": 0.7,
        "z": -0.25,
        "theta": -11.575,
        "phi": 145.008,
        "r": 0.673,
        "u": [
          -0.8025713114622224,
          0.5617994964556496,
          -0.20065048168391433
        ],
        "colorSourceHex": "#7D8D2C",
        "colorDerived": "#F06B0A",
        "colorMatch": false,
        "meta": "dsu"
      },
      {
        "uid": "DSU-00057",
        "label": "膀胱湿热证（热淋）",
        "kind": "dsu",
        "x": 1,
        "y": 1,
        "z": -0.2,
        "theta": -8.049,
        "phi": 45,
        "r": 0.7665,
        "u": [
          0.7001408489867915,
          0.7001408489867914,
          -0.14001993843774477
        ],
        "colorSourceHex": "#527264",
        "colorDerived": "#B83273",
        "colorMatch": false,
        "meta": "dsu"
      },
      {
        "uid": "DSU-00058",
        "label": "湿热下注证（热淋/白浊）",
        "kind": "dsu",
        "x": 1,
        "y": 1,
        "z": -0.3333,
        "theta": -13.263,
        "phi": 45,
        "r": 0.511,
        "u": [
          0.6882462842836704,
          0.6882462842836703,
          -0.22942123776896162
        ],
        "colorSourceHex": "#4E7761",
        "colorDerived": "#BC3A6D",
        "colorMatch": false,
        "meta": "dsu"
      },
      {
        "uid": "DSU-00059",
        "label": "肝郁脾虚证（痛泻）",
        "kind": "dsu",
        "x": 0.6,
        "y": 0,
        "z": 0.5833,
        "theta": 44.193,
        "phi": 0,
        "r": 0.602,
        "u": [
          0.7169957770851999,
          0,
          0.697077510497929
        ],
        "colorSourceHex": "#249393",
        "colorDerived": "#2A8EA0",
        "colorMatch": false,
        "meta": "dsu"
      },
      {
        "uid": "DSU-00060",
        "label": "大肠湿热蕴毒证",
        "kind": "dsu",
        "x": 1,
        "y": 1,
        "z": -0.3333,
        "theta": -13.263,
        "phi": 45,
        "r": 0.6005,
        "u": [
          0.6882462842836704,
          0.6882462842836703,
          -0.22942123776896162
        ],
        "colorSourceHex": "#4E7761",
        "colorDerived": "#BC3A6D",
        "colorMatch": false,
        "meta": "dsu"
      },
      {
        "uid": "DSU-00061",
        "label": "脾虚瘀阻证",
        "kind": "dsu",
        "x": -0.6,
        "y": 0.7,
        "z": -0.375,
        "theta": -22.134,
        "phi": 130.601,
        "r": 0.532,
        "u": [
          -0.6028278242504524,
          0.7033064479161517,
          -0.376774010023291
        ],
        "colorSourceHex": "#628D34",
        "colorDerived": "#A67E20",
        "colorMatch": false,
        "meta": "dsu"
      },
      {
        "uid": "DSU-00062",
        "label": "脾肾阳虚、湿浊内蕴证",
        "kind": "dsu",
        "x": -0.6,
        "y": 0.7,
        "z": 0,
        "theta": 0,
        "phi": 130.601,
        "r": 0.6535,
        "u": [
          -0.6507874689509606,
          0.7592599490664593,
          0
        ],
        "colorSourceHex": "#7E7A2E",
        "colorDerived": "#A56D23",
        "colorMatch": false,
        "meta": "dsu"
      },
      {
        "uid": "DSU-00063",
        "label": "湿热下注、邪留正伤证",
        "kind": "dsu",
        "x": -0.2,
        "y": 0.7,
        "z": -0.1667,
        "theta": -12.895,
        "phi": 105.945,
        "r": 0.6125,
        "u": [
          -0.2677863694991356,
          0.9372768108907381,
          -0.22316505119968938
        ],
        "colorSourceHex": "#925A2C",
        "colorDerived": "#A16925",
        "colorMatch": false,
        "meta": "dsu"
      },
      {
        "uid": "DSU-00064",
        "label": "气虚血瘀、风中经络证",
        "kind": "dsu",
        "x": -1,
        "y": 0,
        "z": -0.2,
        "theta": -11.31,
        "phi": 180,
        "r": 0.74,
        "u": [
          -0.9805804445574351,
          1.2008647027337515e-16,
          -0.19611729080206794
        ],
        "colorSourceHex": "#D4940D",
        "colorDerived": "#FD9500",
        "colorMatch": false,
        "meta": "dsu"
      },
      {
        "uid": "DSU-00065",
        "label": "风邪外袭、经络痹阻证",
        "kind": "dsu",
        "x": 0.6,
        "y": -0.4,
        "z": 0,
        "theta": 0,
        "phi": 326.31,
        "r": 0.6675,
        "u": [
          0.832050948079558,
          -0.5546992156114054,
          0
        ],
        "colorSourceHex": "#3F6AA6",
        "colorDerived": "#396DA5",
        "colorMatch": false,
        "meta": "dsu"
      },
      {
        "uid": "DSU-00066",
        "label": "肝火上炎、风火上扰证",
        "kind": "dsu",
        "x": 1,
        "y": 0.3,
        "z": 0.8333,
        "theta": 38.596,
        "phi": 16.699,
        "r": 0.519,
        "u": [
          0.748603524543493,
          0.22457757910908502,
          0.6238250347674119
        ],
        "colorSourceHex": "#298E8B",
        "colorDerived": "#5F66BC",
        "colorMatch": false,
        "meta": "dsu"
      },
      {
        "uid": "DSU-00067",
        "label": "寒湿阻络、气滞血瘀证",
        "kind": "dsu",
        "x": -1,
        "y": 1,
        "z": -0.25,
        "theta": -10.025,
        "phi": 135,
        "r": 0.5315,
        "u": [
          -0.6963105977462443,
          0.6963105977462444,
          -0.17407786456794525
        ],
        "colorSourceHex": "#698933",
        "colorDerived": "#EE600C",
        "colorMatch": false,
        "meta": "dsu"
      },
      {
        "uid": "DSU-00068",
        "label": "肝阳上亢、风阳上扰证",
        "kind": "dsu",
        "x": 1,
        "y": 0.3,
        "z": 0.875,
        "theta": 39.966,
        "phi": 16.699,
        "r": 0.6405,
        "u": [
          0.7341036640208265,
          0.22022768832332418,
          0.6423329166148675
        ],
        "colorSourceHex": "#27908A",
        "colorDerived": "#5E68BC",
        "colorMatch": false,
        "meta": "dsu"
      },
      {
        "uid": "DSU-00069",
        "label": "风痰闭窍、肝风内动证（痫证）",
        "kind": "dsu",
        "x": 0.6,
        "y": 1,
        "z": 0.5556,
        "theta": 25.472,
        "phi": 59.036,
        "r": 0.506,
        "u": [
          0.4644877752492519,
          0.7741388357242004,
          0.43006995903873585
        ],
        "colorSourceHex": "#4B7C5A",
        "colorDerived": "#8C4C7F",
        "colorMatch": false,
        "meta": "dsu"
      },
      {
        "uid": "DSU-00070",
        "label": "肝肾阴虚、虚风内动证（颤证）",
        "kind": "dsu",
        "x": -0.6,
        "y": 0.4,
        "z": -0.3,
        "theta": -22.589,
        "phi": 146.31,
        "r": 0.55,
        "u": [
          -0.7682193104928411,
          0.5121448992173598,
          -0.3841180719408347
        ],
        "colorSourceHex": "#70952F",
        "colorDerived": "#918D25",
        "colorMatch": false,
        "meta": "dsu"
      },
      {
        "uid": "DSU-00071",
        "label": "肝火亢盛、气阴两虚证（瘿病）",
        "kind": "dsu",
        "x": 1,
        "y": 0,
        "z": 0.4615,
        "theta": 24.775,
        "phi": 0,
        "r": 0.622,
        "u": [
          0.907960412610418,
          0,
          0.4190559498829713
        ],
        "colorSourceHex": "#4E68B1",
        "colorDerived": "#5E5CD9",
        "colorMatch": false,
        "meta": "dsu"
      },
      {
        "uid": "DSU-00072",
        "label": "脾肾阳虚证",
        "kind": "dsu",
        "x": -1,
        "y": 0.4,
        "z": -0.375,
        "theta": -19.197,
        "phi": 158.199,
        "r": 0.7025,
        "u": [
          -0.8768499404827699,
          0.3507327067888097,
          -0.3288171988566865
        ],
        "colorSourceHex": "#8C9725",
        "colorDerived": "#F47E06",
        "colorMatch": false,
        "meta": "dsu"
      },
      {
        "uid": "DSU-00073",
        "label": "气阴两虚证（消渴）",
        "kind": "dsu",
        "x": -0.2,
        "y": 0.4,
        "z": -0.1,
        "theta": -12.604,
        "phi": 116.565,
        "r": 0.761,
        "u": [
          -0.43643565255694045,
          0.872873254257563,
          -0.21821137270777025
        ],
        "colorSourceHex": "#826C2F",
        "colorDerived": "#5D8B36",
        "colorMatch": false,
        "meta": "dsu"
      },
      {
        "uid": "DSU-00074",
        "label": "湿热下注、痹阻经络证（热痹）",
        "kind": "dsu",
        "x": 1,
        "y": 1,
        "z": -0.3333,
        "theta": -13.263,
        "phi": 45,
        "r": 0.684,
        "u": [
          0.6882462842836704,
          0.6882462842836703,
          -0.22942123776896162
        ],
        "colorSourceHex": "#4E7761",
        "colorDerived": "#BC3A6D",
        "colorMatch": false,
        "meta": "dsu"
      },
      {
        "uid": "DSU-00075",
        "label": "痰湿内盛、脾虚不运证",
        "kind": "dsu",
        "x": -0.6,
        "y": 0.7,
        "z": -0.1,
        "theta": -6.19,
        "phi": 130.601,
        "r": 0.675,
        "u": [
          -0.6469932467261622,
          0.7548333104008578,
          -0.1078258419861476
        ],
        "colorSourceHex": "#757E30",
        "colorDerived": "#A57222",
        "colorMatch": false,
        "meta": "dsu"
      },
      {
        "uid": "DSU-00076",
        "label": "肾精亏虚、骨痿证",
        "kind": "dsu",
        "x": -1,
        "y": 0.4,
        "z": -0.7273,
        "theta": -34.029,
        "phi": 158.199,
        "r": 0.595,
        "u": [
          -0.7694813736229918,
          0.307786170169292,
          -0.5596124454475554
        ],
        "colorSourceHex": "#74A22C",
        "colorDerived": "#F48905",
        "colorMatch": false,
        "meta": "dsu"
      },
      {
        "uid": "DSU-00077",
        "label": "脾胃虚弱、气血两虚证",
        "kind": "dsu",
        "x": -1,
        "y": 0.4,
        "z": 0,
        "theta": 0,
        "phi": 158.199,
        "r": 0.6025,
        "u": [
          -0.9284793451480311,
          0.37138404062840835,
          0
        ],
        "colorSourceHex": "#B38B1A",
        "colorDerived": "#F56C08",
        "colorMatch": false,
        "meta": "dsu"
      },
      {
        "uid": "DSU-00078",
        "label": "肾精亏虚、髓枯血虚证",
        "kind": "dsu",
        "x": -0.6,
        "y": 0.4,
        "z": -0.6,
        "theta": -39.762,
        "phi": 146.31,
        "r": 0.5225,
        "u": [
          -0.6396041298526213,
          0.42640166440522,
          -0.639600013811702
        ],
        "colorSourceHex": "#5BA334",
        "colorDerived": "#919624",
        "colorMatch": false,
        "meta": "dsu"
      },
      {
        "uid": "DSU-00079",
        "label": "热毒炽盛、气阴两虚证(急劳/热劳)",
        "kind": "dsu",
        "x": 1,
        "y": 0.7,
        "z": -0.5,
        "theta": -22.275,
        "phi": 34.992,
        "r": 0.619,
        "u": [
          0.7580970887927441,
          0.5306675639480607,
          -0.3790524245238346
        ],
        "colorSourceHex": "#507B6A",
        "colorDerived": "#BB4970",
        "colorMatch": false,
        "meta": "dsu"
      },
      {
        "uid": "DSU-00080",
        "label": "痰瘀互结、气阴两虚证(石疽/恶核)",
        "kind": "dsu",
        "x": 1,
        "y": 0,
        "z": -0.25,
        "theta": -14.036,
        "phi": 0,
        "r": 0.6145,
        "u": [
          0.9701435307473132,
          0,
          -0.24253150259118317
        ],
        "colorSourceHex": "#734DBA",
        "colorDerived": "#9F49B5",
        "colorMatch": false,
        "meta": "dsu"
      },
      {
        "uid": "DSU-00081",
        "label": "湿热浸淫、筋脉失养证(痿证)",
        "kind": "dsu",
        "x": 1,
        "y": 0.7,
        "z": 0,
        "theta": 0,
        "phi": 34.992,
        "r": 0.4405,
        "u": [
          0.8192321226824456,
          0.5734620555583555,
          0
        ],
        "colorSourceHex": "#615F80",
        "colorDerived": "#AB2590",
        "colorMatch": false,
        "meta": "dsu"
      },
      {
        "uid": "DSU-00082",
        "label": "脾胃虚弱、中气下陷证(痿证/睑废)",
        "kind": "dsu",
        "x": -1,
        "y": 0.4,
        "z": -0.4286,
        "theta": -21.699,
        "phi": 158.199,
        "r": 0.536,
        "u": [
          -0.8626863931964442,
          0.3450674052952278,
          -0.3697305407949537
        ],
        "colorSourceHex": "#889926",
        "colorDerived": "#F48006",
        "colorMatch": false,
        "meta": "dsu"
      },
      {
        "uid": "DSU-00083",
        "label": "髓海不足、肾虚痰瘀证(痴呆)",
        "kind": "dsu",
        "x": -0.6,
        "y": 0.4,
        "z": -0.3333,
        "theta": -24.809,
        "phi": 146.31,
        "r": 0.5555,
        "u": [
          -0.7552622806842568,
          0.5035069014023654,
          -0.4195946706236907
        ],
        "colorSourceHex": "#6E972F",
        "colorDerived": "#918E25",
        "colorMatch": false,
        "meta": "dsu"
      },
      {
        "uid": "DSU-00084",
        "label": "湿热火毒蕴结、气滞血瘀证(蛇串疮/缠腰火丹)",
        "kind": "dsu",
        "x": 1,
        "y": 0.3,
        "z": 0.1667,
        "theta": 9.07,
        "phi": 16.699,
        "r": 0.699,
        "u": [
          0.9458512973060638,
          0.2837509944609432,
          0.1576410369379178
        ],
        "colorSourceHex": "#6057A8",
        "colorDerived": "#8B3AB6",
        "colorMatch": false,
        "meta": "dsu"
      },
      {
        "uid": "DSU-00085",
        "label": "血热风盛、瘀毒内蕴证(白疕/松皮癣)",
        "kind": "dsu",
        "x": 1,
        "y": -0.4,
        "z": 0.1667,
        "theta": 8.797,
        "phi": 338.199,
        "r": 0.7125,
        "u": [
          0.9175570766207825,
          -0.3670152237670793,
          0.15293409255729837
        ],
        "colorSourceHex": "#4D62AC",
        "colorDerived": "#6049DD",
        "colorMatch": false,
        "meta": "dsu"
      },
      {
        "uid": "DSU-00086",
        "label": "肺经风热、湿热瘀结证",
        "kind": "dsu",
        "x": 1,
        "y": 1,
        "z": 0.2,
        "theta": 8.049,
        "phi": 45,
        "r": 0.658,
        "u": [
          0.7001408489867915,
          0.7001408489867914,
          0.14001993843774477
        ],
        "colorSourceHex": "#507266",
        "colorDerived": "#A23286",
        "colorMatch": false,
        "meta": "dsu"
      },
      {
        "uid": "DSU-00087",
        "label": "风热外袭、营卫不和证(瘾疹/风疹块)",
        "kind": "dsu",
        "x": 1,
        "y": -0.4,
        "z": 0.1818,
        "theta": 9.582,
        "phi": 338.199,
        "r": 0.652,
        "u": [
          0.9155255544805978,
          -0.36620263175306145,
          0.16645897870083698
        ],
        "colorSourceHex": "#4C63AB",
        "colorDerived": "#5F4BDD",
        "colorMatch": false,
        "meta": "dsu"
      },
      {
        "uid": "DSU-00088",
        "label": "湿热浸淫、脾虚湿蕴证(湿疮/浸淫疮)",
        "kind": "dsu",
        "x": 0.6,
        "y": 0.7,
        "z": -0.1111,
        "theta": -6.872,
        "phi": 49.399,
        "r": 0.6925,
        "u": [
          0.6461121683774685,
          0.7538053749625325,
          -0.11965167174829427
        ],
        "colorSourceHex": "#5C6B5F",
        "colorDerived": "#825665",
        "colorMatch": false,
        "meta": "dsu"
      },
      {
        "uid": "DSU-00089",
        "label": "肝肾阴虚、肝阳上亢证(青风内障/绿风内障)",
        "kind": "dsu",
        "x": -0.6,
        "y": 0.4,
        "z": -0.1,
        "theta": -7.895,
        "phi": 146.31,
        "r": 0.595,
        "u": [
          -0.8241643146991834,
          0.5494414734502969,
          -0.13735810725687797
        ],
        "colorSourceHex": "#858A29",
        "colorDerived": "#908526",
        "colorMatch": false,
        "meta": "dsu"
      },
      {
        "uid": "DSU-00090",
        "label": "肝肾不足、晶珠混浊证(圆翳内障/如银内障)",
        "kind": "dsu",
        "x": -1,
        "y": 0.4,
        "z": -0.6,
        "theta": -29.122,
        "phi": 158.199,
        "r": 0.557,
        "u": [
          -0.8111060179936601,
          0.3244356828341479,
          -0.486670849012357
        ],
        "colorSourceHex": "#7C9E2A",
        "colorDerived": "#F48606",
        "colorMatch": false,
        "meta": "dsu"
      },
      {
        "uid": "DSU-00091",
        "label": "风寒外袭、痰湿阻窍证(耳胀/耳闭)",
        "kind": "dsu",
        "x": -1,
        "y": -0.4,
        "z": 0,
        "theta": 0,
        "phi": 201.801,
        "r": 0.578,
        "u": [
          -0.9284793451480312,
          -0.37138404062840813,
          0
        ],
        "colorSourceHex": "#A0922C",
        "colorDerived": "#BF803E",
        "colorMatch": false,
        "meta": "dsu"
      },
      {
        "uid": "DSU-00092",
        "label": "肺经风热、湿热上蒸证(鼻渊/鼻鼽)",
        "kind": "dsu",
        "x": 1,
        "y": 0.7,
        "z": -0.1429,
        "theta": -6.675,
        "phi": 34.992,
        "r": 0.6565,
        "u": [
          0.8136789267772855,
          0.5695748213416794,
          -0.11623737356013769
        ],
        "colorSourceHex": "#5A667B",
        "colorDerived": "#B13185",
        "colorMatch": false,
        "meta": "dsu"
      },
      {
        "uid": "DSU-00093",
        "label": "肝气郁结、心神失养证(郁证/百合病)",
        "kind": "dsu",
        "x": -0.6,
        "y": -0.3,
        "z": 0.6429,
        "theta": 43.781,
        "phi": 206.565,
        "r": 0.619,
        "u": [
          -0.645767518238212,
          -0.32288303811312247,
          0.6919037910629632
        ],
        "colorSourceHex": "#2EAB60",
        "colorDerived": "#44A36D",
        "colorMatch": false,
        "meta": "dsu"
      },
      {
        "uid": "DSU-00094",
        "label": "胆郁痰扰、心神不宁证(惊悸/不寐)",
        "kind": "dsu",
        "x": 1,
        "y": 0.3,
        "z": 0.7273,
        "theta": 34.861,
        "phi": 16.699,
        "r": 0.6115,
        "u": [
          0.7859368705256055,
          0.23577740944092523,
          0.571587481271016
        ],
        "colorSourceHex": "#30878E",
        "colorDerived": "#6461BB",
        "colorMatch": false,
        "meta": "dsu"
      },
      {
        "uid": "DSU-00095",
        "label": "心肾不交、阴虚火旺证(不寐)",
        "kind": "dsu",
        "x": -0.2,
        "y": 0.4,
        "z": 0.4667,
        "theta": 46.219,
        "phi": 116.565,
        "r": 0.6235,
        "u": [
          -0.30942822937235154,
          0.6188578406668142,
          0.7219897117775982
        ],
        "colorSourceHex": "#2F9B5F",
        "colorDerived": "#3D9858",
        "colorMatch": false,
        "meta": "dsu"
      },
      {
        "uid": "DSU-00096",
        "label": "气阴两虚、痰瘀毒结证(肺积/息贲)",
        "kind": "dsu",
        "x": -0.6,
        "y": 0.7,
        "z": -0.2353,
        "theta": -14.317,
        "phi": 130.601,
        "r": 0.7365,
        "u": [
          -0.6305755737943095,
          0.7356791593012342,
          -0.24728651460159873
        ],
        "colorSourceHex": "#6B8532",
        "colorDerived": "#A67921",
        "colorMatch": false,
        "meta": "dsu"
      },
      {
        "uid": "DSU-00097",
        "label": "脾胃虚弱、瘀毒内结证(胃积/反胃)",
        "kind": "dsu",
        "x": -0.6,
        "y": 0.7,
        "z": -0.4444,
        "theta": -25.737,
        "phi": 130.601,
        "r": 0.7425,
        "u": [
          -0.586227262117992,
          0.6839389238618183,
          -0.43424088427551466
        ],
        "colorSourceHex": "#5F9135",
        "colorDerived": "#A68120",
        "colorMatch": false,
        "meta": "dsu"
      },
      {
        "uid": "DSU-00098",
        "label": "肝郁脾虚、瘀毒互结证(肝积/鼓胀)",
        "kind": "dsu",
        "x": -0.6,
        "y": 0.7,
        "z": 0,
        "theta": 0,
        "phi": 130.601,
        "r": 0.7715,
        "u": [
          -0.6507874689509606,
          0.7592599490664593,
          0
        ],
        "colorSourceHex": "#7E7A2E",
        "colorDerived": "#A56D23",
        "colorMatch": false,
        "meta": "dsu"
      },
      {
        "uid": "DSU-00099",
        "label": "肝气郁结、冲任失调证(乳岩/乳石痈)",
        "kind": "dsu",
        "x": -0.6,
        "y": 0,
        "z": 0,
        "theta": 0,
        "phi": 180,
        "r": 0.7485,
        "u": [
          -1,
          1.2246467991473532e-16,
          0
        ],
        "colorSourceHex": "#FF8C00",
        "colorDerived": "#999A20",
        "colorMatch": false,
        "meta": "dsu"
      },
      {
        "uid": "DSU-00100",
        "label": "湿热蕴结、瘀毒内阻证(肠蕈/脏毒)",
        "kind": "dsu",
        "x": 1,
        "y": 0.7,
        "z": -0.5,
        "theta": -22.275,
        "phi": 34.992,
        "r": 0.7545,
        "u": [
          0.7580970887927441,
          0.5306675639480607,
          -0.3790524245238346
        ],
        "colorSourceHex": "#507B6A",
        "colorDerived": "#BB4970",
        "colorMatch": false,
        "meta": "dsu"
      },
      {
        "uid": "DSU-00101",
        "label": "热毒犯肺、痰瘀阻络证(失荣/上石疽)",
        "kind": "dsu",
        "x": 1,
        "y": 0.3,
        "z": 0.1429,
        "theta": 7.792,
        "phi": 16.699,
        "r": 0.7485,
        "u": [
          0.94898367823454,
          0.28469069418543175,
          0.1355772366168454
        ],
        "colorSourceHex": "#6255AA",
        "colorDerived": "#8D37B6",
        "colorMatch": false,
        "meta": "dsu"
      },
      {
        "uid": "DSU-00102",
        "label": "痰气交阻、瘀毒凝结证(石瘿)",
        "kind": "dsu",
        "x": 0.6,
        "y": 0.3,
        "z": 0,
        "theta": 0,
        "phi": 26.565,
        "r": 0.6185,
        "u": [
          0.8944275904545494,
          0.4472127965897988,
          0
        ],
        "colorSourceHex": "#675597",
        "colorDerived": "#635D80",
        "colorMatch": false,
        "meta": "dsu"
      },
      {
        "uid": "DSU-00103",
        "label": "肾虚瘀毒证(癃闭/积证)",
        "kind": "dsu",
        "x": -0.6,
        "y": 0.7,
        "z": -0.7692,
        "theta": -39.84,
        "phi": 130.601,
        "r": 0.735,
        "u": [
          -0.4996983434630343,
          0.5829874681175321,
          -0.6406459065335616
        ],
        "colorSourceHex": "#589D36",
        "colorDerived": "#B7871A",
        "colorMatch": false,
        "meta": "dsu"
      },
      {
        "uid": "DOM-SIX-太阳病",
        "label": "太阳病",
        "kind": "six_channel",
        "x": 0.8,
        "y": -0.9,
        "z": 0,
        "theta": 0,
        "phi": 311.634,
        "r": 1,
        "u": [
          0.6643698480493211,
          -0.7474039771120582,
          0
        ],
        "colorSourceHex": "#297A9B",
        "colorDerived": "#4952CF",
        "colorMatch": false,
        "meta": "six_channel · 六经域"
      },
      {
        "uid": "DOM-SIX-阳明病",
        "label": "阳明病",
        "kind": "six_channel",
        "x": 0.9,
        "y": 0.85,
        "z": 0.1,
        "theta": 4.618,
        "phi": 43.363,
        "r": 1,
        "u": [
          0.7246580539850979,
          0.6843891522747996,
          0.08051206768623079
        ],
        "colorSourceHex": "#556C6A",
        "colorDerived": "#973A80",
        "colorMatch": false,
        "meta": "six_channel · 六经域"
      },
      {
        "uid": "DOM-SIX-少阳病",
        "label": "少阳病",
        "kind": "six_channel",
        "x": 0.3,
        "y": 0,
        "z": 0.2,
        "theta": 33.69,
        "phi": 0,
        "r": 1,
        "u": [
          0.8320509480795582,
          0,
          0.5546992156114053
        ],
        "colorSourceHex": "#397DA3",
        "colorDerived": "#199B79",
        "colorMatch": false,
        "meta": "six_channel · 六经域"
      },
      {
        "uid": "DOM-SIX-太阴病",
        "label": "太阴病",
        "kind": "six_channel",
        "x": -0.6,
        "y": 0.7,
        "z": -0.3,
        "theta": -18.025,
        "phi": 130.601,
        "r": 1,
        "u": [
          -0.618847855810909,
          0.7219966792542598,
          -0.30943194163509036
        ],
        "colorSourceHex": "#678933",
        "colorDerived": "#A67C21",
        "colorMatch": false,
        "meta": "six_channel · 六经域"
      },
      {
        "uid": "DOM-SIX-少阴病",
        "label": "少阴病",
        "kind": "six_channel",
        "x": -0.9,
        "y": 0.8,
        "z": -0.8,
        "theta": -33.599,
        "phi": 138.366,
        "r": 1,
        "u": [
          -0.6225358666377626,
          0.5533741748625628,
          -0.5533770119409982
        ],
        "colorSourceHex": "#569D36",
        "colorDerived": "#D77F10",
        "colorMatch": false,
        "meta": "six_channel · 六经域"
      },
      {
        "uid": "DOM-SIX-厥阴病",
        "label": "厥阴病",
        "kind": "six_channel",
        "x": -0.4,
        "y": 0.2,
        "z": 0.5,
        "theta": 48.19,
        "phi": 153.435,
        "r": 1,
        "u": [
          -0.596281396313633,
          0.2981400324025902,
          0.745359656467431
        ],
        "colorSourceHex": "#32AA5F",
        "colorDerived": "#42A158",
        "colorMatch": false,
        "meta": "six_channel · 六经域"
      },
      {
        "uid": "DOM-SYS-生理",
        "label": "生理",
        "kind": "system",
        "x": 0,
        "y": 0.1,
        "z": -0.6,
        "theta": -80.538,
        "phi": 90,
        "r": 0.9,
        "u": [
          1.0066195018731127e-17,
          0.16439344022684096,
          -0.9863948483291993
        ],
        "colorSourceHex": "#CFBC0C",
        "colorDerived": "#8FAD22",
        "colorMatch": false,
        "meta": "system · 四系统"
      },
      {
        "uid": "DOM-SYS-心理",
        "label": "心理",
        "kind": "system",
        "x": 0.1,
        "y": -0.1,
        "z": 0.9,
        "theta": 81.07,
        "phi": 315,
        "r": 0.9,
        "u": [
          0.10976253076236019,
          -0.10976253076236024,
          0.9878787241768515
        ],
        "colorSourceHex": "#02C0B2",
        "colorDerived": "#0EB0BF",
        "colorMatch": false,
        "meta": "system · 四系统"
      },
      {
        "uid": "DOM-SYS-社会",
        "label": "社会",
        "kind": "system",
        "x": 0.2,
        "y": -0.4,
        "z": 0.3,
        "theta": 33.855,
        "phi": 296.565,
        "r": 0.9,
        "u": [
          0.37138790316919695,
          -0.7427774649755399,
          0.5570930468997956
        ],
        "colorSourceHex": "#10988B",
        "colorDerived": "#129985",
        "colorMatch": false,
        "meta": "system · 四系统"
      },
      {
        "uid": "DOM-SYS-生态",
        "label": "生态",
        "kind": "system",
        "x": -0.2,
        "y": -0.6,
        "z": 0,
        "theta": 0,
        "phi": 251.565,
        "r": 0.9,
        "u": [
          -0.3162286133887094,
          -0.9486830155928029,
          0
        ],
        "colorSourceHex": "#2878A6",
        "colorDerived": "#348782",
        "colorMatch": false,
        "meta": "system · 四系统"
      },
      {
        "uid": "DOM-JQS-精",
        "label": "精",
        "kind": "treasure",
        "x": 0,
        "y": 0,
        "z": -1,
        "theta": -90,
        "phi": 0,
        "r": 1,
        "u": [
          6.123233995736766e-17,
          0,
          -1
        ],
        "colorSourceHex": "#F2C200",
        "colorDerived": "#F2C200",
        "colorMatch": true,
        "meta": "treasure · 精气神"
      },
      {
        "uid": "DOM-JQS-气",
        "label": "气",
        "kind": "treasure",
        "x": 0,
        "y": 0,
        "z": 0,
        "theta": 90,
        "phi": 0,
        "r": 1,
        "u": [
          6.123233995736766e-17,
          0,
          1
        ],
        "colorSourceHex": "#00C7C7",
        "colorDerived": "#00B050",
        "colorMatch": false,
        "meta": "treasure · 精气神"
      },
      {
        "uid": "DOM-JQS-神",
        "label": "神",
        "kind": "treasure",
        "x": 0,
        "y": 0,
        "z": 1,
        "theta": 90,
        "phi": 0,
        "r": 1,
        "u": [
          6.123233995736766e-17,
          0,
          1
        ],
        "colorSourceHex": "#00C7C7",
        "colorDerived": "#00C7C7",
        "colorMatch": true,
        "meta": "treasure · 精气神"
      }
    ]
  },
  "neijing": {
    "generatedBy": "scripts/build_semtensor_datasets.js",
    "source": "standards/semtensor/datasets/neijing-axiom-text.source.md（《黄帝内经》162 篇公理文本「总纲」表）",
    "convention": "v1.0-elevation（θ = 仰角，φ = 方位角）",
    "mapping": {
      "phi": "φ (方位角) = (内序 − 1) × 30°；12 域 × 30° = 360° 闭合",
      "theta": "θ (仰角，展开度) = (2 × 篇占比/最大篇占比 − 1) × 90°",
      "r": "r (尺度) = clip(0.20 + 0.80 × 篇占比/最大篇占比, 0.20, 1.00)",
      "note": "本映射是本仓库的域级本地约定，非规范 §5 的 DSU 编码公式（域级数据没有证据等级/症状密度/桥接完备度三字段）。见规范 §14.2。"
    },
    "totals": {
      "order": null,
      "name": "合计",
      "pian": 162,
      "zhang": 1323,
      "jie": 3146,
      "chars": 188166,
      "share": 100,
      "source": "素问81＋灵枢81"
    },
    "domains": [
      {
        "order": 1,
        "name": "病证·失常",
        "pian": 40,
        "zhang": 331,
        "jie": 661,
        "chars": 35487,
        "share": 24.7,
        "source": "素问18＋灵枢22",
        "theta": 90,
        "phi": 0,
        "r": 1,
        "u": [
          6.123233995736766e-17,
          0,
          1
        ],
        "colorDerived": "#00C7C7"
      },
      {
        "order": 2,
        "name": "刺灸·术器",
        "pian": 28,
        "zhang": 182,
        "jie": 459,
        "chars": 31906,
        "share": 17.3,
        "source": "素问16＋灵枢12",
        "theta": 36.07287449392714,
        "phi": 30,
        "r": 0.7603238866396762,
        "u": [
          0.6999812586438338,
          0.4041343681057104,
          0.5888137651780845
        ],
        "colorDerived": "#4D768F"
      },
      {
        "order": 3,
        "name": "营卫·气血津液",
        "pian": 15,
        "zhang": 92,
        "jie": 143,
        "chars": 10158,
        "share": 9.3,
        "source": "素问1＋灵枢14",
        "theta": -22.22672064777327,
        "phi": 60,
        "r": 0.5012145748987855,
        "u": [
          0.46284713653051346,
          0.801674756608618,
          -0.37827253775818465
        ],
        "colorDerived": "#A25B4E"
      },
      {
        "order": 4,
        "name": "经络·腧穴",
        "pian": 15,
        "zhang": 85,
        "jie": 260,
        "chars": 19359,
        "share": 9.3,
        "source": "素问7＋灵枢8",
        "theta": -22.22672064777327,
        "phi": 90,
        "r": 0.5012145748987855,
        "u": [
          5.668242642466111e-17,
          0.9256942730610267,
          -0.37827253775818465
        ],
        "colorDerived": "#D15418"
      },
      {
        "order": 5,
        "name": "形神·体质",
        "pian": 12,
        "zhang": 88,
        "jie": 182,
        "chars": 11264,
        "share": 7.4,
        "source": "＋灵枢12",
        "theta": -36.072874493927124,
        "phi": 120,
        "r": 0.4396761133603239,
        "u": [
          -0.40413436810571035,
          0.6999812586438339,
          -0.5888137651780844
        ],
        "colorDerived": "#A58420"
      },
      {
        "order": 6,
        "name": "天时·人应",
        "pian": 11,
        "zhang": 231,
        "jie": 578,
        "chars": 34672,
        "share": 6.8,
        "source": "素问7＋灵枢4",
        "theta": -40.445344129554655,
        "phi": 150,
        "r": 0.4202429149797571,
        "u": [
          -0.6590671077898129,
          0.3805125720964765,
          -0.6487223827694671
        ],
        "colorDerived": "#9F951F"
      },
      {
        "order": 7,
        "name": "脉色·诊候",
        "pian": 10,
        "zhang": 94,
        "jie": 249,
        "chars": 12104,
        "share": 6.2,
        "source": "素问7＋灵枢3",
        "theta": -44.81781376518218,
        "phi": 180,
        "r": 0.40080971659919035,
        "u": [
          -0.7093516252298296,
          8.687051973076838e-17,
          -0.7048547877285075
        ],
        "colorDerived": "#B0AA17"
      },
      {
        "order": 8,
        "name": "心神·认知",
        "pian": 10,
        "zhang": 61,
        "jie": 92,
        "chars": 7382,
        "share": 6.2,
        "source": "素问6＋灵枢4",
        "theta": -44.81781376518218,
        "phi": 210,
        "r": 0.40080971659919035,
        "u": [
          -0.6143165276648109,
          -0.3546758126149149,
          -0.7048547877285075
        ],
        "colorDerived": "#8EA038"
      },
      {
        "order": 9,
        "name": "治则·方药",
        "pian": 7,
        "zhang": 93,
        "jie": 205,
        "chars": 12668,
        "share": 4.3,
        "source": "素问5＋灵枢2",
        "theta": -58.663967611336034,
        "phi": 240,
        "r": 0.33927125506072875,
        "u": [
          -0.2600281822216308,
          -0.45038202300764235,
          -0.8541319440239066
        ],
        "colorDerived": "#9DA041"
      },
      {
        "order": 10,
        "name": "阴阳·数理骨架",
        "pian": 6,
        "zhang": 31,
        "jie": 127,
        "chars": 6317,
        "share": 3.7,
        "source": "素问6",
        "theta": -63.036437246963565,
        "phi": 270,
        "r": 0.31983805668016196,
        "u": [
          -8.329259573583488e-17,
          -0.45342377243695314,
          -0.891295059219472
        ],
        "colorDerived": "#98A34A"
      },
      {
        "order": 11,
        "name": "脏腑·藏象",
        "pian": 5,
        "zhang": 23,
        "jie": 85,
        "chars": 3893,
        "share": 3.1,
        "source": "素问5",
        "theta": -67.40890688259108,
        "phi": 300,
        "r": 0.3004048582995952,
        "u": [
          0.19207590045067244,
          -0.33268521849010635,
          -0.9232699463668541
        ],
        "colorDerived": "#A69A50"
      },
      {
        "order": 12,
        "name": "养生·治未病",
        "pian": 3,
        "zhang": 12,
        "jie": 105,
        "chars": 2956,
        "share": 1.9,
        "source": "素问3",
        "theta": -76.15384615384615,
        "phi": 330,
        "r": 0.26153846153846155,
        "u": [
          0.20725344479657357,
          -0.11965783214377913,
          -0.970941817426052
        ],
        "colorDerived": "#C8A139"
      }
    ]
  },
  "shanghan": {
    "generatedBy": "scripts/build_semtensor_datasets.js",
    "source": "standards/semtensor/datasets/shl-episodes.source.json（伤寒论底本 28 集目录）",
    "convention": "v1.0-elevation；源数据为代码口径（θ=方位角/φ=仰角），已显式换算并保留 source 字段",
    "colorNote": "colorSource 为源系统值，colorDerived 为本仓库按规范公理算出的值；实测二者 28/28 不一致，见规范 §14.1（待裁定项）",
    "episodes": [
      {
        "code": "S00",
        "juan": "00",
        "name": "目录·序跋",
        "domain": "序跋·目录",
        "tiao": 27,
        "durationSec": 62.42,
        "file": "SHL_00_目录·序跋.mp4",
        "source": {
          "theta": -180,
          "phi": -48.6,
          "u": [
            -0.662,
            0,
            -0.7495
          ],
          "color": "#84AD26"
        },
        "theta": -48.6,
        "phi": 180,
        "r": 1,
        "colorSource": "#84AD26",
        "colorDerived": "#BAAB14",
        "colorMatch": false
      },
      {
        "code": "S01",
        "juan": "01",
        "name": "（序跋·题署·目录）",
        "domain": "序跋·目录",
        "tiao": 90,
        "durationSec": 1526.58,
        "file": "SHL_01_(序跋·题署·目录).mp4",
        "source": {
          "theta": -172,
          "phi": -21.8,
          "u": [
            -0.9192,
            -0.1292,
            -0.372
          ],
          "color": "#A19D1F"
        },
        "theta": -21.8,
        "phi": 188,
        "r": 1,
        "colorSource": "#A19D1F",
        "colorDerived": "#D59819",
        "colorMatch": false
      },
      {
        "code": "S02",
        "juan": "02",
        "name": "辨痉湿暍脉证",
        "domain": "脉法·伤寒例",
        "tiao": 61,
        "durationSec": 957.92,
        "file": "SHL_02_辨痉湿暍脉证.mp4",
        "source": {
          "theta": -150,
          "phi": -34.1,
          "u": [
            -0.7168,
            -0.4139,
            -0.5611
          ],
          "color": "#5AA53E"
        },
        "theta": -34.1,
        "phi": 210,
        "r": 1,
        "colorSource": "#5AA53E",
        "colorDerived": "#8C9B3D",
        "colorMatch": false
      },
      {
        "code": "S03",
        "juan": "03",
        "name": "辨太阳病脉证并治上",
        "domain": "太阳病",
        "tiao": 14,
        "durationSec": 182.17,
        "file": "SHL_03_辨太阳病脉证并治上.mp4",
        "source": {
          "theta": 90,
          "phi": -54.1,
          "u": [
            0,
            0.5869,
            -0.8097
          ],
          "color": "#889927"
        },
        "theta": -54.1,
        "phi": 90,
        "r": 1,
        "colorSource": "#889927",
        "colorDerived": "#BC8619",
        "colorMatch": false
      },
      {
        "code": "S04",
        "juan": "04",
        "name": "辨太阳病脉证并治（提纲起",
        "domain": "太阳病",
        "tiao": 78,
        "durationSec": 670.92,
        "file": "SHL_04_辨太阳病脉证并治(提纲起.mp4",
        "source": {
          "theta": 98,
          "phi": -26.9,
          "u": [
            -0.1241,
            0.8829,
            -0.4528
          ],
          "color": "#886C2D"
        },
        "theta": -26.9,
        "phi": 98,
        "r": 1,
        "colorSource": "#886C2D",
        "colorDerived": "#CA6318",
        "colorMatch": false
      },
      {
        "code": "S05",
        "juan": "05",
        "name": "辨太阳病脉证并治中",
        "domain": "太阳病",
        "tiao": 283,
        "durationSec": 2593.08,
        "file": "SHL_05_辨太阳病脉证并治中.mp4",
        "source": {
          "theta": 106,
          "phi": 60,
          "u": [
            -0.1378,
            0.4806,
            0.866
          ],
          "color": "#20A67C"
        },
        "theta": 60,
        "phi": 106,
        "r": 1,
        "colorSource": "#20A67C",
        "colorDerived": "#528F77",
        "colorMatch": false
      },
      {
        "code": "S06",
        "juan": "06",
        "name": "辨太阳病脉证并治下",
        "domain": "太阳病",
        "tiao": 191,
        "durationSec": 1674.58,
        "file": "SHL_06_辨太阳病脉证并治下.mp4",
        "source": {
          "theta": 114,
          "phi": 21,
          "u": [
            -0.3797,
            0.8529,
            0.3582
          ],
          "color": "#69753E"
        },
        "theta": 21,
        "phi": 114,
        "r": 1,
        "colorSource": "#69753E",
        "colorDerived": "#98693F",
        "colorMatch": false
      },
      {
        "code": "S07",
        "juan": "07",
        "name": "辨阳明病脉证并治",
        "domain": "阳明病",
        "tiao": 1,
        "durationSec": 15.67,
        "file": "SHL_07_辨阳明病脉证并治.mp4",
        "source": {
          "theta": 60,
          "phi": -59.6,
          "u": [
            0.2532,
            0.4386,
            -0.8623
          ],
          "color": "#80A32F"
        },
        "theta": -59.6,
        "phi": 60,
        "r": 1,
        "colorSource": "#80A32F",
        "colorDerived": "#BC8232",
        "colorMatch": false
      },
      {
        "code": "S08",
        "juan": "08",
        "name": "辨少阳病脉证并治",
        "domain": "少阳病",
        "tiao": 43,
        "durationSec": 454.67,
        "file": "SHL_08_辨少阳病脉证并治.mp4",
        "source": {
          "theta": 30,
          "phi": -41.8,
          "u": [
            0.6459,
            0.3729,
            -0.6661
          ],
          "color": "#4D9557"
        },
        "theta": -41.8,
        "phi": 30,
        "r": 1,
        "colorSource": "#4D9557",
        "colorDerived": "#837D59",
        "colorMatch": false
      },
      {
        "code": "S09",
        "juan": "09",
        "name": "辨阳明病脉证并治（提纲起",
        "domain": "阳明病",
        "tiao": 133,
        "durationSec": 1285.17,
        "file": "SHL_09_辨阳明病脉证并治(提纲起.mp4",
        "source": {
          "theta": 68,
          "phi": -3.6,
          "u": [
            0.3739,
            0.9253,
            -0.0629
          ],
          "color": "#8D4D3F"
        },
        "theta": -3.6,
        "phi": 68,
        "r": 1,
        "colorSource": "#8D4D3F",
        "colorDerived": "#B73251",
        "colorMatch": false
      },
      {
        "code": "S10",
        "juan": "10",
        "name": "辨少阳病脉证并治",
        "domain": "少阳病",
        "tiao": 2,
        "durationSec": 28.83,
        "file": "SHL_10_辨少阳病脉证并治.mp4",
        "source": {
          "theta": 38,
          "phi": -59.2,
          "u": [
            0.4041,
            0.3157,
            -0.8585
          ],
          "color": "#79A33A"
        },
        "theta": -59.2,
        "phi": 38,
        "r": 1,
        "colorSource": "#79A33A",
        "colorDerived": "#B58242",
        "colorMatch": false
      },
      {
        "code": "S11",
        "juan": "11",
        "name": "辨少阳病脉证并治（提纲起",
        "domain": "少阳病",
        "tiao": 19,
        "durationSec": 104.92,
        "file": "SHL_11_辨少阳病脉证并治(提纲起.mp4",
        "source": {
          "theta": 46,
          "phi": -51.9,
          "u": [
            0.4282,
            0.4434,
            -0.7874
          ],
          "color": "#689C40"
        },
        "theta": -51.9,
        "phi": 46,
        "r": 1,
        "colorSource": "#689C40",
        "colorDerived": "#A57D45",
        "colorMatch": false
      },
      {
        "code": "S12",
        "juan": "12",
        "name": "辨太阴病脉证并治",
        "domain": "太阴病",
        "tiao": 7,
        "durationSec": 28,
        "file": "SHL_12_辨太阴病脉证并治.mp4",
        "source": {
          "theta": 0,
          "phi": -57,
          "u": [
            0.5442,
            0,
            -0.839
          ],
          "color": "#80A048"
        },
        "theta": -57,
        "phi": 0,
        "r": 1,
        "colorSource": "#80A048",
        "colorDerived": "#A98D57",
        "colorMatch": false
      },
      {
        "code": "S13",
        "juan": "13",
        "name": "辨霍乱病脉证并治",
        "domain": "霍乱·差后劳复",
        "tiao": 1,
        "durationSec": 17.58,
        "file": "SHL_13_辨霍乱病脉证并治.mp4",
        "source": {
          "theta": -90,
          "phi": -59.6,
          "u": [
            0,
            -0.5064,
            -0.8623
          ],
          "color": "#76AC41"
        },
        "theta": -59.6,
        "phi": 270,
        "r": 1,
        "colorSource": "#76AC41",
        "colorDerived": "#8DA150",
        "colorMatch": false
      },
      {
        "code": "S14",
        "juan": "14",
        "name": "辨阴阳易差后劳复病脉证并",
        "domain": "霍乱·差后劳复",
        "tiao": 1,
        "durationSec": 22.17,
        "file": "SHL_14_辨阴阳易差后劳复病脉证并.mp4",
        "source": {
          "theta": -82,
          "phi": -59.6,
          "u": [
            0.0705,
            -0.5015,
            -0.8623
          ],
          "color": "#71AC41"
        },
        "theta": -59.6,
        "phi": 278,
        "r": 1,
        "colorSource": "#71AC41",
        "colorDerived": "#8D9C56",
        "colorMatch": false
      },
      {
        "code": "S15",
        "juan": "15",
        "name": "辨可发汗病脉证并治",
        "domain": "汗吐下诸可不可",
        "tiao": 34,
        "durationSec": 314.58,
        "file": "SHL_15_辨可发汗病脉证并治.mp4",
        "source": {
          "theta": -120,
          "phi": -45.6,
          "u": [
            -0.3499,
            -0.6061,
            -0.7143
          ],
          "color": "#47A650"
        },
        "theta": -45.6,
        "phi": 240,
        "r": 1,
        "colorSource": "#47A650",
        "colorDerived": "#789C4F",
        "colorMatch": false
      },
      {
        "code": "S16",
        "juan": "16",
        "name": "辨阴阳易差后劳复病脉证并",
        "domain": "霍乱·差后劳复",
        "tiao": 32,
        "durationSec": 211.5,
        "file": "SHL_16_辨阴阳易差后劳复病脉证并.mp4",
        "source": {
          "theta": -74,
          "phi": -46.4,
          "u": [
            0.19,
            -0.6625,
            -0.7245
          ],
          "color": "#43A25B"
        },
        "theta": -46.4,
        "phi": 286,
        "r": 1,
        "colorSource": "#43A25B",
        "colorDerived": "#66926C",
        "colorMatch": false
      },
      {
        "code": "S17",
        "juan": "17",
        "name": "辨不可发汗病脉证并治",
        "domain": "汗吐下诸可不可",
        "tiao": 33,
        "durationSec": 297.83,
        "file": "SHL_17_辨不可发汗病脉证并治.mp4",
        "source": {
          "theta": -112,
          "phi": -46,
          "u": [
            -0.2602,
            -0.644,
            -0.7194
          ],
          "color": "#45A454"
        },
        "theta": -46,
        "phi": 248,
        "r": 1,
        "colorSource": "#45A454",
        "colorDerived": "#739B54",
        "colorMatch": false
      },
      {
        "code": "S18",
        "juan": "18",
        "name": "辨可发汗病脉证并治",
        "domain": "汗吐下诸可不可",
        "tiao": 144,
        "durationSec": 1160.08,
        "file": "SHL_18_辨可发汗病脉证并治.mp4",
        "source": {
          "theta": -104,
          "phi": 1.1,
          "u": [
            -0.2419,
            -0.9701,
            0.0185
          ],
          "color": "#2274B2"
        },
        "theta": 1.1,
        "phi": 256,
        "r": 1,
        "colorSource": "#2274B2",
        "colorDerived": "#486DAB",
        "colorMatch": false
      },
      {
        "code": "S19",
        "juan": "19",
        "name": "辨发汗后病脉证并治",
        "domain": "汗吐下诸可不可",
        "tiao": 148,
        "durationSec": 1088.33,
        "file": "SHL_19_辨发汗后病脉证并治.mp4",
        "source": {
          "theta": -96,
          "phi": 2.8,
          "u": [
            -0.1044,
            -0.9934,
            0.0481
          ],
          "color": "#1D6CC4"
        },
        "theta": 2.8,
        "phi": 264,
        "r": 1,
        "colorSource": "#1D6CC4",
        "colorDerived": "#326AC4",
        "colorMatch": false
      },
      {
        "code": "S20",
        "juan": "20",
        "name": "辨不可下病脉证并治",
        "domain": "汗吐下诸可不可",
        "tiao": 1,
        "durationSec": 17,
        "file": "SHL_20_辨不可下病脉证并治.mp4",
        "source": {
          "theta": -88,
          "phi": -59.6,
          "u": [
            0.0177,
            -0.5061,
            -0.8623
          ],
          "color": "#75AC41"
        },
        "theta": -59.6,
        "phi": 272,
        "r": 1,
        "colorSource": "#75AC41",
        "colorDerived": "#8D9F52",
        "colorMatch": false
      },
      {
        "code": "S21",
        "juan": "21",
        "name": "辨可下病脉证并治",
        "domain": "汗吐下诸可不可",
        "tiao": 1,
        "durationSec": 16.83,
        "file": "SHL_21_辨可下病脉证并治.mp4",
        "source": {
          "theta": -80,
          "phi": -59.6,
          "u": [
            0.0879,
            -0.4987,
            -0.8623
          ],
          "color": "#70AC42"
        },
        "theta": -59.6,
        "phi": 280,
        "r": 1,
        "colorSource": "#70AC42",
        "colorDerived": "#8D9B57",
        "colorMatch": false
      },
      {
        "code": "S22",
        "juan": "22",
        "name": "辨不可下病脉证并治",
        "domain": "汗吐下诸可不可",
        "tiao": 36,
        "durationSec": 441.42,
        "file": "SHL_22_辨不可下病脉证并治.mp4",
        "source": {
          "theta": -72,
          "phi": -44.7,
          "u": [
            0.2195,
            -0.6756,
            -0.7038
          ],
          "color": "#3EA15D"
        },
        "theta": -44.7,
        "phi": 288,
        "r": 1,
        "colorSource": "#3EA15D",
        "colorDerived": "#62916E",
        "colorMatch": false
      },
      {
        "code": "S23",
        "juan": "23",
        "name": "辨太阴病脉证并治（提纲起",
        "domain": "太阴病",
        "tiao": 1,
        "durationSec": 22,
        "file": "SHL_23_辨太阴病脉证并治(提纲起.mp4",
        "source": {
          "theta": 8,
          "phi": -59.6,
          "u": [
            0.5015,
            0.0705,
            -0.8623
          ],
          "color": "#82A342"
        },
        "theta": -59.6,
        "phi": 8,
        "r": 1,
        "colorSource": "#82A342",
        "colorDerived": "#B08B50",
        "colorMatch": false
      },
      {
        "code": "S24",
        "juan": "24",
        "name": "辨厥阴病脉证并治（提纲起",
        "domain": "厥阴病",
        "tiao": 30,
        "durationSec": 351.33,
        "file": "SHL_24_辨厥阴病脉证并治(提纲起.mp4",
        "source": {
          "theta": -60,
          "phi": -47.3,
          "u": [
            0.3392,
            -0.5875,
            -0.7347
          ],
          "color": "#46A159"
        },
        "theta": -47.3,
        "phi": 300,
        "r": 1,
        "colorSource": "#46A159",
        "colorDerived": "#6B8D70",
        "colorMatch": false
      },
      {
        "code": "S25",
        "juan": "25",
        "name": "辨可下病脉证并治",
        "domain": "汗吐下诸可不可",
        "tiao": 125,
        "durationSec": 1226.33,
        "file": "SHL_25_辨可下病脉证并治.mp4",
        "source": {
          "theta": -64,
          "phi": -7,
          "u": [
            0.4351,
            -0.8921,
            -0.1218
          ],
          "color": "#217AA3"
        },
        "theta": -7,
        "phi": 296,
        "r": 1,
        "colorSource": "#217AA3",
        "colorDerived": "#4862BC",
        "colorMatch": false
      },
      {
        "code": "S26",
        "juan": "26",
        "name": "辨发汗吐下后病脉证并治",
        "domain": "汗吐下诸可不可",
        "tiao": 65,
        "durationSec": 826.67,
        "file": "SHL_26_辨发汗吐下后病脉证并治.mp4",
        "source": {
          "theta": -56,
          "phi": -32.4,
          "u": [
            0.4719,
            -0.6997,
            -0.5364
          ],
          "color": "#2F966F"
        },
        "theta": -32.4,
        "phi": 304,
        "r": 1,
        "colorSource": "#2F966F",
        "colorDerived": "#598482",
        "colorMatch": false
      },
      {
        "code": "S27",
        "juan": "27",
        "name": "辨太阴病脉证并治（提纲起",
        "domain": "太阴病",
        "tiao": 186,
        "durationSec": 1485.67,
        "file": "SHL_27_辨太阴病脉证并治(提纲起.mp4",
        "source": {
          "theta": 16,
          "phi": 18.9,
          "u": [
            0.9096,
            0.2608,
            0.3234
          ],
          "color": "#4F689F"
        },
        "theta": 18.9,
        "phi": 16,
        "r": 1,
        "colorSource": "#4F689F",
        "colorDerived": "#6F53B0",
        "colorMatch": false
      }
    ],
    "domains": [
      {
        "order": 1,
        "name": "序跋·目录",
        "episodes": [
          "00",
          "01"
        ],
        "pianLike": 2,
        "tiao": 117,
        "durationSec": 1589,
        "theta": -27.92354276143558,
        "phi": 186.59399900927468,
        "r": 1,
        "u": [
          -0.8777282682716857,
          -0.10146346537424805,
          -0.46829291289857916
        ],
        "colorDerived": "#CE9D17",
        "colorAggregateNote": "颜色由聚合方向重算（规范 §10 域聚合）"
      },
      {
        "order": 2,
        "name": "脉法·伤寒例",
        "episodes": [
          "02"
        ],
        "pianLike": 1,
        "tiao": 61,
        "durationSec": 957.92,
        "theta": -34.1,
        "phi": 209.99999999999997,
        "r": 1,
        "u": [
          -0.7171212856493231,
          -0.41403016731124725,
          -0.5606389945632417
        ],
        "colorDerived": "#8C9B3D",
        "colorAggregateNote": "颜色由聚合方向重算（规范 §10 域聚合）"
      },
      {
        "order": 3,
        "name": "太阳病",
        "episodes": [
          "03",
          "04",
          "05",
          "06"
        ],
        "pianLike": 4,
        "tiao": 566,
        "durationSec": 5120.75,
        "theta": 34.04281876760228,
        "phi": 107.86726963257527,
        "r": 1,
        "u": [
          -0.25423118885209184,
          0.7886549812597553,
          0.5598123106444043
        ],
        "colorDerived": "#757853",
        "colorAggregateNote": "颜色由聚合方向重算（规范 §10 域聚合）"
      },
      {
        "order": 4,
        "name": "阳明病",
        "episodes": [
          "07",
          "09"
        ],
        "pianLike": 2,
        "tiao": 134,
        "durationSec": 1300.84,
        "theta": -3.9557908257120946,
        "phi": 67.96971503179572,
        "r": 1,
        "u": [
          0.3742029860742767,
          0.9247772463328412,
          -0.06898673697271425
        ],
        "colorDerived": "#B73351",
        "colorAggregateNote": "颜色由聚合方向重算（规范 §10 域聚合）"
      },
      {
        "order": 5,
        "name": "少阳病",
        "episodes": [
          "08",
          "10",
          "11"
        ],
        "pianLike": 3,
        "tiao": 64,
        "durationSec": 588.42,
        "theta": -45.55080093946154,
        "phi": 34.351568213248626,
        "r": 1,
        "u": [
          0.5781418867771922,
          0.3951446078375226,
          -0.7138716254696208
        ],
        "colorDerived": "#8F7C53",
        "colorAggregateNote": "颜色由聚合方向重算（规范 §10 域聚合）"
      },
      {
        "order": 6,
        "name": "太阴病",
        "episodes": [
          "12",
          "23",
          "27"
        ],
        "pianLike": 3,
        "tiao": 194,
        "durationSec": 1535.67,
        "theta": 16.545358735252407,
        "phi": 15.643361052777035,
        "r": 1,
        "u": [
          0.9230870724724094,
          0.25848374538555186,
          0.28477431416083515
        ],
        "colorDerived": "#744FB2",
        "colorAggregateNote": "颜色由聚合方向重算（规范 §10 域聚合）"
      },
      {
        "order": 7,
        "name": "霍乱·差后劳复",
        "episodes": [
          "13",
          "14",
          "16"
        ],
        "pianLike": 3,
        "tiao": 34,
        "durationSec": 251.25,
        "theta": -47.19996014005069,
        "phi": 285.4783636886164,
        "r": 1,
        "u": [
          0.18132567161858779,
          -0.654799343605114,
          -0.7337293918239749
        ],
        "colorDerived": "#68936B",
        "colorAggregateNote": "颜色由聚合方向重算（规范 §10 域聚合）"
      },
      {
        "order": 8,
        "name": "汗吐下诸可不可",
        "episodes": [
          "15",
          "17",
          "18",
          "19",
          "20",
          "21",
          "22",
          "25",
          "26"
        ],
        "pianLike": 9,
        "tiao": 587,
        "durationSec": 5389.07,
        "theta": -12.688875363023064,
        "phi": 272.50215227213806,
        "r": 1,
        "u": [
          0.0425906921838353,
          -0.9746470787017123,
          -0.21965678891743826
        ],
        "colorDerived": "#4672B0",
        "colorAggregateNote": "颜色由聚合方向重算（规范 §10 域聚合）"
      },
      {
        "order": 9,
        "name": "厥阴病",
        "episodes": [
          "24"
        ],
        "pianLike": 1,
        "tiao": 30,
        "durationSec": 351.33,
        "theta": -47.3,
        "phi": 300,
        "r": 1,
        "u": [
          0.3390798349340353,
          -0.5873035019278174,
          -0.7349145951499599
        ],
        "colorDerived": "#6B8D6F",
        "colorAggregateNote": "颜色由聚合方向重算（规范 §10 域聚合）"
      }
    ]
  }
};
window.TCMAI_SEMTENSOR_ANNOTATIONS = {
  "图注-总览.txt": "# 图注 · 总览 · 三维极坐标语义张量\n# 三段制：[球] / [参数] / [图注正文]。改本文件即改图（规范 §9）。\n# 本文件是 standards/semtensor/annotations/图注-总览.txt 的镜像，构建期注入站点。\n\n[球]\nno = 0\nname = 总览\nsex = 合计\nsign = 1,1,1\nangle_x = 0\nangle_y = 45\nangle_z = 90\nxy_face = 代表值\nmirror_point_cloud = true\n\n[参数]\nrings = 45\nseg = 70\nazimuth_step_deg = 30\narrow_head = 13\ncloud_point_size = 9\ncloud_alpha_rim = 0.95\ncloud_alpha_face = 0.30\nview_elev_deg = 20\nview_azim_deg = -60\n\n[图注正文]\n画布内不出现汉字：球面图内只用 X/Y/Z、I/O/T、θ/φ 数字与圈号 ①②③。\n所有汉字母语（域名单、口径说明）全部下沉到本图注与右侧读数面板。\n\n一、口径（v1.0 仰角口径）\n  r  ∈ (0, 1]        径向距离 = 语义张量尺度\n  θ  ∈ [-90°, +90°]  仰角 elevation（赤道 0，天顶 +90°，天底 -90°）\n  φ  ∈ [0°, 360°)    方位角 azimuth（自 +X 轴起算，绕 +Z 轴逆时针）\n  球 → 笛：X = r·cosθ·cosφ ; Y = r·cosθ·sinφ ; Z = r·sinθ\n\n二、轴端色表（母子父三球共用同一张）\n      I (-1)              O (0)              T (+1)\n  X   橙 605nm #FF8C00    绿 533nm #00B050   紫 415nm #8A2BE2\n  Y   蓝 458nm #1F61D9    绿 533nm #00B050   红 685nm #DB1C1C\n  Z   黄 578nm #F2C200    绿 533nm #00B050   青 493nm #00C7C7\n\n三、轴语义\n  X 阴阳轴（左右）   I=阴   O=中（阴阳平和）  T=阳\n  Y 表里轴（前后）   I=表   O=半表半里        T=里\n  Z 精气神轴（足→首）I=精（形质）O=气（能量）T=神（神志情志）\n\n四、颜色公理\n  ramp(t, 轴)：在 [-1, 0, +1] 三色间逐通道线性插值\n  w_i = clip(|v_i|, 0, 1) ； k = max(w_i)\n  C = (1 - k)·绿 + k·( Σ w_i·c_i / Σ w_i )\n  性质：O 点任意轴都回到基准绿；三轴同强趋向三端色加权混合；镜像不变色。\n\n五、本页数字 ↔ 域名映射：内经 12 语义域\n  按内序均分环位 φ = (内序 - 1) × 30°，十二域正好闭合一周。\n  仰角 θ 承载「展开度」（篇占比归一后映射），r 承载尺度。\n\n   内序  域                篇  章    节    字数     θ        φ      r    合成色\n    1   病证·失常         40  331   661   35,487   90.0°     0°   1.00  #00C7C7\n    2   刺灸·术器         28  182   459   31,906   36.1°    30°   0.76  #4D768F\n    3   营卫·气血津液     15   92   143   10,158  -22.2°    60°   0.50  #A25B4E\n    4   经络·腧穴         15   85   260   19,359  -22.2°    90°   0.50  #D15418\n    5   形神·体质         12   88   182   11,264  -36.1°   120°   0.44  #A58420\n    6   天时·人应         11  231   578   34,672  -40.4°   150°   0.42  #9F951F\n    7   脉色·诊候         10   94   249   12,104  -44.8°   180°   0.40  #B0AA17\n    8   心神·认知         10   61    92    7,382  -44.8°   210°   0.40  #8EA038\n    9   治则·方药          7   93   205   12,668  -58.7°   240°   0.34  #9DA041\n   10   阴阳·数理骨架      6   31   127    6,317  -63.0°   270°   0.32  #98A34A\n   11   脏腑·藏象          5   23    85    3,893  -67.4°   300°   0.30  #A69A50\n   12   养生·治未病        3   12   105    2,956  -76.2°   330°   0.26  #C8A139\n  合计                   162 1323  3146  188,166\n\n六、本页数字 ↔ 域名映射：伤寒论九域（28 集，总 285 分钟）\n  序跋·目录 / 脉法·伤寒例 / 太阳病 / 阳明病 / 少阳病 / 太阴病 /\n  厥阴病 / 霍乱·差后劳复 / 汗吐下诸可不可\n  域位置由该域各集方向按「条数」加权平均后归一，颜色由聚合方向重新合成。\n\n七、待裁定项（详见规范 §14）\n  14.1 源数据集（SHL_目录.json）的「色」无法用本规范的颜色公理复现：\n       实测 28/28 不一致。本页一律使用按公理算出的颜色，不声称复现源系统配色。\n  14.2 内经域的球面映射是本仓库的本地约定，非规范原文。\n  14.3 母子父 A/B 方案：本文采 B + 反镜像补偿（三球同色）。\n  14.4 段内插值为 RGB 逐通道线性近似，非严格波长→sRGB 转换。\n"
};
