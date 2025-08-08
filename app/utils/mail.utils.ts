import nodemailer from "nodemailer";
import envConfig from "../config/env.config";

// Email configuration interface
interface EmailConfig {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
    contentType?: string;
  }>;
}

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: envConfig.EMAIL_USER,
      pass: envConfig.EMAIL_PASS,
    },
  });
};

// Send email function
export const sendEmail = async (config: EmailConfig): Promise<boolean> => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: envConfig.EMAIL_USER,
      to: Array.isArray(config.to) ? config.to.join(", ") : config.to,
      subject: config.subject,
      html: config.html,
      text: config.text,
      attachments: config.attachments,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully:", info.messageId);
    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
};

export const sendRecoveryLinkEmail = async ( userEmail:string,userId:string,userToken:string):Promise<boolean>=>{
       const html =`
       <h1>Link to verify Email</h1>
       <a href="http://localhost:3000/recover-password/${userId}?token=${userToken}">Click me</a>
       `
       return await sendEmail({
        to:userEmail,
        subject:'Recover Password',
        html:html
       })
}

