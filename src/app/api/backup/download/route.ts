import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const archiver = require("archiver");
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

    // 确定本次备份所在的物理目录
    const targetDir =
      targetItem.targetDirectory ||
      (fs.existsSync(targetItem.filePath) &&
      fs.statSync(targetItem.filePath).isDirectory()
        ? targetItem.filePath
        : path.dirname(targetItem.filePath));

    if (!fs.existsSync(targetDir)) {
      return new NextResponse("Backup directory does not exist on disk", {
        status: 404,
      });
    }

    // 构造 ZIP 下载文件名
    const safeBaseName = (
      targetItem.scheduleName ||
      targetItem.databases[0] ||
      "backup"
    ).replace(/[/\\?%*:|"<> ]/g, "_");

    const zipFileName = `${safeBaseName}_backup_${targetItem.id}.zip`;

    // 创建 archiver 压缩实例
    const archive = archiver("zip", {
      zlib: { level: 6 },
    });

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

        // 将目标目录内的所有文件与子文件夹加入压缩包根目录
        archive.directory(targetDir, false);
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
