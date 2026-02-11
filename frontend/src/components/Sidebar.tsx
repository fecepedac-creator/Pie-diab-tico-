
import React from 'react';
import { UserRole } from '../types';

interface SidebarProps {
  currentView: string;
  setView: (view: any) => void;
  role: UserRole;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, setView, role, onLogout }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'fa-chart-line' },
    { id: 'patients', label: 'Pacientes', icon: 'fa-user-injured' },
    { id: 'alerts', label: 'Alertas', icon: 'fa-bell', badge: true },
  ];

  return (
    <nav className="w-20 md:w-64 bg-slate-900 text-slate-400 flex flex-col transition-all duration-300">
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center text-white">
          <i className="fa-solid fa-staff-snake"></i>
        </div>
        <span className="hidden md:block font-bold text-white text-lg">P. Pie Diabético</span>
      </div>

      <div className="flex-1 mt-6">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setView(item.id)}
            className={`w-full flex items-center gap-4 px-6 py-4 transition-colors ${
              currentView === item.id ? 'bg-slate-800 text-white border-r-4 border-blue-500' : 'hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <i className={`fa-solid ${item.icon} w-5 text-lg`}></i>
            <span className="hidden md:block font-medium">{item.label}</span>
          </button>
        ))}
      </div>

      <div className="p-6 border-t border-slate-800">
        <div className="hidden md:block mb-4">
          <p className="text-xs uppercase tracking-wider font-bold mb-1">Sesión Activa</p>
          <p className="text-sm text-blue-400 font-medium truncate">{role}</p>
        </div>
        <button 
          onClick={onLogout}
          className="flex items-center gap-4 w-full hover:text-rose-400 transition-colors"
        >
          <i className="fa-solid fa-right-from-bracket w-5"></i>
          <span className="hidden md:block font-medium">Cerrar Sesión</span>
        </button>
      </div>
    </nav>
  );
};

export default Sidebar;