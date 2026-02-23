import path from "path";
import fs from "fs";
import ejs from "ejs";
import { pngToBase64, ttfToBase64 } from "../utils/to-base64";
import { Extensions, normalizeFinalPath } from "../utils/path-normalizer";
import { validateAndFinalizeFilePath } from "../mail_template/utils/generate-pdf-from-ejs";

const ROOT_DIR = path.resolve(__dirname, "..");
const ASSETS_BASE_DIR = path.resolve(ROOT_DIR, "assets");

/**
 * Generate html output based on ejs file and test data.
 * This script is reusable, simply supply the proper arguments.
 * @param templatePath
 * @param testDataPath
 */
async function runPreview(templatePath: string, testDataPath: string) {
  const fullTemplatePath = normalizeFinalPath(ROOT_DIR, templatePath);
  const fullTestDataPath = normalizeFinalPath(ROOT_DIR, testDataPath);
  const outputPath = path.join(ROOT_DIR, "scripts/output/test-preview.html");

  try {
    if (!fs.existsSync(fullTestDataPath))
      throw new Error(`Data file not found: ${fullTestDataPath}`);

    const data = JSON.parse(fs.readFileSync(fullTestDataPath, "utf-8"));

    if (data.images) {
      for (const [key, value] of Object.entries(data.images)) {
        const allowedExtensions = [Extensions.png];
        const fullImagePath = validateAndFinalizeFilePath(
          ASSETS_BASE_DIR,
          value as string,
          allowedExtensions
        );
        data.images[key] = await pngToBase64(fullImagePath);
      }
    }

    if (data.fonts) {
      for (const [key, value] of Object.entries(data.fonts)) {
        const allowedExtensions = [Extensions.ttf];
        const fontPath = validateAndFinalizeFilePath(
          ASSETS_BASE_DIR,
          value as string,
          allowedExtensions
        );
        data.fonts[key] = await ttfToBase64(fontPath);
      }
    }

    const html = (await ejs.renderFile(fullTemplatePath, data)) as string;
    fs.writeFileSync(outputPath, html);

    console.log("EJS preview HTML file successfully generated.");
  } catch (error) {
    console.error("Failed to generate preview: ", error);
  }
}

const args = process.argv.slice(2);

runPreview(args[0] || "", args[1] || "");

// run script: npx ts-node scripts/preview-ejs-script.ts assets/ejs/pdf-ejs/[ejs-file] scripts/data/[test-data-json]
