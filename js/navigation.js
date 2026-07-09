/* ================================================================
   PEAKLY — Navigation premium · js/navigation.js
   Header glassmorphism animé · UIPro level
   ================================================================ */

(function PeaklyNav(){
  const path = window.location.pathname;
  const isInPages = path.includes('/pages/');
  const ROOT   = isInPages ? '../' : '';
  const PAGES  = isInPages ? '' : 'pages/';

  const nbNotifs  = (typeof PeaklyStore !== 'undefined') ? PeaklyStore.getNbNotifNonLues() : 0;
  const nbMsg     = (typeof PeaklyStore !== 'undefined') ? PeaklyStore.getNbMessagesNonLus() : 0;
  const session   = (typeof PeaklyStore !== 'undefined') ? PeaklyStore.getSession() : null;
  const initiale  = session ? session.avatar : 'A';

  const pageName = path.split('/').pop() || 'index.html';

  function isActif(target){
    if(target === 'feed'   && pageName === 'feed.html')       return true;
    if(target === 'search' && pageName === 'recherche.html')  return true;
    if(target === 'crm'    && pageName === 'crm.html')        return true;
    if(target === 'msg'    && pageName === 'messages.html')   return true;
    if(target === 'notifs' && pageName === 'notifications.html') return true;
    return false;
  }

  const NAV_HTML = `
<header class="header-app" id="headerApp" role="banner">
  <!-- Glow ambiant doré derrière le header -->
  <div class="header-glow-line"></div>

  <div class="header-interieur">
    <!-- Logo animé -->
    <a href="${ROOT}feed.html" class="header-logo" aria-label="Peakly">
      <img src="${ROOT}LOGO PEAKLY NAV.png" alt="Peakly" width="90" height="28" class="logo-img">
      <div class="logo-pulse-ring"></div>
    </a>

    <!-- Barre de recherche premium -->
    <div class="barre-recherche" id="navSearchWrap" role="search">
      <div class="search-icon-wrap">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      </div>
      <input type="search" id="navSearchInput"
        placeholder="Rechercher un artiste, un label..."
        aria-label="Rechercher sur Peakly"
        autocomplete="off">
      <div class="search-glow"></div>
      <kbd class="search-kbd">⏎</kbd>
    </div>

    <!-- Nav icônes -->
    <nav class="nav-icones" aria-label="Navigation principale">

      <a href="${ROOT}feed.html" class="nav-icone${isActif('feed')?' actif':''}" aria-label="Fil d'actualité">
        <div class="nav-icone-inner">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        </div>
        <span>Accueil</span>
        <div class="nav-indicator"></div>
      </a>

      <a href="${ROOT}${PAGES}recherche.html" class="nav-icone${isActif('search')?' actif':''}" aria-label="Découverte">
        <div class="nav-icone-inner">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        </div>
        <span>Découverte</span>
        <div class="nav-indicator"></div>
      </a>

      <a href="${ROOT}crm.html" class="nav-icone${isActif('crm')?' actif':''}" aria-label="Auditions">
        <div class="nav-icone-inner">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
        </div>
        <span>Auditions</span>
        <div class="nav-indicator"></div>
      </a>

      <a href="${ROOT}${PAGES}messages.html" class="nav-icone${isActif('msg')?' actif':''}" aria-label="Messages">
        <div class="nav-icone-inner" style="position:relative">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          ${nbMsg > 0 ? `<span class="notif-badge nav-badge-anim">${nbMsg}</span>` : ''}
        </div>
        <span>Messages</span>
        <div class="nav-indicator"></div>
      </a>

      <a href="${ROOT}${PAGES}notifications.html" class="nav-icone${isActif('notifs')?' actif':''}" aria-label="Notifications">
        <div class="nav-icone-inner" style="position:relative">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          ${nbNotifs > 0 ? `<span class="notif-badge nav-badge-anim">${nbNotifs}</span>` : ''}
        </div>
        <span>Alertes</span>
        <div class="nav-indicator"></div>
      </a>

      <!-- Avatar + Menu -->
      <div class="avatar-wrapper" id="avatarWrapper" onclick="ouvrirMenuAvatar(this)" role="button" aria-label="Menu compte" tabindex="0">
        <div class="avatar-header" id="navAvatar">
          ${initiale}
          <div class="avatar-ring"></div>
        </div>
        <!-- Dropdown menu -->
        <div id="menuAvatar" class="menu-avatar" aria-hidden="true">
          <div class="menu-avatar-header">
            <div class="menu-avatar-user-avatar">${initiale}</div>
            <div>
              <div class="menu-avatar-name">${session ? session.nom : 'Mon compte'}</div>
              <div class="menu-avatar-email">${session ? session.email : ''}</div>
            </div>
          </div>
          <div class="menu-avatar-sep"></div>
          <a href="${ROOT}profil-artiste.html" class="menu-avatar-item">
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
            Mon profil
          </a>
          <a href="${ROOT}espace-artiste.html" class="menu-avatar-item">
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
            Espace privé
          </a>
          <a href="${ROOT}${PAGES}settings.html" class="menu-avatar-item">
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            Paramètres
          </a>
          <a href="${ROOT}${PAGES}pricing.html" class="menu-avatar-item">
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>
            Abonnements
            <span class="menu-badge-pro">Pro</span>
          </a>
          <div class="menu-avatar-sep"></div>
          <div class="menu-avatar-item menu-avatar-item-danger" onclick="deconnexion('${ROOT}')">
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Se déconnecter
          </div>
        </div>
      </div>

    </nav>
  </div>
</header>`;

  /* ── Injection dans #nav-root ── */
  const root = document.getElementById('nav-root');
  if(root) root.outerHTML = NAV_HTML;

  /* ── Init après injection ── */
  document.addEventListener('DOMContentLoaded', initNav);
  // Si DOMContentLoaded déjà passé (script en fin de body)
  if(document.readyState !== 'loading') initNav();

  function initNav(){
    /* Recherche nav */
    const inp = document.getElementById('navSearchInput');
    if(inp){
      inp.addEventListener('focus', function(){
        const wrap = document.getElementById('navSearchWrap');
        if(wrap) wrap.classList.add('focused');
      });
      inp.addEventListener('blur', function(){
        const wrap = document.getElementById('navSearchWrap');
        if(wrap) wrap.classList.remove('focused');
      });
      inp.addEventListener('keydown', function(e){
        if(e.key === 'Enter' && inp.value.trim()){
          window.location.href = ROOT + PAGES + 'recherche.html?q=' + encodeURIComponent(inp.value.trim());
        }
      });
    }

    /* Scroll réactif — header s'assombrit */
    const header = document.getElementById('headerApp');
    if(header){
      let lastScroll = 0;
      let ticking = false;
      window.addEventListener('scroll', function(){
        if(!ticking){
          requestAnimationFrame(function(){
            const s = window.scrollY;
            if(s > 20){
              header.classList.add('scrolled');
            } else {
              header.classList.remove('scrolled');
            }
            // Masquer au scroll vers le bas, réafficher vers le haut
            if(s > lastScroll && s > 80){
              header.classList.add('hidden');
            } else {
              header.classList.remove('hidden');
            }
            lastScroll = s;
            ticking = false;
          });
          ticking = true;
        }
      }, { passive: true });
    }

    /* Mouse glow sur le header */
    if(header){
      header.addEventListener('mousemove', function(e){
        const rect = header.getBoundingClientRect();
        const x = e.clientX - rect.left;
        header.style.setProperty('--mx', x + 'px');
      });
    }

    /* Hover micro-bounce sur nav-icone SVGs */
    document.querySelectorAll('.nav-icone').forEach(function(el){
      el.addEventListener('mouseenter', function(){
        const svg = el.querySelector('svg');
        if(svg){
          svg.style.transition = 'transform .15s cubic-bezier(.34,1.56,.64,1)';
          svg.style.transform = 'scale(1.18) translateY(-1px)';
        }
      });
      el.addEventListener('mouseleave', function(){
        const svg = el.querySelector('svg');
        if(svg){
          svg.style.transform = '';
        }
      });
    });

    /* Entrée du header : slide-in depuis le haut */
    if(header){
      header.style.transform = 'translateY(-100%)';
      header.style.opacity = '0';
      requestAnimationFrame(function(){
        requestAnimationFrame(function(){
          header.style.transition = 'transform .5s cubic-bezier(.22,1,.36,1), opacity .4s ease';
          header.style.transform = '';
          header.style.opacity = '';
          setTimeout(function(){ header.style.transition = ''; }, 600);
        });
      });
    }
  }

})();

/* ================================================================
   Menu avatar — animation smooth
   ================================================================ */
function ouvrirMenuAvatar(el){
  const menu = document.getElementById('menuAvatar');
  if(!menu) return;

  const isOpen = menu.classList.contains('open');

  if(isOpen){
    fermerMenuAvatar(menu);
  } else {
    menu.classList.add('open');
    menu.setAttribute('aria-hidden', 'false');
    // Fermer au clic extérieur
    setTimeout(function(){
      document.addEventListener('click', function handler(e){
        if(!el.contains(e.target)){
          fermerMenuAvatar(menu);
          document.removeEventListener('click', handler);
        }
      });
    }, 0);
  }
}

function fermerMenuAvatar(menu){
  if(!menu) menu = document.getElementById('menuAvatar');
  if(!menu) return;
  menu.classList.remove('open');
  menu.setAttribute('aria-hidden', 'true');
}

function deconnexion(root){
  if(typeof PeaklyStore !== 'undefined') PeaklyStore.logout();
  // Transition de sortie
  document.body.style.opacity = '0';
  document.body.style.transition = 'opacity .3s ease';
  setTimeout(function(){
    window.location.href = (root || '') + 'pages/login.html';
  }, 280);
}
