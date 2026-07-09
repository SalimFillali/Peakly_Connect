/* ================================================================
   PEAKLY — Utilitaires de validation & sécurité
   js/utils/validation.js
   ================================================================ */

(function(global){

  const PeaklyValidation = {

    /* ── Email ── */
    email(val){
      return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test((val || '').trim());
    },

    /* ── Mot de passe (min 8 car, 1 maj, 1 chiffre) ── */
    password(val){
      const v = val || '';
      return v.length >= 8 && /[A-Z]/.test(v) && /[0-9]/.test(v);
    },

    passwordStrength(val){
      const v = val || '';
      let score = 0;
      if(v.length >= 8)   score++;
      if(v.length >= 12)  score++;
      if(/[A-Z]/.test(v)) score++;
      if(/[0-9]/.test(v)) score++;
      if(/[^A-Za-z0-9]/.test(v)) score++;
      return score; // 0-5
    },

    /* ── SIRET (14 chiffres, algo Luhn simplifié) ── */
    siret(val){
      const v = (val || '').replace(/\s/g, '');
      if(!/^\d{14}$/.test(v)) return false;
      let sum = 0;
      for(let i = 0; i < 14; i++){
        let d = parseInt(v[i]);
        if(i % 2 === 0) d *= 2;
        if(d > 9) d -= 9;
        sum += d;
      }
      return sum % 10 === 0;
    },

    /* ── Texte non vide ── */
    required(val){ return (val || '').trim().length > 0; },

    /* ── Longueur ── */
    minLength(val, min){ return (val || '').trim().length >= min; },
    maxLength(val, max){ return (val || '').trim().length <= max; },

    /* ── URL ── */
    url(val){
      try { new URL(val); return true; } catch { return false; }
    },

    /* ── XSS — nettoyer le HTML entrant ── */
    sanitize(str){
      const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
      return (str || '').replace(/[&<>"']/g, m => map[m]);
    },

    /* ── Afficher une erreur sur un champ ── */
    showError(inputEl, message){
      if(!inputEl) return;
      inputEl.style.borderColor = 'rgba(255,107,94,.5)';
      inputEl.style.boxShadow = '0 0 0 3px rgba(255,107,94,.12)';
      const existing = inputEl.parentNode.querySelector('.field-error');
      if(existing) existing.remove();
      const err = document.createElement('div');
      err.className = 'field-error';
      err.style.cssText = 'font-size:.72rem;color:#ff6b5e;margin-top:5px;animation:fade-in .2s ease';
      err.textContent = message;
      inputEl.parentNode.appendChild(err);
    },

    /* ── Effacer une erreur ── */
    clearError(inputEl){
      if(!inputEl) return;
      inputEl.style.borderColor = '';
      inputEl.style.boxShadow = '';
      const existing = inputEl.parentNode.querySelector('.field-error');
      if(existing) existing.remove();
    },

    /* ── Valider un formulaire entier ── */
    validateForm(rules){
      /* rules = [{ el, rule, message }]
         rule = 'required' | 'email' | 'password' | 'siret' | (val => bool) */
      let valid = true;
      rules.forEach(({ el, rule, message }) => {
        this.clearError(el);
        const val = el?.value || '';
        let ok = true;
        if(typeof rule === 'function')      ok = rule(val);
        else if(rule === 'required')        ok = this.required(val);
        else if(rule === 'email')           ok = this.email(val);
        else if(rule === 'password')        ok = this.password(val);
        else if(rule === 'siret')           ok = this.siret(val);
        if(!ok){ this.showError(el, message); valid = false; }
      });
      return valid;
    }

  };

  global.PeaklyValidation = PeaklyValidation;

})(window);
