# Peakly

Marketplace music-tech B2B/B2C -- mise en relation entre artistes musicaux et professionnels de l'industrie (labels, publishers, investisseurs).

**Stack :** HTML5 statique · Supabase (PostgreSQL + Auth + Realtime) · Vercel (hosting + serverless) · Stripe (paiements)

**Cible de production :** Vercel (fonctions serverless Node.js + static assets)

---

## Ce qui est cablé vs mode demo

| Fonctionnalite | Etat |
|---|---|
| Authentification Supabase (email/password + OAuth) | Cable -- necessite SUPABASE_URL + SUPABASE_ANON_KEY |
| Profils artiste / professionnel | Cable -- necessite Supabase |
| Feed social (publications, likes, commentaires) | Cable -- necessite Supabase |
| Messagerie temps reel | Cable -- necessite Supabase + Realtime |
| Paiement Stripe Checkout | Cable -- necessite STRIPE_* + Supabase |
| Webhooks Stripe | Cable -- necessite STRIPE_WEBHOOK_SECRET |
| Portail de gestion Stripe | Cable -- necessite stripe_customer_id |
| Demo sans backend | Mode demo si /api/config echoue (pas d'erreur fatale) |

---

## Prerequis

- Node.js >= 18
- Compte [Supabase](https://supabase.com)
- Compte [Vercel](https://vercel.com)
- Compte [Stripe](https://stripe.com)

---

## 1. SQL dans Supabase -- ordre d'execution

**Un seul fichier suffit pour la production :**

```
supabase/schema_production.sql   (tout en un -- tables + RLS + triggers + politiques)
```

Copiez-collez le contenu dans Supabase SQL Editor > New Query > Run.

Si vous preferez l'ordre incremental (base de donnees existante) :
1. `supabase/schema.sql`
2. `supabase/schema_v2.sql`
3. `supabase/schema_v3.sql`
4. `supabase/policies.sql`

---

## 2. Variables Vercel Dashboard

A configurer dans **Vercel > Project > Settings > Environment Variables** :

| Variable | Description | Exemple |
|---|---|---|
| `SUPABASE_URL` | URL de votre projet Supabase | `https://abc.supabase.co` |
| `SUPABASE_ANON_KEY` | Cle publique Supabase (anon) | `eyJhbG...` |
| `SUPABASE_SERVICE_KEY` | Cle service Supabase (server only) | `eyJhbG...` |
| `STRIPE_PUBLIC_KEY` | Cle publique Stripe | `pk_live_...` |
| `STRIPE_SECRET_KEY` | Cle secrete Stripe | `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | Secret webhook Stripe | `whsec_...` |
| `STRIPE_PRICE_STARTER_MONTHLY` | Price ID Stripe plan Starter mensuel | `price_...` |
| `STRIPE_PRICE_STARTER_YEARLY` | Price ID Stripe plan Starter annuel | `price_...` |
| `STRIPE_PRICE_PRO_MONTHLY` | Price ID Stripe plan Pro mensuel | `price_...` |
| `STRIPE_PRICE_PRO_YEARLY` | Price ID Stripe plan Pro annuel | `price_...` |
| `STRIPE_PRICE_LABEL_MONTHLY` | Price ID Stripe plan Label mensuel | `price_...` |
| `STRIPE_PRICE_LABEL_YEARLY` | Price ID Stripe plan Label annuel | `price_...` |
| `APP_URL` | URL de production | `https://peakly.fr` |

Jamais mettre `SUPABASE_SERVICE_KEY` ni `STRIPE_SECRET_KEY` dans le HTML ou le JS client.

---

## 3. Config Stripe

### Produits a creer dans le Dashboard Stripe

| Produit | Mensuel | Annuel |
|---|---|---|
| Peakly Starter | 9 EUR/mois | 84 EUR/an |
| Peakly Pro | 19 EUR/mois | 180 EUR/an |
| Peakly Label | 79 EUR/mois | 708 EUR/an |

Chaque prix genere un `price_xxx` ID -- l'affecter a la variable correspondante.

### Webhook a configurer

URL : `https://votre-domaine.vercel.app/api/stripe/webhook`

Evenements requis :
- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_failed`

---

## 4. Checklist avant `vercel --prod`

1. `schema_production.sql` execute dans Supabase SQL Editor
2. Supabase Auth > Site URL mis a jour avec l'URL Vercel de production
3. Supabase Auth > Redirect URLs inclut `https://peakly.fr/pages/login.html`
4. Toutes les variables d'environnement configurees dans Vercel Dashboard
5. Webhook Stripe pointe vers l'URL Vercel de production
6. `APP_URL` = URL de production exacte (sans slash final)
7. Pages legales completees (mentions legales, SIRET, adresse)
8. Test du flow complet : inscription > abonnement > webhook > acces premium

---

## 5. Deploiement

```bash
# Premier deploiement (import depuis GitHub sur vercel.com)
# Framework Preset : Other | Build Command : vide | Output Directory : .

# Deploiements suivants via CLI
npm install -g vercel
vercel --prod

# Ou automatique via git push sur main (si connecte a GitHub)
git push origin main
```

---

## 6. Developpement local

```bash
cp .env.example .env.local
# Remplir .env.local

npm install
npm run dev     # Lance vercel dev sur http://localhost:3000

# Tester les webhooks Stripe en local
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

---

*Peakly SAS · [A COMPLETER AVANT PRODUCTION] · contact@peakly.fr*
