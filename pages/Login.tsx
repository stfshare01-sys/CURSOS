
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../services/store';
import { Role } from '../types';
import { Button } from '../components/Button';
import { Layout as LayoutIcon, User, ShieldCheck } from 'lucide-react';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState<Role | null>(null);

  const handleLogin = async (role: Role) => {
    setLoading(role);
    await login(role);
    if (role === Role.ADMIN) {
      navigate('/admin/dashboard');
    } else {
      navigate('/student/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white max-w-md w-full rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-indigo-600 p-8 text-center">
          <div className="mx-auto bg-white/20 w-16 h-16 rounded-xl flex items-center justify-center mb-4">
             <LayoutIcon className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">STUFFACTORY</h1>
          <p className="text-indigo-100">Plataforma de Capacitación Corporativa</p>
        </div>
        
        <div className="p-8">
          <p className="text-center text-slate-600 mb-8">Selecciona un rol para simular el inicio de sesión:</p>
          
          <div className="space-y-4">
            <button
              onClick={() => handleLogin(Role.ADMIN)}
              disabled={!!loading}
              className="w-full group relative flex items-center p-4 border-2 border-slate-200 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 transition-all text-left"
            >
              <div className="bg-indigo-100 p-3 rounded-lg mr-4 group-hover:bg-indigo-200 transition-colors">
                <ShieldCheck className="w-6 h-6 text-indigo-700" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-slate-900">Administrador</div>
                <div className="text-sm text-slate-500">Gestionar cursos y seguimiento</div>
              </div>
              {loading === Role.ADMIN && <div className="absolute right-4"><div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>}
            </button>

            <button
              onClick={() => handleLogin(Role.EMPLOYEE)}
              disabled={!!loading}
              className="w-full group relative flex items-center p-4 border-2 border-slate-200 rounded-xl hover:border-emerald-500 hover:bg-emerald-50 transition-all text-left"
            >
              <div className="bg-emerald-100 p-3 rounded-lg mr-4 group-hover:bg-emerald-200 transition-colors">
                <User className="w-6 h-6 text-emerald-700" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-slate-900">Empleado</div>
                <div className="text-sm text-slate-500">Tomar cursos y obtener certificados</div>
              </div>
              {loading === Role.EMPLOYEE && <div className="absolute right-4"><div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div></div>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
