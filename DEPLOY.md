# 🚀 GitHub Pages 部署指南

## 快速部署步骤

### 1. 推送代码到 GitHub

```bash
# 确保所有更改已提交
git add .
git commit -m "Prepare for GitHub Pages deployment"

# 推送到 GitHub
git push origin main
```

### 2. 在 GitHub 上启用 GitHub Pages

1. 打开你的 GitHub 仓库页面
2. 点击右上角的 **Settings**（设置）
3. 在左侧菜单中找到 **Pages**（页面）
4. 在 **Source**（源）部分：
   - 选择 **Deploy from a branch**（从分支部署）
   - **Branch**（分支）选择 `main`
   - **Folder**（文件夹）选择 `/ (root)`（根目录）
5. 点击 **Save**（保存）

### 3. 访问你的网站

等待几分钟后，GitHub Pages 会自动生成你的网站地址：

```
https://你的用户名.github.io/仓库名/
```

例如：`https://sty891459799.github.io/sic-bo/`

## 📁 文件说明

- **index.html** - 主页面（需要外部 CSS 和 JS 文件）
- **index-standalone.html** - 单文件版本（所有代码内联，推荐用于 GitHub Pages）

## 🔧 使用单文件版本（推荐）

如果你想使用单文件版本（`index-standalone.html`），有两种方式：

### 方式一：重命名文件
将 `index-standalone.html` 重命名为 `index.html`（备份原文件）

### 方式二：创建 index.html 重定向
在 `index.html` 中添加自动跳转：

```html
<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="refresh" content="0; url=index-standalone.html">
</head>
<body>
    <p>正在跳转...</p>
</body>
</html>
```

## ✅ 验证部署

部署成功后，你应该能够：
- ✅ 访问网站并看到游戏界面
- ✅ 所有功能正常工作
- ✅ 样式和脚本正确加载

## 🔄 更新网站

每次推送代码到 `main` 分支后，GitHub Pages 会自动重新部署（通常需要几分钟）。

## 📝 注意事项

1. **首次部署**可能需要 5-10 分钟
2. **后续更新**通常需要 1-3 分钟
3. 确保所有文件都已推送到 GitHub
4. 检查浏览器控制台是否有错误

## 🐛 常见问题

### 网站显示 404
- 检查 GitHub Pages 设置是否正确
- 确认文件路径是否正确
- 等待几分钟后刷新

### 样式或脚本未加载
- 检查文件路径（GitHub Pages 使用相对路径）
- 确认所有文件都已推送到仓库
- 检查浏览器控制台的错误信息

### 想要使用自定义域名
1. 在仓库根目录创建 `CNAME` 文件
2. 文件中写入你的域名（如：`example.com`）
3. 在域名 DNS 设置中添加 CNAME 记录指向 `你的用户名.github.io`

---

**祝你部署顺利！** 🎉

