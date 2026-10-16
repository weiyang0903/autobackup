import { NextResponse } from "next/server";
import { isCookieSecure } from "@/lib/auth";

export async function POST() {
  const response = NextResponse.json({ success: true, message: "Logged out" });
  response.cookies.set({
    name: "autobackup_session",
    value: "",
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    secure: isCookieSecure(),
  });
  return response;
}
