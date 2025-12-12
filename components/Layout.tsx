

import React, { useState, useEffect, useRef } from 'react';
import { User, Role, AppNotification } from '../types';
import { LogOut, BookOpen, Users, Layout as LayoutIcon, UserPlus, Briefcase, Compass, Activity, Mic2, Home, Bell, Check, X, Map } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { logout, getNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '../services/store';

interface LayoutProps {
  user: User;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ user, children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
      const interval = setInterval(() => {
          setNotifications(getNotifications(user.id));
      }, 5000);
      setNotifications(getNotifications(user.id));
      return () => clearInterval(interval);
  }, [user.id]);

  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
              setShowNotifDropdown(false);
          }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  const handleMarkRead = (id: string) => {
      markNotificationAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const handleMarkAllRead = () => {
      markAllNotificationsAsRead(user.id);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const isActive = (path: string) => location.pathname === path;
  const navItemClass = (active: boolean) => 
    `flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
      active ? 'bg-indigo-100 text-indigo-700 font-medium' : 'text-slate-600 hover:bg-slate-100'
    }`;

  const getRoleName = (role: Role) => role === Role.ADMIN ? 'ADMINISTRADOR' : 'EMPLEADO';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate(user.role === Role.ADMIN ? '/admin/dashboard' : '/student/dashboard')}>
            <div className="bg-indigo-600 p-2 rounded-lg">
              <LayoutIcon className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900 tracking-tight">STUFFACTORY</span>
          </div>
          
          <div className="flex items-center space-x-6">
            
            {/* Notifications */}
            <div className="relative" ref={dropdownRef}>
                <button 
                    className="p-2 text-slate-500 hover:text-indigo-600 rounded-full hover:bg-slate-50 transition-colors relative"
                    onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                >
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                        <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                    )}
                </button>

                {showNotifDropdown && (
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-50 animate-fade-in-up">
                        <div className="p-3 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <span className="text-xs font-bold text-slate-500 uppercase">Notificaciones</span>
                            {unreadCount > 0 && (
                                <button onClick={handleMarkAllRead} className="text-xs text-indigo-600 hover:text-indigo-800">
                                    Marcar leídas
                                </button>
                            )}
                        </div>
                        <div className="max-h-80 overflow-y-auto">
                            {notifications.length === 0 ? (
                                <div className="p-8 text-center text-slate-400 text-xs italic">
                                    No tienes notificaciones.
                                </div>
                            ) : (
                                notifications.map(n => (
                                    <div key={n.id} className={`p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors flex gap-3 ${n.read ? 'opacity-60' : 'bg-indigo-50/30'}`}>
                                        <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${n.read ? 'bg-slate-300' : 'bg-indigo-500'}`} />
                                        <div className="flex-1">
                                            <h4 className="text-sm font-bold text-slate-800">{n.title}</h4>
                                            <p className="text-xs text-slate-600 mt-1">{n.message}</p>
                                            <span className="text-[10px] text-slate-400 mt-2 block">{new Date(n.createdAt).toLocaleTimeString()}</span>
                                        </div>
                                        {!n.read && (
                                            <button onClick={() => handleMarkRead(n.id)} className="text-slate-400 hover:text-indigo-600 h-fit">
                                                <Check className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div className="hidden md:flex flex-col items-end border-l border-slate-200 pl-6">
              <span className="text-sm font-medium text-slate-900">{user.name}</span>
              <span className="text-xs text-slate-500 uppercase tracking-wide">{getRoleName(user.role)}</span>
            </div>
            
            <button 
              onClick={handleLogout}
              className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
              title="Cerrar sesión"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex gap-8">
        {/* Sidebar Nav */}
        <aside className="w-64 hidden md:block shrink-0">
          <nav className="space-y-2 sticky top-24">
            {user.role === Role.ADMIN ? (
              <>
                <div className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Resumen
                </div>
                <button 
                  onClick={() => navigate('/admin/dashboard')}
                  className={`w-full ${navItemClass(isActive('/admin/dashboard'))}`}
                >
                  <Home className="w-5 h-5" />
                  <span>Panel Principal</span>
                </button>

                <div className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 mt-6">
                  Contenido
                </div>
                <button 
                  onClick={() => navigate('/admin/courses')}
                  className={`w-full ${navItemClass(isActive('/admin/courses') || isActive('/admin/course'))}`}
                >
                  <BookOpen className="w-5 h-5" />
                  <span>Gestión de Cursos</span>
                </button>
                <button 
                  onClick={() => navigate('/admin/paths')}
                  className={`w-full ${navItemClass(isActive('/admin/paths'))}`}
                >
                  <Map className="w-5 h-5" />
                  <span>Carreras (Paths)</span>
                </button>
                <button 
                  onClick={() => navigate('/admin/scenarios')}
                  className={`w-full ${navItemClass(isActive('/admin/scenarios'))}`}
                >
                  <Mic2 className="w-5 h-5" />
                  <span>Simuladores IA</span>
                </button>
                
                <div className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 mt-6">
                  Organización
                </div>
                <button 
                  onClick={() => navigate('/admin/users')}
                  className={`w-full ${navItemClass(isActive('/admin/users'))}`}
                >
                  <UserPlus className="w-5 h-5" />
                  <span>Gestión de Usuarios</span>
                </button>
                <button 
                  onClick={() => navigate('/admin/departments')}
                  className={`w-full ${navItemClass(isActive('/admin/departments'))}`}
                >
                  <Briefcase className="w-5 h-5" />
                  <span>Departamentos</span>
                </button>

                <div className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 mt-6">
                  Reportes
                </div>
                <button 
                  onClick={() => navigate('/admin/tracking')}
                  className={`w-full ${navItemClass(isActive('/admin/tracking'))}`}
                >
                  <Users className="w-5 h-5" />
                  <span>Seguimiento</span>
                </button>
              </>
            ) : (
              <>
                <div className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Aprendizaje
                </div>
                <button 
                  onClick={() => navigate('/student/dashboard')}
                  className={`w-full ${navItemClass(isActive('/student/dashboard'))}`}
                >
                  <BookOpen className="w-5 h-5" />
                  <span>Mis Cursos</span>
                </button>
                <button 
                  onClick={() => navigate('/student/catalog')}
                  className={`w-full ${navItemClass(isActive('/student/catalog'))}`}
                >
                  <Compass className="w-5 h-5" />
                  <span>Catálogo</span>
                </button>
                
                <div className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 mt-6">
                  Práctica (Beta)
                </div>
                <button 
                  onClick={() => navigate('/student/live')}
                  className={`w-full ${navItemClass(isActive('/student/live'))}`}
                >
                  <Activity className="w-5 h-5" />
                  <span>Simulador de Roles</span>
                </button>
              </>
            )}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
};
