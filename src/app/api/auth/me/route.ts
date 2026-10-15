import { NextRequest, NextResponse } from "next/server";
import { verifyAuthenticatedUser, sanitizeUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const auth = verifyAuthenticatedUser(req);
  if (!auth.authenticated || !auth.user) {
    return auth.response!;
  }

  return NextResponse.json({
    success: true,
    user: sanitizeUser(auth.user),
  });
}
