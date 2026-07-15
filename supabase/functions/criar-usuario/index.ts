// Supabase Edge Function: criar-usuario
// Cria um usuário no Supabase Auth (service role) + perfil em Gastronomico_usuarios
// + permissões em Gastronomico_usuario_permissoes.
//
// Deploy:  supabase functions deploy criar-usuario
// Requer as envs padrão do projeto: SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.
//
// OBS de segurança: idealmente valide que o CHAMADOR tem a permissão "usuarios"
// (decodifique o JWT em Authorization e cheque o perfil) antes de criar.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const {
      email, senha, nome, cargo, restauranteId, unidadeId, cpf, telefone, permissoes,
    } = await req.json();

    if (!email || !senha || !nome || !restauranteId) {
      return new Response(JSON.stringify({ error: 'Campos obrigatórios ausentes.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // 1) Cria a credencial no Auth
    const { data: created, error: authError } = await admin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
    });
    if (authError || !created.user) {
      return new Response(JSON.stringify({ error: authError?.message || 'Falha ao criar credencial.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = created.user.id;

    // 2) Cria o perfil
    const { error: perfilError } = await admin.from('Gastronomico_usuarios').insert({
      id: userId,
      restaurante_id: restauranteId,
      unidade_id: unidadeId ?? null,
      nome,
      cargo: cargo || 'Colaborador',
      cpf: cpf || null,
      telefone: telefone || null,
      ativo: true,
    });
    if (perfilError) {
      // rollback da credencial em caso de falha do perfil
      await admin.auth.admin.deleteUser(userId);
      return new Response(JSON.stringify({ error: perfilError.message }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3) Permissões
    if (permissoes && typeof permissoes === 'object') {
      const { data: modulos } = await admin.from('Gastronomico_modulos').select('id, chave');
      const idPorChave = new Map<string, string>();
      (modulos || []).forEach((m: any) => idPorChave.set(m.chave, m.id));

      const rows = Object.entries(permissoes)
        .filter(([chave]) => idPorChave.has(chave))
        .map(([chave, permitido]) => ({
          usuario_id: userId,
          modulo_id: idPorChave.get(chave),
          permitido: !!permitido,
        }));

      if (rows.length > 0) {
        await admin.from('Gastronomico_usuario_permissoes').upsert(rows, { onConflict: 'usuario_id,modulo_id' });
      }
    }

    return new Response(JSON.stringify({ id: userId }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
