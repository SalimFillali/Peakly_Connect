/* ================================================================
   PEAKLY — Stripe Checkout (Vercel Serverless Function)
   api/stripe/checkout.js

   Variables d'environnement requises :
     STRIPE_SECRET_KEY     — clé secrète Stripe (sk_live_...)
     STRIPE_PRICE_STARTER  — price ID Stripe plan Starter
     STRIPE_PRICE_PRO      — price ID Stripe plan Pro
     STRIPE_PRICE_LABEL    — price ID Stripe plan Label
     APP_URL               — URL de production (https://peakly.fr)
     SUPABASE_URL          — URL Supabase
     SUPABASE_SERVICE_KEY  — clé service Supabase (service_role)
   ================================================================ */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

const PRICE_IDS = {
  starter: process.env.STRIPE_PRICE_STARTER,
  pro:     process.env.STRIPE_PRICE_PRO,
  label:   process.env.STRIPE_PRICE_LABEL
};

const SUPABASE = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = async function handler(req, res) {

  /* ── CORS ── */
  res.setHeader('Access-Control-Allow-Origin', process.env.APP_URL || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if(req.method === 'OPTIONS') return res.status(200).end();

  /* ── Auth : vérifier le JWT Supabase ── */
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if(!token) return res.status(401).json({ error: 'Non authentifié.' });

  const { data: { user }, error: authError } = await SUPABASE.auth.getUser(token);
  if(authError || !user) return res.status(401).json({ error: 'Session invalide.' });

  /* ── Paramètres ── */
  const plan = req.query.plan || (req.body && req.body.plan);
  const priceId = PRICE_IDS[plan];
  if(!priceId) return res.status(400).json({ error: `Plan inconnu: ${plan}` });

  /* ── Récupérer ou créer le customer Stripe ── */
  const { data: profile } = await SUPABASE
    .from('profiles')
    .select('stripe_customer_id, nom, email')
    .eq('id', user.id)
    .single();

  let customerId = profile?.stripe_customer_id;
  if(!customerId){
    const customer = await stripe.customers.create({
      email: user.email,
      name:  profile?.nom || user.email,
      metadata: { supabase_uid: user.id }
    });
    customerId = customer.id;
    await SUPABASE.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id);
  }

  /* ── Créer la session Checkout ── */
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    mode: 'subscription',
    subscription_data: {
      trial_period_days: 14,
      metadata: { supabase_uid: user.id, plan }
    },
    success_url: `${process.env.APP_URL}/pages/settings.html?tab=abonnement&success=1`,
    cancel_url:  `${process.env.APP_URL}/pages/pricing.html?canceled=1`,
    locale: 'fr',
    allow_promotion_codes: true,
    metadata: { supabase_uid: user.id, plan }
  });

  return res.status(200).json({ url: session.url, sessionId: session.id });
};
