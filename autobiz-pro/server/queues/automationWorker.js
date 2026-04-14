// server/queues/automationWorker.js — BullMQ Job Processor
const { createWorker } = require('./client');
const { QUEUE_NAME } = require('./automationQueue');
const whatsapp = require('../services/whatsapp');
const prisma = require('../services/db');

const worker = createWorker(QUEUE_NAME, async (job) => {
  const { name, data } = job;
  console.log(`[Worker] Processing job: ${name}`, job.id);

  try {
    switch (name) {

      case 'booking-reminder': {
        const { booking, customer, business } = data;
        if (customer?.phone) {
          await whatsapp.sendBookingReminder(customer.phone, customer.name, booking.service || 'appointment', booking.time);
        }
        // Log run in automations
        await prisma.automation.updateMany({
          where: { businessId: business.id, trigger: { contains: '2 hours before booking' }, active: true },
          data: { runs: { increment: 1 } },
        });
        break;
      }

      case 'follow-up': {
        const { phone, customerName } = data;
        if (phone) {
          await whatsapp.sendFollowUp(phone, customerName);
        }
        break;
      }

      case 'walkin-thanks': {
        const { walkin } = data;
        if (walkin?.phone) {
          await whatsapp.sendWalkinThankYou(walkin.phone, walkin.customerName, walkin.service);
        }
        break;
      }

      case 'auto-reply': {
        const { conversationId, phone, messageText, business } = data;
        // Fetch active automations for this business
        const automations = await prisma.automation.findMany({
          where: { businessId: business.id, active: true },
        });

        const msg = messageText.toLowerCase();
        let replied = false;

        for (const rule of automations) {
          const trigger = rule.trigger.toLowerCase();
          let triggered = false;

          if (trigger.includes('message contains "price"') && msg.includes('price')) triggered = true;
          if (trigger.includes('message contains "book"') && msg.includes('book')) triggered = true;
          if (trigger.includes('message contains "hours"') && msg.includes('hours')) triggered = true;

          if (triggered && phone) {
            const bookingUrl = `${process.env.FRONTEND_URL}/book/${business.slug}`;
            if (rule.action.toLowerCase().includes('price list')) {
              await whatsapp.sendPriceListReply(phone, business.name, bookingUrl);
            } else {
              await whatsapp.sendTextMessage(phone.replace(/\D/g, ''), rule.action);
            }
            // Increment run count
            await prisma.automation.update({
              where: { id: rule.id },
              data: { runs: { increment: 1 } },
            });
            // Save outgoing message in conversation
            await prisma.message.create({
              data: {
                conversationId,
                text: rule.action,
                fromRole: 'business',
              },
            });
            replied = true;
            break; // Only fire first matching rule
          }
        }

        // Schedule follow-up if no reply will come
        if (!replied) {
          const { scheduleFollowUp } = require('./automationQueue');
          await scheduleFollowUp(conversationId, phone, '', business.id);
        }
        break;
      }

      default:
        console.warn('[Worker] Unknown job type:', name);
    }
  } catch (err) {
    console.error(`[Worker] Job ${name} failed:`, err.message);
    throw err; // BullMQ will retry
  }
});

if (worker) {
  worker.on('completed', (job) => console.log(`[Worker] ✅ ${job.name} completed`));
  worker.on('failed', (job, err) => console.error(`[Worker] ❌ ${job?.name} failed:`, err.message));
  console.log('[Worker] Automation worker started ✅');
}

module.exports = worker;
