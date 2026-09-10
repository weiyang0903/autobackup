import { NextRequest, NextResponse } from "next/server";
import {
  ensureInitialAdmin,
  verifyPassword,
  createSessionToken,
  sanitizeUser,
} from "@/lib/auth";
import { getUserByUsername, getUsers, saveUsers } from "@/lib/storage";

export async function POST(req: NextRequest) {
  try {
    // 确保初次启动时存在内置超级管理员账号
    ensureInitialAdmin();

    const body = await req.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: "Username and password are required" },
        { status: 400 }
      );
    }

    const user = getUserByUsername(username.trim());

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Invalid username or password" },
        { status: 401 }
      );
    }

    if (!user.active) {
      return NextResponse.json(
        {
          success: false,
          error: "This account is disabled. Please contact an administrator.",
        },
        { status: 403 }
      );
    }

    const isValid = verifyPassword(password, user.salt, user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: "Invalid username or password" },
        { status: 401 }
      );
    }

    // 更新最后登录时间
    const users = getUsers();
    const targetIdx = users.findIndex((u) => u.id === user.id);
    if (targetIdx !== -1) {
      users[targetIdx].lastLogin = new Date().toISOString();
      saveUsers(users);
    }

    // 生成 Session Token
    const token = createSessionToken(user);

    const response = NextResponse.json({
      success: true,
      user: sanitizeUser(user),
    });

    // 写入安全 HttpOnly Cookie (7天有效)
    response.cookies.set({
      name: "autobackup_session",
      value: token,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: `Login failed: ${msg}` },
      { status: 500 }
    );
  }
}
