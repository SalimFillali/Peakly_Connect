# Peakly

Marketplace music-tech B2B/B2C — mise en relation entre artistes musicaux et professionnels de l'industrie (labels, publishers, investisseurs).

**Stack :** HTML5 statique · Supabase (PostgreSQL + Auth + Realtime) · Vercel (hosting + serverless) · Stripe (paiements)

---

## Prérequis

- Node.js >= 18
- Un compte [Supabase](https://supabase.com) (gratuit pour commencer)
- Un compte [Vercel](https://vercel.com) (gratuit)
- Un compte [Stripe](https://stripe.com) (test ou production)
- Git

---

## 1. Configurer Supabase

### 1.1 Créer le projet

1. Connectez-vous sur [app.supabase.com](https://app.supabase.com)
2. Cliquez sur **New Project**
3. Choisissez la région **Frankfurt (eu-central-1)** pour la conformité RGPD
4. Notez votre `Project URL` et vos clés API

### 1.2 Exécuter le schéma

Dans l'éditeur SQL de Supabase (**SQL Editor** dans la barre latérale) :

```sql
-- Étape 1 : schéma complet
\i supabase/schema.sql

-- Étape 2 : politiques de sécurité RLS
\i supabase/policies.sql
```

Ou copiez-collez le contenu des fichiers directement dans l'éditeur SQL, dans cet ordre :
1. `supabase/schema.sql`
2. `supabase/policies.sql`

### 1.3 Configurer l'authentification

Dans **Authentication > Settings** :

- **Site URL :** `https://votre-domaine.vercel.app` (ou `https://peakly.fr` en production)
- **Redirect URLs :** ajoutez `https://votre-domaine.vercel.app/pages/login.html`
- **Email confirmations :** activé (recommandé en production)
- **JWT expiry :** 3600 secondes (1 heure)

### 1.4 Récupérer les clés

Dans **Settings > API** :

```
SUPABASE_URL          = https://VOTRE_PROJECT_ID.supabase.co
SUPABASE_ANON_KEY     = eyJhbGci...   (clé publique, safe côté client)
SUPABASE_SERVICE_KEY  = eyJhbGci...   (clé secrète, côté serveur UNIQUEMENT)
```

---

## 2. Configurer Stripe

### 2.1 Créer les produits

Dans le [Dashboard Stripe](https://dashboard.stripe.com), créez 3 produits avec leurs prix :

| Produit | Prix mensuel | Prix annuel |
|---------|-------------|-------------|
| Peakly Starter | 9 EUR/mois | 86 EUR/an (20% de remise) |
| Peakly Pro | 19 EUR/mois | 182 EUR/an (20% de remise) |
| Peakly Label | 79 EUR/mois | 758 EUR/an (20% de remise) |

Notez les `price_xxx` IDs pour chaque prix (mensuel et annuel).

### 2.2 Configurer le webhook

Dans **Developers > Webhooks** :

1. Cliquez sur **Add endpoint**
2. URL : `https://votre-domaine.vercel.app/api/stripe/webhook`
3. Événements à écouter :
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
4. Notez le `Signing secret` (commence par `whsec_`)

### 2.3 Récupérer les clés

Dans **Developers > API keys** :

```
STRIPE_PUBLIC_KEY     = pk_live_...   (ou pk_test_... en développement)
STRIPE_SECRET_KEY     = sk_live_...   (ou sk_test_...)
STRIPE_WEBHOOK_SECRET = whsec_...
```

---

## 3. Variables d'environnement

### Développement local

```bash
cp .env.example .env.local
```

Remplissez `.env.local` avec vos clés. Ce fichier ne doit jamais être commité (il est dans `.gitignore`).

### Production sur Vercel

Deux options :

**Option A — Dashboard Vercel (recommandé)**

Dans **Project Settings > Environment Variables**, ajoutez chaque variable. Vercel stocke les secrets de façon chiffrée.

**Option B — CLI Vercel**

```bash
npm install -g vercel
vercel login

# Ajouter les secrets (une fois)
vercel env add SUPABASE_URL
vercel env add SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_KEY
vercel env add STRIPE_PUBLIC_KEY
vercel env add STRIPE_SECRET_KEY
vercel env add STRIPE_WEBHOOK_SECRET
vercel env add STRIPE_PRICE_STARTER_MONTHLY
vercel env add STRIPE_PRICE_STARTER_YEARLY
vercel env add STRIPE_PRICE_PRO_MONTHLY
vercel env add STRIPE_PRICE_PRO_YEARLY
vercel env add STRIPE_PRICE_LABEL_MONTHLY
vercel env add STRIPE_PRICE_LABEL_YEARLY
vercel env add APP_URL
vercel env add RESEND_API_KEY
```

Liste complète des variables requises dans `.env.example`.

---

## 4. Déployer sur Vercel

### 4.1 Première fois (import depuis GitHub)

1. Connectez-vous sur [vercel.com](https://vercel.com)
2. Cliquez sur **Add New Project**
3. Importez votre dépôt GitHub `peakly`
4. Framework Preset : **Other** (site statique)
5. Root Directory : `.` (racine)
6. Build Command : laisser vide (ou `echo ok`)
7. Output Directory : `.`
8. Ajoutez les variables d'environnement (voir étape 3)
9. Cliquez sur **Deploy**

### 4.2 Déploiements suivants

Chaque `git push` sur `main` déclenche un déploiement automatique.

```bash
git add .
git commit -m "feat: ..."
git push origin main
```

### 4.3 Via CLI

```bash
npm run dev      # développement local avec Vercel Dev
vercel           # déploiement preview
vercel --prod    # déploiement production
```

---

## 5. Développement local

```bash
# Cloner le projet
git clone https://github.com/votre-org/peakly.git
cd peakly

# Installer les dépendances
npm install

# Configurer les variables d'environnement
cp .env.example .env.local
# Remplir .env.local avec vos clés Supabase et Stripe de test

# Lancer le serveur local
npm run dev
# Ouvre sur http://localhost:3000
```

Pour tester les webhooks Stripe en local, utilisez la [Stripe CLI](https://stripe.com/docs/stripe-cli) :

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

---

## 6. Structure du projet

```
peakly/
  api/
    stripe/
      checkout.js       Serverless : créer une session Checkout
      webhook.js        Serverless : recevoir les webhooks Stripe
      portal.js         Serverless : portail de gestion Stripe
    auth/
      register.js       Serverless : inscription avec validation SIRET
      verify.js         Serverless : vérification email
  css/
    style.css           Styles partagés (design system gold/dark)
  js/
    navigation.js       Injection du header de navigation
    app.js              Initialisation globale
    store.js            Store léger (état partagé)
    services/
      supabase.js       Client Supabase (PeaklySupabase)
      auth.js           Authentification (PeaklyAuth)
      api.js            Couche API (PeaklyAPI)
      stripe.js         Intégration Stripe client (PeaklyStripe)
    utils/
      validation.js     Validation des formulaires (PeaklyValidation)
      helpers.js        Utilitaires (PeaklyHelpers)
  pages/
    login.html          Connexion
    inscription.html    Inscription artiste / professionnel
    forgot-password.html  Réinitialisation mot de passe
    feed.html           Fil d'actualité
    pricing.html        Abonnements
    settings.html       Paramètres utilisateur
    crm.html            CRM professionnel
    legal/
      mentions-legales.html
      cgu.html
      confidentialite.html
      cookies.html
  supabase/
    schema.sql          Schéma complet de la base de données
    policies.sql        Politiques Row Level Security (RLS)
  index.html            Page d'accueil
  404.html              Page d'erreur
  vercel.json           Configuration Vercel
  package.json          Dépendances Node.js
  .env.example          Template des variables d'environnement
```

---

## 7. Architecture technique

### Base de données (Supabase / PostgreSQL)

18 tables principales avec Row Level Security activé sur toutes :

- `profiles` : données utilisateur communes (rôle, plan, Peakly Score)
- `artistes` : profil artistique étendu
- `professionnels` : profil professionnel avec vérification SIRET
- `publications` : feed de contenu
- `offres` : opportunités publiées par les professionnels
- `candidatures` : candidatures artistes sur offres
- `conversations` et `messages` : messagerie temps réel
- `notifications` : centre de notifications
- `abonnements` : état des abonnements Stripe
- `factures` : historique de facturation

### Authentification

Supabase Auth gère l'authentification JWT. À chaque connexion, le token JWT est stocké dans le localStorage et envoyé dans les headers `Authorization: Bearer xxx` des appels API serverless.

### Paiements

Flux Stripe Checkout en 3 étapes :
1. Le client appelle `/api/stripe/checkout` avec le plan choisi
2. Stripe redirige vers la page de paiement sécurisée
3. Stripe envoie un webhook à `/api/stripe/webhook` qui met à jour le plan dans Supabase

### Sécurité

- RLS sur toutes les tables : chaque utilisateur ne voit que ses données
- Clé `SUPABASE_SERVICE_KEY` uniquement côté serverless (jamais exposée au client)
- Vérification de signature sur chaque webhook Stripe (`stripe.webhooks.constructEvent`)
- Headers de sécurité configurés dans `vercel.json` (CSP, X-Frame-Options, etc.)

---

## 8. Domaine personnalisé

Dans **Vercel > Project > Settings > Domains** :

1. Ajoutez `peakly.fr` et `www.peakly.fr`
2. Suivez les instructions pour configurer vos DNS chez votre registrar
3. Vercel provisionne le certificat TLS automatiquement
4. Mettez à jour `APP_URL` dans vos variables d'environnement Vercel
5. Mettez à jour le **Site URL** dans Supabase Auth (Authentication > Settings)

---

## 9. Monitoring et logs

- **Logs Vercel :** Project > Deployments > Functions tab (logs des serverless en temps réel)
- **Logs Supabase :** Dashboard > Logs (requêtes SQL, auth, realtime)
- **Stripe :** Dashboard > Events (tous les webhooks et leur statut)
- **Analytics :** Plausible sur `peakly.fr` (configurer `PLAUSIBLE_DOMAIN`)

---

## 10. Contact et support

- Questions techniques : [tech@peakly.fr](mailto:tech@peakly.fr)
- Facturation : [billing@peakly.fr](mailto:billing@peakly.fr)
- RGPD / confidentialité : [privacy@peakly.fr](mailto:privacy@peakly.fr)
- Signalement DMCA : [dmca@peakly.fr](mailto:dmca@peakly.fr)

---

*Peakly SAS · 12 rue de la Paix, 75001 Paris · RCS Paris B 123 456 789*
