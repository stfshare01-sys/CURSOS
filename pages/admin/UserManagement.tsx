
import React, { useEffect, useState } from 'react';
import { User, Course, Department, CourseProgress, CourseStatus, LearningPath } from '../../types';
import { getEmployeeProgress, getCourses, getDepartments, registerEmployee, toggleUserStatus, updateUserCourses, getJobTitles, addJobTitle, deleteJobTitle, getLearningPaths } from '../../services/store';
import { sendEmailNotification } from '../../services/notificationService';
import { Button } from '../../components/Button';
import { UserPlus, UserCheck, UserX, BookOpen, X, Check, Briefcase, ChevronRight, Award, Calendar, Percent, Search, Settings, Trash2, Plus, Map } from 'lucide-react';

export const UserManagement: React.FC = () => {
  // Data State
  const [employees, setEmployees] = useState<(User & { progress: CourseProgress[] })[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<(User & { progress: CourseProgress[] })[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [jobTitles, setJobTitles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Create Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserJob, setNewUserJob] = useState('');
  const [newUserDeptId, setNewUserDeptId] = useState('');
  
  // Assign Modal State
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);

  // History Drawer State
  const [historyUser, setHistoryUser] = useState<(User & { progress: CourseProgress[] }) | null>(null);

  // Job Title Manager Modal
  const [showJobTitleModal, setShowJobTitleModal] = useState(false);
  const [newJobTitle, setNewJobTitle] = useState('');
  
  // Notifications
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredEmployees(employees);
    } else {
      const lower = searchTerm.toLowerCase();
      setFilteredEmployees(employees.filter(e => 
        e.name.toLowerCase().includes(lower) || 
        e.jobTitle?.toLowerCase().includes(lower) || 
        (e.departmentId && departments.find(d => d.id === e.departmentId)?.name.toLowerCase().includes(lower))
      ));
    }
  }, [searchTerm, employees, departments]);

  const loadData = async () => {
    setLoading(true);
    const [emps, allCourses, allPaths, depts, titles] = await Promise.all([
        getEmployeeProgress(), 
        getCourses(), 
        getLearningPaths(),
        getDepartments(),
        getJobTitles()
    ]);
    setEmployees(emps);
    setFilteredEmployees(emps);
    setCourses(allCourses);
    setPaths(allPaths);
    setDepartments(depts);
    setJobTitles(titles);
    setLoading(false);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserJob) return;
    
    const deptId = newUserDeptId === '' ? undefined : newUserDeptId;
    
    await registerEmployee(newUserName, deptId, newUserJob);
    setNewUserName('');
    setNewUserJob('');
    setNewUserDeptId('');
    setShowCreateModal(false);
    loadData();
  };

  const handleToggleStatus = async (userId: string) => {
    await toggleUserStatus(userId);
    loadData();
  };

  const openAssignModal = (user: User) => {
    setEditingUser(user);
    setSelectedCourses(user.assignedCourseIds || []);
    setSelectedPaths(user.assignedPathIds || []);
  };

  const handleAssignSave = async () => {
    if (!editingUser) return;
    
    await updateUserCourses(editingUser.id, selectedCourses, selectedPaths);
    
    setToastMessage(`Asignaciones actualizadas para ${editingUser.name}`);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);

    setEditingUser(null);
    loadData();
  };

  const toggleCourseSelection = (courseId: string) => {
    setSelectedCourses(prev => 
      prev.includes(courseId) 
        ? prev.filter(id => id !== courseId)
        : [...prev, courseId]
    );
  };

  const togglePathSelection = (pathId: string) => {
      setSelectedPaths(prev => 
        prev.includes(pathId) ? prev.filter(id => id !== pathId) : [...prev, pathId]
      );
  };

  // Job Title CRUD
  const handleAddJobTitle = async () => {
      if(!newJobTitle.trim()) return;
      await addJobTitle(newJobTitle.trim());
      setNewJobTitle('');
      setJobTitles(await getJobTitles());
  };

  const handleDeleteJobTitle = async (title: string) => {
      if(confirm(`¿Eliminar puesto "${title}" de la lista? No afectará a usuarios existentes.`)) {
          await deleteJobTitle(title);
          setJobTitles(await getJobTitles());
      }
  };

  const getDeptName = (id?: string) => {
    if (!id) return '-';
    return departments.find(d => d.id === id)?.name || 'Desconocido';
  };

  const getCourseName = (id: string) => {
    return courses.find(c => c.id === id)?.title || 'Curso eliminado';
  };

  const getStatusLabel = (status: CourseStatus) => {
      switch(status) {
          case 'PUBLISHED': return 'Publicado';
          case 'ARCHIVED': return 'Archivado';
          default: return 'Borrador';
      }
  };

  return (
    <div className="space-y-6 relative">
      {/* Toast Notification */}
      {showToast && (
          <div className="fixed top-4 right-4 bg-gray-900 text-white px-6 py-3 rounded-lg shadow-xl z-[100] animate-fade-in flex items-center">
              <Check className="w-5 h-5 text-green-400 mr-2" />
              {toastMessage}
          </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestión de Usuarios</h1>
          <p className="text-slate-500">Administra el acceso de empleados, puestos y asigna cursos.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
             <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                    type="text" 
                    placeholder="Buscar empleado..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 pr-4 py-2 bg-white text-slate-900 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 w-full sm:w-64"
                />
            </div>
            
            <Button variant="secondary" onClick={() => setShowJobTitleModal(true)}>
                <Settings className="w-4 h-4 mr-2" /> Puestos
            </Button>
            
            <Button onClick={() => setShowCreateModal(true)}>
                <UserPlus className="w-4 h-4 mr-2" /> Nuevo
            </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                <th className="px-6 py-4 font-semibold text-slate-700">Nombre / ID</th>
                <th className="px-6 py-4 font-semibold text-slate-700">Puesto (Job Title)</th>
                <th className="px-6 py-4 font-semibold text-slate-700">Departamento</th>
                <th className="px-6 py-4 font-semibold text-slate-700">Estado</th>
                <th className="px-6 py-4 font-semibold text-slate-700">Cursos</th>
                <th className="px-6 py-4 font-semibold text-slate-700 text-right">Acciones</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {filteredEmployees.map(user => (
                <tr key={user.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4 cursor-pointer" onClick={() => setHistoryUser(user)}>
                    <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{user.name}</div>
                    <div className="text-xs text-slate-400 font-mono">{user.id.slice(0, 8)}...</div>
                    </td>
                    <td className="px-6 py-4">
                    <div className="text-slate-700 font-medium">{user.jobTitle || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4">
                    <div className="inline-flex items-center text-slate-600 bg-slate-100 px-2 py-1 rounded text-xs">
                        <Briefcase className="w-3 h-3 mr-1 text-slate-400" />
                        {getDeptName(user.departmentId)}
                    </div>
                    </td>
                    <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                        {user.isActive ? 'Activo' : 'Baja'}
                    </span>
                    </td>
                    <td className="px-6 py-4">
                    <div className="flex flex-col text-xs">
                        <span className="font-bold text-slate-700">{user.assignedCourseIds?.length || 0} asignados</span>
                        <span className="text-green-600">{user.completedCourseIds?.length || user.progress?.length || 0} completados</span>
                    </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                        <button
                            onClick={() => setHistoryUser(user)}
                            className="text-slate-400 hover:text-indigo-600 p-2"
                            title="Ver Historial Detallado"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                        <Button 
                        size="sm" 
                        onClick={() => openAssignModal(user)}
                        title="Asignar Cursos Manualmente"
                        className="bg-indigo-600 text-white hover:bg-indigo-700 border-transparent shadow-sm"
                        >
                        <BookOpen className="w-4 h-4 mr-1" />
                        Asignar
                        </Button>
                        <Button 
                        variant="secondary" 
                        size="sm" 
                        onClick={() => handleToggleStatus(user.id)}
                        title={user.isActive ? "Dar de baja" : "Reactivar"}
                        className="border border-slate-200"
                        >
                        {user.isActive ? <UserX className="w-4 h-4 text-red-600" /> : <UserCheck className="w-4 h-4 text-green-600" />}
                        </Button>
                    </div>
                    </td>
                </tr>
                ))}
                {filteredEmployees.length === 0 && !loading && (
                <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    No se encontraron empleados.
                    </td>
                </tr>
                )}
            </tbody>
            </table>
        </div>
      </div>

      {/* --- SIDE PANEL (DRAWER) FOR HISTORY --- */}
      {historyUser && (
        <>
            <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity" onClick={() => setHistoryUser(null)} />
            <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col">
                <div className="p-6 bg-indigo-600 text-white shrink-0">
                    <button onClick={() => setHistoryUser(null)} className="absolute top-4 right-4 text-indigo-200 hover:text-white">
                        <X className="w-6 h-6" />
                    </button>
                    <h2 className="text-xl font-bold">{historyUser.name}</h2>
                    <p className="text-indigo-100 text-sm mt-1">{historyUser.jobTitle} • {getDeptName(historyUser.departmentId)}</p>
                    <div className="mt-4 flex gap-4 text-sm">
                        <div className="bg-indigo-700/50 px-3 py-1 rounded">
                            <span className="block text-xl font-bold">{historyUser.assignedCourseIds.length}</span>
                            <span className="text-indigo-200 text-xs uppercase">Asignados</span>
                        </div>
                        <div className="bg-green-600/50 px-3 py-1 rounded">
                            <span className="block text-xl font-bold">{historyUser.progress.length}</span>
                            <span className="text-green-100 text-xs uppercase">Completados</span>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50">
                    {/* Paths Section */}
                    {historyUser.assignedPathIds && historyUser.assignedPathIds.length > 0 && (
                        <div className="mb-6">
                            <h3 className="font-bold text-slate-900 border-b pb-2 mb-2">Carreras Activas</h3>
                            <div className="space-y-2">
                                {historyUser.assignedPathIds.map(pId => {
                                    const path = paths.find(p => p.id === pId);
                                    return path ? (
                                        <div key={pId} className="flex items-center gap-2 text-sm bg-indigo-50 p-2 rounded text-indigo-800">
                                            <Map className="w-4 h-4" />
                                            {path.title}
                                        </div>
                                    ) : null;
                                })}
                            </div>
                        </div>
                    )}

                    <h3 className="font-bold text-slate-900 border-b pb-2">Historial de Aprendizaje</h3>
                    
                    {historyUser.progress.length === 0 ? (
                        <p className="text-slate-500 text-sm italic">Este usuario aún no ha completado ningún curso.</p>
                    ) : (
                        <div className="space-y-4">
                            {historyUser.progress.map((prog, idx) => (
                                <div key={idx} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-green-500" />
                                    <div className="mb-2">
                                        <h4 className="font-bold text-slate-800 text-sm">{getCourseName(prog.courseId)}</h4>
                                    </div>
                                    <div className="flex items-center gap-4 text-xs text-slate-500">
                                        <div className="flex items-center text-green-700 font-bold bg-green-50 px-2 py-0.5 rounded">
                                            <Percent className="w-3 h-3 mr-1" /> {prog.score}%
                                        </div>
                                        <div className="flex items-center">
                                            <Calendar className="w-3 h-3 mr-1" /> 
                                            {prog.completedAt ? new Date(prog.completedAt).toLocaleDateString() : '-'}
                                        </div>
                                    </div>
                                    <Award className="absolute top-4 right-4 text-slate-100 w-12 h-12 -rotate-12" />
                                </div>
                            ))}
                        </div>
                    )}

                    <h3 className="font-bold text-slate-900 border-b pb-2 pt-4">Cursos Pendientes</h3>
                    <ul className="space-y-2">
                        {historyUser.assignedCourseIds
                            .filter(id => !historyUser.progress.find(p => p.courseId === id))
                            .map(id => (
                                <li key={id} className="flex items-center text-sm text-slate-600 bg-white p-3 rounded border border-slate-100">
                                    <div className="w-2 h-2 rounded-full bg-yellow-400 mr-3" />
                                    {getCourseName(id)}
                                </li>
                            ))}
                    </ul>
                </div>
                <div className="p-4 bg-white border-t border-slate-200 shrink-0">
                    <Button className="w-full" onClick={() => { setHistoryUser(null); openAssignModal(historyUser); }}>
                        Gestionar Asignaciones
                    </Button>
                </div>
            </div>
        </>
      )}


      {/* Modal Job Title Manager */}
      {showJobTitleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh]">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="font-bold text-slate-900">Gestionar Puestos</h3>
                    <button onClick={() => setShowJobTitleModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
                </div>
                <div className="p-4 overflow-y-auto flex-1 bg-slate-50 space-y-2">
                    {jobTitles.map(title => (
                        <div key={title} className="flex items-center justify-between bg-white p-3 rounded border border-slate-200">
                            <span className="text-sm font-medium text-slate-700">{title}</span>
                            <button onClick={() => handleDeleteJobTitle(title)} className="text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4"/></button>
                        </div>
                    ))}
                </div>
                <div className="p-4 border-t border-slate-100 bg-white flex gap-2">
                    <input 
                        type="text" 
                        value={newJobTitle}
                        onChange={e => setNewJobTitle(e.target.value)}
                        placeholder="Nuevo puesto..."
                        className="flex-1 px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500"
                    />
                    <Button onClick={handleAddJobTitle} disabled={!newJobTitle.trim()} size="sm"><Plus className="w-4 h-4"/></Button>
                </div>
            </div>
        </div>
      )}


      {/* Modal Alta Empleado */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900">Registrar Nuevo Empleado</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Completo</label>
                <input
                  type="text"
                  value={newUserName}
                  onChange={e => setNewUserName(e.target.value)}
                  className="w-full px-4 py-2 bg-white text-slate-900 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ej. Juan Pérez"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Puesto (Job Title)</label>
                <select
                  value={newUserJob}
                  onChange={e => setNewUserJob(e.target.value)}
                  className="w-full px-4 py-2 bg-white text-slate-900 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Seleccionar Puesto...</option>
                  {jobTitles.map(title => (
                      <option key={title} value={title}>{title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Departamento (Opcional)</label>
                <select
                  value={newUserDeptId}
                  onChange={e => setNewUserDeptId(e.target.value)}
                  className="w-full px-4 py-2 bg-white text-slate-900 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Sin Departamento --</option>
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-1">
                  Si seleccionas un departamento, los cursos base se asignarán automáticamente.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="ghost" onClick={() => setShowCreateModal(false)}>Cancelar</Button>
                <Button type="submit" disabled={!newUserName.trim() || !newUserJob}>Crear Usuario</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Asignar Cursos y Carreras */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Asignaciones</h3>
                <p className="text-sm text-slate-500">Empleado: {editingUser.name}</p>
              </div>
              <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6">
                
                {/* Learning Paths Section */}
                <div>
                    <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                        <Map className="w-4 h-4 text-indigo-600" />
                        Carreras (Packs de Cursos)
                    </h4>
                    <div className="space-y-2 border rounded-md p-2 max-h-40 overflow-y-auto bg-indigo-50">
                        {paths.map(path => (
                            <label key={path.id} className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${
                                selectedPaths.includes(path.id) ? 'border-indigo-500 bg-white' : 'border-indigo-100 bg-indigo-50/50 hover:bg-white'
                            }`}>
                                <div className={`w-5 h-5 rounded border flex items-center justify-center mr-3 ${
                                    selectedPaths.includes(path.id) ? 'bg-indigo-600 border-indigo-600' : 'border-indigo-300 bg-white'
                                }`}>
                                    {selectedPaths.includes(path.id) && <Check className="w-3 h-3 text-white" />}
                                </div>
                                <input 
                                    type="checkbox" 
                                    className="hidden" 
                                    checked={selectedPaths.includes(path.id)}
                                    onChange={() => togglePathSelection(path.id)}
                                />
                                <div className="flex-1">
                                    <div className="font-bold text-slate-900 text-sm">{path.title}</div>
                                    <div className="text-xs text-indigo-600">{path.courseIds.length} cursos incluidos</div>
                                </div>
                            </label>
                        ))}
                        {paths.length === 0 && <p className="text-center text-slate-400 text-xs">No hay carreras disponibles.</p>}
                    </div>
                </div>

                {/* Individual Courses Section */}
                <div>
                    <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-slate-500" />
                        Cursos Individuales
                    </h4>
                    <div className="space-y-2 border rounded-md p-2 max-h-48 overflow-y-auto">
                        {courses.length === 0 ? (
                        <p className="text-center text-slate-500 py-4">No hay cursos disponibles para asignar.</p>
                        ) : (
                        courses.map(course => (
                            <label 
                            key={course.id} 
                            className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${
                                selectedCourses.includes(course.id)
                                ? 'border-indigo-500 bg-indigo-50'
                                : 'border-slate-200 hover:bg-slate-50'
                            }`}
                            >
                            <div className={`w-5 h-5 rounded border flex items-center justify-center mr-3 ${
                                selectedCourses.includes(course.id) ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 bg-white'
                            }`}>
                                {selectedCourses.includes(course.id) && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <input 
                                type="checkbox" 
                                className="hidden" 
                                checked={selectedCourses.includes(course.id)}
                                onChange={() => toggleCourseSelection(course.id)}
                            />
                            <div className="flex-1">
                                <div className="font-medium text-slate-900 text-sm">{course.title}</div>
                                <div className="text-xs text-slate-500">{getStatusLabel(course.status)}</div>
                            </div>
                            </label>
                        ))
                        )}
                    </div>
                </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 shrink-0 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setEditingUser(null)}>Cancelar</Button>
              <Button onClick={handleAssignSave}>Guardar Asignaciones</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
