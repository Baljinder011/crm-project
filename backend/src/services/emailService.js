const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return transporter;
}

async function sendLeadAcknowledgementEmail({ to, name, company }) {
  const mailer = getTransporter();

  const safeName = name || 'there';
  const safeCompany = company ? ` regarding ${company}` : '';

  await mailer.sendMail({
    from: process.env.MAIL_FROM,
    to,
    subject: 'We received your inquiry',
    html: `
      <div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6;">
        <h2 style="margin-bottom: 12px;">Thanks for reaching out, ${safeName}.</h2>
        <p>We have received your inquiry${safeCompany}.</p>
        <p>Our team is reviewing your request and will reach out to you soon.</p>
        <p>Best regards,<br />Team</p>
      </div>
    `,
  });
}

module.exports = {
  sendLeadAcknowledgementEmail,
};