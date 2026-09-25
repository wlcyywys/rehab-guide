# rehab-guide · 运动医学术后康复指导网页

患者扫码即可在手机上查看的术后康复指导页（首期：**肘关节OA合并僵硬 · 关节镜松解术后四阶段康复**）。

- 线上地址（开启 GitHub Pages 后）：https://wlcyywys.github.io/rehab-guide/
- 二维码：`assets/qr/qr-pages.svg` / `assets/qr/qr-pages.png`
- 开发规格：见 [SPEC.md](SPEC.md)
- 文字数据：`content/rehab-data.json`（由康复海报转录，网页唯一数据源）
- 打印用二维码页：`qr.html`

## 页面

| 文件 | 内容 |
|---|---|
| `index.html` | 首页：医生信息、适用范围、康复时间轴（含“我是术后第几周？”）、危险信号、完整视频 |
| `stage1.html` … `stage4.html` | 四个阶段页：动作循环短视频、要点、注意事项、原始海报、阶段合集 |
| `qr.html` | 二维码 + 网址 + 医生信息，可 A4 打印张贴 |
| `css/style.css` · `js/app.js` | 样式与渲染脚本（纯静态，无构建步骤、无外部依赖） |

## 修改内容

1. **医生 / 医院信息**：只改 `content/rehab-data.json` 里的 `doctor` 字段（`name` / `clinic` / `contact`），首页和二维码页会自动显示。
2. **康复文字**：同样只改 `content/rehab-data.json`。
3. 改完后运行 `python3 tools/sync-data.py`，同步生成 `content/rehab-data.js`。这个文件只在本地双击打开 html（`file://`，浏览器禁止读取 JSON）时作为回退；线上网页直接读 JSON。可用 `python3 tools/sync-data.py --check` 检查两者是否一致。
4. 替换视频：保持同名文件（如 `assets/videos/moves/move01.mp4`）直接覆盖即可。

本地预览：`python3 -m http.server 8000` 后打开 http://localhost:8000/ （或直接双击 `index.html`）。

## 目录

| 路径 | 内容 |
|---|---|
| `assets/posters/` | 4 张原始康复海报（stage1–4） |
| `assets/videos/moves/` | 24 个动作的 5 秒循环短片（move01–24，720p H.264） |
| `assets/videos/stages/` | 4 个阶段合集视频 |
| `assets/videos/elbow-rehab-full.mp4` | 四阶段完整视频 |
| `assets/qr/` | 指向 Pages 网址的二维码 |

## 部署

Settings → Pages → Source: `Deploy from a branch` → `main` / `(root)`。

> 本页面仅供康复参考，请遵医嘱。仓库内不含任何患者信息。
