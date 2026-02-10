
import React, { useState } from 'react';
import { UserRole, User } from '../types';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.ADMIN);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulación de autenticación
    const mockUser: User = {
      id: 'usr-' + Math.random().toString(36).substr(2, 5),
      name: email.split('@')[0] || 'Usuario Clínico',
      role: role,
      email: email
    };
    onLogin(mockUser);
  };

  return (
    <div className="fixed inset-0 bg-slate-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-600/20 blur-[120px] rounded-full"></div>
      </div>

      <div className="bg-white/80 backdrop-blur-xl p-10 rounded-[32px] w-full max-w-md shadow-2xl border border-white/20 relative z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-3xl mb-4 shadow-xl shadow-blue-200">
            <i className="fa-solid fa-staff-snake"></i>
          </div>
          <h1 className="text-2xl font-black text-slate-800">Acceso Clínico</h1>
          <p className="text-slate-500 font-medium">Unidad de Pie Diabético</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1 tracking-wider">Email Institucional</label>
            <input 
              required
              type="email" 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              placeholder="nombre@hospital.cl"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1 tracking-wider">Contraseña</label>
            <input 
              required
              type="password" 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1 tracking-wider">Rol de Acceso</label>
            <select 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              value={role}
              onChange={e => setRole(e.target.value as UserRole)}
            >
              {Object.values(UserRole).map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          
          <button 
            type="submit"
            className="w-full bg-slate-900 text-white font-black py-4 rounded-xl shadow-lg hover:bg-slate-800 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            INGRESAR AL SISTEMA
            <i className="fa-solid fa-arrow-right text-sm"></i>
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Sistema de Gestión de Heridas Complejas v2.0</p>
        </div>
      </div>
    </div>
  );
};

export default Login;