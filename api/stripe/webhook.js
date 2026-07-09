/* ================================================================
   PEAKLY -- Stripe Webhooks (Vercel Serverless Function)
   api/stripe/webhook.js

   Variables d'environnement requises :
     STRIPE_SECRET_KEY      -- cle secrete Stripe
     STRIPE_WEBHOOK_SECRET  -- secret du webhook (whsec_...)
     SUPABASE_URL
     SUPABASE_SERVICE_KEY
   ================================================================ */

const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

async function getRawBody(req){
  return new Promise(function(resolve, reject){
    var chunks = [];
    req.on('data', function(chunk){ chunks.push(chunk); });
    req.on('end',  function(){ resolve(Buffer.concat(chunks)); });
    req.on('error', reject);
  });
}

async function handler(req, res){
  if(req.method !== 'POST') return res.status(405).end();

  var sig           = req.headers['stripe-signature'];
  var webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  var body          = await getRawBody(req);

  var stripe = Stripe(process.env.STRIPE_SECRET_KEY);
  var supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  var event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch(err){
    console.error('[Webhook] Signature invalide:', err.message);
    return res.status(400).json({ error: 'Webhook Error: ' + err.message });
  }

  var data = event.data.object;

  switch(event.type){

    case 'checkout.session.completed': {
      var uid  = data.metadata && data.metadata.supabase_uid;
      var plan = (data.metadata && data.metadata.plan) || 'starter';
      if(!uid) break;

      await supabase.from('profiles').update({
        plan: plan,
        premium: true,
        stripe_customer_id: data.customer
      }).eq('id', uid);

      await supabase.from('abonnements').upsert({
        profile_id:             uid,
        stripe_subscription_id: data.subscription,
        plan:                   plan,
        status:                 'active',
        updated_at:             new Date().toISOString()
      }, { onConflict: 'profile_id' });

      /* Table subscriptions (schema_production.sql) */
      await supabase.from('subscriptions').upsert({
        user_id:                uid,
        plan:                   plan,
        status:                 'active',
        stripe_customer_id:     data.customer,
        stripe_subscription_id: data.subscription,
        updated_at:             new Date().toISOString()
      }, { onConflict: 'user_id' });

      console.log('[Webhook] Abonnement active : ' + uid + ' -> ' + plan);
      break;
    }

    case 'customer.subscription.updated': {
      var uid2    = data.metadata && data.metadata.supabase_uid;
      var plan2   = (data.metadata && data.metadata.plan) || 'starter';
      var status2 = data.status;
      if(!uid2) break;

      await supabase.from('abonnements').upsert({
        profile_id:             uid2,
        stripe_subscription_id: data.id,
        stripe_price_id:        data.items && data.items.data[0] && data.items.data[0].price && data.items.data[0].price.id,
        plan:                   plan2,
        status:                 status2,
        cancel_at_period_end:   data.cancel_at_period_end,
        canceled_at:            data.canceled_at ? new Date(data.canceled_at * 1000).toISOString() : null,
        current_period_start:   new Date(data.current_period_start * 1000).toISOString(),
        current_period_end:     new Date(data.current_period_end   * 1000).toISOString(),
        updated_at:             new Date().toISOString()
      }, { onConflict: 'profile_id' });

      var isPremium = ['active', 'trialing'].includes(status2);
      await supabase.from('profiles').update({ plan: isPremium ? plan2 : 'gratuit', premium: isPremium }).eq('id', uid2);

      await supabase.from('subscriptions').upsert({
        user_id:                uid2,
        plan:                   isPremium ? plan2 : 'gratuit',
        status:                 status2,
        stripe_subscription_id: data.id,
        updated_at:             new Date().toISOString()
      }, { onConflict: 'user_id' });

      console.log('[Webhook] Abonnement mis a jour : ' + uid2 + ' -> ' + plan2 + ' (' + status2 + ')');
      break;
    }

    case 'customer.subscription.deleted': {
      var uid3 = data.metadata && data.metadata.supabase_uid;
      if(!uid3) break;

      await supabase.from('abonnements').upsert({
        profile_id:             uid3,
        stripe_subscription_id: data.id,
        plan:                   'gratuit',
        status:                 'canceled',
        canceled_at:            new Date().toISOString(),
        updated_at:             new Date().toISOString()
      }, { onConflict: 'profile_id' });

      await supabase.from('profiles').update({ plan: 'gratuit', premium: false }).eq('id', uid3);

      await supabase.from('subscriptions').update({
        status:     'cancelled',
        updated_at: new Date().toISOString()
      }).eq('user_id', uid3);

      console.log('[Webhook] Abonnement resilie : ' + uid3);
      break;
    }

    case 'invoice.payment_failed': {
      var customerId = data.customer;
      var profileRes = await supabase.from('profiles')
        .select('id').eq('stripe_customer_id', customerId).single();
      if(profileRes.data){
        var pid = profileRes.data.id;
        await supabase.from('abonnements').update({ status: 'past_due', updated_at: new Date().toISOString() }).eq('profile_id', pid);
        await supabase.from('notifications').insert({
          profile_id: pid,
          type:       'system',
          titre:      'Paiement echoue',
          contenu:    'Votre paiement n\'a pas pu etre traite. Veuillez mettre a jour votre moyen de paiement.',
          lien:       '/pages/settings.html#abonnement'
        });
      }
      break;
    }

    default:
      console.log('[Webhook] Evenement non gere: ' + event.type);
  }

  return res.status(200).json({ received: true });
}

module.exports = handler;
module.exports.config = { api: { bodyParser: false } };
