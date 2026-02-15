import React, { useState } from 'react';
import { UserRole } from '../types';

interface LoginViewProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (email: string, password: string, role: UserRole) => Promise<void>;
}

const LoginView: React.FC<LoginViewProps> = ({ onLogin, onRegister }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.DOCTOR);
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (isRegister) {
        await onRegister(email, password, role);
        await onLogin(email, password);
      } else {
        await onLogin(email, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de autenticación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <form onSubmit={submit} className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4">
        <h1 className="text-2xl font-bold text-slate-800">Pie Diabético · Acceso Seguro</h1>
        <p className="text-sm text-slate-500">Autenticación con roles para entorno multiusuario.</p>
        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1">Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required className="w-full border rounded-lg p-2" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1">Contraseña</label>
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required className="w-full border rounded-lg p-2" />
        </div>
        {isRegister && (
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Rol clínico</label>
            <select value={role} onChange={(e) => setRole(e.target.value as UserRole)} className="w-full border rounded-lg p-2">
              {Object.values(UserRole).map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        )}
        {error && <p className="text-sm text-rose-600 font-semibold">{error}</p>}
        <button disabled={loading} className="w-full bg-blue-600 text-white rounded-lg py-2 font-bold disabled:opacity-50">
          {loading ? 'Procesando...' : isRegister ? 'Crear usuario' : 'Ingresar'}
        </button>
        <button type="button" onClick={() => setIsRegister(!isRegister)} className="w-full text-sm text-slate-500 hover:text-slate-700">
          {isRegister ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate'}
        </button>
      </form>
    </div>
  );
};

export default LoginView;
