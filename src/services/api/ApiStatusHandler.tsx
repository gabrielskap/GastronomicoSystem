import React from 'react';
import { Loader2, AlertTriangle, Inbox, RotateCw } from 'lucide-react';

interface ApiStatusHandlerProps {
  loading: boolean;
  error: string | null;
  isEmpty: boolean;
  emptyMessage?: string;
  errorMessage?: string;
  onRetry?: () => void;
  children: React.ReactNode;
}

/**
 * Componente unificado para tratamento visual de API:
 * - Tela de Loading com animação suave
 * - Tela de Erro descritiva com botão para tentar novamente
 * - Tela de Lista Vazia ilustrada com Lucide Icons
 * - Renderização dos filhos em caso de sucesso
 */
export const ApiStatusHandler: React.FC<ApiStatusHandlerProps> = ({
  loading,
  error,
  isEmpty,
  emptyMessage = 'Nenhum registro encontrado.',
  errorMessage = 'Problema ao se comunicar com o servidor.',
  onRetry,
  children,
}) => {
  // 1. ESTADO DE LOADING
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center min-h-[250px] animate-pulse">
        <Loader2 className="h-10 w-10 text-red-500 animate-spin mb-4" />
        <p className="text-zinc-500 text-sm font-medium">Buscando informações em tempo real...</p>
        <span className="text-zinc-400 text-xs mt-1">Sincronizando com Supabase</span>
      </div>
    );
  }

  // 2. ESTADO DE ERRO
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-10 bg-red-50 border border-red-100 rounded-xl text-center min-h-[200px] my-4 mx-2">
        <AlertTriangle className="h-10 w-10 text-red-600 mb-3" />
        <h4 className="text-red-900 font-semibold text-base mb-1">Algo deu errado</h4>
        <p className="text-red-700 text-sm max-w-md mb-4 leading-relaxed">
          {error || errorMessage}
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg text-sm transition-colors shadow-sm cursor-pointer"
          >
            <RotateCw className="h-4 w-4" />
            Tentar Novamente
          </button>
        )}
      </div>
    );
  }

  // 3. ESTADO DE LISTA VAZIA
  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-zinc-200 rounded-xl min-h-[220px] bg-zinc-50/50 my-2">
        <Inbox className="h-12 w-12 text-zinc-300 mb-3" />
        <p className="text-zinc-600 text-sm font-medium mb-1">{emptyMessage}</p>
        <p className="text-zinc-400 text-xs max-w-xs">
          Não há itens disponíveis no momento. Verifique as configurações do Painel Administrativo.
        </p>
      </div>
    );
  }

  // 4. SUCESSO
  return <>{children}</>;
};
