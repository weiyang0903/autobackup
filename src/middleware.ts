import { NextRequest, NextResponse } from "next/server";

const SESSION_SECRET =
  process.env.SESSION_SECRET || "autobackup_secure_session_secret_key_2026";

/**
 * 使用通用 Web Crypto API 校验 HMAC-SHA256 签名 (在 Next.js Middleware 中 100% 原生支持)
 */
async function verifyToken(token: string): Promise<{
  valid: boolean;
  payload?: { userId: string; username: string; role: "admin" | "operator"; exp: number };
}> {
  if (!token || !token.includes(".")) {
    return { valid: false };
  }

  const [payloadEncoded, signature] = token.split(".");
  if (!payloadEncoded || !signature) {
    return { valid: false };
  }

  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(SESSION_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const sigBuffer = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(payloadEncoded)
    );

    // 将 ArrayBuffer 转换为 base64url 格式比对
    const bytes = new Uint8Array(sigBuffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const computedSig = btoa(binary)
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");

    if (computedSig !== signature) {
      return { valid: false };
    }

    // 解析 Base64URL 载荷
    let base64 = payloadEncoded.replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4) {
      base64 += "=";
    }
    const jsonStr = atob(base64);
    const payload = JSON.parse(jsonStr);

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return { valid: false };
    }

    return { valid: true, payload };
  } catch {
    return { valid: false };
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. 公开路径白名单
  if (
    pathname === "/login" ||
    pathname.startsWith("/api/auth/login") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico")
  ) {
    return NextResponse.next();
  }

  // 2. 检查会话 Token
  const sessionToken = req.cookies.get("autobackup_session")?.value;
  const { valid, payload } = await verifyToken(sessionToken || "");

  // 若未登录或已失效
  if (!valid || !payload) {
    // API 请求返回 401 JSON
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Please log in first" },
        { status: 401 }
      );
    }
    // 页面请求重定向至 /login
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 3. 角色权限拦截：非 Admin 用户禁止调用用户管理 API (/api/users/*)
  if (pathname.startsWith("/api/users") && payload.role !== "admin") {
    return NextResponse.json(
      { success: false, error: "Forbidden: Admin privilege required" },
      { status: 403 }
    );
  }

  // 4. 将当前用户信息注入到下游 Request Headers 中，方便 API 读取
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-user-id", payload.userId);
  requestHeaders.set("x-user-name", payload.username);
  requestHeaders.set("x-user-role", payload.role);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    /*
     * 匹配所有路径，排除静态资源与文件
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
