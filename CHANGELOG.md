# CHANGELOG

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
