import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { UserItem, UserPublicInfo, SessionPayload, UserRole } from "@/types";
import { getUsers, saveUsers, getUserByUsername, getUserById } from "./storage";

const SESSION_SECRET =
  process.env.SESSION_SECRET || "autobackup_secure_session_secret_key_2026";
const SESSION_EXPIRY_SECONDS = 7 * 24 * 60 * 60; // 7 天有效期

/**
 * 为明文密码生成 Salt 和安全哈希 (使用 Node.js 原生 scrypt 算法)
 */
export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return { hash, salt };
}

/**
 * 校验用户输入的密码是否正确 (常数时间比对，防止时序侧信道攻击)
 */
export function verifyPassword(
  password: string,
  salt: string,
  expectedHash: string
): boolean {
  try {
    const computedHash = crypto.scryptSync(password, salt, 64).toString("hex");
    const a = Buffer.from(computedHash, "hex");
    const b = Buffer.from(expectedHash, "hex");
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Base64 URL 编解码工具
 */
function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  return Buffer.from(base64, "base64").toString("utf-8");
}

/**
 * 生成带 HMAC-SHA256 签名的会话 Token
 */
export function createSessionToken(user: {
  id: string;
  username: string;
  role: UserRole;
}): string {
  const payload: SessionPayload = {
    userId: user.id,
    username: user.username,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + SESSION_EXPIRY_SECONDS,
  };

  const payloadStr = JSON.stringify(payload);
  const payloadEncoded = base64UrlEncode(payloadStr);

  const signature = crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(payloadEncoded)
    .digest("base64url");

  return `${payloadEncoded}.${signature}`;
}

/**
 * 验证会话 Token 并解析 Payload
 */
export function verifySessionToken(token: string): SessionPayload | null {
  if (!token || typeof token !== "string" || !token.includes(".")) {
    return null;
  }

  const [payloadEncoded, signature] = token.split(".");
  if (!payloadEncoded || !signature) {
    return null;
  }

  try {
    // 校验签名
    const expectedSignature = crypto
      .createHmac("sha256", SESSION_SECRET)
      .update(payloadEncoded)
      .digest("base64url");

    const sigA = Buffer.from(signature);
    const sigB = Buffer.from(expectedSignature);
    if (sigA.length !== sigB.length || !crypto.timingSafeEqual(sigA, sigB)) {
      return null;
    }

    // 解析载荷并检查过期时间
    const payloadStr = base64UrlDecode(payloadEncoded);
    const payload: SessionPayload = JSON.parse(payloadStr);

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * 脱敏用户信息（移除 passwordHash 和 salt）
 */
export function sanitizeUser(user: UserItem): UserPublicInfo {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    active: user.active,
    createdAt: user.createdAt,
    lastLogin: user.lastLogin,
  };
}

/**
 * 确保系统中至少存在一个超级管理员账号 (初次部署开箱即用)
 */
export function ensureInitialAdmin(): UserItem {
  const users = getUsers();
  const existingAdmin = users.find((u) => u.role === "admin");

  if (existingAdmin) {
    return existingAdmin;
  }

  const initialUsername = "admin";
  const initialPassword = process.env.INITIAL_ADMIN_PASSWORD || "admin123";
  const { hash, salt } = hashPassword(initialPassword);

  const newAdmin: UserItem = {
    id: "u_init_admin_001",
    username: initialUsername,
    passwordHash: hash,
    salt: salt,
    role: "admin",
    active: true,
    createdAt: new Date().toISOString(),
    lastLogin: null,
  };

  users.unshift(newAdmin);
  saveUsers(users);
  return newAdmin;
}

/**
 * 严格校验当前请求的会话 Token 与用户实体状态
 * 1. 验证签名有效性与时间戳
 * 2. 检查用户实体是否依然存在于存储中
 * 3. 检查用户是否处于激活状态 (active === true)
 * 若验证不通过，统一返回 401 JSON 响应，并清除浏览器中的旧 Session Cookie (清除幽灵会话)
 */
export function verifyAuthenticatedUser(req: NextRequest): {
  authenticated: boolean;
  user?: UserItem;
  response?: NextResponse;
} {
  // 确保系统存在初始管理员
  const currentUsers = getUsers();
  if (currentUsers.length === 0) {
    ensureInitialAdmin();
  }

  const token = req.cookies.get("autobackup_session")?.value;
  if (!token) {
    return {
      authenticated: false,
      response: NextResponse.json(
        { success: false, error: "Unauthorized: Please log in first" },
        { status: 401 }
      ),
    };
  }

  const payload = verifySessionToken(token);
  if (!payload) {
    const res = NextResponse.json(
      { success: false, error: "Unauthorized: Session expired or invalid" },
      { status: 401 }
    );
    res.cookies.set({
      name: "autobackup_session",
      value: "",
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
    return { authenticated: false, response: res };
  }

  const user = getUserById(payload.userId);
  if (!user || !user.active) {
    const res = NextResponse.json(
      { success: false, error: "Unauthorized: User not found or disabled" },
      { status: 401 }
    );
    res.cookies.set({
      name: "autobackup_session",
      value: "",
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
    return { authenticated: false, response: res };
  }

  return { authenticated: true, user };
}
