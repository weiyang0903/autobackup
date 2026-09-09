import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getHistory } from "@/lib/storage";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return new NextResponse("Backup ID is required", { status: 400 });
    }

    const history = getHistory();
    const targetItem = history.find((h) => h.id === id);

    if (!targetItem) {
      return new NextResponse("Backup record not found", { status: 404 });
    }

    const filePath = targetItem.filePath;

    if (!fs.existsSync(filePath)) {
      return new NextResponse("Backup file does not exist on disk", {
        status: 404,
      });
    }

    const stat = fs.statSync(filePath);
    const fileBuffer = fs.readFileSync(filePath);
    const fileName = targetItem.fileName || path.basename(filePath);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/sql",
        "Content-Length": stat.size.toString(),
        "Content-Disposition": `attachment; filename="${encodeURIComponent(
          fileName
        )}"`,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return new NextResponse(`Download failed: ${message}`, { status: 500 });
  }
}
