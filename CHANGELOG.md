# CHANGELOG

## 2026-09-09 - XAMPP MySQL 自动备份系统初始化与全功能实现

### 新增
- 基于 Next.js、React、TypeScript 与 Tailwind CSS 实现全栈 XAMPP MySQL 自动备份管理控制台。
- 实现 MySQL 数据库自动发现、过滤系统库、多选与实时搜索功能。
- 实现即时手动导出功能，调用 mysqldump 生成带时间戳的 SQL 文件并支持自定义保存路径与临时文件原子写入保护。
- 基于 node-cron 实现周期性自动备份调度引擎，支持常用预设周期与自定义 Cron 表达式。
- 实现备份历史记录审计与管理，支持一键浏览器流式下载 SQL 文件与物理文件联动清理。
- 建立本地 JSON 数据持久化体系并提供对应的 .example 模板文件与 Git 忽略配置。
- 新增 docs 目录下的完整功能文档库与包含开发模式及生产模式的 DEPLOYMENT.md 部署指南。
