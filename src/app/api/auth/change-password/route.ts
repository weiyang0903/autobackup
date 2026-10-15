import { NextRequest, NextResponse } from "next/server";
import { verifyAuthenticatedUser, verifyPassword, hashPassword } from "@/lib/auth";
import { getUsers, saveUsers } from "@/lib/storage";

export async function POST(req: NextRequest) {
  try {
    const auth = verifyAuthenticatedUser(req);
    if (!auth.authenticated || !auth.user) {
      return auth.response!;
    }
    const user = auth.user;

    const body = await req.json();
    const { oldPassword, newPassword } = body;

    if (!oldPassword || !newPassword) {
      return NextResponse.json(
        { success: false, error: "Old password and new password are required" },
        { status: 400 }
      );
    }

    if (typeof newPassword !== "string" || newPassword.length < 6) {
      return NextResponse.json(
        {
          success: false,
          error: "New password must be at least 6 characters long",
        },
        { status: 400 }
      );
    }

    const isOldValid = verifyPassword(oldPassword, user.salt, user.passwordHash);
    if (!isOldValid) {
      return NextResponse.json(
        { success: false, error: "Incorrect old password" },
        { status: 400 }
      );
    }

    // 生成新哈希
    const { hash, salt } = hashPassword(newPassword);
    const users = getUsers();
    const idx = users.findIndex((u) => u.id === user.id);
    if (idx !== -1) {
      users[idx].passwordHash = hash;
      users[idx].salt = salt;
      saveUsers(users);
    }

    return NextResponse.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: `Failed to change password: ${msg}` },
      { status: 500 }
    );
  }
}
