
import React from 'react';
import { UserRole } from '../types';

interface RoleSelectorProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
}

const RoleSelector: React.FC<RoleSelectorProps> = ({ currentRole, onRoleChange }) => {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-bold text-slate-500 uppercase">Simular Rol:</label>
      <select 
        value={currentRole}
        onChange={(e) => onRoleChange(e.target.value as UserRole)}
        className="text-sm bg-white border border-slate-200 rounded p-1 shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        {Object.values(UserRole).map(role => (
          <option key={role} value={role}>{role}</option>
        ))}
      </select>
    </div>
  );
};

export default RoleSelector;
