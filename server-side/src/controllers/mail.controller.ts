import { Request, Response } from "express";
import { certificateMail } from "../mail_template/mail.template";

export const sendCertParticipationController = async (req: Request, res: Response) => {
    try {
        const { data, studentEmail } = req.body;
        if (!data ||
            !studentEmail ||
            !data.student_name ||
            !data.event_name ||
            !data.event_date ||
            !data.event_start_time ||
            !data.event_end_time ||
            !data.event_venue ||
            !data.images_path ||
            !data.signees
        ) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        certificateMail(data, studentEmail);
        res.status(200).json({ message: "Email sent successfully" });
    } catch (err) {
        console.error("Server error during certificate generation:", err);
        res.status(500).json({ message: "Internal Server Error" });
    }
};