/* ================================================================
   PEAKLY — Store de données simulées · js/store.js
   Couche de persistance localStorage pour toute la plateforme
   ================================================================ */

if(typeof window.PeaklyStore !== 'undefined'){ /* déjà chargé */ } else
window.PeaklyStore = (function(){

/* ----------------------------------------------------------------
   DONNÉES ARTISTES
   ---------------------------------------------------------------- */
const ARTISTES = [
  { id:'a1', slug:'awa-kouyate', nom:'Awa Kouyaté', genre:'RnB / Soul', ville:'Paris',
    pays:'France', bio:'Voix soul d\'exception, née à Dakar, formée à Paris. Ses influences vont de Nina Simone à Beyoncé.',
    avatar:'AK', couleur:'#E5C158', score:91, streams:2400000, auditeurs:187000,
    abonnes:42000, concerts:8, momentum:88, virality:81,
    labels_interesses:['Def Jam France','Universal Music FR'],
    genres:['RnB','Soul','Afrobeat'], disponible:true, verifie:true,
    reseaux:{ spotify:'https://open.spotify.com', instagram:'https://instagram.com', tiktok:'https://tiktok.com' },
    link:'../profil-artiste.html' },
  { id:'a2', slug:'tiroy', nom:'TiRoy', genre:'Trap / Rap FR', ville:'Marseille',
    pays:'France', bio:'Rappeur marseillais avec un flow unique et une plume acérée. Projet solo à venir.',
    avatar:'TR', couleur:'#a78bfa', score:84, streams:1800000, auditeurs:142000,
    abonnes:38000, concerts:12, momentum:79, virality:74,
    labels_interesses:['Sony Music FR','Believe'], genres:['Rap','Trap'],
    disponible:true, verifie:true, reseaux:{}, link:'../profil-artiste.html' },
  { id:'a3', slug:'sola-lefebvre', nom:'Sola Lefebvre', genre:'Pop Alternative', ville:'Lyon',
    pays:'France', bio:'Pop alternative avec des textes introspectifs et une production soignée.',
    avatar:'SL', couleur:'#f472b6', score:78, streams:920000, auditeurs:74000,
    abonnes:21000, concerts:6, momentum:82, virality:69,
    labels_interesses:['Warner Music FR'], genres:['Pop','Alternative'],
    disponible:false, verifie:true, reseaux:{}, link:'../profil-artiste.html' },
  { id:'a4', slug:'bamba-kone', nom:'Bamba Koné', genre:'Afrobeats / Coupé-décalé', ville:'Paris',
    pays:'France / Côte d\'Ivoire', bio:'Fusion afrobeats et coupé-décalé avec une énergie live incomparable.',
    avatar:'BK', couleur:'#4ade80', score:87, streams:3100000, auditeurs:256000,
    abonnes:64000, concerts:18, momentum:91, virality:88,
    labels_interesses:['Def Jam France','Polydor'], genres:['Afrobeats','Dancehall'],
    disponible:true, verifie:true, reseaux:{}, link:'../profil-artiste.html' },
  { id:'a5', slug:'willy-ramos', nom:'Willy Ramos', genre:'Jazz / Électro', ville:'Bordeaux',
    pays:'France', bio:'Pianiste de jazz qui fusionne les standards avec des productions électroniques contemporaines.',
    avatar:'WR', couleur:'#60a5fa', score:72, streams:540000, auditeurs:43000,
    abonnes:12000, concerts:4, momentum:68, virality:58,
    labels_interesses:['Blue Note France'], genres:['Jazz','Électro'],
    disponible:true, verifie:false, reseaux:{}, link:'../profil-artiste.html' },
  { id:'a6', slug:'maya-diallo', nom:'Maya Diallo', genre:'R&B / Trap Soul', ville:'Nantes',
    pays:'France / Guinée', bio:'R&B atmosphérique teinté de trap soul. Trois projets autoproduits en 2 ans.',
    avatar:'MD', couleur:'#fb923c', score:80, streams:1200000, auditeurs:98000,
    abonnes:27000, concerts:5, momentum:86, virality:77,
    labels_interesses:['Columbia FR'], genres:['R&B','Trap Soul'],
    disponible:true, verifie:false, reseaux:{}, link:'../profil-artiste.html' },
  { id:'a7', slug:'neo-cassidy', nom:'Neo Cassidy', genre:'Hip-Hop / Conscient', ville:'Strasbourg',
    pays:'France', bio:'Hip-hop conscient aux textes engagés. Certifié or sur son dernier single.',
    avatar:'NC', couleur:'#E5C158', score:88, streams:2900000, auditeurs:219000,
    abonnes:51000, concerts:22, momentum:85, virality:83,
    labels_interesses:['Skyrock','Polydor'], genres:['Hip-Hop','Rap'],
    disponible:false, verifie:true, reseaux:{}, link:'../profil-artiste.html' },
  { id:'a8', slug:'lena-voss', nom:'Léna Voss', genre:'Pop / Électropop', ville:'Paris',
    pays:'France / Allemagne', bio:'Électropop minimaliste avec des influences berlinoises et une présence scénique rare.',
    avatar:'LV', couleur:'#a78bfa', score:75, streams:680000, auditeurs:55000,
    abonnes:18000, concerts:3, momentum:73, virality:65,
    labels_interesses:['Because Music'], genres:['Pop','Électropop'],
    disponible:true, verifie:false, reseaux:{}, link:'../profil-artiste.html' },
];

/* ----------------------------------------------------------------
   DONNÉES PROFESSIONNELS / LABELS
   ---------------------------------------------------------------- */
const PROFESSIONNELS = [
  { id:'p1', slug:'def-jam-france', nom:'Def Jam France', type:'Label Major', ville:'Paris',
    specialite:'Rap / RnB / Urban', avatar:'DJ', couleur:'#E5C158',
    artistes_signes:24, opportunites_actives:3, score_compatibilite:94, verifie:true,
    link:'../profil-pro.html' },
  { id:'p2', slug:'universal-music-fr', nom:'Universal Music FR', type:'Major Label', ville:'Paris',
    specialite:'Pop / Rock / Urban', avatar:'U', couleur:'#60a5fa',
    artistes_signes:87, opportunites_actives:7, score_compatibilite:96, verifie:true,
    link:'../profil-pro.html' },
  { id:'p3', slug:'sony-music-fr', nom:'Sony Music FR', type:'Major Label', ville:'Paris',
    specialite:'Urban / Pop', avatar:'S', couleur:'#4ade80',
    artistes_signes:62, opportunites_actives:5, score_compatibilite:91, verifie:true,
    link:'../profil-pro.html' },
  { id:'p4', slug:'believe-distribution', nom:'Believe Distribution', type:'Distribution Indé', ville:'Paris',
    specialite:'Artiste-centric / Indépendant', avatar:'B', couleur:'#f472b6',
    artistes_signes:340, opportunites_actives:12, score_compatibilite:84, verifie:true,
    link:'../profil-pro.html' },
  { id:'p5', slug:'marc-dubois-manager', nom:'Marc Dubois', type:'Manager', ville:'Lyon',
    specialite:'Rap / RnB / Tour management', avatar:'MD', couleur:'#fb923c',
    artistes_signes:6, opportunites_actives:2, score_compatibilite:78, verifie:false,
    link:'../profil-pro.html' },
];

/* ----------------------------------------------------------------
   DONNÉES MESSAGES
   ---------------------------------------------------------------- */
const MESSAGES_DEFAUT = [
  { id:'conv1', avec:'p1', nom_contact:'Def Jam France', avatar:'DJ', couleur:'#E5C158',
    dernierMessage:'Nous avons écouté votre dernier EP et souhaitons en discuter.',
    horodatage: Date.now() - 3600000, lu:false, badge:'Label',
    messages:[
      { de:'eux', texte:'Bonjour, nous avons découvert votre profil Peakly.', ts: Date.now() - 86400000 },
      { de:'eux', texte:'Nous avons écouté votre dernier EP et souhaitons en discuter.', ts: Date.now() - 3600000 },
    ]
  },
  { id:'conv2', avec:'a4', nom_contact:'Bamba Koné', avatar:'BK', couleur:'#4ade80',
    dernierMessage:'Top pour la collab ! Je suis dispo la semaine prochaine.',
    horodatage: Date.now() - 7200000, lu:true, badge:'Artiste',
    messages:[
      { de:'moi', texte:'Salut Bamba ! Tu serais chaud pour une collab sur mon prochain projet ?', ts: Date.now() - 14400000 },
      { de:'eux', texte:'Top pour la collab ! Je suis dispo la semaine prochaine.', ts: Date.now() - 7200000 },
    ]
  },
  { id:'conv3', avec:'p5', nom_contact:'Marc Dubois', avatar:'MD', couleur:'#fb923c',
    dernierMessage:'Je vous envoie le contrat de management pour relecture.',
    horodatage: Date.now() - 172800000, lu:true, badge:'Manager',
    messages:[
      { de:'eux', texte:'Je vous envoie le contrat de management pour relecture.', ts: Date.now() - 172800000 },
    ]
  },
];

/* ----------------------------------------------------------------
   DONNÉES NOTIFICATIONS
   ---------------------------------------------------------------- */
const NOTIFS_DEFAUT = [
  { id:'n1', type:'opportunite', titre:'Nouvelle opportunité — Def Jam France',
    texte:'Def Jam France a publié une offre qui correspond à votre profil.',
    ts: Date.now() - 1800000, lu:false, lien:'../profil-pro.html' },
  { id:'n2', type:'follow', titre:'Bamba Koné vous suit',
    texte:'L\'artiste Bamba Koné a ajouté votre profil à ses favoris.',
    ts: Date.now() - 7200000, lu:false, lien:'../profil-artiste.html' },
  { id:'n3', type:'bigup', titre:'12 Big Ups sur votre publication',
    texte:'Votre post "Session studio nocturne" continue de progresser.',
    ts: Date.now() - 14400000, lu:false, lien:'../profil-artiste.html' },
  { id:'n4', type:'score', titre:'Votre Talent Score a progressé',
    texte:'Votre score est passé de 88 à 91. Vous gagnez en visibilité.',
    ts: Date.now() - 86400000, lu:true, lien:'../espace-artiste.html' },
  { id:'n5', type:'message', titre:'Nouveau message de Universal Music FR',
    texte:'Marc Lefebvre (A&R Universal) vous a envoyé un message.',
    ts: Date.now() - 172800000, lu:true, lien:'messages.html' },
  { id:'n6', type:'vue', titre:'Votre profil a été consulté 47 fois',
    texte:'Dont 3 consultations de professionnels vérifiés cette semaine.',
    ts: Date.now() - 259200000, lu:true, lien:'../espace-artiste.html' },
  { id:'n7', type:'opportunite', titre:'Appel à candidatures — Printemps de Bourges',
    texte:'Le festival Printemps de Bourges recherche des artistes émergents.',
    ts: Date.now() - 432000000, lu:true, lien:'../crm.html' },
];

/* ----------------------------------------------------------------
   API PUBLIQUE DU STORE
   ---------------------------------------------------------------- */

function init(){
  if(!localStorage.getItem('pkly_init')){
    localStorage.setItem('pkly_artistes', JSON.stringify(ARTISTES));
    localStorage.setItem('pkly_pros', JSON.stringify(PROFESSIONNELS));
    localStorage.setItem('pkly_messages', JSON.stringify(MESSAGES_DEFAUT));
    localStorage.setItem('pkly_notifs', JSON.stringify(NOTIFS_DEFAUT));
    localStorage.setItem('pkly_follows', JSON.stringify([]));
    localStorage.setItem('pkly_bigups', JSON.stringify([]));
    localStorage.setItem('pkly_init', '1');
  }
}

function getArtistes(){ return JSON.parse(localStorage.getItem('pkly_artistes') || '[]'); }
function getPros(){ return JSON.parse(localStorage.getItem('pkly_pros') || '[]'); }
function getMessages(){ return JSON.parse(localStorage.getItem('pkly_messages') || '[]'); }
function getNotifs(){ return JSON.parse(localStorage.getItem('pkly_notifs') || '[]'); }
function getSession(){ return JSON.parse(localStorage.getItem('pkly_session') || 'null'); }
function isLoggedIn(){ return !!getSession(); }

function getNbNotifNonLues(){
  return getNotifs().filter(n => !n.lu).length;
}
function getNbMessagesNonLus(){
  return getMessages().filter(m => !m.lu).length;
}

function login(email, nom, type){
  const session = { email, nom: nom || email.split('@')[0], type: type || 'artiste',
    ts: Date.now(), avatar: (nom || email)[0].toUpperCase() };
  localStorage.setItem('pkly_session', JSON.stringify(session));
  return session;
}
function logout(){
  localStorage.removeItem('pkly_session');
}

function toggleFollow(entiteId){
  const follows = JSON.parse(localStorage.getItem('pkly_follows') || '[]');
  const idx = follows.indexOf(entiteId);
  if(idx > -1){ follows.splice(idx,1); }
  else { follows.push(entiteId); }
  localStorage.setItem('pkly_follows', JSON.stringify(follows));
  return idx === -1;
}
function isSuivi(entiteId){
  return (JSON.parse(localStorage.getItem('pkly_follows')||'[]')).includes(entiteId);
}

function marquerNotifsLues(){
  const notifs = getNotifs().map(n => ({...n, lu:true}));
  localStorage.setItem('pkly_notifs', JSON.stringify(notifs));
}

function envoyerMessage(convId, texte){
  const messages = getMessages();
  const conv = messages.find(m => m.id === convId);
  if(!conv) return;
  conv.messages.push({ de:'moi', texte, ts: Date.now() });
  conv.dernierMessage = texte;
  conv.horodatage = Date.now();
  conv.lu = true;
  localStorage.setItem('pkly_messages', JSON.stringify(messages));
}

function searchArtistes(query, filtres){
  let resultats = getArtistes();
  if(query){
    const q = query.toLowerCase();
    resultats = resultats.filter(a =>
      a.nom.toLowerCase().includes(q) ||
      a.genre.toLowerCase().includes(q) ||
      a.ville.toLowerCase().includes(q) ||
      (a.genres || []).some(g => g.toLowerCase().includes(q))
    );
  }
  if(filtres){
    if(filtres.genre) resultats = resultats.filter(a => (a.genres||[]).some(g => g.toLowerCase().includes(filtres.genre.toLowerCase())));
    if(filtres.ville) resultats = resultats.filter(a => a.ville.toLowerCase().includes(filtres.ville.toLowerCase()));
    if(filtres.scoreMin) resultats = resultats.filter(a => a.score >= filtres.scoreMin);
    if(filtres.disponible) resultats = resultats.filter(a => a.disponible);
  }
  return resultats.sort((a,b) => b.score - a.score);
}

function searchTous(query, filtres){
  const type = filtres && filtres.type;
  let resultats = [];
  if(!type || type === 'artiste') resultats = [...resultats, ...searchArtistes(query, filtres).map(a=>({...a, _type:'artiste'}))];
  if(!type || type === 'label' || type === 'professionnel'){
    let pros = getPros();
    if(query){ const q=query.toLowerCase(); pros = pros.filter(p=>p.nom.toLowerCase().includes(q)||p.specialite.toLowerCase().includes(q)||p.ville.toLowerCase().includes(q)); }
    resultats = [...resultats, ...pros.map(p=>({...p, _type:'professionnel'}))];
  }
  return resultats;
}

init();

return { getArtistes, getPros, getMessages, getNotifs, getSession, isLoggedIn,
  getNbNotifNonLues, getNbMessagesNonLus, login, logout,
  toggleFollow, isSuivi,
  searchArtistes, searchTous, marquerNotifsLues, envoyerMessage
};
})();
