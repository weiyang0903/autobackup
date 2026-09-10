# CHANGELOG

## 2026-09-10 - 多数据库独立拆分导出与 ZIP 单包独立存放

### 新增
- 备份引擎新增多数据库独立拆分导出机制：同时勾选多个数据库时，依次为各数据库单独调用 mysqldump 生成各自独立的专属 `.sql` 文件（如 `db1_...sql` 和 `db2_...sql`），并在元数据中记录 `filePaths` 路径数组。
- ZIP 打包下载支持多 SQL 文件并列存放：点击下载包含多个数据库的备份时，同一个 ZIP 压缩包内将并列包含各个独立的 `.sql` 脚本文件与源文件夹。

### 修改
- 历史记录删除与清理逻辑扩展支持遍历删除 `filePaths` 中的所有独立 SQL 文件。
- 同步更新 `docs/MANUAL_BACKUP.md`、`docs/SCHEDULED_BACKUP.md`、`docs/BACKUP_HISTORY_MANAGEMENT.md` 现行文档。

## 2026-09-10 - ZIP 下载精准定向打包与手动备份安全独立删除改造

### 修复
- 修复 ZIP 打包下载混入同目录下其他备份文件的缺陷：重构 `/api/backup/download` 打包机制，严格按被点击备份记录（Record Metadata）精准只添加其专属的 SQL 文件及关联复制文件夹，杜绝同一日期目录下多个 Manual 或 Scheduled 备份被一并打包。
- 修复历史记录物理删除可能误删同日期其他手动备份的问题：重构 `/api/history` DELETE 路由，手动备份仅删除专属 SQL 文件及源文件夹，保留同目录下的其他手动备份文件，并在该日期目录完全变空时才向上递归清理空目录。

### 修改
- 同步更新 `docs/BACKUP_HISTORY_MANAGEMENT.md`，完善记录级精准隔离打包规范与手动/定时安全物理删除规则及错误处理表。

## 2026-09-09 - 修复 ZIP 下载 archiver 模块加载与删除备份空父目录清理

### 新增
- 根目录下新增 `initial.sql` 与 `demo.sql` 测试脚本，支持新服务器快速导入基础库与演示业务数据以进行多库备份测试。
- 新增 `cleanEmptyParentDirectories` 递归清理机制，在删除单次备份后自动向上递归清理空的日期目录及规则专属目录，杜绝磁盘空文件夹残留。

### 修复
- 修复 `archiver` 初始化与打包异常：解决 Archiver v8 ESM 命名导出模式变更导致的 `Failed to initialize zip compression engine` 错误，实现对 Archiver v8 `ZipArchive` 类与历史版本工厂函数（`archiver('zip', ...)`）的双向安全兼容适配，并在 `next.config.ts` 中配置 `serverExternalPackages: ["mysql2", "node-cron", "archiver"]`。

### 修改
- 更新 `docs/DEPLOYMENT.md` 部署指南，补充 `initial.sql` 和 `demo.sql` 的作用、结构与导入使用说明。
- 更新 `docs/BACKUP_HISTORY_MANAGEMENT.md`，完善空父目录向上递归清理流程与异常处理说明。

## 2026-09-09 - 定时调度支持多源文件夹备份与一键 ZIP 打包下载

### 新增
- 定时任务新增支持添加一个或多个源文件夹路径进行递归复制备份。
- 历史记录下载功能升级为使用 archiver 将 SQL 文件与备份文件夹完整流式压缩打包为 ZIP 文件提供下载。
- 新增源文件夹存在性、目录属性、读权限以及防自包含死循环校验函数。

### 修改
- 导出引擎与调度器扩展支持数据库与源文件夹的组合备份与总体积计算。
- 历史记录删除操作升级为递归清理时间点备份目录。
- 重写 docs/SCHEDULED_BACKUP.md、docs/BACKUP_HISTORY_MANAGEMENT.md 现行文档及相关示例模板。

## 2026-09-09 - 备份存储路径多层级精细化归档改造

### 新增
- 手动导出文件结构升级为自动存入 Immediate_Manual_Export/YYYY-MM-DD/ 两级子目录。
- 定时调度文件结构升级为自动存入 scheduleName_id/YYYY-MM-DD/HH_mm_ss/ 三级深度子目录。
- 导出引擎新增规则名称安全转义与多级子目录递归创建支持。

### 修改
- 调度器触发时透传 scheduleId 以精确生成专属归档目录。
- 重写 docs/MANUAL_BACKUP.md、docs/SCHEDULED_BACKUP.md、docs/BACKUP_HISTORY_MANAGEMENT.md 现行文档与 data/history.json.example 模板。

## 2026-09-09 - 备份文件按当天日期创建子目录归档存储

### 新增
- 备份导出引擎新增按当天日期（YYYY-MM-DD）自动创建子文件夹并智能追加写入功能。

### 修改
- 优化 mysqldump 导出路径生成与历史记录元数据结构，文件物理路径和下载逻辑完整适配日期子目录。
- 同步更新 docs/MANUAL_BACKUP.md、docs/SCHEDULED_BACKUP.md、docs/BACKUP_HISTORY_MANAGEMENT.md 现行文档与 data/history.json.example 模板。

## 2026-09-09 - 定时备份调度器可视化改造与多时间点支持

### 新增
- 实现 Every Hour、Daily 与 Weekly 三档全可视化频率配置与交互面板。
- 实现 Daily 与 Weekly 模式下一个或多个具体时间点（HH:mm）自由添加与移除功能。
- 实现 Weekly 模式下周一至周日任意天数自由多选功能。
- 实现单规则多 Cron 表达式自动编译算法与服务端严格格式校验。

### 修改
- 调度器生命周期管理升级为支持单个规则绑定与控制多个活动定时任务实例。
- 调度规则列表展示升级为直观的人类可读描述格式。
- 重写 docs/SCHEDULED_BACKUP.md 现行文档与 data/schedules.json.example 模板。

### 删除
- 移除原有的复杂手写 Cron 表达式输入框与旧版简易下拉预设。

## 2026-09-09 - XAMPP MySQL 自动备份系统初始化与全功能实现

### 新增
- 基于 Next.js、React、TypeScript 与 Tailwind CSS 实现全栈 XAMPP MySQL 自动备份管理控制台。
- 实现 MySQL 数据库自动发现、过滤系统库、多选与实时搜索功能。
- 实现即时手动导出功能，调用 mysqldump 生成带时间戳的 SQL 文件并支持自定义保存路径与临时文件原子写入保护。
- 基于 node-cron 实现周期性自动备份调度引擎，支持常用预设周期与自定义 Cron 表达式。
- 实现备份历史记录审计与管理，支持一键浏览器流式下载 SQL 文件与物理文件联动清理。
- 建立本地 JSON 数据持久化体系并提供对应的 .example 模板文件与 Git 忽略配置。
- 新增 docs 目录下的完整功能文档库与包含开发模式及生产模式的 DEPLOYMENT.md 部署指南。
