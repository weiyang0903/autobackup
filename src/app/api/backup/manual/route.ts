import { NextRequest, NextResponse } from "next/server";
import { executeBackup } from "@/lib/dump";
import { ManualBackupRequest } from "@/types";
import { verifyAuthenticatedUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const auth = verifyAuthenticatedUser(req);
  if (!auth.authenticated || !auth.user) return auth.response!;

  try {
    const body = (await req.json()) as ManualBackupRequest;

    if (!body.databases || !Array.isArray(body.databases) || body.databases.length === 0) {
      return NextResponse.json(
        { success: false, error: "Please select at least one database to backup." },
        { status: 400 }
      );
    }

    const triggeredBy = auth.user.username || req.headers.get("x-user-name") || "manual";

    const result = await executeBackup({
      databases: body.databases,
      customBackupDir: body.customBackupDir,
      triggerType: "manual",
      triggeredBy,
    });

    return NextResponse.json({ success: true, item: result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
