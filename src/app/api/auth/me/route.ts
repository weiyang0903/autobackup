import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, sanitizeUser } from "@/lib/auth";
import { getUserById } from "@/lib/storage";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("autobackup_session")?.value;

  if (!token) {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 }
    );
  }

  const payload = verifySessionToken(token);
  if (!payload) {
    return NextResponse.json(
      { success: false, error: "Session expired or invalid" },
      { status: 401 }
    );
  }

  const user = getUserById(payload.userId);
  if (!user || !user.active) {
    return NextResponse.json(
      { success: false, error: "User not found or disabled" },
      { status: 401 }
    );
  }

  return NextResponse.json({
    success: true,
    user: sanitizeUser(user),
  });
}
