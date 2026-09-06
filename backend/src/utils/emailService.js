const nodemailer = require('nodemailer');

/**
 * Creates Nodemailer transporter based on .env config
 */
const createTransporter = () => {
  const user = process.env.EMAIL_USER || process.env.GMAIL_USER;
  const pass = process.env.EMAIL_PASS || process.env.GMAIL_PASS;

  if (!user || !pass) {
    return null;
  }

  // If custom SMTP host is defined, use it; otherwise default to Gmail service
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user, pass }
    });
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass }
  });
};

/**
 * Sends OTP Email to user's Gmail / email inbox
 */
const sendOtpEmail = async (toEmail, otp, type = 'REGISTER') => {
  const user = process.env.EMAIL_USER || process.env.GMAIL_USER;
  const transporter = createTransporter();

  if (!transporter) {
    console.log(`\n⚠️  [Email Service] SMTP credentials (EMAIL_USER & EMAIL_PASS) not configured in backend/.env`);
    console.log(`ℹ️  [Email Service] OTP for ${toEmail} is: ${otp}\n`);
    return { sent: false, reason: 'NO_CREDENTIALS', otp };
  }

  const subject = type === 'REGISTER' 
    ? `Your DealFlow360 Registration OTP: ${otp}` 
    : type === 'FORGOT_PASSWORD'
    ? `Your DealFlow360 Password Reset OTP: ${otp}`
    : `Your DealFlow360 Sign-In OTP: ${otp}`;

  const actionText = type === 'REGISTER' 
    ? 'creating your DealFlow360 account' 
    : type === 'FORGOT_PASSWORD'
    ? 'resetting your password'
    : 'signing in';

  const html = `
    <div style="background-color: #080B12; color: #F5F7FA; padding: 32px; font-family: 'Plus Jakarta Sans', Arial, sans-serif; max-width: 500px; margin: 0 auto; border-radius: 16px; border: 1px solid #242C3A;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #F5F7FA; margin: 0; font-size: 24px; font-weight: 800;">
          DealFlow<span style="color: #818CF8;">360</span>
        </h1>
        <p style="color: #687386; font-size: 12px; margin-top: 4px;">Security Verification Code</p>
      </div>

      <p style="color: #A7B0C0; font-size: 14px; margin-bottom: 16px;">
        Hello,
      </p>
      <p style="color: #A7B0C0; font-size: 14px; margin-bottom: 24px; line-height: 1.5;">
        Your 6-digit verification code for <strong>${actionText}</strong> is:
      </p>

      <div style="background-color: #111722; border: 1px solid #242C3A; padding: 18px; border-radius: 12px; text-align: center; margin-bottom: 24px;">
        <span style="font-family: 'Courier New', monospace; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #6366F1;">
          ${otp}
        </span>
      </div>

      <p style="color: #687386; font-size: 12px; margin-bottom: 8px; text-align: center;">
        This OTP is valid for <strong>10 minutes</strong>. Do not share this code with anyone.
      </p>
      
      <div style="border-t: 1px solid #242C3A; margin-top: 24px; pt: 16px; text-align: center;">
        <p style="color: #687386; font-size: 11px;">DealFlow360 Enterprise Sales Platform</p>
      </div>
    </div>
  `;

  try {
    const info = await transporter.sendMail({
      from: `"DealFlow360 Verification" <${user}>`,
      to: toEmail,
      subject,
      html
    });

    console.log(`\n✅ [Email Service] Real OTP Email sent to Gmail (${toEmail}) | Message ID: ${info.messageId}`);
    return { sent: true, messageId: info.messageId, otp };
  } catch (error) {
    console.error(`❌ [Email Service] Failed to send email to ${toEmail}:`, error.message);
    return { sent: false, error: error.message, otp };
  }
};

module.exports = { sendOtpEmail };
