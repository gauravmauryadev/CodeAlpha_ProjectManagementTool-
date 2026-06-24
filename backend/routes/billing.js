const express = require('express');
const router = express.Router();
const Stripe = require('stripe');
const auth = require('../middleware/auth');
const Workspace = require('../models/Workspace');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock_key');

// Product Price IDs from Stripe Dashboard
const PLANS = {
  pro: 'price_pro_mock_id', // $9/month
  enterprise: 'price_enterprise_mock_id' // Custom
};

// @route   POST /api/billing/create-checkout-session
// @desc    Create a Stripe Checkout Session
// @access  Private
router.post('/create-checkout-session', auth, async (req, res) => {
  try {
    const { plan, workspaceId } = req.body;
    
    if (!PLANS[plan]) {
      return res.status(400).json({ message: 'Invalid plan selected' });
    }

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    // Verify user is owner
    const member = workspace.members.find(m => m.user.toString() === req.user.id);
    if (!member || member.role !== 'owner') {
      return res.status(403).json({ message: 'Only workspace owners can upgrade plans' });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: PLANS[plan],
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.CLIENT_URL || 'http://localhost:3000'}/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL || 'http://localhost:3000'}/pricing?canceled=true`,
      client_reference_id: workspaceId.toString(),
      customer_email: req.user.email,
    });

    res.json({ id: session.id, url: session.url });
  } catch (error) {
    console.error('Stripe error:', error);
    res.status(500).json({ message: 'Error creating checkout session', error: error.message });
  }
});

// @route   POST /api/billing/webhook
// @desc    Stripe Webhook handler
// @access  Public
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error(`Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      const workspaceId = session.client_reference_id;
      
      if (workspaceId) {
        await Workspace.findByIdAndUpdate(workspaceId, {
          'subscription.status': 'active',
          'subscription.plan': 'pro', // Map this dynamically in production based on price ID
          'subscription.stripeCustomerId': session.customer,
          'subscription.stripeSubscriptionId': session.subscription,
        });
        console.log(`Workspace ${workspaceId} upgraded to Pro!`);
      }
      break;
    
    case 'customer.subscription.deleted':
    case 'customer.subscription.updated':
      const subscription = event.data.object;
      const status = subscription.status;
      
      await Workspace.findOneAndUpdate(
        { 'subscription.stripeSubscriptionId': subscription.id },
        { 'subscription.status': status }
      );
      break;
      
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.send();
});

module.exports = router;
