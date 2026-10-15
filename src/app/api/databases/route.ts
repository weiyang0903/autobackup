import { NextRequest, NextResponse } from "next/server";
import { listDatabases } from "@/lib/db";
import { verifyAuthenticatedUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const auth = verifyAuthenticatedUser(req);
  if (!auth.authenticated) return auth.response!;

  try {
    const { searchParams } = new URL(req.url);
    const includeSystem = searchParams.get("includeSystem") === "true";

    const databases = await listDatabases(includeSystem);
    return NextResponse.json({ success: true, databases });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
