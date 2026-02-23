import path from "path"
import fs from "fs"

require('dotenv').config({ path: path.resolve(__dirname, "../../.env") })

import { ICertificateData } from "../mail_template/mail.interface"
import { certificateOfParticipationEmail } from "../mail_template/mail.template"


/**
 * Generate automated certs and sending an email payload to target email
 */
async function sendCertEmail(testDataPath: string, studentEmail: string) {
    const root = path.resolve(__dirname, '..')
    const fullDataPath = path.join(root, testDataPath)

    if (!fs.existsSync(fullDataPath)) throw Error("The path to test data does not exist.")
    
    const data = JSON.parse(fs.readFileSync(fullDataPath, "utf-8")) as ICertificateData

    if (!data ||
        !studentEmail ||
        !data.student_name ||
        !data.event_name ||
        !data.event_date ||
        !data.event_start_time ||
        !data.event_end_time ||
        !data.event_venue_specific ||
        !data.images ||
        !data.fonts ||
        !data.signees
    ) {
        throw Error("Some required fields in data are missing.")
    }

    const res = await certificateOfParticipationEmail(data, studentEmail) as { status: boolean, message: string }

    if (res.status) {
        console.log("Certificate of participation sent successfully!")
    } else {
        console.log("Failed to send certificate of participation")
    }
}

const args = process.argv.slice(2)

sendCertEmail(
    args[0],
    args[1] || ""
)

// run script: npx ts-node scripts/send-cert-email-script.ts [path-to-test-data] [email]