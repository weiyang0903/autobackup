import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { verifyAuthenticatedUser } from "@/lib/auth";

/**
 * 探测 Windows 系统上所有可访问的驱动器盘符 (C:\, D:\, etc.)
 */
function getAvailableDrives(): string[] {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const drives: string[] = [];

  for (const letter of letters) {
    const drivePath = `${letter}:\\`;
    try {
      fs.accessSync(drivePath, fs.constants.R_OK);
      drives.push(drivePath);
    } catch {
      // 盘符不存在或无权访问，忽略
    }
  }

  return drives.length > 0 ? drives : [process.cwd()];
}

export async function GET(req: NextRequest) {
  const auth = verifyAuthenticatedUser(req);
  if (!auth.authenticated) return auth.response!;

  try {
    const { searchParams } = new URL(req.url);
    const requestedPath = searchParams.get("path");

    const availableDrives = getAvailableDrives();

    // 默认起始路径：优先使用传入的路径，其次当前项目工作目录，再回退到第一个盘符
    let currentDir = requestedPath ? path.resolve(requestedPath.trim()) : process.cwd();

    // 若传入路径不存在或无法访问，回退到当前工作目录或 C:\
    if (!fs.existsSync(currentDir) || !fs.statSync(currentDir).isDirectory()) {
      currentDir = fs.existsSync(process.cwd()) ? process.cwd() : (availableDrives[0] || "C:\\");
    }

    // 计算上一级父目录
    const parentDir = path.dirname(currentDir);
    const hasParent = parentDir !== currentDir;

    // 读取子目录
    let subDirectories: { name: string; path: string }[] = [];

    try {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        // 过滤系统隐藏文件夹及临时系统文件
        if (entry.name.startsWith("$") || entry.name.startsWith(".")) {
          continue;
        }

        try {
          if (entry.isDirectory()) {
            subDirectories.push({
              name: entry.name,
              path: path.join(currentDir, entry.name),
            });
          }
        } catch {
          // 忽略受保护或无权限读取状态的单个文件夹
        }
      }

      // 按名称不区分大小写升序排序
      subDirectories.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
    } catch (readErr: unknown) {
      console.warn(`Cannot read directory contents of ${currentDir}:`, readErr);
    }

    return NextResponse.json({
      success: true,
      currentPath: currentDir,
      parentPath: hasParent ? parentDir : null,
      drives: availableDrives,
      directories: subDirectories,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: `Failed to browse directory: ${msg}` },
      { status: 500 }
    );
  }
}
