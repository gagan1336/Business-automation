// server/services/whatsapp.js — Meta WhatsApp Cloud API
const axios = require('axios');

const BASE_URL = 'https://graph.facebook.com/v19.0';

/**
 * Send a plain text WhatsApp message
 * @param {string} to   - Recipient phone number in international format (e.g. 919876543210)
 * @param {string} text - Message body
 */
async function sendTextMessage(to, text, credentials = null) {
  const token = credentials?.accessToken || process.env.META_ACCESS_TOKEN;
  const phoneId = credentials?.phoneNumberId || process.env.META_PHONE_NUMBER_ID;

  if (!token || !phoneId) {
    console.warn('[WhatsApp] Credentials not configured — message not sent');
    return null;
  }
  try {
    const { data } = await axios.post(
      `${BASE_URL}/${phoneId}/messages`,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: { preview_url: false, body: text },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
    console.log(`[WhatsApp] Message sent to ${to}:`, data.messages?.[0]?.id);
    return data;
  } catch (err) {
    console.error('[WhatsApp] Send error:', err.response?.data || err.message);
    throw err;
  }
}

/**
 * Send a booking confirmation message
 */
function sendBookingConfirmation(phone, customerName, service, date, time, businessSlug) {
  const bookingUrl = `${process.env.FRONTEND_URL}/book/${businessSlug}`;
  const msg = `Hi ${customerName}! ✅ Your booking is confirmed.\n\n📋 Service: ${service}\n📅 Date: ${date}\n⏰ Time: ${time}\n\nSee you soon! 🙏\n\nManage booking: ${bookingUrl}`;
  return sendTextMessage(phone.replace(/\D/g, ''), msg);
}

/**
 * Send a booking reminder (2 hours before)
 */
function sendBookingReminder(phone, customerName, service, time) {
  const msg = `Hi ${customerName}! ⏰ Reminder: You have a *${service}* appointment today at *${time}*.\n\nSee you soon! 🙏`;
  return sendTextMessage(phone.replace(/\D/g, ''), msg);
}

/**
 * Send a walk-in thank you
 */
function sendWalkinThankYou(phone, customerName, service) {
  const msg = `Hi ${customerName}! 🙏 Thank you for visiting us today for your *${service}*. We hope to see you again soon!\n\n⭐ Leave us a review!`;
  return sendTextMessage(phone.replace(/\D/g, ''), msg);
}

/**
 * Send a follow-up message
 */
function sendFollowUp(phone, customerName) {
  const msg = `Hi ${customerName}! 👋 We noticed we haven't heard back from you. Is there anything we can help you with?\n\nBook your next appointment here: ${process.env.FRONTEND_URL}`;
  return sendTextMessage(phone.replace(/\D/g, ''), msg);
}

/**
 * Send a price list + booking link (auto-reply)
 */
function sendPriceListReply(phone, businessName, bookingUrl) {
  const msg = `Hi! 👋 Thanks for reaching out to *${businessName}*.\n\n💰 View our services & prices and book online:\n${bookingUrl}\n\nFeel free to ask any questions!`;
  return sendTextMessage(phone.replace(/\D/g, ''), msg);
}

module.exports = {
  sendTextMessage,
  sendBookingConfirmation,
  sendBookingReminder,
  sendWalkinThankYou,
  sendFollowUp,
  sendPriceListReply,
};
