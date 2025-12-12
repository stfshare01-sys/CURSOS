

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Course, CourseStatus, AuditLog } from '../../types';
import { getCourses, deleteCourse, getCourseAverageRating, getAuditLogs } from '../../services/store';
import { Button } from '../../components/Button';
import { Plus, Edit2, Trash2, FileText, Youtube, Search, Eye, Star, BarChart2, Activity, X } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | CourseStatus>('ALL');
  const [ratings, setRatings] = useState<Record<string, { avg: number, count: number }>>({});
  
  // Audit Log State
  const [showAuditLogs, setShowAuditLogs] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  const navigate = useNavigate();

  useEffect(() => {
    loadCourses();
  }, []);

  useEffect(() => {
    let result = courses;

    // Search Filter
    if (searchTerm.trim()) {
      const lowerTerm = searchTerm.toLowerCase();
      result = result.filter(c => 
        c.title.toLowerCase().includes(lowerTerm) || 
        c.description.toLowerCase().includes(lowerTerm)
      );
    }

    // Status Filter
    if (filterStatus !== 'ALL') {
      result = result.filter(c => c.status === filterStatus);
    }

    setFilteredCourses(result);
  }, [searchTerm, filterStatus, courses]);

  const loadCourses = async () => {
    setLoading(true);
    const data = await getCourses();
    setCourses(data);
    setFilteredCourses(data);
    
    // Load Ratings
    const ratingMap: Record<string, any> = {};
    for (const c of data) {
        ratingMap[c.id] = await getCourseAverageRating(c.id);
    }
    setRatings(ratingMap);
    
    setLoading(false);
  };

  const handleOpenAuditLogs = async () => {
      const logs = await getAuditLogs();
      setAuditLogs(logs);
      setShowAuditLogs(true);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm("¿CONFIRMAR ELIMINACIÓN?\n\nEsta acción eliminará permanentemente el curso y todo el progreso asociado de los empleados.\n\n¿Estás seguro?")) {
      setLoading(true);
      await deleteCourse(id);
      await loadCourses();
      setLoading(false);
    }
  };

  const getStatusColor = (status: CourseStatus) => {
    switch (status) {
        case 'PUBLISHED': return 'bg-green-100 text-green-700 border-green-200';
        case 'ARCHIVED': return 'bg-orange-100 text-orange-700 border-orange-200';
        default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const getStatusLabel = (status: CourseStatus) => {
    switch (status) {
        case 'PUBLISHED': return 'PUBLICADO';
        case 'ARCHIVED': return 'ARCHIVADO';
        default: return 'BORRADOR';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestión de Cursos</h1>
          <p className="text-slate-500">Administra el contenido y el estado de publicación.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                    type="text" 
                    placeholder="Buscar curso..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 pr-4 py-2 bg-white text-slate-900 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 w-full sm:w-64"
                />
            </div>
            
            <select 
              className="px-4 py-2 bg-white text-slate-900 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
            >
              <option value="ALL">Todos los Estados</option>
              <option value="PUBLISHED">Publicados</option>
              <option value="DRAFT">Borradores</option>
              <option value="ARCHIVED">Archivados</option>
            </select>

            <Button variant="secondary" onClick={handleOpenAuditLogs} title="Ver Registro de Actividad">
                <Activity className="w-4 h-4" />
            </Button>

            <Button onClick={() => navigate('/admin/course/new')}>
              <Plus className="w-4 h-4 mr-2" />
              Nuevo
            </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4"></div>
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="bg-white rounded-lg border-2 border-dashed border-slate-300 p-12 text-center">
          <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-slate-900">No se encontraron cursos</h3>
          <p className="text-slate-500 mb-6">Ajusta los filtros o crea un nuevo curso.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredCourses.map(course => {
            const ratingData = ratings[course.id] || { avg: 0, count: 0 };
            return (
            <div key={course.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col group relative">
              
              <div className="p-5 flex-1 cursor-pointer" onClick={() => navigate(`/admin/course/${course.id}`)}>
                <div className="flex justify-between items-start mb-3">
                  {course.chapters.some(c => c.videoUrl) ? 
                    <div className="p-2 bg-red-50 rounded-lg"><Youtube className="w-5 h-5 text-red-500" /></div> : 
                    <div className="p-2 bg-indigo-50 rounded-lg"><FileText className="w-5 h-5 text-indigo-500" /></div>
                  }
                  <div className="flex gap-2">
                    {ratingData.count > 0 && (
                        <span className="px-2 py-1 rounded-full text-xs font-bold border bg-yellow-50 text-yellow-700 border-yellow-200 flex items-center">
                            <Star className="w-3 h-3 mr-1 fill-current" /> {ratingData.avg}
                        </span>
                    )}
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusColor(course.status)}`}>
                        {getStatusLabel(course.status)}
                    </span>
                  </div>
                </div>
                
                <h3 className="text-lg font-bold text-slate-900 mb-2 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                  {course.title}
                </h3>
                <p className="text-slate-500 text-sm line-clamp-2 mb-4 h-10">
                  {course.description || 'Sin descripción...'}
                </p>
                
                <div className="text-xs text-slate-400 border-t border-slate-100 pt-3 flex items-center gap-2">
                   {course.quiz ? <span className="text-indigo-600 font-semibold">{course.quiz.questions.length} preguntas</span> : 'Sin examen'}
                   <span>•</span>
                   <span>{course.chapters.length} lecciones</span>
                </div>
              </div>

              <div className="p-3 border-t border-slate-100 bg-slate-50 flex justify-between items-center gap-2">
                
                <button 
                   onClick={(e) => { e.stopPropagation(); navigate(`/admin/analytics/${course.id}`); }}
                   className="text-slate-600 hover:text-indigo-600 text-xs font-bold py-2 rounded hover:bg-white border border-transparent hover:border-slate-200 transition-all flex items-center justify-center px-3"
                   title="Ver Analíticas"
                >
                   <BarChart2 className="w-4 h-4" />
                </button>

                <div className="h-4 w-px bg-slate-300"></div>

                <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/course/${course.id}`)} className="flex-1 justify-center text-xs">
                  <Edit2 className="w-3 h-3 mr-1" /> Editar
                </Button>
                
                <div className="h-4 w-px bg-slate-300"></div>

                <div className="flex items-center">
                    <button 
                    onClick={(e) => handleDelete(e, course.id)}
                    className="text-slate-400 hover:text-red-600 p-2 rounded hover:bg-red-50 transition-colors"
                    title="Eliminar permanentemente"
                    >
                    <Trash2 className="w-4 h-4" />
                    </button>
                </div>
              </div>
            </div>
            );
          })}
        </div>
      )}

      {/* Audit Logs Modal */}
      {showAuditLogs && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[85vh]">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                      <div>
                          <h3 className="text-lg font-bold text-slate-900">Registro de Actividad (Audit Log)</h3>
                          <p className="text-xs text-slate-500">Monitoreo de seguridad y cambios en el sistema</p>
                      </div>
                      <button onClick={() => setShowAuditLogs(false)} className="text-slate-400 hover:text-slate-600">
                          <X className="w-5 h-5" />
                      </button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-0">
                      <table className="w-full text-sm text-left">
                          <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200 sticky top-0">
                              <tr>
                                  <th className="px-6 py-3">Fecha / Hora</th>
                                  <th className="px-6 py-3">Usuario</th>
                                  <th className="px-6 py-3">Acción</th>
                                  <th className="px-6 py-3">Detalles</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                              {auditLogs.map(log => (
                                  <tr key={log.id} className="hover:bg-slate-50">
                                      <td className="px-6 py-3 font-mono text-xs text-slate-500">
                                          {new Date(log.timestamp).toLocaleString()}
                                      </td>
                                      <td className="px-6 py-3 font-bold text-slate-700">
                                          {log.userName}
                                      </td>
                                      <td className="px-6 py-3">
                                          <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                                              log.action.includes('DELETE') ? 'bg-red-100 text-red-700' :
                                              log.action.includes('CREATE') ? 'bg-green-100 text-green-700' :
                                              log.action.includes('LOGIN') ? 'bg-blue-100 text-blue-700' :
                                              'bg-slate-100 text-slate-700'
                                          }`}>
                                              {log.action}
                                          </span>
                                      </td>
                                      <td className="px-6 py-3 text-slate-600 truncate max-w-xs" title={log.details}>
                                          {log.details}
                                      </td>
                                  </tr>
                              ))}
                              {auditLogs.length === 0 && (
                                  <tr>
                                      <td colSpan={4} className="text-center py-8 text-slate-400">No hay registros de actividad.</td>
                                  </tr>
                              )}
                          </tbody>
                      </table>
                  </div>
                  
                  <div className="p-4 border-t border-slate-100 text-center bg-slate-50 text-xs text-slate-400">
                      Mostrando últimos 100 registros.
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
