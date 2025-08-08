
Run Game - 可部署到 GitHub Pages 的前端跑酷游戏示例

使用方法：
1. 将整个 run-game 目录上传到你的 GitHub 仓库（确保根目录含有 index.html）
2. 在仓库 Settings -> Pages，选择 main 分支和 root，然后保存
3. 访问 https://<你的用户名>.github.io/<仓库名>/ 即可在手机/电脑上玩

文件结构：
- index.html
- style.css
- script.js
- assets/ (图片与音效)

玩法：
- 手机：点击屏幕跳跃（支持二段跳）
- 电脑：空格跳

高分存储：使用 localStorage 保存 Best 分数
