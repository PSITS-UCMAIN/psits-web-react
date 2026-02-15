import { Request, Response } from "express";
import ejs from "ejs";
import path from "path";
import { toBase64 } from "../../mail_template/utils/to-base64";
import { ICertificateData } from "../../mail_template/mail.interface";

/**
 * Controller to preview any EJS template.
 * Expects:
 * - templatePath: string (e.g. "../../assets/ejs/pdf-ejs/certificate.ejs")
 * - data: object (the data to inject into the template)
 * 
 * Note:
 * Images must be stored within the "images" key within data
 */

export const previewEJSController = async (req: Request, res: Response) => {
    const { templatePath, data }: {
        templatePath: string;
        data: ICertificateData;
    } = req.body;

    // Image handling
    if (data.images) {
        try {
            // Replace file path with base64 value
            for (const [key, value] of Object.entries(data.images)) {
                data.images[key] = await toBase64(
                    path.join(__dirname, "../../assets", value as string)
                )
            }
        } catch (err: any) {
            console.error("Preview error:", err);
            return res.status(500).send(`
                <div style="font-family: sans-serif; padding: 20px; color: #721c24; background: #f8d7da; border: 1px solid #f5c6cb;">
                    <h2>Error rendering template</h2>
                    <p><strong>Path:</strong> ${templatePath}</p>
                    <p><strong>Message:</strong> 
                        <pre>${err.message}</pre>
                    </p>
                </div>
            `);
        }
    }

    try {
        if (!templatePath) {
            return res.status(400).send("<h1>Error</h1><p>templatePath is required in the request body.</p>");
        }

        const ejsTemplate = await ejs.renderFile(
            path.join(__dirname, "../../assets", templatePath),
            data || {}
        );

        return res.status(200).send(ejsTemplate);
    } catch (err: any) {
        console.error("Preview error:", err);
        return res.status(500).send(`
            <div style="font-family: sans-serif; padding: 20px; color: #721c24; background: #f8d7da; border: 1px solid #f5c6cb;">
                <h2>Error rendering template</h2>
                <p><strong>Path:</strong> ${templatePath}</p>
                <p><strong>Message:</strong> 
                    <pre>${err.message}</pre>
                </p>
            </div>
        `);
    }
};
