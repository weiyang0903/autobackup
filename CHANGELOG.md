# CHANGELOG

## 2026-10-15 - 全面重构 README 与完善功能文档库规范

### 新增
- 针对 `README.md` 进行全面规范化重构：新增隐私与安全体系（Local-First、RBAC 细粒度权限、scrypt 加盐防碰撞、Web Crypto 会话签名、路径穿透与死循环防御）、详细项目结构树目录、系统备注与运行要求、开源社区致谢致敬名单等七大核心板块。
- 为 `docs/DATABASE_SELECTION.md`、`docs/MANUAL_BACKUP.md` 与 `docs/SCHEDULED_BACKUP.md` 补齐对应的服务端 RESTful API 接口规范、入参载荷与成功响应示例。

### 修改
- 校准 `docs/BACKUP_HISTORY_MANAGEMENT.md` 中无权删除备份时抛出的精确错误文案（与实际 API 保持一致：`Forbidden: Only administrators can delete backup history and files`）。
- 全面完善 `docs/` 下全部现行功能文档（`DATABASE_SELECTION.md`、`DEPLOYMENT.md`、`ENV_CONFIGURATION.md`、`MANUAL_BACKUP.md`、`SCHEDULED_BACKUP.md`、`BACKUP_HISTORY_MANAGEMENT.md`、`AUTHENTICATION_AND_USER_MANAGEMENT.md`）底部的“相关功能文档库”交叉索引导航，形成闭环文档体系。

## 2026-10-15 - 服务端监听端口调整为 3003

### 修改
- 将 Web 控制台服务默认监听端口从 3000 调整为 3003：同步更新 `package.json` 中的 `dev` 与 `start` 脚本命令（增加 `-p 3003`），更新 `.env` 与 `.env.example` 中的 `PORT=3003` 配置。
- 全面更新 `README.md`、`docs/DEPLOYMENT.md`、`docs/ENV_CONFIGURATION.md` 与 `docs/AUTHENTICATION_AND_USER_MANAGEMENT.md` 中所有涉及端口的访问链接、配置字典及故障排查说明。

## 2026-10-15 - 定时备份源文件夹支持可视化目录树浏览选择

### 新增
- 新增服务端本地目录安全浏览接口（`/api/system/browse-directories`）：支持探测 Windows 系统挂载盘符（`C:\`, `D:\` 等）及各层级子文件夹，过滤系统隐藏与受保护目录。
- 新增网页内嵌“目录浏览选择弹窗”组件（`DirectoryPickerModal`）：提供直观的驱动器盘符切换、路径面包屑、返回上一级、目录实时过滤与文件夹双击/单击选择能力。

### 优化
- 优化定时备份规则创建面板中“Source Folders to Backup”交互逻辑：输入框有路径时点击按钮直接添加；输入框为空时点击自动呼出目录选择弹窗供用户点选，输入框内同时配备专属浏览图标。

### 修改
- 同步更新 `docs/SCHEDULED_BACKUP.md` 现行功能文档中关于源文件夹直接输入与可视化点选的说明。

## 2026-10-15 - 修复数据初始化逻辑杜绝自动回填示例假数据

### 修复
- 修复 `safeReadJson` 在业务数据文件缺失时自动从 `.example` 拷贝示例数据导致产生假数据的问题：彻底移除自动拷贝 `.example` 文件的逻辑，当数据文件不存在时严格使用纯净的初始默认值（如历史记录与调度任务初始化为干净的空数组 `[]`），确保用户清空重置或全新部署时绝对不会出现模拟假数据。

## 2026-10-15 - 备份历史与调度状态后台静默实时自动同步

### 新增
- 新增前端 5 秒后台静默轮询机制：在用户停留在页面时，无需手动刷新（F5），后台自动同步 `/api/history` 与 `/api/schedules`，自动备份任务（Scheduled Backup）触发完成后新记录直接无缝实时呈现在表格中。
- 新增页面可见性感知（Page Visibility API）：当浏览器标签页处于后台时自动挂起轮询节省系统资源，切回页面时立即核对一次最新数据。

### 修改
- 优化历史表格与调度规则面板交互体验：静默更新过程完全不触发全屏骨架屏与 Loading 遮罩，杜绝屏幕闪烁；自动同步更新调度规则的上次执行时间（Last run）。
- 同步更新 `docs/BACKUP_HISTORY_MANAGEMENT.md` 与 `docs/SCHEDULED_BACKUP.md` 现行功能文档中的流程与规则说明。

## 2026-09-10 - 修复初始管理员密码哈希与模板有效性

### 修复
- 修复 `data/users.json` 及 `data/users.json.example` 中默认管理员密码哈希值与实际 scrypt 计算结果不一致的问题，校准为初始密码 `admin123` 对应的真实加盐哈希，确保部署后使用 `admin / admin123` 顺利开箱登录。

## 2026-09-10 - 用户登录认证与基于角色的权限控制 (RBAC) 系统

### 新增
- 新增登录认证与安全会话管理：引入基于 Web Crypto HMAC-SHA256 签名的轻量会话机制，通过 HttpOnly、SameSite 严格 Cookie 保证安全通信，未授权请求全站自动重定向至登录页 `/login`。
- 新增双角色权限控制体系（RBAC）：定义 Administrator（系统管理员）与 Operator（操作员）双角色；Operator 可执行手动备份、调度管理、查看与下载 ZIP 备份，但受严格约束——物理禁止删除历史备份与备份文件，无权访问用户管理模块。
- 新增用户管理与自服务密码修改功能：管理员可开通、启用/禁用、重置密码与删除普通操作员账号（内置管理员账号享有防自锁保护）；所有登录用户均可在顶部导航栏自服务修改个人密码。
- 新增数据操作审计追踪：手动备份记录与历史记录中自动注入当前登录用户的真实用户名（`triggeredBy`），实现安全审计可追溯。
- 新增独立技术规范文档 `docs/AUTHENTICATION_AND_USER_MANAGEMENT.md`，并在 `data/` 目录下提供开箱即用的模板 `users.json.example`。

### 修改
- 修改历史记录删除 API（`/api/history`）与表格视图：后端接口严格校验权限，非管理员用户请求删除时拒绝并返回 403 Forbidden；前端根据用户角色自动隐藏操作员界面中的 Delete 按钮。
- 修改全局中间件 `middleware.ts`：保护全站路由与 API 端点，对受保护接口提取用户上下文并通过 Header 传递至下游处理程序。
- 同步更新部署文档 `docs/DEPLOYMENT.md` 与环境变量规范 `docs/ENV_CONFIGURATION.md`，补充默认登录凭证与安全环境变量说明。
- 全面更新 `README.md`、`docs/BACKUP_HISTORY_MANAGEMENT.md`、`docs/MANUAL_BACKUP.md`、`docs/SCHEDULED_BACKUP.md` 与 `docs/DATABASE_SELECTION.md`，补齐权限矩阵约束、触发人审计追溯与各功能模块在登录态下的行为规范。

## 2026-09-10 - Automated Schedules 新建规则取消默认时间与星期预选

### 优化
- 优化定时任务（Schedule Manager）交互体验：移除 Daily 模式默认预设时间（`09:00`）与 Weekly 模式默认预设星期（`Mon`），初始状态保持空白由用户完全自主点选与添加。
- 完善空选状态下的校验拦截与提示文案，支持用户随时自由移除所有时间项与星期项，重置表单时自动清空。

### 修改
- 同步更新 `docs/SCHEDULED_BACKUP.md` 现行文档中的交互流程与规则说明。

## 2026-09-10 - 多数据库手动导出 ZIP 压缩包命名规则优化

### 优化
- 优化 Manual 导出下载 ZIP 文件名生成逻辑：多选数据库时不再取第 1 个数据库作为文件名，而是统一采用 `multiple_{count}_dbs_backup_{id}.zip`（如 `multiple_3_dbs_backup_b_1789001.zip`）格式命名，纯源文件夹备份采用 `{folderName}_backup_{id}.zip` 或 `multiple_{count}_folders_backup_{id}.zip` 命名，语义更准确清晰。

### 修改
- 同步更新 `docs/MANUAL_BACKUP.md` 与 `docs/BACKUP_HISTORY_MANAGEMENT.md` 中关于多库 ZIP 打包命名的规范说明。

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
