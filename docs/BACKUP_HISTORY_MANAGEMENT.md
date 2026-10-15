# 备份历史与文件管理功能 (BACKUP_HISTORY_MANAGEMENT.md)

本文档详细说明备份历史记录追溯、SQL 与备份文件夹一键 ZIP 流式打包下载、多层级物理路径定位、磁盘文件清理与空父目录自动清理联动的功能设计。

---

## 1. 功能概述

系统自动记录每一次手动或定时触发的备份执行结果，在页面提供清晰的审计表格。用户可以直接查看备份状态、耗时、总文件体积（包含 SQL 文件与复制的文件夹体积）、一键复制服务器物理路径、**一键将本次备份的所有 SQL 文件与文件夹完整打包为 `.zip` 压缩包下载到本地电脑**，并支持安全删除历史与磁盘文件，删除后自动清理变为空文件夹的父级目录。

---

## 2. 交互与操作流程

1. **历史记录展示与实时自动同步 (Real-time Silent Auto-sync)**：
   - **初次与手动刷新**：页面初始化或点击顶部 Refresh 时主动拉取 `/api/history`，呈现加载状态；
   - **5 秒后台静默轮询**：用户停留在页面上时，前端每隔 5 秒自动在后台静默请求 `/api/history`。当定时备份（Scheduled Backup）执行完成后，新备份记录将**自动实时呈现在表格顶部**，无需用户手动刷新网页；
   - **无闪烁设计 (Zero-flicker)**：静默轮询过程完全不触发骨架屏与 Loading 遮罩，保证用户查看与操作平滑流畅；
   - **页面可见性感知 (Visibility-aware)**：浏览器标签页最小化或切到后台时自动挂起轮询节省系统资源，切回页面时立即核对一次最新数据；
   - 列表展示：状态徽章（Success / Failed）、触发来源与操作人审计（`Manual (username)` / 调度名称）、目标数据库名与源文件夹名、相对路径、包含 SQL 与文件夹在内的总体积、执行耗时及时间戳。
2. **复制完整文件/目录路径**：
   - 点击路径前方的复制图标，系统将该次备份的完整绝对物理路径写入系统剪贴板，并显示绿勾反馈。
3. **一键精准 ZIP 打包下载**：
   - 针对状态为 Success 的记录，点击 **"Download ZIP"** 按钮；
   - 请求 `/api/backup/download?id=xxx`；
   - 后端基于 `archiver` 引擎**按当前记录元数据进行精准定向打包**：
     - 若当前记录包含多个数据库，则将每个数据库独立生成的专属 `.sql` 文件（`filePaths`）分别逐一加入同一个 ZIP 包根目录；
     - 若当前记录包含备份的源文件夹（`sourceFolders`），则只把本次复制的专属文件夹并列加入 ZIP 包；
   - 边流式压缩边响应推送到浏览器，直接保存为标准 `.zip` 文件：
     - **定时调度**：`{scheduleName}_backup_{id}.zip`；
     - **单库手动备份**：`{dbName}_backup_{id}.zip`；
     - **多库手动备份**：`multiple_{count}_dbs_backup_{id}.zip`（如 `multiple_3_dbs_backup_b_1789001.zip`）；
     - **纯源文件夹备份**：`{folderName}_backup_{id}.zip` 或 `multiple_{count}_folders_backup_{id}.zip`。
   - 解压后可看到各个数据库独立的 `.sql` 文件以及备份的源文件夹。
4. **安全删除与空目录联动清理（仅限 Administrator 权限）**：
   - **权限控制**：物理删除历史备份严格限制为 `admin` 角色。对于 `operator` 角色，表格操作列自动隐藏 Delete 按钮；若通过 API 尝试强行删除，后端将直接拦截并返回 403 Forbidden；
   - 点击操作列的删除图标；
   - 弹出确认对话框提示用户；
   - 确认后请求 `DELETE /api/history?id=xxx&deleteFile=true`：
     1. 从 `history.json` 中移除元数据记录；
     2. **手动备份删除**：仅删除属于该记录的专属 `.sql` 文件及复制文件夹，绝不误删同日期目录下的其他手动备份；
     3. **定时任务删除**：递归删除该次备份在磁盘上生成的时间点独立目录（`scheduleName_id/YYYY-MM-DD/HH_mm_ss`）；
     4. **自动向上递归清理空父目录**：若删除后使得父级目录（如日期目录 `2026-09-10` 或规则专属目录 `scheduleName_id`）变为空文件夹，系统将自动向上逐层删除，直到遇到非空目录或到达备份根目录 `backups/`。

---

## 3. 业务规则与流式下载安全

1. **记录级精准隔离 (Record-level Precision)**：
   - 打包与下载严格以单一历史记录为边界，不会跨记录打包同一个父目录下的其他备份文件。
2. **流式压缩防内存溢出 (OOM Prevention)**：
   - 后端采用 Stream 管道（Pipe Stream）机制将压缩数据块直接写入 HTTP 响应体，不把整个大文件载入内存，保证对几百 MB 甚至数 GB 备份的极速稳定下载。
3. **下载安全与防路径穿越**：
   - 下载接口仅接收合法的备份记录 `id`，从服务端存储的稳定元数据中读取真实目录路径；
   - 不允许客户端任意传参指定任意磁盘文件路径，杜绝路径穿越漏洞。
4. **物理目录丢失容错**：
   - 若用户在磁盘上手动删除了该目录或文件，点击下载时接口返回友好 404 提示："Backup file or folder does not exist on disk"。

---

## 4. 错误与校验处理机制 (Validation & Error Handling)

| 异常情况 | 触发原因 | 处理策略 |
| :--- | :--- | :--- |
| **缺少 Backup ID** | 请求 `/api/backup/download` 或 `DELETE /api/history` 未提供 `id` 参数 | 返回 HTTP 400 与错误提示："Backup ID is required" 或 "History ID is required"。 |
| **记录不存在** | 历史记录在 `history.json` 中已被删除 | 返回 HTTP 404 与错误提示："Backup record not found" 或 "History record not found"。 |
| **无权删除备份** | Operator 角色请求 `DELETE /api/history` | 返回 HTTP 403 与错误提示："Forbidden: Only administrators can delete backup history and files"。 |
| **物理文件或文件夹丢失** | 磁盘上的 `.sql` 文件或文件夹已被外部删除 | 返回 HTTP 404 与错误提示："Backup file or folder does not exist on disk"。 |
| **大文件压缩中断** | 客户端网络断开或取消下载 | Node.js 流式传输机制自动捕获并安全销毁归档器与文件流句柄。 |
| **删除时目录只读/占用** | 个别文件正被其他程序独占打开 | 捕获删除错误并记录日志，保证元数据正常清理。 |
| **父目录非空** | 同一日期目录下还有其他手动/定时备份 | 仅清理当前记录的文件/目录，保留父级日期目录与其兄弟备份文件。 |

---

## 5. 相关功能文档库

- 📖 [docs/DEPLOYMENT.md](DEPLOYMENT.md) - 开发模式与生产模式部署指南
- ⚙️ [docs/ENV_CONFIGURATION.md](ENV_CONFIGURATION.md) - 环境变量与配置项规范
- 🗄️ [docs/DATABASE_SELECTION.md](DATABASE_SELECTION.md) - 数据库检索与选择功能
- ⚡ [docs/MANUAL_BACKUP.md](MANUAL_BACKUP.md) - 即时手动导出备份功能
- ⏰ [docs/SCHEDULED_BACKUP.md](SCHEDULED_BACKUP.md) - 定时自动备份调度功能
- 🔐 [docs/AUTHENTICATION_AND_USER_MANAGEMENT.md](AUTHENTICATION_AND_USER_MANAGEMENT.md) - 用户登录认证与权限控制 (RBAC)


