# Amorist

Amorist 是一个静态个人乙女游戏档案展示站，适合部署到 GitHub Pages。

## GitHub Pages 部署

仓库根目录需要保留：

```text
index.html
assets/
data/
README.md
```

在 GitHub 仓库的 `Settings → Pages` 中选择 `Deploy from a branch`，分支选择 `main`，目录选择 `/ (root)`。

## 更新个人数据

本项目只发布公开展示页。个人数据保存在 `data/amorist-data.json` 中。更新数据后替换该文件，使用 GitHub Desktop 提交并推送即可。

`assets/user-media/` 中的图片文件也需要一起上传，否则封面和角色图片会失效。
