/* ================================================================
   PEAKLY — Navigation premium · js/navigation.js
   Header glassmorphism animé · UIPro level
   ================================================================ */

(function PeaklyNav(){
  const path = window.location.pathname;

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
    <a href="/feed.html" class="header-logo" aria-label="Peakly">
      <img src="/logo-peakly-nav.png" alt="Peakly" width="90" height="28" class="logo-img">
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

      <a href="/feed.html" class="nav-icone${isActif('feed')?' actif':''}" aria-label="Fil d'actualité">
        <div class="nav-icone-inner">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        </div>
        <span>Accueil</span>
        <div class="nav-indicator"></div>
      </a>

      <a href="/pages/recherche.html" class="nav-icone${isActif('search')?' actif':''}" aria-label="Découverte">
        <div class="nav-icone-inner">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        </div>
        <span>Découverte</span>
        <div class="nav-indicator"></div>
      </a>

      <a href="/crm.html" class="nav-icone${isActif('crm')?' actif':''}" aria-label="Auditions">
        <div class="nav-icone-inner">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
        </div>
        <span>Auditions</span>
        <div class="nav-indicator"></div>
      </a>

      <a href="/pages/messages.html" class="nav-icone${isActif('msg')?' actif':''}" aria-label="Messages">
        <div class="nav-icone-inner" style="position:relative">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          ${nbMsg > 0 ? `<span class="notif-badge nav-badge-anim">${nbMsg}</span>` : ''}
        </div>
        <span>Messages</span>
        <div class="nav-indicator"></div>
      </a>

      <a href="/pages/notifications.html" class="nav-icone${isActif('notifs')?' actif':''}" aria-label="Notifications">
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
        <div class="menu-avatar" id="menuAvatar" role="menu" aria-hidden="true">
          <div class="menu-avatar-header">
            <div class="menu-avatar-name">${session ? session.nom || 'Mon compte' : 'Mon compte'}</div>
            <div class="menu-avatar-role">${session ? (session.role === 'professionnel' ? 'Professionnel' : 'Artiste') : ''}</div>
          </div>
          <a href="${session && session.role === 'professionnel' ? '/profil-pro.html' : '/profil-artiste.html'}" class="menu-avatar-item" role="menuitem">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            Mon profil
          </a>
          <a href="${session && session.role === 'professionnel' ? '/crm.html' : '/espace-artiste.html'}" class="menu-avatar-item" role="menuitem">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
            Espace privé
          </a>
          <a href="/pages/settings.html" class="menu-avatar-item" role="menuitem">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            Paramètres
          </a>
          <a href="/pages/pricing.html" class="menu-avatar-item" role="menuitem">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            Abonnements
          </a>
          <div class="menu-avatar-sep"></div>
          <a href="#" class="menu-avatar-item menu-avatar-logout" role="menuitem" onclick="event.preventDefault(); if(typeof PeaklyAuth !== 'undefined' && PeaklyAuth.logout){ PeaklyAuth.logout(); } else { window.location.href='/pages/login.html'; }">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Se déconnecter
          </a>
        </div>
      </div>

    </nav>
  </div>
</header>`;

  /* ── Injection ── */
  var placeholder = document.getElementById('navPlaceholder');
  if(placeholder){
    placeholder.outerHTML = NAV_HTML;
  } else if(document.body) {
    document.body.insertAdjacentHTML('afterbegin', NAV_HTML);
  } else {
    document.addEventListener('DOMContentLoaded', function(){
      document.body.insertAdjacentHTML('afterbegin', NAV_HTML);
    });
  }

  /* ── Comportement scroll ── */
  var header = document.getElementById('headerApp');
  if(header){
    var lastScroll = 0;
    window.addEventListener('scroll', function(){
      var curr = window.scrollY;
      if(curr > 60){
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
      lastScroll = curr;
    }, { passive: true });
  }

  /* ── Menu avatar ── */
  window.ouvrirMenuAvatar = function(el) {
    var menu = document.getElementById('menuAvatar');
    if (!menu) return;
    var isOpen = menu.classList.contains('open');
    document.querySelectorAll('.menu-avatar.open').forEach(function(m) {
      m.classList.remove('open');
      m.setAttribute('aria-hidden', 'true');
    });
    if (!isOpen) {
      menu.classList.add('open');
      menu.setAttribute('aria-hidden', 'false');
    }
  };

  /* Fermer le menu au clic exterieur */
  document.addEventListener('click', function(e){
    var wrapper = document.getElementById('avatarWrapper');
    if(wrapper && !wrapper.contains(e.target)){
      var menu = document.getElementById('menuAvatar');
      if(menu){ menu.classList.remove('open'); menu.setAttribute('aria-hidden','true'); }
    }
  });

  /* Fermer le menu avec Echap */
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      var menu = document.getElementById('menuAvatar');
      if (menu) { menu.classList.remove('open'); menu.setAttribute('aria-hidden', 'true'); }
    }
  });

  /* ── Recherche nav ── */
  var navSearch = document.getElementById('navSearchInput');
  if(navSearch){
    navSearch.addEventListener('keydown', function(e){
      if(e.key === 'Enter' && navSearch.value.trim()){
        window.location.href = '/pages/recherche.html?q=' + encodeURIComponent(navSearch.value.trim());
      }
    });
  }

})();
