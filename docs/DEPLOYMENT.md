# 项目部署与运行指南 (DEPLOYMENT.md)

本文档详细说明如何在本地或服务器环境中部署并运行 **XAMPP MySQL 自动备份系统 (autobackup)**。

---

## 1. 前置运行环境要求

在部署前，请确保目标机器已安装并配置好以下基础软件：

1. **Node.js**：建议使用 `v18.18.0` 或更高版本（支持最新 Next.js 运行环境）；
2. **XAMPP**：已安装并运行 XAMPP（支持 XAMPP Control Panel v3.2.2 及更高版本）；
3. **MySQL 服务**：确保在 XAMPP Control Panel 中已点击 **Start** 启动 MySQL 服务（默认端口 `3306`）；
4. **mysqldump 工具**：确保 XAMPP 安装目录中存在 `mysqldump.exe`（默认路径为 `C:\xampp\mysql\bin\mysqldump.exe`）。

---

## 2. 初始配置准备

无论采用开发模式还是生产模式，初次部署均需完成以下准备：

1. **克隆或放置项目源码**至目标工作目录（例如 `C:\xampp\htdocs\autobackup`）。
2. **复制环境变量文件**：
   在项目根目录下复制 `.env.example` 并重命名为 `.env`：
   ```cmd
   copy .env.example .env
   ```
3. **检查 `.env` 配置项**：
   打开 `.env` 文件，根据当前 XAMPP 环境确认或调整参数：
   ```env
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=
   MYSQLDUMP_PATH=C:\xampp\mysql\bin\mysqldump.exe
   DEFAULT_BACKUP_DIR=./backups
   PORT=3000
   ```
4. **安装项目依赖**：
   在项目根目录下执行安装命令（使用本地项目依赖）：
   ```cmd
   npm install
   ```

---

## 3. 运行模式一：Development（开发模式）

在开发模式下，系统**不需要提前执行 build**，支持热重载（Hot Module Replacement），适合调试与功能开发。

### 启动步骤：
```cmd
npm run dev
```

### 访问方式：
- 打开浏览器访问：`http://localhost:3000`
- 控制台将显示热编译日志与 API 调度器初始化状态。

---

## 4. 运行模式二：Production（生产/正式运行模式）

在生产模式下，系统**必须先完成构建打包（build）**，再启动高效稳定的常驻服务。

### 启动步骤：

#### 第一步：构建打包 (Build)
```cmd
npm run build
```
- 该命令将执行 TypeScript 类型检查、Tailwind CSS 压缩及 Next.js 页面与 API 的静态/服务端优化打包。

#### 第二步：启动服务 (Start)
```cmd
npm run start
```
- 服务将常驻运行在指定的端口（默认 `3000` 端口）。

### 访问方式：
- 打开浏览器访问：`http://localhost:3000`

---

## 5. 持久化数据与备份目录说明

- **配置与任务存储**：系统运行时产生的数据自动保存在 `data/` 目录（`config.json`, `schedules.json`, `history.json`），均已纳入 Git 忽略规则。
- **备份文件存放**：导出的 `.sql` 文件默认存放在 `./backups/` 目录，或用户指定的自定义绝对路径（如 `D:\mysql_backups`）。
- **定时任务守护**：只要 Node.js 进程保持运行，系统内置的调度引擎即可按设定时间在后台自动触发备份。

---

## 6. 常见故障排查

1. **页面提示 MySQL Connection Error**：
   - 请检查 XAMPP Control Panel 中 MySQL 是否处于绿色 `Running` 状态；
   - 检查 `.env` 中的 `DB_PORT` 是否与 XAMPP MySQL 端口一致（默认 `3306`）。
2. **页面提示 mysqldump Tool Missing**：
   - 检查 `.env` 中的 `MYSQLDUMP_PATH` 路径是否正确指向存在的 `mysqldump.exe`。
3. **端口被占用 (Port 3000 in use)**：
   - 可在 `.env` 中修改 `PORT=3001`，或使用 `npm run dev -- -p 3001` 指定端口启动。
