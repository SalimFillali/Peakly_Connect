// api/stripe/portal.js
// Vercel serverless — Stripe Customer Portal (gestion abonnement)
const Stripe     = require('stripe');
const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', process.env.APP_URL || '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  // Vérifier le JWT Supabase
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) return res.status(401).json({ error: 'Non authentifié' });

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: 'Token invalide' });

  // Récupérer le customer_id Stripe de l'utilisateur
  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single();

  if (!profile?.stripe_customer_id) {
    return res.status(400).json({ error: "Aucun abonnement actif trouvé." });
  }

  const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
  const returnUrl = (process.env.APP_URL || 'https://peakly.fr') + '/pages/settings.html';

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer:   profile.stripe_customer_id,
      return_url: returnUrl,
    });

    res.setHeader('Access-Control-Allow-Origin', process.env.APP_URL || '*');
    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('[Portal]', err.message);
    return res.status(500).json({ error: 'Impossible d\'ouvrir le portail de gestion.' });
  }
};
