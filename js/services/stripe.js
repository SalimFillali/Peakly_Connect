/* ================================================================
   PEAKLY — Service Stripe (côté client)
   js/services/stripe.js
   ================================================================ */

(function(global){

  /* Plans disponibles */
  const PLANS = {
    gratuit: { id: 'gratuit', nom: 'Gratuit',  prix_m: 0,    prix_a: 0    },
    starter: { id: 'starter', nom: 'Starter',  prix_m: 9,    prix_a: 7    },
    pro:     { id: 'pro',     nom: 'Pro',       prix_m: 19,   prix_a: 15   },
    label:   { id: 'label',   nom: 'Label',     prix_m: 79,   prix_a: 59   }
  };

  const PeaklyStripe = {

    plans: PLANS,

    /* ── Démarrer un abonnement ── */
    async subscribe(plan, annuel = false){
      if(!PeaklyAuth || !PeaklyAuth.isLoggedIn()){
        window.location.href = (window.location.pathname.includes('/pages/') ? '' : 'pages/') + 'login.html?redirect=pricing';
        return;
      }
      if(plan === 'gratuit'){
        if(typeof showToast !== 'undefined') showToast('','Plan Gratuit','Vous êtes déjà sur le plan gratuit.','');
        return;
      }

      try {
        if(typeof showToast !== 'undefined') showToast('','Paiement sécurisé','Redirection vers Stripe Checkout…','');
        const { data: { session } } = await PeaklySupabase.auth.getSession();
        const res = await fetch('/api/stripe/checkout?plan=' + plan + (annuel ? '&billing=yearly' : ''), {
          headers: { Authorization: 'Bearer ' + session.access_token }
        });
        const json = await res.json();
        if(json.url) window.location.href = json.url;
        else throw new Error(json.error || 'Erreur Stripe');
      } catch(err){
        if(typeof showToast !== 'undefined') showToast('error','Erreur',err.message,'');
      }
    },

    /* ── Gérer l'abonnement (portail Stripe) ── */
    async manageSubscription(){
      try {
        const { data: { session } } = await PeaklySupabase.auth.getSession();
        const res = await fetch('/api/stripe/portal', {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + session.access_token }
        });
        const json = await res.json();
        if(json.url) window.location.href = json.url;
      } catch(err){
        if(typeof showToast !== 'undefined') showToast('error','Erreur',err.message,'');
      }
    },

    /* ── Vérifier les limites de fonctionnalités ── */
    canUseFeature(feature, plan){
      const p = plan || (PeaklyAuth ? PeaklyAuth.getPlan() : 'gratuit');
      const featureMap = {
        messaging:        ['starter', 'pro', 'label'],
        crm:              ['pro', 'label'],
        analytics:        ['starter', 'pro', 'label'],
        export:           ['pro', 'label'],
        unlimited_search: ['pro', 'label'],
        scoring_ia:       ['starter', 'pro', 'label'],
        upload_audio:     ['starter', 'pro', 'label'],
        team_seats:       ['label'],
        api_access:       ['label']
      };
      return (featureMap[feature] || []).includes(p);
    },

    /* ── Afficher l'upsell si feature non disponible ── */
    requireFeature(feature, onUnlocked){
      if(this.canUseFeature(feature)){
        if(onUnlocked) onUnlocked();
        return true;
      }
      /* Afficher modale upsell */
      const modal = document.getElementById('upsellModal');
      if(modal){
        modal.classList.add('open');
        const btn = modal.querySelector('[data-upgrade]');
        if(btn) btn.onclick = () => { modal.classList.remove('open'); this.subscribe('pro'); };
      } else {
        const root = window.location.pathname.includes('/pages/') ? '' : 'pages/';
        if(typeof showToast !== 'undefined') showToast('', 'Fonctionnalité Premium', 'Passez au plan Pro pour débloquer cette fonctionnalité.');
        setTimeout(() => { window.location.href = root + 'pricing.html'; }, 1500);
      }
      return false;
    }

  };

  global.PeaklyStripe = PeaklyStripe;

})(window);
