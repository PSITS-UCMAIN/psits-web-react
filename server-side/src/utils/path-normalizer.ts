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

export function isFilePathAbsolute(filePath: string) {
  if (!path.isAbsolute(filePath)) {
    throw new Error("Base path must be an absolute path.");
  }

  if (!fs.existsSync(filePath)) {
    throw new Error("Base path does not exist.");
  }

  if (!fs.statSync(filePath).isDirectory()) {
    throw new Error("Base path is not a directory.");
  }

  return filePath;
}

/**
 * Normalizes and safely joins an absolute path with a relative path
 */
export const normalizeFinalPath = (
  basePath: string,
  filePath: string
): string => {
  const normalizedPath = normalizeBackwardSlashes(filePath);
  const fullPath = path.resolve(basePath, normalizedPath);

  isFilePathAbsolute(basePath);

  if (!fullPath.startsWith(basePath + path.sep)) {
    throw new Error("Invalid file path.");
  }

  return fullPath;
};
