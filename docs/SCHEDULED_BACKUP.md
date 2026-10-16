# 定时自动备份调度功能 (SCHEDULED_BACKUP.md)

本文档详细说明系统基于内置 Cron 引擎实现的可视化周期性自动备份调度机制、MySQL 数据库导出与源文件夹（Source Folders）递归复制备份、多时间点选择、智能 Cron 编译与 `scheduleName_id/YYYY-MM-DD/HH_mm_ss` 深度分层归档存储规范。

---

## 1. 功能概述

系统提供全可视化的定时备份调度能力。已登录的管理员（Admin）与操作员（Operator）均拥有调度规则的完整管理权限，可以自由查看、创建、**全量编辑修改**、启停切换（Pause/Resume）与删除定时规则。用户不仅可以选择需要定时备份的 MySQL 数据库，还可以配置一个或多个**磁盘源文件夹路径（Source Folders）**（例如项目的 `uploads/`、用户资料目录或资产文件夹）。系统在到达设定周期时，将自动调用 `mysqldump` 导出数据库，并递归复制选中的源文件夹至深度归档目录中。定时任务由服务端后台引擎自动触发，在审计历史中触发源记录为该规则的名称。

---

## 2. 深度归档存储结构

针对自动调度任务，系统按以下层级自动组织存储：

```text
backups/ (备份根目录)
  └── {scheduleName}_{scheduleId}/                  <-- 第一层: 规则专属目录 (特殊字符安全转义)
        └── {YYYY-MM-DD}/                           <-- 第二层: 执行当天日期
              └── {HH_mm_ss}/                       <-- 第三层: 执行具体时间 (时_分_秒)
                    ├── {db_name}_{时间戳}.sql       <-- 导出的 SQL 文件
                    ├── uploads/                    <-- 递归备份的源文件夹 1
                    └── assets/                     <-- 递归备份的源文件夹 2
```

---

## 3. 如何使用 (How to Use)

### 3.1 新建调度规则（包含数据库与文件夹）
1. 在 **Automated Schedules** 区域点击 **"New Schedule"** 展开配置面板；
2. **输入规则名称**（如 `Daily Core DB & Uploads Backup`）；
3. **选择数据库（可选）**：勾选需要备份的 MySQL 数据库；
4. **选择源文件夹（可选，支持直接输入或可视化浏览选择）**：
   - **方式一（直接输入）**：在输入框直接填入文件夹绝对路径（如 `C:\xampp\htdocs\my_project\uploads`）后点击 **"Add Folder"**（或直接按键盘回车键）；
   - **方式二（可视化浏览点选）**：**若输入框为空时点击按钮，或点击输入框右侧的文件夹浏览图标**，系统将自动呼出**目录浏览选择弹窗（Directory Picker Modal）**。用户可直观在可视界面中快速切换驱动器盘符（`C:\`、`D:\` 或当前项目根目录），通过双击或点击 Open 逐级展开各层级子文件夹，单选目标文件夹后点击 **"Select This Folder"** 即可自动将真实绝对路径填入并添加至备份列表；
   - 支持多次添加多个不同的源文件夹；列表中每个文件夹项均配备专属标签与 `✕` 移除按钮；
   - *注：数据库与源文件夹至少选择一项。*
5. **选择备份频率类型 (Backup Frequency)**：
   - **Every Hour（每小时）**：固定在每小时整点（`XX:00`）执行；
   - **Daily（每日）**：初始不预设任何时间，由用户自主输入并点击 **"+ Add Time"** 添加一个或多个具体时间点（`HH:mm`）；
   - **Weekly（每周）**：初始不预选星期和时间，由用户自主点选周一至周日的任意天数 + 添加一个或多个具体时间点；
6. **指定输出目录（可选）**：留空使用默认目录，或填入自定义路径；
7. 点击 **"Save Schedule"** 提交保存，后台即刻启动监听。

### 3.2 编辑修改已有调度规则 (Edit Schedule)
1. 在规则列表中，找到需要调整的定时备份项，点击操作列的 **"Edit"**（铅笔图标）按钮；
2. 系统自动展开编辑配置面板，并带有紫色高亮激活状态，自动回填当前规则的所有配置数据：
   - 规则名称（Schedule Name）；
   - 已选定的数据库（可增删勾选）；
   - 已配置的源文件夹列表（可继续输入、弹窗点选或点击 ✕ 移除）；
   - 调度周期类型（Hourly / Daily / Weekly）及对应的时间点列表与星期选项；
   - 自定义备份输出路径；
3. 对需要调整的字段进行修改，点击 **"Update Schedule"** 提交更新；
4. 服务端接收请求并执行二次校验，重新编译标准 Cron 表达式数组并持久化至 `data/schedules.json`，同时在内存中热重启该规则的 `node-cron` 定时任务，无需重启 Node.js 进程；
5. 若需要放弃本次修改，点击表单右上角或底部的 **"Cancel"** 按钮即可还原并退出编辑模式。

---

## 4. 详细工作流程 (Workflow)

```mermaid
flowchart TD
    A[用户操作: 点击 New Schedule 或 Edit 按钮] --> B[配置面板: 回填或录入 Name / 数据库 / 源文件夹 / 周期]
    B --> C[前端表单校验: 必填项 / 至少选择库或文件夹之一 / 时间与星期有效性]
    C -- 校验通过 --> D{操作类型}
    D -- 新建 -- --> E[POST /api/schedules]
    D -- 编辑修改 -- --> F[PUT /api/schedules]
    E & F --> G[服务端二次数据校验: 文件夹真实存在性 / 读权限 / 防自包含死循环]
    G --> H[compileScheduleToCrons 编译为标准 Cron 表达式数组]
    
    H --> I[写入 data/schedules.json 原子持久化]
    I --> J[调度引擎 syncScheduleTask: 销毁旧任务并在内存中注册新定时器]
    
    J --> K{到达设定触发时间}
    K --> L[构建 scheduleName_id / YYYY-MM-DD / HH_mm_ss 深度路径]
    L --> M1[循环为各数据库独立调用 mysqldump 生成各自独立的 .sql 文件]
    L --> M2[调用 fs.cpSync 递归复制源文件夹到该子目录]
    M1 & M2 --> N[统计总体积 & 写入 data/history.json 审计日志]
    N --> O[更新规则上次执行时间 Last run 并持久化]
    O --> P[前端 5 秒后台静默轮询自动捕获最新数据并即时渲染]
```

---

## 5. 输入校验规则 (Validation)

1. **资源非空校验**：数据库列表与源文件夹列表至少选择一项，不能两者皆为空；
2. **源文件夹合法性校验**：
   - 路径必须在服务器磁盘上真实存在；
   - 必须是目录（Directory）而非单一普通文件；
   - Node.js 进程必须具备读取权限（`fs.constants.R_OK`）；
   - **防自包含死循环校验（Anti-Self-Recursion）**：源文件夹绝对不能是备份目标根目录自身或包含备份根目录，杜绝无限嵌套递归导致磁盘被撑爆；
   - **白名单根目录校验**：若配置了 `ALLOWED_SOURCE_ROOTS`，所选文件夹必须严格位于该根目录范围内；
3. **备份目标路径校验**：若配置了 `ALLOWED_BACKUP_ROOTS`，输出路径必须位于白名单限制内；
4. **Daily / Weekly 模式**：必须包含至少 1 个有效的时间点（`HH:mm`）；Weekly 模式必须至少选择 1 天（`0-6`）；
5. **规则名称安全过滤**：自动将规则名称中的空格及特殊字符转换为下划线 `_`；
6. **开机自启常驻机制**：调度器通过 Next.js 原生 `src/instrumentation.ts` 注册，在 Node.js 服务端进程启动时自动加载并激活全部规则，无需依赖 Web 浏览器登录；支持通过 `BACKUP_TIMEZONE` 自定义调度时区。

---

## 6. 错误处理机制 (Error Handling)

| 异常情况 | 触发原因 | 处理策略 |
| :--- | :--- | :--- |
| **规则不存在** | 编辑或删除时传入了不存在的 `id` | 接口返回 HTTP 404 与错误提示："Schedule rule not found"。 |
| **规则名称为空** | 创建或编辑时清空了规则名称 | 前后端拦截并提示："Schedule name is required"。 |
| **源文件夹不存在或为普通文件** | 输入了错误的路径或误选了文件 | 前后端在校验阶段直接拦截并给出具体路径错误提示，阻止保存。 |
| **源文件夹包含备份目标目录** | 用户配置将 `backups` 复制进 `backups` | 触发自包含拦截："Cannot backup the backup destination directory itself"。 |
| **未选库且未选文件夹** | 取消了所有数据库勾选并删光了源文件夹 | 拦截并提示："Please select at least one database or one source folder to back up."。 |
| **执行时 MySQL 临时离线** | 仅备份数据库时 MySQL 未启动 | 捕获连接错误，记录失败日志；若同时配置了文件夹备份，仍会保证文件夹正常复制完成。 |

---

## 7. 接口规范 (API Specification)

### 7.1 `GET /api/schedules`
- **说明**：获取当前所有定时调度规则配置。
- **权限**：需要有效登录会话（Admin 或 Operator）。

### 7.2 `POST /api/schedules`
- **说明**：创建一条新的定时调度规则。
- **请求载荷 (JSON Payload)**：
  ```json
  {
    "name": "Daily Core DB & Uploads Backup",
    "databases": ["petty_cash_claim"],
    "sourceFolders": ["C:\\xampp\\htdocs\\uploads"],
    "frequencyType": "daily",
    "times": ["08:45"],
    "backupDir": "C:\\xampp\\htdocs\\autobackup\\backups",
    "enabled": true
  }
  ```

### 7.3 `PUT /api/schedules`
- **说明**：更新现有调度规则（支持全量配置编辑修改，或轻量启停状态切换）。
- **完整编辑请求载荷示例**：
  ```json
  {
    "id": "sched_1792025091618_f9gjh",
    "name": "Updated Daily Core DB & Uploads Backup",
    "databases": ["petty_cash_claim", "semipack_traceability"],
    "sourceFolders": ["C:\\xampp\\htdocs\\uploads"],
    "frequencyType": "weekly",
    "weekDays": [1, 3, 5],
    "times": ["09:00", "18:00"],
    "backupDir": "C:\\xampp\\htdocs\\autobackup\\backups"
  }
  ```
- **轻量状态切换载荷示例**：
  ```json
  {
    "id": "sched_1792025091618_f9gjh",
    "enabled": false
  }
  ```
- **成功响应**（HTTP 200）：返回 `{ "success": true, "schedule": <更新后的规则对象> }`，并在内存中自动热重载活动的 Cron 任务。

### 7.4 `DELETE /api/schedules?id={id}`
- **说明**：删除指定的调度规则，并从内存调度引擎中注销对应的活动定时任务。

---

## 8. 相关功能文档库

- 🗄️ [docs/DATABASE_SELECTION.md](DATABASE_SELECTION.md) - 数据库检索与选择功能
- ⚡ [docs/MANUAL_BACKUP.md](MANUAL_BACKUP.md) - 即时手动导出备份功能
- 📂 [docs/BACKUP_HISTORY_MANAGEMENT.md](BACKUP_HISTORY_MANAGEMENT.md) - 备份历史与文件管理功能
- 🔐 [docs/AUTHENTICATION_AND_USER_MANAGEMENT.md](AUTHENTICATION_AND_USER_MANAGEMENT.md) - 用户登录认证与权限控制 (RBAC)

