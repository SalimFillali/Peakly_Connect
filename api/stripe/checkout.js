/* ================================================================
   PEAKLY -- Stripe Checkout (Vercel Serverless Function)
   api/stripe/checkout.js

   Variables d'environnement requises :
     STRIPE_SECRET_KEY              -- cle secrete Stripe (sk_live_...)
     STRIPE_PRICE_STARTER_MONTHLY   -- price ID Stripe plan Starter mensuel
     STRIPE_PRICE_STARTER_YEARLY    -- price ID Stripe plan Starter annuel
     STRIPE_PRICE_PRO_MONTHLY       -- price ID Stripe plan Pro mensuel
     STRIPE_PRICE_PRO_YEARLY        -- price ID Stripe plan Pro annuel
     STRIPE_PRICE_LABEL_MONTHLY     -- price ID Stripe plan Label mensuel
     STRIPE_PRICE_LABEL_YEARLY      -- price ID Stripe plan Label annuel
     APP_URL                        -- URL de production (https://peakly.fr)
     SUPABASE_URL                   -- URL Supabase
     SUPABASE_ANON_KEY              -- cle anon Supabase (pour verifier le JWT)
   ================================================================ */

const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {

  /* ── CORS ── */
  res.setHeader('Access-Control-Allow-Origin', process.env.APP_URL || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if(req.method === 'OPTIONS') return res.status(200).end();

  if(req.method !== 'GET' && req.method !== 'POST'){
    return res.status(405).json({ error: 'Methode non autorisee' });
  }

  /* ── Auth : verifier le JWT Supabase ── */
  var authHeader = req.headers.authorization || '';
  if(!authHeader.startsWith('Bearer ')){
    return res.status(401).json({ error: 'Non authentifie.' });
  }
  var token = authHeader.slice(7);

  /* Utiliser la cle anon pour verifier le token utilisateur */
  var supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );

  var authResult = await supabase.auth.getUser(token);
  var user = authResult.data && authResult.data.user;
  var authError = authResult.error;
  if(authError || !user) return res.status(401).json({ error: 'Session invalide.' });

  /* ── Parametres plan + billing ── */
  var plan    = ((req.query && req.query.plan)    || (req.body && req.body.plan)    || 'starter').toLowerCase();
  var billing = ((req.query && req.query.billing) || (req.body && req.body.billing) || 'monthly').toLowerCase();

  var priceEnvKey = 'STRIPE_PRICE_' + plan.toUpperCase() + '_' + billing.toUpperCase();
  var priceId     = process.env[priceEnvKey];

  /* Fallback vers les anciens noms de variable sans suffixe billing */
  if(!priceId){
    priceId = process.env['STRIPE_PRICE_' + plan.toUpperCase()];
  }

  if(!priceId){
    return res.status(400).json({ error: 'Prix non configure pour ' + plan + '/' + billing + '. Verifiez la variable ' + priceEnvKey + '.' });
  }

  /* ── Recuperer ou creer le customer Stripe ── */
  /* Pour cette operation on a besoin du service role pour lire profiles */
  var supabaseService = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
  );

  var profileRes = await supabaseService
    .from('profiles')
    .select('stripe_customer_id, nom, email')
    .eq('id', user.id)
    .single();

  var profile    = profileRes.data || {};
  var customerId = profile.stripe_customer_id;

  var stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  if(!customerId){
    var customer = await stripe.customers.create({
      email:    user.email,
      name:     profile.nom || user.email,
      metadata: { supabase_uid: user.id }
    });
    customerId = customer.id;
    await supabaseService.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id);
  }

  var appUrl = process.env.APP_URL || 'http://localhost:3000';

  try {
    var session = await stripe.checkout.sessions.create({
      customer:             customerId,
      payment_method_types: ['card'],
      line_items:           [{ price: priceId, quantity: 1 }],
      mode:                 'subscription',
      subscription_data: {
        trial_period_days: 14,
        metadata: { supabase_uid: user.id, plan: plan, billing: billing }
      },
      success_url:            appUrl + '/pages/settings.html?tab=abonnement&success=1',
      cancel_url:             appUrl + '/pages/pricing.html?canceled=1',
      locale:                 'fr',
      allow_promotion_codes:  true,
      metadata:               { supabase_uid: user.id, plan: plan, billing: billing }
    });

    return res.status(200).json({ url: session.url, sessionId: session.id });
  } catch(e) {
    console.error('[Checkout]', e.message);
    return res.status(500).json({ error: e.message });
  }
};
