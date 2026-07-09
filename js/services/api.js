/* ================================================================
   PEAKLY — Service API (CRUD Supabase)
   js/services/api.js
   Dépend de : supabase.js, auth.js
   ================================================================ */

(function(global){

  const PeaklyAPI = {

    /* ════════════════════════════════════════════════════════════
       PROFILS
    ═════════════════════════════════════════════════════════════*/
    profiles: {
      async getById(id){
        return PeaklySupabase.from('profiles')
          .select('*, artistes(*), professionnels(*), badges_profils(badge_id, obtenu_le, badges(*))')
          .eq('id', id)
          .single();
      },
      async search(query, role){
        let q = PeaklySupabase.from('profiles').select('*, artistes(*)').ilike('nom', `%${query}%`);
        if(role) q = q.eq('role', role);
        return q.limit(20);
      }
    },

    /* ════════════════════════════════════════════════════════════
       PUBLICATIONS (FEED)
    ═════════════════════════════════════════════════════════════*/
    feed: {
      async list({ page = 0, limit = 20, profileId = null } = {}){
        let q = PeaklySupabase.from('publications')
          .select('*, profiles(id, nom, avatar_url, role, artistes(nom_artiste, genre_principal))')
          .order('created_at', { ascending: false })
          .range(page * limit, (page + 1) * limit - 1);
        if(profileId) q = q.eq('profile_id', profileId);
        return q;
      },
      async create(contenu, type = 'publication', mediaUrl = null, mediaType = null){
        const user = PeaklyAuth.getUser();
        if(!user) throw new Error('Non connecté');
        return PeaklySupabase.from('publications').insert({
          profile_id: user.id, contenu, type, media_url: mediaUrl, media_type: mediaType
        }).select().single();
      },
      async delete(id){
        return PeaklySupabase.from('publications').delete().eq('id', id);
      },
      async like(publicationId){
        const user = PeaklyAuth.getUser();
        if(!user) throw new Error('Non connecté');
        return PeaklySupabase.from('likes').upsert({ profile_id: user.id, publication_id: publicationId });
      },
      async unlike(publicationId){
        const user = PeaklyAuth.getUser();
        if(!user) throw new Error('Non connecté');
        return PeaklySupabase.from('likes').delete()
          .eq('profile_id', user.id)
          .eq('publication_id', publicationId);
      },
      async comment(publicationId, contenu){
        const user = PeaklyAuth.getUser();
        if(!user) throw new Error('Non connecté');
        return PeaklySupabase.from('commentaires').insert({
          publication_id: publicationId, profile_id: user.id, contenu
        }).select().single();
      }
    },

    /* ════════════════════════════════════════════════════════════
       MESSAGERIE
    ═════════════════════════════════════════════════════════════*/
    messages: {
      async getConversations(){
        const user = PeaklyAuth.getUser();
        if(!user) return { data: [] };
        return PeaklySupabase.from('conversations')
          .select('*, p1:participant_1(id, nom, avatar_url), p2:participant_2(id, nom, avatar_url)')
          .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
          .order('last_message_at', { ascending: false });
      },
      async getOrCreateConversation(otherUserId){
        const user = PeaklyAuth.getUser();
        if(!user) throw new Error('Non connecté');
        const p1 = user.id < otherUserId ? user.id : otherUserId;
        const p2 = user.id < otherUserId ? otherUserId : user.id;
        const { data: existing } = await PeaklySupabase.from('conversations')
          .select('id').eq('participant_1', p1).eq('participant_2', p2).single();
        if(existing) return existing.id;
        const { data: created } = await PeaklySupabase.from('conversations')
          .insert({ participant_1: p1, participant_2: p2 }).select('id').single();
        return created.id;
      },
      async getMessages(conversationId, page = 0){
        return PeaklySupabase.from('messages')
          .select('*, sender:sender_id(id, nom, avatar_url)')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: false })
          .range(page * 50, (page + 1) * 50 - 1);
      },
      async send(conversationId, contenu){
        const user = PeaklyAuth.getUser();
        if(!user) throw new Error('Non connecté');
        const { data, error } = await PeaklySupabase.from('messages')
          .insert({ conversation_id: conversationId, sender_id: user.id, contenu })
          .select().single();
        if(!error){
          await PeaklySupabase.from('conversations').update({ last_message_at: new Date() }).eq('id', conversationId);
        }
        return { data, error };
      },
      subscribeToConversation(conversationId, onMessage){
        return PeaklySupabase.channel(`conv:${conversationId}`)
          .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${conversationId}`
          }, payload => onMessage(payload.new))
          .subscribe();
      }
    },

    /* ════════════════════════════════════════════════════════════
       NOTIFICATIONS
    ═════════════════════════════════════════════════════════════*/
    notifications: {
      async list(limit = 30){
        const user = PeaklyAuth.getUser();
        if(!user) return { data: [] };
        return PeaklySupabase.from('notifications')
          .select('*, from_profile:from_profile_id(id, nom, avatar_url)')
          .eq('profile_id', user.id)
          .order('created_at', { ascending: false })
          .limit(limit);
      },
      async markRead(id){
        return PeaklySupabase.from('notifications').update({ lue: true }).eq('id', id);
      },
      async markAllRead(){
        const user = PeaklyAuth.getUser();
        return PeaklySupabase.from('notifications').update({ lue: true }).eq('profile_id', user.id);
      },
      async countUnread(){
        const user = PeaklyAuth.getUser();
        if(!user) return 0;
        const { count } = await PeaklySupabase.from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('profile_id', user.id).eq('lue', false);
        return count || 0;
      },
      subscribeToNotifications(onNotif){
        const user = PeaklyAuth.getUser();
        if(!user) return;
        return PeaklySupabase.channel(`notifs:${user.id}`)
          .on('postgres_changes', {
            event: 'INSERT', schema: 'public', table: 'notifications',
            filter: `profile_id=eq.${user.id}`
          }, payload => onNotif(payload.new))
          .subscribe();
      }
    },

    /* ════════════════════════════════════════════════════════════
       CANDIDATURES
    ═════════════════════════════════════════════════════════════*/
    candidatures: {
      async list(type = 'artiste'){
        const user = PeaklyAuth.getUser();
        if(!user) return { data: [] };
        const col = type === 'artiste' ? 'artiste_id' : 'pro_id';
        return PeaklySupabase.from('candidatures')
          .select('*, artiste:artiste_id(id, nom, avatar_url, artistes(*)), pro:pro_id(id, nom, avatar_url, professionnels(*))')
          .eq(col, user.id)
          .order('created_at', { ascending: false });
      },
      async create(proId, offreTitre, message, mediaUrl = null){
        const user = PeaklyAuth.getUser();
        if(!user) throw new Error('Non connecté');
        return PeaklySupabase.from('candidatures').insert({
          artiste_id: user.id, pro_id: proId, offre_titre: offreTitre, message, media_url: mediaUrl
        }).select().single();
      },
      async updateStatus(id, status, note = null){
        return PeaklySupabase.from('candidatures').update({ status, note_pro: note }).eq('id', id);
      }
    },

    /* ════════════════════════════════════════════════════════════
       FOLLOWS
    ═════════════════════════════════════════════════════════════*/
    social: {
      async follow(targetId){
        const user = PeaklyAuth.getUser();
        if(!user) throw new Error('Non connecté');
        return PeaklySupabase.from('follows').insert({ follower_id: user.id, following_id: targetId });
      },
      async unfollow(targetId){
        const user = PeaklyAuth.getUser();
        if(!user) throw new Error('Non connecté');
        return PeaklySupabase.from('follows').delete()
          .eq('follower_id', user.id).eq('following_id', targetId);
      },
      async isFollowing(targetId){
        const user = PeaklyAuth.getUser();
        if(!user) return false;
        const { data } = await PeaklySupabase.from('follows')
          .select('follower_id').eq('follower_id', user.id).eq('following_id', targetId).single();
        return !!data;
      },
      async getFollowers(profileId){
        return PeaklySupabase.from('follows')
          .select('follower:follower_id(id, nom, avatar_url, role)')
          .eq('following_id', profileId);
      },
      async getFollowing(profileId){
        return PeaklySupabase.from('follows')
          .select('following:following_id(id, nom, avatar_url, role)')
          .eq('follower_id', profileId);
      }
    },

    /* ════════════════════════════════════════════════════════════
       OFFRES (pour le CRM pro)
    ═════════════════════════════════════════════════════════════*/
    offres: {
      async list(filters = {}){
        let q = PeaklySupabase.from('offres')
          .select('*, pro:pro_id(id, nom, avatar_url, professionnels(nom_structure, type_structure))')
          .eq('active', true)
          .order('created_at', { ascending: false });
        if(filters.genre) q = q.eq('genre', filters.genre);
        if(filters.search) q = q.ilike('titre', `%${filters.search}%`);
        return q.limit(50);
      },
      async create(data){
        const user = PeaklyAuth.getUser();
        if(!user) throw new Error('Non connecté');
        return PeaklySupabase.from('offres').insert({ ...data, pro_id: user.id }).select().single();
      }
    },

    /* ════════════════════════════════════════════════════════════
       UPLOAD FICHIERS (Supabase Storage)
    ═════════════════════════════════════════════════════════════*/
    upload: {
      async file(file, bucket = 'media', onProgress = null){
        const user = PeaklyAuth.getUser();
        if(!user) throw new Error('Non connecté');
        const ext  = file.name.split('.').pop();
        const path = `${user.id}/${Date.now()}.${ext}`;

        const { data, error } = await PeaklySupabase.storage.from(bucket).upload(path, file, {
          cacheControl: '3600',
          upsert: false
        });
        if(error) throw error;

        const { data: urlData } = PeaklySupabase.storage.from(bucket).getPublicUrl(path);
        return urlData.publicUrl;
      }
    },

    /* ════════════════════════════════════════════════════════════
       ARTISTE — onboarding & données étendues
    ═════════════════════════════════════════════════════════════*/
    artiste: {

      async _id(){
        const user = PeaklyAuth.getUser();
        if(!user) throw new Error('Non connecté');
        const { data, error } = await PeaklySupabase.from('artistes')
          .select('id').eq('profile_id', user.id).single();
        if(error) throw error;
        return data.id;
      },

      async updateProfile(updates){
        const user = PeaklyAuth.getUser();
        if(!user) throw new Error('Non connecté');
        const { error } = await PeaklySupabase.from('artistes')
          .update(updates)
          .eq('profile_id', user.id);
        if(error) throw error;
      },

      async savePlatforms(platforms){
        const artisteId = await this._id();
        const rows = platforms.map(p => ({ ...p, artiste_id: artisteId }));
        const { error } = await PeaklySupabase.from('artist_platform_accounts')
          .upsert(rows, { onConflict: 'artiste_id,platform' });
        if(error) throw error;
      },

      async saveTracks(tracks){
        const artisteId = await this._id();
        const rows = tracks.map(t => ({ ...t, artiste_id: artisteId }));
        const { error } = await PeaklySupabase.from('artist_tracks')
          .upsert(rows, { onConflict: 'id' });
        if(error) throw error;
      },

      async getMetrics(artisteId, days = 30){
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        return PeaklySupabase.from('artist_metrics_daily')
          .select('*')
          .eq('artiste_id', artisteId)
          .gte('date', cutoff.toISOString().slice(0, 10))
          .order('date', { ascending: false });
      },

      async getPlatforms(artisteId){
        return PeaklySupabase.from('artist_platform_accounts')
          .select('*')
          .eq('artiste_id', artisteId)
          .order('followers', { ascending: false });
      },

      async getTracks(artisteId){
        return PeaklySupabase.from('artist_tracks')
          .select('*')
          .eq('artiste_id', artisteId)
          .order('prioritaire', { ascending: false })
          .order('position');
      }
    },

    /* ════════════════════════════════════════════════════════════
       PROFESSIONNEL — onboarding & données étendues
    ═════════════════════════════════════════════════════════════*/
    pro: {

      async _id(){
        const user = PeaklyAuth.getUser();
        if(!user) throw new Error('Non connecté');
        const { data, error } = await PeaklySupabase.from('professionnels')
          .select('id').eq('profile_id', user.id).single();
        if(error) throw error;
        return data.id;
      },

      async updateProfile(updates){
        const user = PeaklyAuth.getUser();
        if(!user) throw new Error('Non connecté');
        const { error } = await PeaklySupabase.from('professionnels')
          .update(updates).eq('profile_id', user.id);
        if(error) throw error;
      },

      async getById(profileId){
        return PeaklySupabase.from('profiles')
          .select('*, professionnels(*, professional_preferences(*), professional_opportunities(*), professional_contact_prefs(*), professional_trust_metrics(*))')
          .eq('id', profileId)
          .single();
      },

      async savePreferences(prefs){
        const proId = await this._id();
        const { error } = await PeaklySupabase.from('professional_preferences')
          .upsert({ ...prefs, pro_id: proId }, { onConflict: 'pro_id' });
        if(error) throw error;
      },

      async saveOpportunities(opps){
        const proId = await this._id();
        const { error } = await PeaklySupabase.from('professional_opportunities')
          .upsert({ ...opps, pro_id: proId }, { onConflict: 'pro_id' });
        if(error) throw error;
      },

      async saveContactPrefs(prefs){
        const proId = await this._id();
        const { error } = await PeaklySupabase.from('professional_contact_prefs')
          .upsert({ ...prefs, pro_id: proId }, { onConflict: 'pro_id' });
        if(error) throw error;
      },

      async getTrustMetrics(proId){
        return PeaklySupabase.from('professional_trust_metrics')
          .select('*').eq('pro_id', proId).single();
      },

      async search({ verified = false } = {}){
        let q = PeaklySupabase.from('profiles')
          .select('*, professionnels(*, professional_preferences(*), professional_opportunities(*), professional_trust_metrics(*))')
          .eq('role', 'professionnel')
          .eq('professionnels.visible_public', true);
        if(verified) q = q.not('professionnels.verification_level', 'eq', 'declare');
        return q.order('created_at', { ascending: false }).limit(40);
      }
    },

    /* ════════════════════════════════════════════════════════════
       RECHERCHE
    ═════════════════════════════════════════════════════════════*/
    search: {
      async artists(query, filters = {}){
        let q = PeaklySupabase.from('profiles')
          .select('*, artistes(nom_artiste, genre_principal, peakly_score, streams_total)')
          .eq('role', 'artiste')
          .ilike('nom', `%${query}%`);
        if(filters.genre) q = q.eq('artistes.genre_principal', filters.genre);
        if(filters.minScore) q = q.gte('artistes.peakly_score', filters.minScore);
        return q.order('artistes(peakly_score)', { ascending: false }).limit(30);
      },
      async pros(query){
        return PeaklySupabase.from('profiles')
          .select('*, professionnels(nom_structure, type_structure)')
          .eq('role', 'professionnel')
          .ilike('nom', `%${query}%`)
          .limit(20);
      }
    }

  };

  global.PeaklyAPI = PeaklyAPI;

})(window);
