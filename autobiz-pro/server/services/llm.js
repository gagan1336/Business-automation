// server/services/llm.js — Google Gemini 2.0 Flash LLM Service
// Generates intelligent, contextual messages for automations
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

const MODEL = 'gemini-2.0-flash';

// ── System Prompts ────────────────────────────────────────────────────────────

const SYSTEM_BASE = `You are a professional assistant for a service business. 
Generate short, warm, professional messages. Use emojis sparingly (1-2 max).
Keep messages under 160 characters when possible for SMS compatibility.
Never mention that you are an AI. Write as the business itself.
Do not include subject lines unless explicitly asked.`;

const PROMPTS = {
  reminder_24h: `${SYSTEM_BASE}
Generate a friendly 24-hour appointment reminder message.
Include: customer name, service name, date, time, business name.
Tone: warm, professional. Include a brief "see you tomorrow!" sentiment.`,

  reminder_2h: `${SYSTEM_BASE}
Generate a brief 2-hour appointment reminder.
Include: customer name, service, time.
Tone: concise, friendly. "Your appointment is coming up soon!"`,

  review_request: `${SYSTEM_BASE}
Generate a post-visit review request message.
Thank the customer for visiting, ask them to leave a review.
Include: customer name, service they received, business name.
Tone: grateful, not pushy.`,

  rebooking_nudge: `${SYSTEM_BASE}
Generate a rebooking reminder message.
The customer hasn't visited in a while. Encourage them to book again.
Include: customer name, their last service, business name.
Tone: friendly, inviting, not desperate.`,

  follow_up: `${SYSTEM_BASE}
Generate a conversation follow-up message.
The customer hasn't replied to a previous conversation.
Include: customer name, business name.
Tone: helpful, checking in. Keep it brief.`,

  auto_reply: `${SYSTEM_BASE}
Generate an intelligent auto-reply to a customer's incoming message.
Consider the message content and business context.
If they're asking about prices/services, mention the booking link.
If they're asking about availability, suggest they check the online booking page.
Keep it conversational and helpful.`,

  booking_confirmation: `${SYSTEM_BASE}
Generate a booking confirmation message.
Include: customer name, service, date, time, business name.
Mention they can manage their booking via the provided link.
Tone: excited, professional.`,
};

// ── LLM Generation Functions ──────────────────────────────────────────────────

/**
 * Generate a message using Gemini Flash
 * @param {string} type - Message type (key from PROMPTS)
 * @param {object} context - Dynamic data to include
 * @returns {string} Generated message text
 */
async function generateMessage(type, context) {
  // Fallback to templates if LLM is not configured
  if (!genAI) {
    console.warn('[LLM] Gemini not configured — using fallback template');
    return getFallbackMessage(type, context);
  }

  try {
    const model = genAI.getGenerativeModel({ model: MODEL });
    const systemPrompt = PROMPTS[type] || PROMPTS.auto_reply;

    const contextStr = Object.entries(context)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n');

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\nContext:\n${contextStr}\n\nGenerate the message:` }] }],
      generationConfig: {
        maxOutputTokens: 200,
        temperature: 0.7,
      },
    });

    const text = result.response.text().trim();
    console.log(`[LLM] Generated ${type} message (${text.length} chars)`);
    return text;
  } catch (err) {
    console.error(`[LLM] Generation error for ${type}:`, err.message);
    return getFallbackMessage(type, context);
  }
}

/**
 * Generate an intelligent auto-reply for incoming messages
 */
async function generateAutoReply(incomingMessage, business, customerHistory = []) {
  return generateMessage('auto_reply', {
    incomingMessage,
    businessName: business.name,
    businessCategory: business.category,
    bookingUrl: `${process.env.FRONTEND_URL}/book/${business.slug}`,
    customerHistory: customerHistory.length > 0
      ? `Previous visits: ${customerHistory.length}, last service: ${customerHistory[0]?.service || 'N/A'}`
      : 'New customer',
  });
}

/**
 * Generate a booking confirmation
 */
async function generateBookingConfirmation(customer, booking, business, service) {
  return generateMessage('booking_confirmation', {
    customerName: customer.name,
    service: service?.name || 'Appointment',
    date: booking.startTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
    time: booking.startTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    businessName: business.name,
    bookingUrl: `${process.env.FRONTEND_URL}/book/${business.slug}`,
  });
}

/**
 * Generate a reminder message
 */
async function generateReminder(type, customer, booking, business, service) {
  return generateMessage(type, {
    customerName: customer.name,
    service: service?.name || 'Appointment',
    date: booking.startTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
    time: booking.startTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    businessName: business.name,
  });
}

/**
 * Generate a review request
 */
async function generateReviewRequest(customer, service, business) {
  return generateMessage('review_request', {
    customerName: customer.name,
    service: service?.name || 'appointment',
    businessName: business.name,
  });
}

/**
 * Generate a rebooking nudge
 */
async function generateRebookingNudge(customer, lastService, business) {
  return generateMessage('rebooking_nudge', {
    customerName: customer.name,
    lastService: lastService || 'your last service',
    businessName: business.name,
    bookingUrl: `${process.env.FRONTEND_URL}/book/${business.slug}`,
  });
}

// ── Fallback Templates ────────────────────────────────────────────────────────

function getFallbackMessage(type, ctx) {
  const templates = {
    reminder_24h: `Hi ${ctx.customerName}! 📅 Reminder: You have a ${ctx.service} appointment tomorrow at ${ctx.time} with ${ctx.businessName}. See you then!`,
    reminder_2h: `Hi ${ctx.customerName}! ⏰ Your ${ctx.service} appointment is in 2 hours at ${ctx.time}. See you soon!`,
    review_request: `Hi ${ctx.customerName}! Thank you for visiting ${ctx.businessName}! We'd love to hear about your experience. 🙏`,
    rebooking_nudge: `Hi ${ctx.customerName}! It's been a while since your last visit to ${ctx.businessName}. Ready to book again? ${ctx.bookingUrl || ''}`,
    follow_up: `Hi ${ctx.customerName}! Just checking in — is there anything ${ctx.businessName || 'we'} can help you with? 😊`,
    auto_reply: `Hi! Thanks for reaching out. You can view our services and book online here: ${ctx.bookingUrl || 'our website'}`,
    booking_confirmation: `Hi ${ctx.customerName}! ✅ Your ${ctx.service} appointment is confirmed for ${ctx.date} at ${ctx.time} with ${ctx.businessName}.`,
  };
  return templates[type] || templates.auto_reply;
}

module.exports = {
  generateMessage,
  generateAutoReply,
  generateBookingConfirmation,
  generateReminder,
  generateReviewRequest,
  generateRebookingNudge,
  getFallbackMessage,
};
