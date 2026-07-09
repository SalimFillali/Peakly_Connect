/* ================================================================
   PEAKLY — Stripe Webhooks (Vercel Serverless Function)
   api/stripe/webhook.js

   Variables d'environnement requises :
     STRIPE_SECRET_KEY      — clé secrète Stripe
     STRIPE_WEBHOOK_SECRET  — secret du webhook (whsec_...)
     SUPABASE_URL
     SUPABASE_SERVICE_KEY
   ================================================================ */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

const SUPABASE = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/* Map plan_type → features */
const PLAN_FEATURES = {
  gratuit: { plan: 'gratuit', premium: false },
  starter: { plan: 'starter', premium: true  },
  pro:     { plan: 'pro',     premium: true  },
  label:   { plan: 'label',   premium: true  }
};

/* ── Disable bodyParser pour Stripe signature ── */
export const config = { api: { bodyParser: false } };

async function getRawBody(req){
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => (data += chunk));
    req.on('end',  () => resolve(Buffer.from(data)));
    req.on('error', reject);
  });
}

module.exports = async function handler(req, res){
  if(req.method !== 'POST') return res.status(405).end();

  const sig  = req.headers['stripe-signature'];
  const body = await getRawBody(req);

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch(err){
    console.error('[Webhook] Signature invalide:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  const data = event.data.object;

  switch(event.type){

    case 'checkout.session.completed': {
      const uid  = data.metadata?.supabase_uid;
      const plan = data.metadata?.plan || 'starter';
      if(!uid) break;

      await SUPABASE.from('profiles').update({
        plan,
        premium: true,
        stripe_customer_id: data.customer
      }).eq('id', uid);

      await SUPABASE.from('abonnements').upsert({
        profile_id:           uid,
        stripe_subscription_id: data.subscription,
        plan,
        status: 'active',
        updated_at: new Date()
      }, { onConflict: 'profile_id' });

      console.log(`[Webhook] Abonnement activé : ${uid} → ${plan}`);
      break;
    }

    case 'customer.subscription.updated': {
      const uid    = data.metadata?.supabase_uid;
      const plan   = data.metadata?.plan || 'starter';
      const status = data.status;
      if(!uid) break;

      await SUPABASE.from('abonnements').upsert({
        profile_id:             uid,
        stripe_subscription_id: data.id,
        stripe_price_id:        data.items.data[0]?.price?.id,
        plan,
        status,
        cancel_at_period_end:  data.cancel_at_period_end,
        canceled_at:           data.canceled_at ? new Date(data.canceled_at * 1000) : null,
        current_period_start:  new Date(data.current_period_start * 1000),
        current_period_end:    new Date(data.current_period_end   * 1000),
        updated_at:            new Date()
      }, { onConflict: 'profile_id' });

      const isPremium = ['active', 'trialing'].includes(status);
      await SUPABASE.from('profiles').update({ plan: isPremium ? plan : 'gratuit', premium: isPremium }).eq('id', uid);

      console.log(`[Webhook] Abonnement mis à jour : ${uid} → ${plan} (${status})`);
      break;
    }

    case 'customer.subscription.deleted': {
      const uid = data.metadata?.supabase_uid;
      if(!uid) break;

      await SUPABASE.from('abonnements').upsert({
        profile_id:             uid,
        stripe_subscription_id: data.id,
        plan:                   'gratuit',
        status:                 'canceled',
        canceled_at:            new Date(),
        updated_at:             new Date()
      }, { onConflict: 'profile_id' });

      await SUPABASE.from('profiles').update({ plan: 'gratuit', premium: false }).eq('id', uid);

      console.log(`[Webhook] Abonnement résilié : ${uid}`);
      break;
    }

    case 'invoice.payment_failed': {
      const customerId = data.customer;
      const { data: profile } = await SUPABASE.from('profiles')
        .select('id').eq('stripe_customer_id', customerId).single();
      if(profile){
        await SUPABASE.from('abonnements').update({ status: 'past_due' }).eq('profile_id', profile.id);
        /* Envoyer une notification à l'utilisateur */
        await SUPABASE.from('notifications').insert({
          profile_id: profile.id,
          type:       'system',
          titre:      'Paiement échoué',
          contenu:    'Votre paiement n\'a pas pu être traité. Veuillez mettre à jour votre moyen de paiement.',
          lien:       '/pages/settings.html#abonnement'
        });
      }
      break;
    }

    default:
      console.log(`[Webhook] Événement non géré: ${event.type}`);
  }

  return res.status(200).json({ received: true });
};
