// server/routes/billing.js — Stripe Subscription Billing
const express = require('express');
const router = express.Router();
const prisma = require('../services/db');
const firebaseAuth = require('../middleware/firebaseAuth');

// Initialize Stripe only if key is configured
let stripe = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
}

// Plan price mapping
const PLAN_PRICES = {
  Starter: process.env.STRIPE_PRICE_STARTER,
  Pro: process.env.STRIPE_PRICE_PRO,
  Business: process.env.STRIPE_PRICE_BUSINESS,
};

async function getBusiness(firebaseUid) {
  return prisma.business.findUniqueOrThrow({ where: { firebaseUid } });
}

// POST /api/billing/create-checkout — Create Stripe Checkout Session
router.post('/create-checkout', firebaseAuth, async (req, res) => {
  try {
    if (!stripe) {
      return res.status(503).json({ error: 'Payment system not configured. Please contact support.' });
    }

    const { plan } = req.body;
    if (!plan || !PLAN_PRICES[plan]) {
      return res.status(400).json({
        error: 'Invalid plan. Choose: Starter, Pro, or Business',
        validPlans: Object.keys(PLAN_PRICES),
      });
    }

    const priceId = PLAN_PRICES[plan];
    if (!priceId) {
      return res.status(500).json({ error: `Price ID not configured for ${plan} plan` });
    }

    const business = await getBusiness(req.firebaseUid);

    // Create or reuse Stripe customer
    let stripeCustomerId = business.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: business.email,
        name: business.name,
        metadata: {
          businessId: business.id,
          firebaseUid: req.firebaseUid,
        },
      });
      stripeCustomerId = customer.id;
      await prisma.business.update({
        where: { id: business.id },
        data: { stripeCustomerId },
      });
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/app/settings?billing=success`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/app/settings?billing=cancelled`,
      metadata: {
        businessId: business.id,
        plan,
      },
    });

    res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('[Billing] Checkout error:', err.message);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// GET /api/billing/portal — Stripe Customer Portal
router.get('/portal', firebaseAuth, async (req, res) => {
  try {
    if (!stripe) {
      return res.status(503).json({ error: 'Payment system not configured' });
    }

    const business = await getBusiness(req.firebaseUid);
    if (!business.stripeCustomerId) {
      return res.status(400).json({ error: 'No active subscription found. Please subscribe first.' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: business.stripeCustomerId,
      return_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/app/settings`,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('[Billing] Portal error:', err.message);
    res.status(500).json({ error: 'Failed to create billing portal session' });
  }
});

// GET /api/billing/status — Current subscription status
router.get('/status', firebaseAuth, async (req, res) => {
  try {
    const business = await getBusiness(req.firebaseUid);
    res.json({
      plan: business.plan,
      stripeCustomerId: business.stripeCustomerId ? '***configured***' : null,
      stripeSubscriptionId: business.stripeSubscriptionId ? '***active***' : null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/billing/webhook — Stripe Webhook Handler
// NOTE: This endpoint receives RAW body (handled by express.raw in index.js)
router.post('/webhook', async (req, res) => {
  if (!stripe) {
    return res.sendStatus(200); // Accept silently if not configured
  }

  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.warn('[Billing] STRIPE_WEBHOOK_SECRET not set — accepting webhook without verification');
  }

  let event;
  try {
    if (webhookSecret && sig) {
      // Verify signature — req.body must be raw buffer
      const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body));
      event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    } else {
      event = typeof req.body === 'string' ? JSON.parse(req.body) :
              Buffer.isBuffer(req.body) ? JSON.parse(req.body.toString()) : req.body;
    }
  } catch (err) {
    console.error('[Billing] Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  console.log(`[Billing] Webhook event: ${event.type}`);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const businessId = session.metadata?.businessId;
        const plan = session.metadata?.plan;

        if (businessId && plan) {
          await prisma.business.update({
            where: { id: businessId },
            data: {
              plan,
              stripeSubscriptionId: session.subscription || null,
            },
          });
          console.log(`[Billing] Business ${businessId} upgraded to ${plan}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const customerId = subscription.customer;

        // Find business by Stripe customer ID and downgrade
        const business = await prisma.business.findFirst({
          where: { stripeCustomerId: customerId },
        });
        if (business) {
          await prisma.business.update({
            where: { id: business.id },
            data: { plan: 'Free', stripeSubscriptionId: null },
          });
          console.log(`[Billing] Business ${business.id} downgraded to Free (subscription cancelled)`);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        console.log(`[Billing] Subscription ${subscription.id} updated, status: ${subscription.status}`);
        break;
      }

      default:
        console.log(`[Billing] Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    console.error('[Billing] Webhook processing error:', err.message);
  }

  res.sendStatus(200);
});

module.exports = router;
