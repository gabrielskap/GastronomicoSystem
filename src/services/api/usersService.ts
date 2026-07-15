import { supabase } from '../supabase';
import { TB } from './tables';
import { DbUsuario, DbModulo, DbPermissao } from './types';

/**
 * Catálogo global de módulos permissionáveis.
 */
export async function fetchModulos(): Promise<DbModulo[]> {
  const { data, error } = await supabase.from(TB.modulos).select('*').order('nome');
  if (error) {
    console.error('Supabase: erro ao buscar módulos:', error);
    return [];
  }
  return (data || []) as DbModulo[];
}

/**
 * Lista os colaboradores de uma marca já com o mapa de permissões (por chave).
 */
export async function fetchUsuariosComPermissoes(
  restauranteId: string
): Promise<{ usuario: DbUsuario; permissoes: Record<string, boolean> }[]> {
  if (!restauranteId) return [];

  const [{ data: usuarios }, { data: modulos }] = await Promise.all([
    supabase.from(TB.usuarios).select('*').eq('restaurante_id', restauranteId).order('nome'),
    supabase.from(TB.modulos).select('id, chave'),
  ]);

  const chavePorId = new Map<string, string>();
  (modulos || []).forEach((m: any) => chavePorId.set(m.id, m.chave));

  const usuariosList = (usuarios || []) as DbUsuario[];
  if (usuariosList.length === 0) return [];

  const { data: permissoesData } = await supabase
    .from(TB.permissoes)
    .select('*')
    .in('usuario_id', usuariosList.map((u) => u.id));
  const permissoes = (permissoesData || []) as DbPermissao[];

  const porUsuario = new Map<string, Record<string, boolean>>();
  permissoes.forEach((p) => {
    const chave = chavePorId.get(p.modulo_id);
    if (!chave) return;
    const map = porUsuario.get(p.usuario_id) || {};
    map[chave] = !!p.permitido;
    porUsuario.set(p.usuario_id, map);
  });

  return usuariosList.map((usuario) => ({
    usuario,
    permissoes: porUsuario.get(usuario.id) || {},
  }));
}

/**
 * Atualiza campos do perfil de um colaborador.
 */
export async function atualizarUsuario(id: string, updates: Partial<DbUsuario>): Promise<boolean> {
  const { error } = await supabase.from(TB.usuarios).update(updates).eq('id', id);
  if (error) {
    console.error('Supabase: erro ao atualizar usuário:', error);
    return false;
  }
  return true;
}

/**
 * Salva o mapa de permissões (por chave) de um colaborador.
 */
export async function salvarPermissoes(
  usuarioId: string,
  permissoesPorChave: Record<string, boolean>,
  modulos: DbModulo[]
): Promise<boolean> {
  const idPorChave = new Map<string, string>();
  modulos.forEach((m) => idPorChave.set(m.chave, m.id));

  const rows = Object.entries(permissoesPorChave)
    .filter(([chave]) => idPorChave.has(chave))
    .map(([chave, permitido]) => ({
      usuario_id: usuarioId,
      modulo_id: idPorChave.get(chave)!,
      permitido,
    }));

  if (rows.length === 0) return true;

  const { error } = await supabase
    .from(TB.permissoes)
    .upsert(rows, { onConflict: 'usuario_id,modulo_id' });
  if (error) {
    console.error('Supabase: erro ao salvar permissões:', error);
    return false;
  }
  return true;
}

/**
 * Cria um novo colaborador (usuário Auth + perfil). Requer a Edge Function
 * "criar-usuario" (service role), pois criar em auth.users não é possível com a
 * anon key no navegador.
 */
export async function criarUsuarioEquipe(payload: {
  email: string;
  senha: string;
  nome: string;
  cargo: string;
  restauranteId: string;
  unidadeId?: string | null;
  cpf?: string;
  telefone?: string;
  permissoes?: Record<string, boolean>;
}): Promise<{ error: string | null }> {
  const { error } = await supabase.functions.invoke('criar-usuario', { body: payload });
  return { error: error ? error.message : null };
}
