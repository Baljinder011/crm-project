const nodemailer = require('nodemailer');

function hasSmtpConfig() {
  return (
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS
  );
}

async function sendEmail({ to, subject, html, fallbackText }) {
  if (!hasSmtpConfig()) {
    console.warn('SMTP is not configured. Email was not sent.');
    if (fallbackText) {
      console.log('Email fallback output:', fallbackText);
    }
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to,
    subject,
    html,
  });
}

module.exports = { sendEmail };