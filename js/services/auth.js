/* ================================================================
   PEAKLY — Service d'authentification
   js/services/auth.js
   Dépend de : supabase.js
   ================================================================ */

(function(global){

  const PeaklyAuth = {

    /* ── État courant ── */
    _session: null,
    _profile: null,

    /* ────────────────────────────────────────────────────────────
       INITIALISATION — appeler au chargement de chaque page
    ──────────────────────────────────────────────────────────── */
    async init(){
      if(!global.PeaklySupabase) return null;
      const { data } = await PeaklySupabase.auth.getSession();
      this._session = data?.session || null;
      if(this._session) await this._loadProfile();
      /* Écouter les changements d'état (expiration, refresh...) */
      PeaklySupabase.auth.onAuthStateChange(async (event, session) => {
        this._session = session;
        if(session) await this._loadProfile();
        else this._profile = null;
        document.dispatchEvent(new CustomEvent('peakly:auth', { detail: { event, session, profile: this._profile } }));
      });
      return this._session;
    },

    /* ── Charger le profil Supabase ── */
    async _loadProfile(){
      if(!this._session) return;
      const { data, error } = await PeaklySupabase
        .from('profiles')
        .select('*, artistes(*), professionnels(*)')
        .eq('id', this._session.user.id)
        .single();
      if(!error) this._profile = data;
    },

    /* ────────────────────────────────────────────────────────────
       INSCRIPTION
    ──────────────────────────────────────────────────────────── */
    async register({ email, password, nom, role = 'artiste', siret = null, nom_structure = null, type_structure = 'label', meta = {} }){
      /* Validation */
      if(!email || !password || !nom) throw new Error('Champs obligatoires manquants.');
      if(password.length < 8) throw new Error('Mot de passe trop court (8 caractères minimum).');
      /* SIRET facultatif — collecté dans l'onboarding étape 3b, envoyé en meta */

      /*
        Toutes les métadonnées sont passées dans raw_user_meta_data.
        Le trigger handle_new_user() (schema_v2.sql) crée automatiquement
        le sous-profil artiste ou professionnel — pas besoin d'inserts client.
      */
      const { data, error } = await PeaklySupabase.auth.signUp({
        email,
        password,
        options: {
          data: { nom, role, siret, nom_structure: nom_structure || nom, type_structure, ...meta },
          emailRedirectTo: window.location.origin + '/pages/login.html?confirmed=1'
        }
      });
      if(error) throw error;
      return data;
    },

    /* ────────────────────────────────────────────────────────────
       CONNEXION
    ──────────────────────────────────────────────────────────── */
    async login({ email, password }){
      if(!email || !password) throw new Error('Email et mot de passe requis.');
      const { data, error } = await PeaklySupabase.auth.signInWithPassword({ email, password });
      if(error) throw error;
      this._session = data.session;
      await this._loadProfile();
      return data;
    },

    /* ── Connexion OAuth (Google, Apple) ── */
    async loginOAuth(provider = 'google'){
      const { error } = await PeaklySupabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: window.location.origin + '/feed.html' }
      });
      if(error) throw error;
    },

    /* ────────────────────────────────────────────────────────────
       DÉCONNEXION
    ──────────────────────────────────────────────────────────── */
    async logout(){
      await PeaklySupabase.auth.signOut();
      this._session = null;
      this._profile = null;
      /* Transition douce */
      document.body.style.opacity = '0';
      document.body.style.transition = 'opacity .3s ease';
      setTimeout(() => { window.location.href = PeaklyAuth._rootPath() + 'pages/login.html'; }, 300);
    },

    /* ────────────────────────────────────────────────────────────
       MOT DE PASSE OUBLIÉ
    ──────────────────────────────────────────────────────────── */
    async forgotPassword(email){
      if(!email) throw new Error('Email requis.');
      const { error } = await PeaklySupabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/pages/reset-password.html'
      });
      if(error) throw error;
    },

    /* ────────────────────────────────────────────────────────────
       MISE À JOUR PROFIL
    ──────────────────────────────────────────────────────────── */
    async updateProfile(updates){
      if(!this._session) throw new Error('Non connecté.');
      const { error } = await PeaklySupabase
        .from('profiles')
        .update(updates)
        .eq('id', this._session.user.id);
      if(error) throw error;
      await this._loadProfile();
    },

    /* ────────────────────────────────────────────────────────────
       GETTERS
    ──────────────────────────────────────────────────────────── */
    getSession(){ return this._session; },
    getProfile(){ return this._profile; },
    getUser(){ return this._session?.user || null; },
    isLoggedIn(){ return !!this._session; },
    getRole(){ return this._profile?.role || null; },
    isPremium(){ return this._profile?.premium || false; },
    getPlan(){ return this._profile?.plan || 'gratuit'; },

    /* ────────────────────────────────────────────────────────────
       PROTECTION DE PAGE — appeler en haut de chaque page protégée
    ──────────────────────────────────────────────────────────── */
    async requireAuth(redirectTo){
      await this.init();
      if(!this.isLoggedIn()){
        const dest = redirectTo || window.location.href;
        window.location.href = this._rootPath() + 'pages/login.html?redirect=' + encodeURIComponent(dest);
        return false;
      }
      return true;
    },

    /* Protection par rôle */
    async requireRole(role){
      await this.requireAuth();
      if(this.getRole() !== role && this.getRole() !== 'admin'){
        window.location.href = this._rootPath() + 'feed.html';
        return false;
      }
      return true;
    },

    /* Redirection post-login selon le rôle */
    redirectByRole(){
      const role = this.getRole();
      if(role === 'admin')         return (window.location.href = this._rootPath() + 'pages/admin.html');
      if(role === 'professionnel') return (window.location.href = this._rootPath() + 'crm.html');
      return (window.location.href = this._rootPath() + 'feed.html');
    },

    /* ── Utilitaire chemin racine ── */
    _rootPath(){
      return window.location.pathname.includes('/pages/') ? '../' : '';
    }

  };

  global.PeaklyAuth = PeaklyAuth;

})(window);
