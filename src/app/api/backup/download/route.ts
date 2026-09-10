import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import * as archiverModule from "archiver";
import { getHistory } from "@/lib/storage";

// 获取可靠的 archiver 压缩实例 (完美兼容 Archiver v8 ZipArchive 类与 v7/v6 历史版本的工厂函数)
const createZipInstance = (options: { zlib: { level: number } }) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mod: any = archiverModule;
  if (mod && typeof mod.ZipArchive === "function") {
    return new mod.ZipArchive(options);
  }
  if (typeof mod === "function") {
    return mod("zip", options);
  }
  if (mod && typeof mod.default === "function") {
    return mod.default("zip", options);
  }
  if (mod && mod.default && typeof mod.default.ZipArchive === "function") {
    return new mod.default.ZipArchive(options);
  }
  throw new Error("Failed to initialize zip compression engine from archiver module.");
};

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

    // 检查并收集属于当前备份记录的具体物理文件与文件夹
    let hasEntries = false;
    const targetDir =
      targetItem.targetDirectory ||
      (fs.existsSync(targetItem.filePath) &&
      fs.statSync(targetItem.filePath).isDirectory()
        ? targetItem.filePath
        : path.dirname(targetItem.filePath));

    // 构造 ZIP 下载文件名
    const safeBaseName = (
      targetItem.scheduleName ||
      targetItem.databases[0] ||
      "backup"
    ).replace(/[/\\?%*:|"<> ]/g, "_");

    const zipFileName = `${safeBaseName}_backup_${targetItem.id}.zip`;

    // 创建 archiver 压缩实例
    const archive = createZipInstance({
      zlib: { level: 6 },
    });

    // 1. 若存在本次备份生成的 SQL 文件列表，精确添加每一个独立的 .sql 文件
    if (Array.isArray(targetItem.filePaths) && targetItem.filePaths.length > 0) {
      for (const sqlPath of targetItem.filePaths) {
        if (fs.existsSync(sqlPath) && fs.statSync(sqlPath).isFile()) {
          const sqlFileName = path.basename(sqlPath);
          archive.file(sqlPath, { name: sqlFileName });
          hasEntries = true;
        }
      }
    } else if (
      targetItem.filePath &&
      fs.existsSync(targetItem.filePath) &&
      fs.statSync(targetItem.filePath).isFile()
    ) {
      const sqlFileName = path.basename(targetItem.filePath);
      archive.file(targetItem.filePath, { name: sqlFileName });
      hasEntries = true;
    }

    // 2. 若存在本次备份复制的专属源文件夹，精确添加对应的文件夹
    if (Array.isArray(targetItem.sourceFolders) && targetItem.sourceFolders.length > 0) {
      for (const srcFolder of targetItem.sourceFolders) {
        const folderBaseName = path.basename(srcFolder);
        const copiedFolderPath = path.join(targetDir, folderBaseName);
        if (fs.existsSync(copiedFolderPath) && fs.statSync(copiedFolderPath).isDirectory()) {
          archive.directory(copiedFolderPath, folderBaseName);
          hasEntries = true;
        }
      }
    }

    // 若既没有找到 SQL 文件，也没有找到任何复制的文件夹
    if (!hasEntries) {
      return new NextResponse("Backup file or folder does not exist on disk", {
        status: 404,
      });
    }

    // 创建 Web ReadableStream 将 node-stream 桥接给 Next.js Response
    const stream = new ReadableStream({
      start(controller) {
        archive.on("data", (chunk: Uint8Array) => {
          controller.enqueue(chunk);
        });

        archive.on("end", () => {
          controller.close();
        });

        archive.on("error", (err: Error) => {
          controller.error(err);
        });

        archive.finalize();
      },
    });

    return new NextResponse(stream, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(
          zipFileName
        )}"`,
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return new NextResponse(`Download failed: ${message}`, { status: 500 });
  }
}
