# XAMPP MySQL 自动备份系统 (autobackup)

基于 **Node.js + React + TypeScript + Tailwind CSS (Next.js 全栈架构)** 的 XAMPP MySQL 自动化备份与管理控制台。

---

## 🌟 核心特性

- **可视化数据库选择**：自动发现 XAMPP 本地 MySQL 数据库，支持多选、实时搜索与表大小统计；
- **即时手动导出**：一键调用 `mysqldump` 进行原子安全备份，支持指定任意自定义保存路径；
- **周期性自动调度**：内置 Cron 定时器，支持每小时、每日、每周或自定义周期后台自动备份；
- **备份历史与下载**：完整的备份审计历史，支持一键浏览器流式下载 `.sql` 文件与物理文件联动清理；
- **用户认证与分权控制 (RBAC)**：支持管理员（Admin）与操作员（Operator）双角色权限隔离，全站会话保护与密码修改；
- **安全审计追踪**：备份历史记录严格绑定操作人员用户名（`triggeredBy`），非管理员账号物理禁止删除备份；
- **环境安全与解耦**：采用 `.env` + 本地 JSON 存储，即使 MySQL 关机系统也能正常启动并提供友好提示。

---

## 🚀 快速启动

详细部署与运行说明请参阅 [docs/DEPLOYMENT.md](file:///c:/xampp/htdocs/autobackup/docs/DEPLOYMENT.md)。

### 1. 配置环境
```cmd
copy .env.example .env
```

### 2. 开发模式 (Development)
```cmd
npm install
npm run dev
```
打开浏览器访问：`http://localhost:3000`（系统自动跳转至登录页 `/login`，默认账号密码：`admin / admin123`）。

### 3. 生产模式 (Production)
```cmd
npm run build
npm run start
```
打开浏览器访问：`http://localhost:3000`（默认管理员凭据：`admin / admin123`）。

---

## 📚 详细功能文档库

- 📖 [docs/DEPLOYMENT.md](file:///c:/xampp/htdocs/autobackup/docs/DEPLOYMENT.md) - 开发模式与生产模式部署指南
- ⚙️ [docs/ENV_CONFIGURATION.md](file:///c:/xampp/htdocs/autobackup/docs/ENV_CONFIGURATION.md) - 环境变量与配置项规范
- 🔐 [docs/AUTHENTICATION_AND_USER_MANAGEMENT.md](file:///c:/xampp/htdocs/autobackup/docs/AUTHENTICATION_AND_USER_MANAGEMENT.md) - 用户登录认证与基于角色的权限控制 (RBAC) 系统
- 🗄️ [docs/DATABASE_SELECTION.md](file:///c:/xampp/htdocs/autobackup/docs/DATABASE_SELECTION.md) - 数据库检索与多选功能
- ⚡ [docs/MANUAL_BACKUP.md](file:///c:/xampp/htdocs/autobackup/docs/MANUAL_BACKUP.md) - 即时手动导出备份功能
- ⏰ [docs/SCHEDULED_BACKUP.md](file:///c:/xampp/htdocs/autobackup/docs/SCHEDULED_BACKUP.md) - 定时自动备份调度功能
- 📂 [docs/BACKUP_HISTORY_MANAGEMENT.md](file:///c:/xampp/htdocs/autobackup/docs/BACKUP_HISTORY_MANAGEMENT.md) - 备份历史与文件管理功能