require('dotenv').config();
const nodemailer = require('nodemailer');

const test = async () => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
      port: process.env.SMTP_PORT || 2525,
      auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD
      }
    });

    const info = await transporter.sendMail({
      from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
      to: 'gauravmaurya9419@gmail.com', // sending to self
      subject: 'Test Email',
      text: 'This is a test email'
    });
    console.log('Success:', info);
  } catch (err) {
    console.error('Error:', err);
  }
};
test();
