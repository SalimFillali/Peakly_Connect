/* ================================================================
   PEAKLY — Utilitaires helpers
   js/utils/helpers.js
   ================================================================ */

(function(global){

  const PeaklyHelpers = {

    /* ── Formater un nombre (1400000 → "1.4M") ── */
    formatNumber(n){
      if(n === null || n === undefined) return '—';
      if(n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace('.0','') + 'M';
      if(n >= 1_000)     return (n / 1_000).toFixed(1).replace('.0','') + 'K';
      return n.toString();
    },

    /* ── Formater une date relative ("il y a 2h") ── */
    timeAgo(dateStr){
      const d = new Date(dateStr);
      const diff = (Date.now() - d) / 1000;
      if(diff < 60)           return "à l'instant";
      if(diff < 3600)         return `il y a ${Math.floor(diff/60)}min`;
      if(diff < 86400)        return `il y a ${Math.floor(diff/3600)}h`;
      if(diff < 604800)       return `il y a ${Math.floor(diff/86400)}j`;
      return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
    },

    /* ── Truncate texte ── */
    truncate(str, max = 120){
      if(!str) return '';
      return str.length > max ? str.slice(0, max) + '…' : str;
    },

    /* ── Générer des initiales ── */
    initials(nom){
      return (nom || 'A').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    },

    /* ── Debounce ── */
    debounce(fn, delay = 300){
      let t;
      return function(...args){ clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
    },

    /* ── Compteur animé ── */
    animateCount(el, target, duration = 1200){
      if(!el) return;
      const step = target / (duration / 16);
      let val = 0;
      const tick = () => {
        val = Math.min(val + step, target);
        el.textContent = Math.round(val);
        if(val < target) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    },

    /* ── Toast notification ── */
    toast(type = '', title = '', message = '', icon = ''){
      if(typeof showToast === 'function') return showToast(type, title, message, icon);
      console.log(`[Toast] ${title}: ${message}`);
    },

    /* ── Copier dans le presse-papiers ── */
    async copyToClipboard(text){
      try {
        await navigator.clipboard.writeText(text);
        this.toast('', 'Copié', 'Lien copié dans le presse-papiers.');
      } catch {
        this.toast('', 'Erreur', 'Impossible de copier.');
      }
    },

    /* ── URL params ── */
    getParam(name){
      return new URLSearchParams(window.location.search).get(name);
    },

    /* ── Scroll reveal simple ── */
    initReveal(){
      const io = new IntersectionObserver((entries) => {
        entries.forEach(e => { if(e.isIntersecting){ e.target.classList.add('visible'); io.unobserve(e.target); } });
      }, { threshold: 0.1 });
      document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale').forEach(el => io.observe(el));
    },

    /* ── Spinner dans un bouton ── */
    btnLoading(btn, loading = true){
      if(!btn) return;
      if(loading){
        btn._origText = btn.innerHTML;
        btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="animation:spin-ring .7s linear infinite"><path d="M12 2a10 10 0 1 0 1 0"/></svg>';
        btn.disabled = true;
        btn.style.opacity = '.7';
      } else {
        btn.innerHTML = btn._origText || btn.innerHTML;
        btn.disabled = false;
        btn.style.opacity = '';
      }
    },

    /* ── Formater des prix ── */
    formatPrice(cents, currency = 'EUR'){
      return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(cents / 100);
    }

  };

  global.PeaklyHelpers = PeaklyHelpers;

})(window);
