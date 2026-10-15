import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getHistory, deleteHistoryItem } from "@/lib/storage";
import { verifyAuthenticatedUser } from "@/lib/auth";

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
export async function GET(req: NextRequest) {
  const auth = verifyAuthenticatedUser(req);
  if (!auth.authenticated) return auth.response!;

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
  const auth = verifyAuthenticatedUser(req);
  if (!auth.authenticated || !auth.user) return auth.response!;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const deletePhysicalFile = searchParams.get("deleteFile") === "true";

    // 权限校验：仅允许超级管理员 (Admin) 执行删除历史记录与物理文件
    if (auth.user.role !== "admin") {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden: Only administrators can delete backup history and files",
        },
        { status: 403 }
      );
    }

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
      /* turbopackIgnore: true */ process.cwd(),
      process.env.DEFAULT_BACKUP_DIR || "./backups"
    );

    // 若要求删除物理磁盘文件/目录
    if (deletePhysicalFile) {
      let parentDirToClean = "";

      if (removed.triggerType === "manual") {
        // 1. 手动导出：仅删除属于该记录的 SQL 文件列表及复制的专属文件夹，不误删同日期目录下的其他手动备份
        if (Array.isArray(removed.filePaths) && removed.filePaths.length > 0) {
          for (const sqlPath of removed.filePaths) {
            if (fs.existsSync(sqlPath)) {
              try {
                fs.unlinkSync(sqlPath);
              } catch (fileErr) {
                console.error(`Failed to delete SQL file ${sqlPath}:`, fileErr);
              }
            }
          }
        } else if (removed.filePath && fs.existsSync(removed.filePath)) {
          try {
            fs.unlinkSync(removed.filePath);
          } catch (fileErr) {
            console.error(`Failed to delete SQL file ${removed.filePath}:`, fileErr);
          }
        }
        if (removed.targetDirectory && Array.isArray(removed.sourceFolders)) {
          for (const srcFolder of removed.sourceFolders) {
            const folderBaseName = path.basename(srcFolder);
            const copiedPath = path.join(removed.targetDirectory, folderBaseName);
            if (fs.existsSync(copiedPath)) {
              try {
                fs.rmSync(copiedPath, { recursive: true, force: true });
              } catch (folderErr) {
                console.error(`Failed to delete copied folder ${copiedPath}:`, folderErr);
              }
            }
          }
        }
        // 向上清理从当前日期的 Immediate_Manual_Export 目录开始
        parentDirToClean = removed.targetDirectory || (removed.filePath ? path.dirname(removed.filePath) : "");
      } else {
        // 2. 定时任务：拥有独立的时间点子目录 (scheduleName_id/YYYY-MM-DD/HH_mm_ss)，安全递归删除该时间点目录
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
