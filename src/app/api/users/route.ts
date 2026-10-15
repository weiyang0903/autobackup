import { NextRequest, NextResponse } from "next/server";
import {
  verifySessionToken,
  verifyAuthenticatedUser,
  hashPassword,
  sanitizeUser,
} from "@/lib/auth";
import {
  getUsers,
  saveUsers,
  getUserByUsername,
  getUserById,
} from "@/lib/storage";
import { UserItem, UserRole } from "@/types";

/**
 * 校验当前请求是否来自已登录的超级管理员 (Admin)
 */
function verifyAdminSession(req: NextRequest) {
  const auth = verifyAuthenticatedUser(req);
  if (!auth.authenticated || !auth.user) {
    return {
      authorized: false,
      response:
        auth.response ||
        NextResponse.json(
          { success: false, error: "Authentication required" },
          { status: 401 }
        ),
    };
  }

  if (auth.user.role !== "admin") {
    return {
      authorized: false,
      response: NextResponse.json(
        {
          success: false,
          error: "Forbidden: Admin privileges required to manage users",
        },
        { status: 403 }
      ),
    };
  }

  return { authorized: true, currentUserId: auth.user.id };
}

// 1. 获取用户列表 (Admin 独占)
export async function GET(req: NextRequest) {
  const auth = verifyAdminSession(req);
  if (!auth.authorized) return auth.response;

  try {
    const users = getUsers();
    return NextResponse.json({
      success: true,
      users: users.map(sanitizeUser),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: `Failed to fetch users: ${msg}` },
      { status: 500 }
    );
  }
}

// 2. 创建新用户 (Admin 独占)
export async function POST(req: NextRequest) {
  const auth = verifyAdminSession(req);
  if (!auth.authorized) return auth.response;

  try {
    const body = await req.json();
    const { username, password, role = "operator" } = body;

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: "Username and password are required" },
        { status: 400 }
      );
    }

    const cleanUsername = username.trim();
    if (cleanUsername.length < 3) {
      return NextResponse.json(
        { success: false, error: "Username must be at least 3 characters long" },
        { status: 400 }
      );
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(cleanUsername)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Username can only contain alphanumeric characters, underscores, and dashes",
        },
        { status: 400 }
      );
    }

    if (typeof password !== "string" || password.length < 6) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 6 characters long" },
        { status: 400 }
      );
    }

    if (role !== "admin" && role !== "operator") {
      return NextResponse.json(
        { success: false, error: "Invalid role. Allowed roles: admin, operator" },
        { status: 400 }
      );
    }

    const existing = getUserByUsername(cleanUsername);
    if (existing) {
      return NextResponse.json(
        { success: false, error: `Username "${cleanUsername}" is already taken` },
        { status: 409 }
      );
    }

    const { hash, salt } = hashPassword(password);
    const newUser: UserItem = {
      id: "u_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
      username: cleanUsername,
      passwordHash: hash,
      salt,
      role: role as UserRole,
      active: true,
      createdAt: new Date().toISOString(),
      lastLogin: null,
    };

    const users = getUsers();
    users.push(newUser);
    saveUsers(users);

    return NextResponse.json({
      success: true,
      user: sanitizeUser(newUser),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: `Failed to create user: ${msg}` },
      { status: 500 }
    );
  }
}

// 3. 更新用户状态 / 角色 / 重置密码 (Admin 独占)
export async function PUT(req: NextRequest) {
  const auth = verifyAdminSession(req);
  if (!auth.authorized) return auth.response;

  try {
    const body = await req.json();
    const { id, active, role, newPassword } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "User ID is required" },
        { status: 400 }
      );
    }

    const users = getUsers();
    const targetIdx = users.findIndex((u) => u.id === id);
    if (targetIdx === -1) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    const targetUser = users[targetIdx];

    // 安全保护：不允许禁用或降权唯一的 admin 账号
    if (targetUser.username === "admin") {
      if (active === false) {
        return NextResponse.json(
          { success: false, error: "Cannot disable the default root admin account" },
          { status: 400 }
        );
      }
      if (role && role !== "admin") {
        return NextResponse.json(
          { success: false, error: "Cannot change the role of the default root admin account" },
          { status: 400 }
        );
      }
    }

    // 更新启用/禁用状态
    if (typeof active === "boolean") {
      targetUser.active = active;
    }

    // 更新角色
    if (role && (role === "admin" || role === "operator")) {
      targetUser.role = role;
    }

    // 管理员重置他人密码
    if (newPassword) {
      if (typeof newPassword !== "string" || newPassword.length < 6) {
        return NextResponse.json(
          {
            success: false,
            error: "New password must be at least 6 characters long",
          },
          { status: 400 }
        );
      }
      const { hash, salt } = hashPassword(newPassword);
      targetUser.passwordHash = hash;
      targetUser.salt = salt;
    }

    users[targetIdx] = targetUser;
    saveUsers(users);

    return NextResponse.json({
      success: true,
      user: sanitizeUser(targetUser),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: `Failed to update user: ${msg}` },
      { status: 500 }
    );
  }
}

// 4. 删除用户 (Admin 独占)
export async function DELETE(req: NextRequest) {
  const auth = verifyAdminSession(req);
  if (!auth.authorized) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "User ID is required" },
        { status: 400 }
      );
    }

    // 不能删除当前登录账号
    if (id === auth.currentUserId) {
      return NextResponse.json(
        { success: false, error: "Cannot delete your own account while logged in" },
        { status: 400 }
      );
    }

    const targetUser = getUserById(id);
    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    // 不能删除内置 root admin
    if (targetUser.username === "admin") {
      return NextResponse.json(
        { success: false, error: "Cannot delete the default root admin account" },
        { status: 400 }
      );
    }

    const users = getUsers();
    const updated = users.filter((u) => u.id !== id);
    saveUsers(updated);

    return NextResponse.json({
      success: true,
      message: `User '${targetUser.username}' deleted successfully`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: `Failed to delete user: ${msg}` },
      { status: 500 }
    );
  }
}
