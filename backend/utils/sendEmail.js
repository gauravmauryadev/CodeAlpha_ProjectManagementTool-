const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  // Validate SMTP config
  if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) {
    console.error('❌ Email send failed: SMTP_EMAIL or SMTP_PASSWORD not set in environment variables');
    return;
  }

  // Create a transporter
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false, // true for 465, false for 587
    auth: {
      user: process.env.SMTP_EMAIL,
      pass: process.env.SMTP_PASSWORD
    }
  });

  // Define the email options
  const message = {
    from: `${process.env.FROM_NAME || 'OmniPlan'} <${process.env.FROM_EMAIL || process.env.SMTP_EMAIL}>`,
    to: options.email,
    subject: options.subject,
    html: options.html || `<p>${options.message}</p>`
  };

  try {
    // Send the email
    const info = await transporter.sendMail(message);
    console.log('✅ Email sent successfully to:', options.email, '| MessageId:', info.messageId);
    return info;
  } catch (err) {
    console.error('❌ Email send failed to:', options.email);
    console.error('   Error:', err.message);
    console.error('   SMTP Host:', process.env.SMTP_HOST);
    console.error('   SMTP Port:', process.env.SMTP_PORT);
    console.error('   SMTP User:', process.env.SMTP_EMAIL);
    throw err; // Re-throw so callers can handle it
  }
};

module.exports = sendEmail;

