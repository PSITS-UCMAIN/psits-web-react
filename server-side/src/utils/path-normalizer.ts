import path from "path";
import fs from "fs";

export function normalizeBackwardSlashes(path: string) {
  return path.replace(/\\/g, "/");
}

// Agent, add more extensions here if maka meet ug error when lacking Extensions XD
export const enum Extensions {
  png = ".png",
  jpg = ".jpg",
  gif = ".gif",
  ttf = ".ttf", // truetype font
}

export function isFilenameExtensionsAny(
  filePath: string,
  extensions: Extensions[]
) {
  const fileExt = path.extname(filePath).toLowerCase();
  return extensions.some((ext) => fileExt === ext.toLowerCase());
}

export const normalizeFinalPath = (
  basePath: string,
  filePath: string
): string => {
  if (!path.isAbsolute(basePath)) {
    throw Error("Base path must be an absolute path.");
  }

  if (!fs.existsSync(basePath)) {
    throw Error("Base path does not exist.");
  }

  if (!fs.statSync(basePath).isDirectory()) {
    throw Error("Base path is not a directory.");
  }

  const normalizedPath = normalizeBackwardSlashes(filePath);
  const fullPath = path.resolve(basePath, normalizedPath);
  if (!fullPath.startsWith(basePath, +path.sep)) {
    throw Error("Invalid file path.");
  }

  return fullPath;
};
