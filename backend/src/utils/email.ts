import nodemailer from 'nodemailer';

// Only create transporter when credentials are provided
let transporter: nodemailer.Transporter | null = null;
if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
} else {
  console.warn('EMAIL_USER or EMAIL_PASS not set - email sending disabled');
}

// Make the extra data optional to match usages across the codebase
export const sendInvoiceEmail = async (to: string, subject: string, html: string, _extra?: any) => {
  if (!transporter) {
    // Gracefully skip sending if transporter not configured
    console.info(`Skipping sendInvoiceEmail to ${to} because email is not configured`);
    return;
  }

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject,
    html,
  } as any;

  try {
    await transporter.sendMail(mailOptions);
  } catch (err) {
    // Log error but don't throw - email failures should not block order creation
    console.error('Failed to send invoice email:', (err as any)?.message || err);
  }
};