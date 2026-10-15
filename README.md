# XAMPP MySQL 自动备份与管理系统 (AutoBackup)

![Next.js 15](https://img.shields.io/badge/Next.js-15.2.1-black?style=flat-square&logo=next.js)
![React 19](https://img.shields.io/badge/React-19.0.0-61dafb?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38b2ac?style=flat-square&logo=tailwind-css)
![node-cron](https://img.shields.io/badge/node--cron-3.0-orange?style=flat-square)
![Platform](https://img.shields.io/badge/Platform-Windows_XAMPP-blue?style=flat-square)
![Port](https://img.shields.io/badge/Default_Port-3003-green?style=flat-square)

基于 **Node.js + React + TypeScript + Tailwind CSS (Next.js 全栈架构)** 构建的现代化、轻量级 XAMPP MySQL 自动化备份与系统管理控制台。

---

## 🌟 1. 项目简介 (Introduction)

**AutoBackup** 专为在 Windows 环境下运行的 XAMPP 本地开发与内网服务器量身打造，旨在解决传统 MySQL 备份依赖手写复杂批处理脚本、计划任务配置繁琐、缺乏执行审计和可视化交互的痛点。

系统采用**与 MySQL 解耦的本地优先（Local-First）架构**，所有任务调度、会话凭证和历史审计日志均采用原子写入机制持久化保存在本地 JSON 数据集中。**即使 MySQL 服务离线、停机或处于维护状态，控制台依然能够正常启动并提供友好的诊断指引。**

### 核心亮点特性
- **可视化数据库检索**：自动发现 XAMPP 本地 MySQL 数据库，支持实时不区分大小写模糊搜索、单库/多库勾选、一键全选以及实时表数量与存储体积统计。
- **即时手动导出**：一键调用 XAMPP 原生 `mysqldump.exe` 进行原子安全备份，支持导出单个或多个独立 `.sql` 文件，并允许自由指定任意自定义保存路径。
- **周期性自动调度 (Cron)**：内置常驻内存的 Cron 定时任务引擎，提供全可视化的周期配置面板（每小时整点、每日多时间点、每周多天多时间点），支持对已有规则进行全量编辑修改、启停切换（Pause/Resume），并支持将项目源文件夹（如静态上传目录 `uploads/`）与数据库一并打包归档。
- **可视化目录浏览选择**：内置 Windows 磁盘目录树浏览器，可自动识别挂载盘符（`C:\`, `D:\` 等）并支持层级展开点选，简化备份源路径配置。
- **流式 ZIP 打包与下载**：基于 `archiver` 引擎实现按历史记录精准隔离的 HTTP Chunked 流式归档下载，解压即可直接查看独立的 `.sql` 脚本与源文件夹。
- **安全审计与级联清理**：全流程记录触发方式与操作人员用户名（`triggeredBy`）；删除历史记录时联动清理物理文件，并自动自底向上递归清理变空的日期父级目录，杜绝磁盘残留。
- **用户认证与分权控制 (RBAC)**：内置管理员（Admin）与操作员（Operator）双角色权限隔离，全站受 Web Crypto HMAC-SHA256 签名会话与 HttpOnly Cookie 保护。
- **实时无感后台同步**：前端内置 5 秒后台静默轮询与 Page Visibility 页面可见性感知，自动捕获定时任务执行结果，无全屏 Loading 闪烁。

---

## 🚀 2. 快速启动 (Quick Start)

### 2.1 环境要求
- **Node.js**：`v18.18.0` 或更高版本（推荐使用 LTS 版本）；
- **XAMPP**：已在 Windows 上安装 XAMPP，并在 XAMPP Control Panel 中启动 **MySQL** 服务（默认端口 `3306`）；
- **mysqldump 工具**：确保 `C:\xampp\mysql\bin\mysqldump.exe` 真实存在。

### 2.2 安装步骤
```cmd
# 1. 进入项目根目录
cd c:\xampp\htdocs\autobackup

# 2. 复制环境变量配置文件
copy .env.example .env

# 3. 安装依赖包
npm install
```

### 2.3 默认登录凭据
系统开箱即用，初次启动时将自动初始化超级管理员账号：
- **访问地址**：`http://localhost:3003`
- **默认用户名**：`admin`
- **默认初始密码**：`admin123`（可在 `.env` 中通过 `INITIAL_ADMIN_PASSWORD` 预先自定义）

---

## 💻 3. 如何运行 (How to Run)

系统提供两种运行模式：适合二次开发调试的 **Development（开发模式）**，以及适合长期稳定运行的 **Production（生产模式）**。

### 3.1 运行模式一：Development (开发模式)
开发模式支持热重载（Fast Refresh），代码变更即刻生效，无需提前打包。
```cmd
npm run dev
```
启动后终端将输出监听地址，打开浏览器访问：[http://localhost:3003](http://localhost:3003)。

### 3.2 运行模式二：Production (生产/正式模式)
生产模式下 Next.js 会对代码进行严格的 TypeScript 类型校验、Tailwind CSS 压缩混淆以及服务端代码优化，运行效率更高且内存占用更低。
```cmd
# 第一步：构建优化打包
npm run build

# 第二步：启动正式常驻服务
npm run start
```
服务将在后台稳定运行在 `3003` 端口上。

---

## 🔒 4. 隐私与安全 (Privacy & Security)

本项目在架构设计之初就将“数据主权”、“凭据安全”和“主机防护”放在首位：

1. **本地优先与数据隔离 (Local-First & Zero Cloud Leak)**：
   - 所有的配置数据、用户密码哈希、调度规则与备份文件**100% 留存在本地服务器磁盘**；
   - 系统无任何外部云端遥测、上报或第三方接口调用，严防企业内部数据泄露。
2. **基于角色的权限控制体系 (RBAC)**：
   - **Admin（超级管理员）**：享有全局所有权限，独占用户账号生命周期管理（创建/启停/重置密码/删除），以及物理历史文件删除权限；
   - **Operator（运维操作员）**：可执行日常手动备份、创建调度、查看与下载 ZIP 压缩包；**物理禁止删除历史记录与磁盘物理备份，无权访问用户管理模块**；
   - **内置管理员保护**：系统根账号 `admin` 拥有防自锁保护，禁止任何操作对其降权、禁用或删除。
3. **高强度加盐密码存储 (scrypt + Salt + Timing-Safe)**：
   - 用户密码采用 Node.js 原生 `crypto.scrypt` 强哈希算法（`keylen=64`），搭配 16 字节随机盐值存储，杜绝彩虹表碰撞；
   - 密码校验使用 `crypto.timingSafeEqual` 进行常数时间比对，抵御时序侧信道攻击（Timing Attacks）。
4. **防篡改轻量会话 (Web Crypto HMAC-SHA256)**：
   - 登录状态基于服务端 HMAC-SHA256 签名 Token；
   - 会话通过安全 Cookie 传输，严格设置 `HttpOnly`（防御 XSS 脚本窃取）与 `SameSite=Lax`（防御 CSRF 攻击），默认有效期 7 天。
5. **系统注入与路径穿透防护**：
   - **命令/SQL 注入防御**：数据库名称强制经过 `^[a-zA-Z0-9_\-$]+$` 白名单正则严格校验；
   - **防自包含死循环（Anti-Recursion）**：源文件夹添加时通过 `path.relative` 严格检测，杜绝将备份目标目录自身作为源文件夹备份导致的磁盘爆满死循环；
   - **防路径穿越**：下载与删除接口严格以历史记录的合法 UUID 为准，禁止前端传参任意物理路径。
6. **操作审计日志追溯**：
   - 手动触发的导出均自动记录操作人用户名（`triggeredBy`），操作责任到人。

---

## 📁 5. 项目结构 (Project Structure)

```text
autobackup/
├── .env / .env.example          # 环境配置文件 (MySQL连接、端口3003、mysqldump路径)
├── next.config.ts               # Next.js 配置文件 (配置 serverExternalPackages)
├── package.json                 # 项目依赖定义与启动脚本 (-p 3003)
├── tailwind.config.ts           # Tailwind CSS 样式配置
├── tsconfig.json                # TypeScript 编译配置
├── initial.sql / demo.sql       # 初始系统库与测试业务数据导入脚本
├── backups/                     # 默认物理备份存放目录 (按规范自动分层归档)
│   ├── Immediate_Manual_Export/ # 手动导出专属目录 (按 YYYY-MM-DD 子目录归档)
│   └── [scheduleName]_[id]/     # 定时任务专属目录 (按 YYYY-MM-DD/HH_mm_ss 深度归档)
├── data/                        # 本地持久化数据存储 (纳入 .gitignore)
│   ├── config.json              # 系统全局设置
│   ├── schedules.json           # 调度规则配置
│   ├── history.json             # 备份审计历史记录
│   └── users.json               # RBAC 用户账户数据 (含加盐哈希与角色)
├── docs/                        # 详细功能与架构设计规范库
│   ├── AI_COLLABORATION_WORKING_GUIDE.md  # 协作规范与执行准则
│   ├── AUTHENTICATION_AND_USER_MANAGEMENT.md # 权限与用户管理技术设计
│   ├── BACKUP_HISTORY_MANAGEMENT.md      # 历史审计与文件管理设计
│   ├── DATABASE_SELECTION.md             # 数据库检索设计
│   ├── DEPLOYMENT.md                     # 开发与生产部署全流程手册
│   ├── ENV_CONFIGURATION.md              # 环境变量与配置项规范
│   ├── MANUAL_BACKUP.md                  # 手动即时导出规范
│   ├── SCHEDULED_BACKUP.md               # 定时自动备份调度规范
│   └── CHANGELOG_GUIDE.md                # 更新日志维护指南
└── src/
    ├── middleware.ts            # 全局路由守卫 (会话验签与 RBAC 权限拦截)
    ├── types/
    │   └── index.ts             # 全局 TypeScript 接口与类型定义
    ├── lib/
    │   ├── auth.ts              # 密码哈希、会话签发、脱敏与初始 Admin 机制
    │   ├── db.ts                # MySQL 连接测试、SHOW DATABASES 与表容量统计
    │   ├── dump.ts              # 备份核心流水线 (mysqldump 导出与文件夹递归复制)
    │   ├── scheduler.ts         # Cron 编译引擎与 node-cron 运行时任务管理器
    │   ├── storage.ts           # 原子写入 (atomicWriteJson) 与安全读取模块
    │   └── validation.ts        # 路径安全、防死循环与合法性校验工具
    ├── components/
    │   ├── Header.tsx           # 顶部导航、运行状态指示灯、用户信息与功能入口
    │   ├── DatabaseSelector.tsx # 数据库多选表格、实时搜索与表信息呈现
    │   ├── ManualBackupCard.tsx # 即时手动导出操作面板
    │   ├── ScheduleManager.tsx  # 定时任务配置卡片 (支持多时间点、多星期与多源文件夹)
    │   ├── BackupHistoryTable.tsx # 备份历史审计表与流式 ZIP 下载
    │   ├── DirectoryPickerModal.tsx # 本地磁盘目录树浏览弹窗
    │   ├── UserManagementModal.tsx  # 管理员用户管理模态框 (CRUD、重置密码)
    │   ├── ChangePasswordModal.tsx  # 自服务密码修改模态框
    │   └── StatusAlert.tsx      # 系统警告与离线提示条
    └── app/
        ├── layout.tsx           # 根布局
        ├── page.tsx             # 控制台主页 (集成静默数据轮询)
        ├── login/page.tsx       # 用户登录页
        └── api/                 # RESTful API 端点
            ├── auth/            # 登录、注销、当前用户、修改密码
            ├── backup/          # 即时导出、ZIP 下载
            ├── databases/       # 数据库列表查询
            ├── history/         # 历史记录获取与物理删除
            ├── schedules/       # 定时任务 CRUD
            ├── system/          # 连通性状态、本地磁盘目录安全浏览
            └── users/           # 管理员用户管理接口
```

---

## 📌 6. 备注与注意事项 (Notes & Remarks)

1. **XAMPP MySQL 服务依赖**：
   - 执行数据库备份或刷新数据库列表前，请确保 XAMPP 控制面板中的 MySQL 服务已启动（绿色 Running 状态）。若 MySQL 关机，系统主界面依然可用，但会弹出提示并阻止导出动作。
2. **`mysqldump.exe` 路径**：
   - 默认配置为 `C:\xampp\mysql\bin\mysqldump.exe`。如果您的 XAMPP 安装在其他盘符（如 `D:\xampp`），请务必在 `.env` 中修正 `MYSQLDUMP_PATH`。
3. **服务端监听端口**：
   - 本系统统一配置运行在 **`3003`** 端口上，有效规避了常规 `3000` 端口与其他 Node.js / React 项目冲突的问题。
4. **原子文件写入与纯净初始化**：
   - 系统所有配置与业务记录的写入均采用原子化写入（先写入 `.tmp` 临时文件，完成后重命名覆盖），确保断电或意外中断不会破坏数据文件；
   - 系统在全新部署或清空数据时，严格初始化为空状态，**绝不会自动拷贝 `.example` 模板中的假数据**。
5. **后台定时任务常驻**：
   - 定时备份由 Node.js 进程内部的 `node-cron` 调度驱动。如需实现服务器开机自启或后台守护，推荐使用 Windows 任务计划程序、PM2 或 NSSM 将 `npm run start` 注册为系统服务。

---

## 📚 7. 详细功能文档库

- 📖 [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) - 开发模式与生产模式部署指南
- ⚙️ [docs/ENV_CONFIGURATION.md](docs/ENV_CONFIGURATION.md) - 环境变量与配置项规范
- 🔐 [docs/AUTHENTICATION_AND_USER_MANAGEMENT.md](docs/AUTHENTICATION_AND_USER_MANAGEMENT.md) - 用户登录认证与基于角色的权限控制 (RBAC) 系统
- 🗄️ [docs/DATABASE_SELECTION.md](docs/DATABASE_SELECTION.md) - 数据库检索与多选功能
- ⚡ [docs/MANUAL_BACKUP.md](docs/MANUAL_BACKUP.md) - 即时手动导出备份功能
- ⏰ [docs/SCHEDULED_BACKUP.md](docs/SCHEDULED_BACKUP.md) - 定时自动备份调度功能
- 📂 [docs/BACKUP_HISTORY_MANAGEMENT.md](docs/BACKUP_HISTORY_MANAGEMENT.md) - 备份历史与文件管理功能

---

## 💖 8. 致谢 (Acknowledgements)

本项目由开发者本人与 AI 工具共同完成。功能设计和整体方向由开发者规划主导，AI 在代码编写和审查过程中提供了辅助支持。