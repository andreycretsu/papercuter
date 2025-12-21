import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendPasswordResetEmail(
  email: string,
  resetUrl: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await resend.emails.send({
      from: "Papercuts <noreply@resend.dev>", // You can customize this with your verified domain
      to: email,
      subject: "Reset your Papercuts password",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .container {
                background-color: #ffffff;
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                padding: 32px;
                margin: 20px 0;
              }
              h1 {
                color: #111827;
                font-size: 24px;
                margin-bottom: 16px;
              }
              p {
                color: #6b7280;
                margin-bottom: 16px;
              }
              .button {
                display: inline-block;
                background-color: #2563eb;
                color: #ffffff;
                text-decoration: none;
                padding: 12px 24px;
                border-radius: 6px;
                font-weight: 500;
                margin: 16px 0;
              }
              .button:hover {
                background-color: #1d4ed8;
              }
              .footer {
                color: #9ca3af;
                font-size: 14px;
                margin-top: 32px;
                padding-top: 16px;
                border-top: 1px solid #e5e7eb;
              }
              .warning {
                background-color: #fef3c7;
                border-left: 4px solid #f59e0b;
                padding: 12px;
                margin: 16px 0;
                border-radius: 4px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>Reset your password</h1>

              <p>Hi there,</p>

              <p>We received a request to reset your password for your Papercuts account. Click the button below to reset it:</p>

              <a href="${resetUrl}" class="button">Reset Password</a>

              <p style="color: #6b7280; font-size: 14px;">
                Or copy and paste this link into your browser:<br>
                <a href="${resetUrl}" style="color: #2563eb; word-break: break-all;">${resetUrl}</a>
              </p>

              <div class="warning">
                <strong>⚠️ Security Notice:</strong> This link will expire in 1 hour and can only be used once.
              </div>

              <p>If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.</p>

              <div class="footer">
                <p>This email was sent to ${email} because a password reset was requested for your Papercuts account.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to send password reset email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
