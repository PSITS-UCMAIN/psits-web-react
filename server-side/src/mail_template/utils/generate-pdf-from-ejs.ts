import puppeteer, { PDFOptions } from "puppeteer";
import ejs from "ejs";
import path from "path";
import { pngToBase64, ttfToBase64 } from "../../utils/to-base64";
import { TCertificateData } from "../mail.interface";
import { Extensions } from "../../utils/path-normalizer";
import {
  normalizeFinalPath,
  isFilenameExtensionsAny,
} from "../../utils/path-normalizer";

const ASSETS_BASE_DIR = path.resolve(__dirname, "../../assets");
const pdfConfig: PDFOptions = {
  format: "A4",
  landscape: true,
  printBackground: true,
};

export const validateAndFinalizeFilePath = (
  basePath: string,
  relativePath: string,
  allowedExtensions: Extensions[]
): string => {
  const finalPath = normalizeFinalPath(basePath, relativePath);
  if (!isFilenameExtensionsAny(finalPath, allowedExtensions)) {
    throw new Error(
      "This file extension is not allowed for this implementation"
    );
  }
  return finalPath;
};

export const generatePDFFromEJS = async (
  templatePath: string,
  data: TCertificateData
) => {
  if (data.images) {
    for (const [key, value] of Object.entries(data.images)) {
      const allowedExtensions: Extensions[] = [Extensions.png];
      const imagePath = validateAndFinalizeFilePath(
        ASSETS_BASE_DIR,
        value,
        allowedExtensions
      );
      data.images[key] = await pngToBase64(imagePath);
    }
  }

  if (data.fonts) {
    for (const [key, value] of Object.entries(data.fonts)) {
      const allowedExtensions: Extensions[] = [Extensions.ttf];
      const fontPath = validateAndFinalizeFilePath(
        ASSETS_BASE_DIR,
        value,
        allowedExtensions
      );
      data.fonts[key] = await ttfToBase64(fontPath);
    }
  }

  // const start = performance.now();

  const ejsTemplate = (await ejs.renderFile(
    path.join(ASSETS_BASE_DIR, templatePath),
    data,
    { cache: true }
  )) as string;

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  await page.setContent(ejsTemplate, { waitUntil: "networkidle0" as any });

  const pdfBuffer = await page.pdf(pdfConfig);

  await browser.close();

  // const end = performance.now();
  // console.log(`Time elapsed converting ejs to pdf: ${end - start}ms`);
  return pdfBuffer;
};
