import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import { getHistory, deleteHistoryItem } from "@/lib/storage";

// 获取备份历史记录
export async function GET() {
  try {
    const history = getHistory();
    return NextResponse.json({ success: true, history });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

// 删除备份历史（并根据参数决定是否清理物理文件）
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const deletePhysicalFile = searchParams.get("deleteFile") === "true";

    if (!id) {
      return NextResponse.json(
        { success: false, error: "History ID is required" },
        { status: 400 }
      );
    }

    const removed = deleteHistoryItem(id);

    if (!removed) {
      return NextResponse.json(
        { success: false, error: "History record not found" },
        { status: 404 }
      );
    }

    // 若要求删除物理磁盘文件
    if (deletePhysicalFile && removed.filePath) {
      if (fs.existsSync(removed.filePath)) {
        try {
          fs.unlinkSync(removed.filePath);
        } catch (fileErr) {
          console.error(`Failed to delete physical file ${removed.filePath}:`, fileErr);
        }
      }
    }

    return NextResponse.json({ success: true, removed });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
