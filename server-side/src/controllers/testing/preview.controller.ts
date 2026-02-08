import { Request, Response } from "express";
import ejs from "ejs";
import path from "path";

/**
 * Controller to preview any EJS template.
 * Expects:
 * - templatePath: string (e.g. "../../assets/ejs/pdf-ejs/certificate.ejs")
 * - data: object (the data to inject into the template)
 * 
 * Note:
 * Does not handle cid or images
 */
export const previewEJSController = async (req: Request, res: Response) => {
    const { templatePath, data } = req.body;

    try {
        if (!templatePath) {
            return res.status(400).send("<h1>Error</h1><p>templatePath is required in the request body.</p>");
        }

        const ejsTemplate = await ejs.renderFile(
            path.join(__dirname, "../../assets/ejs", templatePath),
            data || {}
        );

        res.send(ejsTemplate);
    } catch (err: any) {
        console.error("Preview error:", err);
        res.status(500).send(`
            <div style="font-family: sans-serif; padding: 20px; color: #721c24; background: #f8d7da; border: 1px solid #f5c6cb;">
                <h2>Error rendering template</h2>
                <p><strong>Path:</strong> ${templatePath}</p>
                <p><strong>Message:</strong> ${err.message}</p>
            </div>
        `);
    }
};
