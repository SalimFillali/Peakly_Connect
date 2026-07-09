/* ================================================================
   PEAKLY — JavaScript commun · js/app.js
   ================================================================ */

/* ── Routes centralisées ── */
var PeaklyRoutes = {
  feed:          '/feed.html',
  search:        '/pages/recherche.html',
  crm:           '/crm.html',
  messages:      '/pages/messages.html',
  notifications: '/pages/notifications.html',
  login:         '/pages/login.html',
  inscription:   '/pages/inscription.html',
  settings:      '/pages/settings.html',
  pricing:       '/pages/pricing.html',
  artistProfile: '/profil-artiste.html',
  proProfile:    '/profil-pro.html',
  artistSpace:   '/espace-artiste.html',
  index:         '/index.html',
  profilePath: function(role) {
    return (role === 'professionnel') ? this.proProfile : this.artistProfile;
  },
  privateAreaPath: function(role) {
    return (role === 'professionnel') ? this.crm : this.artistSpace;
  }
};

/* ----------------------------------------------------------------
   1. NAVIGATION — lien actif selon la page courante
   ---------------------------------------------------------------- */
(function setNavActif(){
  const page = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-icone').forEach(link => {
    const href = link.getAttribute('href') || '';
    if(href && page.includes(href.replace('.html',''))){
      link.classList.add('actif');
    }
  });
  // Mouse glow
  const glow = document.getElementById('mouseGlow');
  if(glow){
    document.addEventListener('mousemove', e => {
      glow.style.left = e.clientX + 'px';
      glow.style.top  = e.clientY + 'px';
    });
  }
})();

/* ----------------------------------------------------------------
   2. SCROLL REVEAL
   ---------------------------------------------------------------- */
const revealObs = new IntersectionObserver(entries => {
  entries.forEach(e => { if(e.isIntersecting) e.target.classList.add('visible'); });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach(el => revealObs.observe(el));

/* ----------------------------------------------------------------
   3. CARD TILT
   ---------------------------------------------------------------- */
document.querySelectorAll('.card-tilt').forEach(card => {
  card.addEventListener('mousemove', e => {
    const r = card.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width  - 0.5;
    const y = (e.clientY - r.top)  / r.height - 0.5;
    card.style.transform = `perspective(600px) rotateY(${x*6}deg) rotateX(${-y*6}deg) translateY(-4px)`;
  });
  card.addEventListener('mouseleave', () => { card.style.transform = ''; });
});

/* ----------------------------------------------------------------
   4. ANIMATED COUNTER
   ---------------------------------------------------------------- */
function animateCount(el, target, duration, suffix, decimals){
  if(!el) return;
  const start = performance.now();
  function step(now){
    const progress = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    const val = decimals ? (target * ease).toFixed(1) : Math.round(target * ease);
    el.textContent = val + (suffix || '');
    if(progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

/* ----------------------------------------------------------------
   5. ANIMATED RING (SVG stroke-dashoffset)
   ---------------------------------------------------------------- */
function animateRing(ringEl, targetPct, circumference, duration){
  if(!ringEl) return;
  ringEl.style.strokeDasharray = circumference;
  ringEl.style.strokeDashoffset = circumference;
  const start = performance.now();
  function step(now){
    const progress = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    ringEl.style.strokeDashoffset = circumference - (circumference * ease * targetPct / 100);
    if(progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

/* ----------------------------------------------------------------
   6. TAB SWITCHING — panneau profil / CRM
   ---------------------------------------------------------------- */
function setTab(el){
  const bar = el.closest('.profile-nav-tabs, .crm-tab-bar, [data-tab-group]');
  const tabs = bar
    ? bar.querySelectorAll('[data-panel]')
    : document.querySelectorAll('[data-panel]');
  tabs.forEach(t => t.classList.remove('active', 'actif'));
  el.classList.add('active', 'actif');
  const panelId = el.dataset.panel;
  document.querySelectorAll('.tab-panel, [id^="panel-"]').forEach(p => {
    p.style.display = 'none';
  });
  const target = document.getElementById(panelId);
  if(target){
    target.style.display = 'flex';
    target.style.flexDirection = 'column';
    target.style.gap = '20px';
    target.querySelectorAll('.reveal:not(.visible)').forEach(r => r.classList.add('visible'));
  }
}
/* Init : afficher le premier panneau actif au chargement */
(function initTab(){
  const firstActive = document.querySelector('.profile-tab.active, .crm-tab.active, [data-panel].active, [data-panel].actif');
  if(firstActive){
    const pid = firstActive.dataset.panel;
    if(pid){
      document.querySelectorAll('.tab-panel, [id^="panel-"]').forEach(p => { p.style.display = 'none'; });
      const panel = document.getElementById(pid);
      if(panel){ panel.style.display = 'flex'; panel.style.flexDirection = 'column'; panel.style.gap = '20px'; }
    }
  }
})();

/* ----------------------------------------------------------------
   7. BIG UP (like artistique)
   ---------------------------------------------------------------- */
function toggleBigUp(btn){
  const isActif = btn.classList.contains('actif');
  const countEl = btn.querySelector('.bigup-count');
  let count = parseInt(countEl ? countEl.textContent : 0);
  if(isActif){
    btn.classList.remove('actif');
    if(countEl) countEl.textContent = count - 1;
  } else {
    btn.classList.add('actif');
    if(countEl) countEl.textContent = count + 1;
    btn.style.transform = 'scale(1.12)';
    setTimeout(() => { btn.style.transform = ''; }, 180);
  }
}

/* ----------------------------------------------------------------
   8. TOAST NOTIFICATIONS
   ---------------------------------------------------------------- */
function showToast(type, titre, message){
  let container = document.getElementById('toastContainer');
  if(!container){
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const t = document.createElement('div');
  const color = type === 'suivi' ? 'var(--or)' : type === 'erreur' ? 'var(--corail)' : 'var(--vert)';
  t.style.cssText = 'background:rgba(17,22,34,.97);border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:14px 18px;display:flex;align-items:flex-start;gap:12px;min-width:280px;max-width:340px;box-shadow:0 8px 32px rgba(0,0,0,.6);animation:toastIn .3s ease;cursor:pointer;';
  t.innerHTML = '<div style="width:8px;height:8px;border-radius:50%;background:'+color+';margin-top:5px;flex-shrink:0"></div>'
    +'<div><div style="font-size:.82rem;font-weight:700;color:var(--txt);font-family:\'Plus Jakarta Sans\',sans-serif;margin-bottom:2px">'+titre+'</div>'
    +'<div style="font-size:.75rem;color:var(--txt2)">'+message+'</div></div>';
  t.onclick = () => t.remove();
  container.appendChild(t);
  setTimeout(() => {
    t.style.opacity = '0'; t.style.transition = 'opacity .3s';
    setTimeout(() => t.remove(), 300);
  }, 3500);
}

/* ----------------------------------------------------------------
   9. MODAL CONNEXION
   ---------------------------------------------------------------- */
function ouvrirConnexion(){
  let overlay = document.getElementById('modalConnexion');
  if(!overlay){
    overlay = document.createElement('div');
    overlay.id = 'modalConnexion';
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
<div class="modal-box" onclick="event.stopPropagation()">
  <button class="modal-fermer" onclick="fermerConnexion()">✕</button>
  <div class="modal-titre">Connexion à Peakly</div>
  <div class="modal-sous-titre">Accédez à votre espace artiste ou professionnel</div>
  <div class="modal-champ">
    <label>Adresse e-mail</label>
    <input type="email" placeholder="votre@email.com" id="cx-email">
  </div>
  <div class="modal-champ">
    <label>Mot de passe</label>
    <input type="password" placeholder="••••••••" id="cx-mdp">
  </div>
  <button class="btn-primary" style="width:100%;justify-content:center;margin-top:8px" onclick="validerConnexion()">
    Se connecter
  </button>
  <div style="text-align:center;margin-top:14px;font-size:.78rem;color:var(--txt3)">
    Pas encore de compte ? <a href="#" style="color:var(--or);text-decoration:none" onclick="fermerConnexion()">Rejoindre Peakly</a>
  </div>
</div>`;
    overlay.onclick = fermerConnexion;
    document.body.appendChild(overlay);
  }
  requestAnimationFrame(() => overlay.classList.add('open'));
  document.body.style.overflow = 'hidden';
}
function fermerConnexion(){
  const overlay = document.getElementById('modalConnexion');
  if(overlay){ overlay.classList.remove('open'); document.body.style.overflow = ''; }
}
function validerConnexion(){
  const email = document.getElementById('cx-email');
  const mdp   = document.getElementById('cx-mdp');
  if(!email || !email.value.includes('@')){ showToast('erreur','Adresse invalide','Vérifiez votre e-mail.'); return; }
  if(!mdp || mdp.value.length < 4){ showToast('erreur','Mot de passe','Minimum 4 caractères.'); return; }
  fermerConnexion();
  showToast('suivi','Connexion réussie','Bienvenue sur Peakly.');
}

/* ----------------------------------------------------------------
   10. MODAL CONTACT
   ---------------------------------------------------------------- */
function ouvrirContact(nom){
  let overlay = document.getElementById('modalContact');
  if(!overlay){
    overlay = document.createElement('div');
    overlay.id = 'modalContact';
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
<div class="modal-box" onclick="event.stopPropagation()">
  <button class="modal-fermer" onclick="fermerContact()">✕</button>
  <div class="modal-titre" id="contactTitre">Contacter</div>
  <div class="modal-sous-titre">Envoyez un message via Peakly</div>
  <div class="modal-champ">
    <label>Objet</label>
    <input type="text" placeholder="Collaboration, audition, partenariat..." id="ct-objet">
  </div>
  <div class="modal-champ">
    <label>Message</label>
    <textarea placeholder="Présentez votre projet en quelques lignes..." id="ct-message" rows="4" style="min-height:100px"></textarea>
  </div>
  <button class="btn-primary" style="width:100%;justify-content:center;margin-top:8px" onclick="envoyerContact()">
    Envoyer le message
  </button>
</div>`;
    overlay.onclick = fermerContact;
    document.body.appendChild(overlay);
  }
  if(nom){
    const titre = overlay.querySelector('#contactTitre');
    if(titre) titre.textContent = 'Contacter ' + nom;
  }
  requestAnimationFrame(() => overlay.classList.add('open'));
  document.body.style.overflow = 'hidden';
}
function fermerContact(){
  const overlay = document.getElementById('modalContact');
  if(overlay){ overlay.classList.remove('open'); document.body.style.overflow = ''; }
}
function envoyerContact(){
  const msg = document.getElementById('ct-message');
  if(!msg || msg.value.trim().length < 10){ showToast('erreur','Message trop court','Minimum 10 caractères.'); return; }
  fermerContact();
  showToast('', 'Message envoyé', 'Votre message a bien été transmis via Peakly.');
}

/* ----------------------------------------------------------------
   11. SUIVRE TOGGLE (bouton artiste / label)
   ---------------------------------------------------------------- */
function toggleSuivre(btn, nomEntite){
  const suivi = btn.dataset.suivi === '1';
  if(suivi){
    btn.dataset.suivi = '0';
    btn.textContent = 'Suivre';
    btn.style.background = '';
    btn.style.color = '';
    btn.classList.remove('btn-secondary-suivi');
    showToast('', 'Abonnement annulé', 'Vous ne suivez plus ' + (nomEntite || 'ce profil') + '.');
  } else {
    btn.dataset.suivi = '1';
    btn.textContent = 'Suivi';
    btn.style.background = 'rgba(229,193,88,.12)';
    btn.style.color = 'var(--or)';
    showToast('suivi', 'Vous suivez ' + (nomEntite || 'ce profil'), 'Ses publications apparaîtront dans votre fil.');
  }
}

/* ----------------------------------------------------------------
   12. ESCAPE — fermer les modales
   ---------------------------------------------------------------- */
document.addEventListener('keydown', e => {
  if(e.key === 'Escape'){
    fermerConnexion();
    fermerContact();
  }
});
