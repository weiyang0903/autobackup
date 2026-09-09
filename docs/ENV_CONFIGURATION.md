# 环境变量与配置项规范 (ENV_CONFIGURATION.md)

本文档说明本系统所有的环境变量配置项、数据存储方式、校验规则与错误处理机制。

---

## 1. 功能概述

系统通过根目录下的 `.env` 文件统一管理与底层 XAMPP 环境、MySQL 实例通信所需的连接参数及运行环境配置。同时提供 `.env.example` 供版本控制提交和新环境初始化使用。

---

## 2. 配置项字典

| 配置变量名 | 默认值 | 必填 | 说明 |
| :--- | :--- | :--- | :--- |
| `DB_HOST` | `127.0.0.1` | 是 | XAMPP MySQL 数据库主机地址，通常为本机 `127.0.0.1` 或 `localhost`。 |
| `DB_PORT` | `3306` | 是 | XAMPP MySQL 监听端口，默认为 `3306`。 |
| `DB_USER` | `root` | 是 | 连接 MySQL 的用户名，XAMPP 默认超级用户为 `root`。 |
| `DB_PASSWORD` | *(留空)* | 否 | MySQL 用户密码。XAMPP 默认安装时 root 密码为空。 |
| `MYSQLDUMP_PATH` | `C:\xampp\mysql\bin\mysqldump.exe` | 是 | XAMPP 原生提供的 `mysqldump` 可执行文件绝对路径。 |
| `DEFAULT_BACKUP_DIR` | `./backups` | 是 | 默认备份文件存放目录。支持相对路径或系统绝对路径（如 `D:\backups`）。 |
| `PORT` | `3000` | 否 | Web 控制台服务端监听端口。 |

---

## 3. 工作流程与加载机制

1. **环境初始化**：
   - Node.js 启动时由 Next.js 自动加载 `.env` 内容至 `process.env`；
   - 服务端库通过统一入口 `getDbConfig()` 获取配置。
2. **连接自检**：
   - 用户打开 Web 页面或点击 Refresh 时，后端 API `/api/system/status` 执行 `connection.ping()` 测试连通性；
   - 同时通过 `fs.existsSync()` 校验 `MYSQLDUMP_PATH` 是否真实存在。
3. **安全与 Git 保护**：
   - 真实含有密码或环境专有路径的 `.env` 纳入 `.gitignore`；
   - 仓库仅跟踪不含敏感信息的 `.env.example`。

---

## 4. 业务规则与边界约束

1. **零外部数据库依赖**：
   - 系统的配置（`config.json`）、定时规则（`schedules.json`）和备份历史（`history.json`）全部保存在 `data/` 目录下；
   - 严禁向用户 MySQL 内部创建配置表，杜绝因 MySQL 停机导致备份系统自身崩溃的死锁问题。
2. **原子写入安全**：
   - 对 `data/*.json` 的写入统一采用原子文件重命名机制（先写入 `.tmp` 临时文件，校验完整后原子替换），杜绝进程断电或中断产生损坏的 JSON 文件。

---

## 5. 错误处理与用户提示

| 异常情况 | 错误代码/现象 | 系统处理与界面提示 |
| :--- | :--- | :--- |
| **MySQL 未启动** | `ECONNREFUSED` | 界面顶部红框提示："Cannot connect to MySQL at 127.0.0.1:3306. Please make sure MySQL is started in XAMPP Control Panel."，阻止执行导出操作。 |
| **密码错误** | `ER_ACCESS_DENIED_ERROR` | 界面提示访问被拒绝，提示检查 `.env` 中的 `DB_PASSWORD`。 |
| **mysqldump 路径不存在** | 文件不存在 | 状态栏显示 "mysqldump Not Found"，并在导出时明确拦截提示路径错误。 |
| **`.env` 文件缺失** | 变量为空 | 自动回退至默认安全配置（`127.0.0.1:3306`, `root` 无密码）。 |
