#!/usr/bin/env python3
"""把 content/rehab-data.json 同步生成 content/rehab-data.js。

网页以 JSON 为唯一数据源；rehab-data.js 仅在 file:// 本地双击打开
（fetch 读取 JSON 失败）时作为回退使用。修改 JSON 后运行：

    python3 tools/sync-data.py          # 生成 / 更新 rehab-data.js
    python3 tools/sync-data.py --check  # 仅检查两者是否一致
"""
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "content" / "rehab-data.json"
DST = ROOT / "content" / "rehab-data.js"

data = json.loads(SRC.read_text(encoding="utf-8"))
out = (
    "/* 自动生成，请勿手改：修改 content/rehab-data.json 后运行 python3 tools/sync-data.py */\n"
    "window.REHAB_DATA = " + json.dumps(data, ensure_ascii=False, indent=2) + ";\n"
)

if "--check" in sys.argv:
    if not DST.exists() or DST.read_text(encoding="utf-8") != out:
        sys.exit("rehab-data.js 与 rehab-data.json 不一致，请运行 python3 tools/sync-data.py")
    print("OK：rehab-data.js 与 rehab-data.json 一致")
else:
    DST.write_text(out, encoding="utf-8")
    print("已生成", DST.relative_to(ROOT))
