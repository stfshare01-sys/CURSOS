

import React, { useEffect, useState } from 'react';
import { getGlobalStats, getReportedIssues } from '../../services/store';
import { AuditLog } from '../../types';
import { Users, BookOpen, CheckCircle, Activity, ArrowUpRight, ShieldAlert, AlertTriangle } from 'lucide-react';

export const OverviewDashboard: React.FC = () => {
    const [stats, setStats] = useState<{
        totalUsers: number;
        activeCourses: number;
        completionRate: number;
        recentActivity: AuditLog[];
    } | null>(null);
    const [reports, setReports] = useState<AuditLog[]>([]);

    useEffect(() => {
        getGlobalStats().then(setStats);
        getReportedIssues().then(setReports);
    }, []);

    if (!stats) return <div className="p-12 text-center">Cargando panel...</div>;

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Panel Principal</h1>
                    <p className="text-slate-500">Visión general del estado de la plataforma.</p>
                </div>
                <div className="text-xs text-slate-400">
                    Última actualización: {new Date().toLocaleTimeString()}
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                    <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Users className="w-24 h-24 text-indigo-600" />
                    </div>
                    <div className="relative z-10">
                        <div className="text-sm font-bold text-slate-500 uppercase mb-1">Empleados Activos</div>
                        <div className="text-4xl font-black text-slate-900">{stats.totalUsers}</div>
                        <div className="mt-2 text-xs text-green-600 font-bold flex items-center">
                            <ArrowUpRight className="w-3 h-3 mr-1" />
                            Plataforma operativa
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                    <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <BookOpen className="w-24 h-24 text-blue-600" />
                    </div>
                    <div className="relative z-10">
                        <div className="text-sm font-bold text-slate-500 uppercase mb-1">Cursos Publicados</div>
                        <div className="text-4xl font-black text-slate-900">{stats.activeCourses}</div>
                        <div className="mt-2 text-xs text-blue-600 font-bold flex items-center">
                            Disponibles en catálogo
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                    <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <CheckCircle className="w-24 h-24 text-green-600" />
                    </div>
                    <div className="relative z-10">
                        <div className="text-sm font-bold text-slate-500 uppercase mb-1">Tasa de Cumplimiento</div>
                        <div className="text-4xl font-black text-slate-900">{stats.completionRate}%</div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3">
                            <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${stats.completionRate}%` }}></div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
                {/* Reports Widget */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-96">
                    <div className="p-5 border-b border-slate-100 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-orange-500" />
                        <h3 className="font-bold text-slate-900">Problemas Reportados</h3>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {reports.length === 0 ? (
                            <div className="p-8 text-center text-slate-400 text-sm">No hay reportes activos.</div>
                        ) : (
                            <div className="divide-y divide-slate-50">
                                {reports.map(rep => (
                                    <div key={rep.id} className="p-4 hover:bg-orange-50/50 transition-colors">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="text-xs font-bold text-orange-800 bg-orange-100 px-2 py-0.5 rounded">Nuevo</span>
                                            <span className="text-xs text-slate-400">{new Date(rep.timestamp).toLocaleDateString()}</span>
                                        </div>
                                        <p className="text-sm text-slate-800 mt-1">{rep.details}</p>
                                        <p className="text-xs text-slate-500 mt-1">Por: {rep.userName}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Activity Feed */}
                <div className="md:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-96">
                    <div className="p-5 border-b border-slate-100 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-indigo-600" />
                        <h3 className="font-bold text-slate-900">Actividad Reciente</h3>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {stats.recentActivity.length === 0 ? (
                            <div className="p-8 text-center text-slate-400 text-sm">Sin actividad registrada.</div>
                        ) : (
                            <div className="divide-y divide-slate-50">
                                {stats.recentActivity.map(log => (
                                    <div key={log.id} className="p-4 flex items-start gap-4 hover:bg-slate-50 transition-colors">
                                        <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${
                                            log.action.includes('DELETE') ? 'bg-red-500' : 
                                            log.action.includes('CREATE') ? 'bg-green-500' : 'bg-blue-500'
                                        }`} />
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start">
                                                <span className="text-sm font-bold text-slate-800">{log.action}</span>
                                                <span className="text-xs text-slate-400">{new Date(log.timestamp).toLocaleTimeString()}</span>
                                            </div>
                                            <p className="text-xs text-slate-600 mt-0.5">
                                                <span className="font-semibold text-slate-900">{log.userName}</span> - {log.details}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
