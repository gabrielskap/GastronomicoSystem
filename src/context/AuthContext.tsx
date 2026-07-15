/**
 * Autenticação da equipe via Supabase Auth.
 * Expõe a sessão, o perfil (Gastronomico_usuarios) e as permissões por módulo.
 */
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';
import { TB } from '../services/api/tables';
import { DbUsuario } from '../services/api/types';

interface AuthContextType {
  session: Session | null;
  loading: boolean;
  profile: DbUsuario | null;
  permissoes: Record<string, boolean>;
  restauranteId: string | null;
  unidadeId: string | null;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  hasPermission: (chave: string) => boolean;
  reloadProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function loadPermissoes(usuarioId: string): Promise<Record<string, boolean>> {
  const [{ data: modulos }, { data: permissoes }] = await Promise.all([
    supabase.from(TB.modulos).select('id, chave'),
    supabase.from(TB.permissoes).select('modulo_id, permitido').eq('usuario_id', usuarioId),
  ]);

  const chavePorId = new Map<string, string>();
  (modulos || []).forEach((m: any) => chavePorId.set(m.id, m.chave));

  const map: Record<string, boolean> = {};
  (permissoes || []).forEach((p: any) => {
    const chave = chavePorId.get(p.modulo_id);
    if (chave) map[chave] = !!p.permitido;
  });
  return map;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<DbUsuario | null>(null);
  const [permissoes, setPermissoes] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState<boolean>(true);

  const hydrate = useCallback(async (sess: Session | null) => {
    if (!sess?.user) {
      setProfile(null);
      setPermissoes({});
      return;
    }
    try {
      const { data: perfil } = await supabase
        .from(TB.usuarios)
        .select('*')
        .eq('id', sess.user.id)
        .maybeSingle<DbUsuario>();
      setProfile(perfil ?? null);
      if (perfil) {
        setPermissoes(await loadPermissoes(perfil.id));
      } else {
        setPermissoes({});
      }
    } catch (err) {
      console.error('Auth: erro ao carregar perfil/permissões:', err);
      setProfile(null);
      setPermissoes({});
    }
  }, []);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      await hydrate(data.session);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, sess) => {
      setSession(sess);
      await hydrate(sess);
      setLoading(false);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [hydrate]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? error.message : null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setPermissoes({});
  }, []);

  const reloadProfile = useCallback(async () => {
    await hydrate(session);
  }, [hydrate, session]);

  const hasPermission = useCallback(
    (chave: string) => permissoes[chave] === true,
    [permissoes]
  );

  return (
    <AuthContext.Provider
      value={{
        session,
        loading,
        profile,
        permissoes,
        restauranteId: profile?.restaurante_id ?? null,
        unidadeId: profile?.unidade_id ?? null,
        signIn,
        signOut,
        hasPermission,
        reloadProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
};
