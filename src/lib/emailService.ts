import nodemailer from "nodemailer";

interface EmailOptions {
  to: string;
  subject: string;
  body: string;
}

export const sendEmail = async ({ to, subject, body }: EmailOptions) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "centennialwaterventureresource@gmail.com", // Replace with your email
        pass: "cnwz zvhd rfin yeyp", // Use an app password, not your actual password
      },
    });

    const mailOptions = {
      from: '"Centennial Water Billing" <centennialwaterventureresource@gmail.com>', // Change sender info
      to,
      subject,
      html: body,
    };

    await transporter.sendMail(mailOptions);
    console.log(`📧 Email sent to ${to}`);
  } catch (error) {
    console.error("❌ Error sending email:", error);
  }
};
