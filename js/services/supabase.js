/* ================================================================
   PEAKLY — Client Supabase
   js/services/supabase.js

   Charger ce fichier AVANT tous les autres services :
   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.0/dist/umd/supabase.min.js"></script>
   <script src="js/services/supabase.js"></script>
   ================================================================ */

(function(global){

  /* ── Configuration (remplacer par vos clés depuis .env ou Vercel env vars) ── */
  const SUPABASE_URL  = window.ENV_SUPABASE_URL  || 'https://VOTRE_PROJECT_ID.supabase.co';
  const SUPABASE_ANON = window.ENV_SUPABASE_ANON || 'VOTRE_ANON_KEY';

  /* ── Initialisation du client ── */
  let client = null;

  function getClient(){
    if(client) return client;
    if(typeof supabase === 'undefined'){
      console.error('[Peakly] Supabase JS non chargé. Ajouter le CDN avant ce fichier.');
      return null;
    }
    client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON, {
      auth: {
        autoRefreshToken:    true,
        persistSession:      true,
        detectSessionInUrl:  true,
        storageKey:          'peakly_session'
      },
      realtime: {
        params: { eventsPerSecond: 10 }
      }
    });
    return client;
  }

  /* ── API publique ── */
  const PeaklySupabase = {

    get client(){ return getClient(); },

    /* Raccourcis tables */
    from(table){ return getClient().from(table); },

    /* Auth */
    auth: {
      signUp(params)       { return getClient().auth.signUp(params); },
      signIn(params)       { return getClient().auth.signInWithPassword(params); },
      signInOAuth(provider){ return getClient().auth.signInWithOAuth({ provider, options: { redirectTo: window.location.origin + '/feed.html' } }); },
      signOut()            { return getClient().auth.signOut(); },
      getSession()         { return getClient().auth.getSession(); },
      getUser()            { return getClient().auth.getUser(); },
      onAuthStateChange(cb){ return getClient().auth.onAuthStateChange(cb); },
      resetPassword(email) { return getClient().auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/pages/reset-password.html' }); },
      updateUser(params)   { return getClient().auth.updateUser(params); }
    },

    /* Storage */
    storage: {
      upload(bucket, path, file, opts){
        return getClient().storage.from(bucket).upload(path, file, opts);
      },
      getPublicUrl(bucket, path){
        return getClient().storage.from(bucket).getPublicUrl(path);
      },
      remove(bucket, paths){
        return getClient().storage.from(bucket).remove(paths);
      }
    },

    /* Realtime */
    channel(name){ return getClient().channel(name); },
    removeChannel(channel){ return getClient().removeChannel(channel); }

  };

  global.PeaklySupabase = PeaklySupabase;

})(window);
