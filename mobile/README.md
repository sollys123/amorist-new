# Amorist Mobile — 独立移动端 PWA

Amorist 的手机 App 版位于仓库的 `mobile/`，与原有桌面/公开站完全隔离。本版本直接复用原项目的全部九个内容模块与原始数据模型，未修改仓库根目录的公开网页。

## 访问与安装

GitHub Pages 从 `main` 分支的根目录发布后：

- 移动端：<https://sollys123.github.io/amorist-new/mobile/>
- 原公开站：<https://sollys123.github.io/amorist-new/>

iPhone：使用 Safari 打开移动端，点击“分享”→“添加到主屏幕”，然后从主屏幕图标进入。Android：在 Chrome 打开移动端，选择“安装应用”。

首次使用请联网。应用会把已经发布的 `data/amorist-data.json` 导入手机的本地编辑空间。之后的修改自动保存在本机，**不会自动公开**；只有主动“发布”时，才会更新访客看到的网站。

> 注意：主屏幕应用与 Safari 的本地数据并不保证共用。换设备、清除网站数据、卸载应用之前，请先在“管理与发布”里“导出完整备份”。

## 功能模块

底部：**主页、游戏、角色、日历、更多**；“更多”提供完整的 **REPO 制作、作品索引、御签所、推角展示、图文创作**及发布管理。原编辑器未删除。REPO 有手机“快捷填写”和原“画布与排版”两种模式，可按需切换。

## 备份、离线与发布

“管理与发布”包括：

- 本地档案与 REPO 自动保存；完整 JSON 备份/恢复，包含本地存储和 IndexedDB 图像/REPO 存档。
- 基础代码和公开数据离线缓存；可选下载全套图片素材（当前约 45 MB，237 张），不占用源代码包大小。
- 一键向 GitHub 发布：写入同一个 `data/amorist-data.json`，上传手机新增图片到 `assets/user-media/`，原公开站依旧自动读取该文件。
- 防止覆盖另一设备更新：发布前读取 GitHub 远端内容 SHA，变化时拒绝覆盖。请在不同设备之间避免同时编辑；出现冲突时先分别导出备份，再对照合并。

### 首次连接 GitHub

GitHub 不允许直接把可公开的 PWA 当作可信的私有后台，因此手机发布需要你的 GitHub 授权。此版本使用 GitHub 官方的 **fine-grained Personal Access Token**，由你自己创建并输入：

1. 打开 <https://github.com/settings/personal-access-tokens/new>，选择资源所有者和 `amorist-new` 这一个仓库。
2. 只授予 **Repository permissions → Contents: Read and write**，尽量设置有效期；无需其他仓库授权。
3. 在手机 App 的“管理与发布”里粘贴 token 并点击“连接 / 解锁 GitHub”，之后勾选“我已检查发布内容”即可一键发布。
4. 可选设置至少八位的“设备密码”，使用 PBKDF2+AES-GCM 加密储存 token。**不设设备密码则授权只保留当前运行会话，刷新需要重新输入；token 永远不会写进公开站的 JSON。**

GitHub Pages 会在仓库更新后由 GitHub 自动构建。发布动作是更新公开仓库，**会让已选中的档案资料真正对任何访客可见**，请在首次发布之前确认内容。

## 技术说明

- `index.html`：手机入口，沿用原全部九个视图，保留原有 HTML 表单与编辑控件。
- `app.css`：移动端布局、底部导航、系统安全区域、原生弹层、完整高级画布模式。
- `bootstrap.js`：首次导入公开档案、之后保护本机独立草稿。
- `app.js`：移动导航、REPO 双模式、备份与离线资源管理。
- `publish.js`：安全授权、发布资料打包、图片上传、GitHub SHA 冲突检查。
- `sw.js`：限制作用域在 `/mobile/` 的 Service Worker，不控制桌面公开站。
- `manifest.webmanifest`、`icon-*.png`、`icon.svg`：独立可安装 PWA。
- `qa.mjs`、`qa-browser.mjs`：静态完整性和模拟 iPhone 的真实浏览器交互测试。

可执行 `node mobile/qa.mjs`，以及配合本地 HTTP Server + Playwright 执行浏览器测试。GitHub Actions 会在变更时自动运行上述校验。

## 已知边界

iOS PWA 不等于 App Store 原生应用，权限、存储配额、分享/下载与离线行为受 Safari/WKWebView 限制；系统可能清理长期未使用的本地缓存。移动端没有把原来的桌面高级排版能力删掉，但复杂 REPO 图像导出、部分远程搜索/API 和首次 GitHub 真正发布仍可能依赖网络。GitHub 授权后的实际发布需要账号所有者本人完成首次连接，CI 测试不会使用任何私人密钥进行真实公开内容写入。
