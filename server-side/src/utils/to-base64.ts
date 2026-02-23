import fs from "fs";

/*
 * This function is used to convert an png to base64
 * @param filePath - The path to the image
 * @returns The base64 representation of the image
 *
 * Note: Only works on png
 */
export const pngToBase64 = async (filePath: string) => {
  const bitmap = await fs.promises.readFile(filePath);
  return `data:image/png;base64,${bitmap.toString("base64")}`;
};

/*
 * This function is used to convert a TTF (truetype font) to base64
 * @param filePath - The path to the image
 * @returns The base64 representation of the font
 *
 */
export const ttfToBase64 = async (filePath: string) => {
  const bitmap = await fs.promises.readFile(filePath);
  return `data:font/ttf;base64,${bitmap.toString("base64")}`;
};
