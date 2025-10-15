import { Resend } from "resend";

const isEmailConfigured = () => {
  return !!process.env.RESEND_API_KEY;
};

let resend: Resend | null = null;

if (isEmailConfigured()) {
  resend = new Resend(process.env.RESEND_API_KEY);
  console.log("✅ Resend email service initialized");
} else {
  console.log(
    "⚠️  Email not configured - RESEND_API_KEY environment variable is missing"
  );
  console.log(
    "   Email notifications will be disabled until API key is provided"
  );
}

export interface EmailData {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(emailData: EmailData): Promise<boolean> {
  if (!resend || !isEmailConfigured()) {
    console.log("📧 Email not sent - Resend not configured");
    return false;
  }

  try {
    // Convert string array to array if needed
    const recipients = Array.isArray(emailData.to)
      ? emailData.to
      : [emailData.to];

    // Prepare email options for Resend
    const emailOptions: any = {
      from: process.env.FROM_EMAIL || "SplitEase <noreply@yourdomain.com>",
      to: recipients,
      subject: emailData.subject,
      html: emailData.html,
    };

    // Only include text if it's provided
    if (emailData.text) {
      emailOptions.text = emailData.text;
    }

    const { data, error } = await resend.emails.send(emailOptions);

    if (error) {
      console.error("❌ Error sending email:", error);
      return false;
    }

    console.log("✅ Email sent successfully:", data?.id);
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
