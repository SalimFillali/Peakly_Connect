/* ================================================================
   PEAKLY -- Config publique (Vercel Serverless Function)
   api/config.js
   Expose uniquement les cles publiques au client.
   Ne jamais exposer STRIPE_SECRET_KEY ni SUPABASE_SERVICE_KEY ici.
   ================================================================ */

module.exports = function(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.setHeader('Content-Type', 'application/json');
  res.json({
    supabaseUrl:      process.env.SUPABASE_URL      || '',
    supabaseAnonKey:  process.env.SUPABASE_ANON_KEY || '',
    stripePublicKey:  process.env.STRIPE_PUBLIC_KEY || '',
    appUrl:           process.env.APP_URL           || ''
  });
};
