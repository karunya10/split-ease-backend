import nodemailer from "nodemailer";


const isEmailConfigured = () => {
  return !!(process.env.SMTP_USER && process.env.SMTP_PASS);
};


let transporter: nodemailer.Transporter | null = null;

if (isEmailConfigured()) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    secure: false, 
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  transporter.verify((error: any, success: any) => {
    if (error) {
      console.log("❌ Email configuration error:", error.message);
    } else {
      console.log("✅ Email server is ready to send messages");
    }
  });
} else {
  console.log(
    "⚠️  Email not configured - SMTP_USER and SMTP_PASS environment variables are missing"
  );
  console.log(
    "   Email notifications will be disabled until credentials are provided"
  );
}

export interface EmailData {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(emailData: EmailData): Promise<boolean> {

  if (!transporter || !isEmailConfigured()) {
    console.log("📧 Email not sent - SMTP not configured");
    return false;
  }

  try {
    const info = await transporter.sendMail({
      from: `"SplitEase" <${process.env.SMTP_USER}>`,
      to: emailData.to,
      subject: emailData.subject,
      text: emailData.text,
      html: emailData.html,
    });

    console.log("✅ Email sent successfully:", info.messageId);
    return true;
  } catch (error) {
    console.error(
      "❌ Error sending email:",
      error instanceof Error ? error.message : error
    );
    return false;
  }
}

export function generateExpenseNotificationEmail(
  expenseData: {
    description: string;
    amount: number;
    paidByName: string;
    groupName: string;
  },
  recipientName: string
): { subject: string; html: string; text: string } {
  const subject = `New expense added to ${expenseData.groupName}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background-color: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
        .expense-details { background-color: white; padding: 15px; border-radius: 5px; margin: 15px 0; }
        .amount { font-size: 24px; font-weight: bold; color: #4CAF50; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>💰 New Expense Added</h1>
        </div>
        <div class="content">
          <p>Hi ${recipientName},</p>
          <p>A new expense has been added to your group <strong>${
            expenseData.groupName
          }</strong>.</p>
          
          <div class="expense-details">
            <h3>Expense Details:</h3>
            <p><strong>Description:</strong> ${expenseData.description}</p>
            <p><strong>Amount:</strong> <span class="amount">$${expenseData.amount.toFixed(
              2
            )}</span></p>
            <p><strong>Paid by:</strong> ${expenseData.paidByName}</p>
          </div>
          
          <p>Please check your SplitEase app to see how this affects your balances.</p>
          
          <p>Best regards,<br>The SplitEase Team</p>
        </div>
        <div class="footer">
          <p>This is an automated message from SplitEase. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Hi ${recipientName},

A new expense has been added to your group "${expenseData.groupName}".

Expense Details:
- Description: ${expenseData.description}
- Amount: $${expenseData.amount.toFixed(2)}
- Paid by: ${expenseData.paidByName}

Please check your SplitEase app to see how this affects your balances.

Best regards,
The SplitEase Team
  `;

  return { subject, html, text };
}
