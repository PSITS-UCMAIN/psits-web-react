import { Request, Response } from "express";
import { certificateMail } from "../../mail_template/mail.template";
import { ICertificateData } from "../../mail_template/mail.interface";

export const sendCertEJSTestController = async (req: Request, res: Response) => {
    try {
        const { data, event_name, student_email } = req.body;
        // Need to add error trapping
        if (!data || !event_name || !student_email) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        certificateMail(data, event_name, student_email);
        res.status(200).json({ message: "Email sent successfully" });
    } catch (err) {
        console.error("Server error during certificate generation:", err);
        res.status(500).json({ message: "Internal Server Error" });
    }
};