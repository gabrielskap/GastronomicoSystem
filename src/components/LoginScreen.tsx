/**
 * Tela de login da equipe (Supabase Auth). Exibida quando um painel
 * administrativo/operacional é acessado sem sessão ativa.
 */
import React, { useState } from 'react';
import { LogIn, Loader2, AlertTriangle, LockKeyhole } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface LoginScreenProps {
  painel?: string;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ painel }) => {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error: err } = await signIn(email.trim(), password);
    setSubmitting(false);
    if (err) {
      setError(
        err.toLowerCase().includes('invalid')
          ? 'E-mail ou senha inválidos.'
          : err
      );
    }
  };

  return (
    <div className="min-h-[80vh] w-full flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-neutral-200 p-8">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-red-600 text-white flex items-center justify-center mb-3 shadow-lg">
            <LockKeyhole className="w-7 h-7" />
          </div>
          <h1 className="text-lg font-black text-neutral-900 tracking-tight">Acesso da Equipe</h1>
          <p className="text-xs text-neutral-500 mt-1">
            {painel ? `Faça login para acessar o painel ${painel}.` : 'Faça login para continuar.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-neutral-600 mb-1">E-mail</label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="voce@restaurante.com"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-600 mb-1">Senha</label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-xs text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-bold text-sm py-2.5 rounded-lg transition-colors shadow-sm cursor-pointer"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
            {submitting ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
};
