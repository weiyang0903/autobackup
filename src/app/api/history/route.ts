import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getHistory, deleteHistoryItem } from "@/lib/storage";

/**
 * 递归向上检查并删除空的父级文件夹，直到遇到非空目录或到达备份根目录
 */
function cleanEmptyParentDirectories(currentDir: string, stopRootDir: string): void {
  try {
    let dir = path.resolve(currentDir);
    const stopDir = path.resolve(stopRootDir);

    // 只要当前目录不是备份根目录，且位于备份根目录内部
    while (dir !== stopDir && dir.startsWith(stopDir)) {
      if (fs.existsSync(dir)) {
        const items = fs.readdirSync(dir);
        if (items.length === 0) {
          fs.rmdirSync(dir);
          dir = path.dirname(dir);
        } else {
          // 如果目录非空，停止向上清理
          break;
        }
      } else {
        dir = path.dirname(dir);
      }
    }
  } catch (err) {
    console.error("Error during cleaning empty parent directories:", err);
  }
}

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

// 删除备份历史（并根据参数决定是否清理物理文件或目录及空父目录）
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

    const backupRootDir = path.resolve(
      process.cwd(),
      process.env.DEFAULT_BACKUP_DIR || "./backups"
    );

    // 若要求删除物理磁盘文件/目录
    if (deletePhysicalFile) {
      let parentDirToClean = "";

      // 1. 若有独立运行目标目录，递归清理该时间目录
      if (removed.targetDirectory && fs.existsSync(removed.targetDirectory)) {
        try {
          parentDirToClean = path.dirname(path.resolve(removed.targetDirectory));
          fs.rmSync(removed.targetDirectory, { recursive: true, force: true });
        } catch (dirErr) {
          console.error(
            `Failed to delete target directory ${removed.targetDirectory}:`,
            dirErr
          );
        }
      } else if (removed.filePath && fs.existsSync(removed.filePath)) {
        // 2. 否则单独删除主文件
        try {
          parentDirToClean = path.dirname(path.resolve(removed.filePath));
          fs.unlinkSync(removed.filePath);
        } catch (fileErr) {
          console.error(
            `Failed to delete physical file ${removed.filePath}:`,
            fileErr
          );
        }
      }

      // 3. 向上自动清理变为空文件夹的父目录（如日期目录和规则目录）
      if (parentDirToClean) {
        cleanEmptyParentDirectories(parentDirToClean, backupRootDir);
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
