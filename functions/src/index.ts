import * as functions from "firebase-functions";
import nodemailer from "nodemailer";
import cors from "cors";
import twilio from "twilio"; // <-- Add this import

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "centennialwaterventureresource@gmail.com", // Replace with your Gmail
    pass: "cnwz zvhd rfin yeyp", // Use an app password (not your real password)
  },
});

const corsHandler = cors({ origin: true }); // ✅ Allows requests from any origin

// --- Twilio Config ---
const accountSid = functions.config().twilio.sid;
const authToken = functions.config().twilio.token;
const twilioPhone = functions.config().twilio.phone;
const twilioClient = twilio(accountSid, authToken);

// --- Email Function ---
export const sendReceiptEmail = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    try {
      const { to, subject, body } = req.body;

      if (!to || !subject || !body) {
        console.error("❌ Missing required fields");
        return res.status(400).json({ error: "Missing required fields" });
      }

      await transporter.sendMail({
        from: '"Centennial Water Billing" <centennialwaterventureresource@gmail.com>',
        to,
        subject,
        html: body,
      });

      console.log(`✅ Email sent successfully to ${to}`);
      return res.status(200).json({ message: "Email sent successfully" });
    } catch (error: unknown) {
      console.error("❌ Error sending email:", error);

      // ✅ Explicitly check error type
      if (error instanceof Error) {
        return res.status(500).json({ error: "Failed to send email", details: error.message });
      } else {
        return res.status(500).json({ error: "Failed to send email", details: "Unknown error occurred" });
      }
    }
  });
});

// --- SMS Function ---
export const sendSms = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    try {
      const { to, message } = req.body;

      if (!to || !message) {
        console.error("❌ Missing required fields");
        return res.status(400).json({ error: "Missing required fields" });
      }

      await twilioClient.messages.create({
        body: message,
        from: twilioPhone,
        to,
      });

      console.log(`✅ SMS sent successfully to ${to}`);
      return res.status(200).json({ message: "SMS sent successfully" });
    } catch (error: unknown) {
      console.error("❌ Error sending SMS:", error);

      if (error instanceof Error) {
        return res.status(500).json({ error: "Failed to send SMS", details: error.message });
      } else {
        return res.status(500).json({ error: "Failed to send SMS", details: "Unknown error occurred" });
      }
    }
  });
});