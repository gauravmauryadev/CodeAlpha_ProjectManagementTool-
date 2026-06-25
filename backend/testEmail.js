require('dotenv').config();
const sendEmail = require('./utils/sendEmail');

async function testMail() {
  try {
    console.log("Testing email with credentials:");
    console.log("Host:", process.env.SMTP_HOST);
    console.log("Port:", process.env.SMTP_PORT);
    console.log("Email:", process.env.SMTP_EMAIL);
    
    await sendEmail({
      email: process.env.SMTP_EMAIL, // Send to self
      subject: 'Test Email from OmniPlan',
      html: '<h1>Success!</h1><p>Your SMTP configuration is working.</p>'
    });
    console.log("Email sent successfully!");
  } catch (err) {
    console.error("Failed to send email:", err.message);
  }
}

testMail();
