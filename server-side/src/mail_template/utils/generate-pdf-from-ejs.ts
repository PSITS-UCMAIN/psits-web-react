import puppeteer from "puppeteer";
import ejs from "ejs"
import path from "path"
import { toBase64 } from "./to-base64"
import { ICertificateData } from "../mail.interface";

export const generatePDFFromEJS = async (templatePath: string, data: ICertificateData) => {
    if (data.images) {
        for (const [key, value] of Object.entries(data.images)) {
            data.images[key] = await toBase64(path.join(__dirname, "../../assets", value as string))
        }
    }
    const ejsTemplate = await ejs.renderFile(
        path.join(__dirname, "../../assets", templatePath),
        data
    ) as string

    const browser = await puppeteer.launch({ headless: true })
    const page = await browser.newPage()

    await page.setContent(ejsTemplate, { waitUntil: "networkidle0" })

    const pdfBuffer = await page.pdf({
        format: 'A4',
        landscape: true,
        printBackground: true
    })

    await browser.close()
    return pdfBuffer
}