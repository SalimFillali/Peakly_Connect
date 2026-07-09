/* ================================================================
   PEAKLY — Client Supabase
   js/services/supabase.js

   Charger ce fichier AVANT tous les autres services :
   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.0/dist/umd/supabase.min.js"></script>
   <script src="js/services/supabase.js"></script>
   ================================================================ */

(function(global){

  /* ── Initialisation du client (config chargee via /api/config) ── */
  var client = null;

  function getClient(){
    if(client) return client;
    if(typeof supabase === 'undefined' || !supabase.createClient){
      console.error('[Peakly] Supabase JS non charge. Ajouter le CDN avant ce fichier.');
      return null;
    }
    var cfg = global.__PEAKLY_CONFIG__ || {};
    var url  = cfg.supabaseUrl  || '';
    var anon = cfg.supabaseAnonKey || '';
    if(!url || !anon){
      console.warn('[Peakly] Supabase non configure -- mode demo.');
      return null;
    }
    client = supabase.createClient(url, anon, {
      auth: {
        autoRefreshToken:   true,
        persistSession:     true,
        detectSessionInUrl: true,
        storageKey:         'peakly_session'
      },
      realtime: {
        params: { eventsPerSecond: 10 }
      }
    });
    return client;
  }

  /* ── Chargement de la config depuis /api/config ── */
  function initSupabase(cfg){
    global.__PEAKLY_CONFIG__ = cfg;
    if(typeof supabase !== 'undefined' && supabase.createClient){
      getClient();
    }
    global.__PEAKLY_READY__ = true;
    document.dispatchEvent(new CustomEvent('peakly:ready', { detail: { client: client } }));
  }

  if(global.__PEAKLY_CONFIG__){
    initSupabase(global.__PEAKLY_CONFIG__);
  } else {
    fetch('/api/config')
      .then(function(r){ return r.json(); })
      .then(function(cfg){ initSupabase(cfg); })
      .catch(function(e){
        console.warn('[Peakly] Config fetch failed, mode demo:', e);
        global.__PEAKLY_READY__ = true;
        document.dispatchEvent(new CustomEvent('peakly:ready', { detail: { client: null } }));
      });
  }

  /* ── API publique ── */
  var PeaklySupabase = {

    get client(){ return getClient(); },

    from: function(table){ return getClient().from(table); },

    auth: {
      signUp: function(params)            { return getClient().auth.signUp(params); },
      signInWithPassword: function(params){ return getClient().auth.signInWithPassword(params); },
      signInWithOAuth: function(opts)     { return getClient().auth.signInWithOAuth(opts); },
      signOut: function()                 { return getClient().auth.signOut(); },
      getSession: function()              { return getClient() ? getClient().auth.getSession() : Promise.resolve({ data: { session: null } }); },
      getUser: function()                 { return getClient() ? getClient().auth.getUser() : Promise.resolve({ data: { user: null } }); },
      onAuthStateChange: function(cb)     { return getClient() ? getClient().auth.onAuthStateChange(cb) : null; },
      resetPasswordForEmail: function(email, opts){ return getClient().auth.resetPasswordForEmail(email, opts); },
      updateUser: function(params)        { return getClient().auth.updateUser(params); }
    },

    storage: {
      from: function(bucket){ return getClient().storage.from(bucket); }
    },

    channel: function(name){ return getClient().channel(name); },
    removeChannel: function(channel){ return getClient().removeChannel(channel); }

  };

  global.PeaklySupabase = PeaklySupabase;

})(window);
