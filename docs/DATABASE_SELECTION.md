# 数据库检索与选择功能 (DATABASE_SELECTION.md)

本文档详细说明 Web 控制台中 MySQL 数据库发现、元数据统计、过滤筛选与选择操作的功能设计。

---

## 1. 功能概述

系统在受全局会话保护的前提下，自动与 XAMPP MySQL 实例建立连接，查询并呈现当前所有的用户业务数据库。已登录用户（Admin / Operator）均可通过搜索框快速查找数据库，查看各数据库的表数量与数据体积，并支持单选、多选或全选，作为即时导出或定时备份的目标对象。

---

## 2. 交互与业务流程

1. **元数据拉取**：
   - 页面加载时请求 `/api/databases`；
   - 服务端执行 `SHOW DATABASES` 获取所有库名；
   - 针对非系统库，查询 `information_schema.tables` 统计总表数（Table Count）与总存储大小（Data + Index Length）。
2. **系统库过滤规则**：
   - 默认排除系统保留库：`information_schema`、`performance_schema`、`mysql`、`sys`、`phpmyadmin`；
   - 仅将用户真实创建的业务数据库展示在列表中。
3. **前端搜索与筛选**：
   - 用户在搜索框中输入字符，前端实时对数据库名称进行不区分大小写（Case-insensitive）过滤；
4. **多选与状态联动**：
   - 点击单个卡片可切换选中状态（高亮显示勾选框与背景）；
   - 点击 "Select All" 批量选中当前过滤出的所有数据库；再次点击切换为 "Deselect All"；
   - 底部状态栏实时显示选中数量（如 `Selected: 3 / 10 databases`）。

---

## 3. 业务规则

1. **名称防注入校验**：
   - 数据库名称仅允许标准的标识符命名（`[a-zA-Z0-9_\-$]+`），任何非法字符均在后端拦截；
2. **空库与空表容错**：
   - 若数据库中尚无数据表，表数量显示为 `0 tables`，大小显示为 `0 B`，允许正常加入备份序列；
3. **状态保留**：
   - 搜索过滤仅改变视图展示，不丢失之前已经选中的数据库勾选状态。

---

## 4. 接口规范 (API Specification)

### `GET /api/databases`
- **请求权限**：需要有效登录会话（Admin 或 Operator 均可）。
- **查询参数**：
  - `includeSystem`（可选，boolean，默认为 `false`）：是否在返回列表中包含系统保留数据库。
- **成功响应示例**（HTTP 200）：
  ```json
  {
    "success": true,
    "databases": [
      {
        "name": "petty_cash_claim",
        "tableCount": 18,
        "sizeBytes": 119888,
        "isSystem": false
      },
      {
        "name": "semipack_traceability",
        "tableCount": 25,
        "sizeBytes": 222523,
        "isSystem": false
      }
    ]
  }
  ```

---

## 5. 错误处理机制

| 异常情况 | 触发原因 | 处理策略与错误提示 |
| :--- | :--- | :--- |
| **未登录或会话失效** | 未携带有效 Cookie 请求接口 | 中间件拦截并返回 HTTP 401："Unauthorized: Please log in first"。 |
| **MySQL 离线** | XAMPP MySQL 服务未启动 | 接口返回 HTTP 500，并在界面顶部弹出醒目的红色连接错误通知。 |
| **权限不足读取统计** | 用户无 `information_schema` 读权限 | 容错降级处理，表数量与体积显示为默认 `0`，仍保留库名以支持正常导出。 |
| **未选择任何数据库** | 用户未勾选直接点击导出 | 前端拦截提交并提示："Please select at least one database above before exporting."。 |

---

## 6. 相关功能文档
- ⚡ [docs/MANUAL_BACKUP.md](MANUAL_BACKUP.md) - 即时手动导出备份功能
- ⏰ [docs/SCHEDULED_BACKUP.md](SCHEDULED_BACKUP.md) - 定时自动备份调度功能
- 🔐 [docs/AUTHENTICATION_AND_USER_MANAGEMENT.md](AUTHENTICATION_AND_USER_MANAGEMENT.md) - 用户登录认证与权限控制

