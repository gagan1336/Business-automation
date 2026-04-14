// server/services/mailer.js — SendGrid Email Service
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');

const FROM = process.env.FROM_EMAIL || 'hello@autobizpro.app';

async function sendEmail(to, subject, htmlContent, textContent) {
  if (!process.env.SENDGRID_API_KEY) {
    console.warn('[Mailer] SendGrid not configured — email not sent');
    return;
  }
  try {
    await sgMail.send({
      to,
      from: { email: FROM, name: 'AutoBiz Pro' },
      subject,
      text: textContent || subject,
      html: htmlContent,
    });
    console.log(`[Mailer] Email sent to ${to}: ${subject}`);
  } catch (err) {
    console.error('[Mailer] Send error:', err.response?.body?.errors || err.message);
  }
}

function sendBookingConfirmationEmail(to, customerName, service, date, time, businessName) {
  return sendEmail(
    to,
    `Booking Confirmed — ${service} at ${businessName}`,
    `<h2>Hi ${customerName}!</h2>
     <p>Your booking is confirmed ✅</p>
     <table>
       <tr><td><strong>Service:</strong></td><td>${service}</td></tr>
       <tr><td><strong>Date:</strong></td><td>${date}</td></tr>
       <tr><td><strong>Time:</strong></td><td>${time}</td></tr>
       <tr><td><strong>Business:</strong></td><td>${businessName}</td></tr>
     </table>
     <p>See you soon! 🙏</p>`,
  );
}

function sendWeeklyReport(to, ownerName, stats) {
  return sendEmail(
    to,
    'Your Weekly Business Report — AutoBiz Pro',
    `<h2>Hi ${ownerName}!</h2>
     <p>Here's your week at a glance:</p>
     <ul>
       <li>Total Bookings: ${stats.bookings}</li>
       <li>Total Revenue: ₹${stats.revenue?.toLocaleString()}</li>
       <li>New Customers: ${stats.newCustomers}</li>
       <li>Walk-ins: ${stats.walkins}</li>
     </ul>
     <p>Keep growing! 🚀</p>`,
  );
}

module.exports = { sendEmail, sendBookingConfirmationEmail, sendWeeklyReport };
