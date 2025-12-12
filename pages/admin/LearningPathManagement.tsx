
import React, { useEffect, useState } from 'react';
import { Course, Department, LearningPath } from '../../types';
import { getLearningPaths, getCourses, saveLearningPath, deleteLearningPath, getDepartments, getJobTitles, togglePathInDepartment, assignPathToJobTitle } from '../../services/store';
import { sendMassEmailNotification } from '../../services/notificationService';
import { Button } from '../../components/Button';
import { Plus, Trash2, Edit2, X, Check, Map, ArrowRight, Briefcase, Users, Save } from 'lucide-react';

export const LearningPathManagement: React.FC = () => {
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [jobTitles, setJobTitles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [editingPath, setEditingPath] = useState<LearningPath | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'config' | 'assign'>('config');
  
  // Config Form
  const [tempTitle, setTempTitle] = useState('');
  const [tempDesc, setTempDesc] = useState('');
  const [tempImage, setTempImage] = useState('');
  const [tempCourseIds, setTempCourseIds] = useState<string[]>([]);

  // Assign Form
  const [jobTitleQuery, setJobTitleQuery] = useState('');
  const [massAssignCount, setMassAssignCount] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [p, c, depts, jobs] = await Promise.all([
        getLearningPaths(), 
        getCourses(), 
        getDepartments(),
        getJobTitles()
    ]);
    setPaths(p);
    setCourses(c);
    setDepartments(depts);
    setJobTitles(jobs);
    setLoading(false);
  };

  const handleOpenModal = (path?: LearningPath) => {
    setActiveTab('config');
    setMassAssignCount(null);
    setJobTitleQuery('');
    
    if (path) {
      setEditingPath(path);
      setTempTitle(path.title);
      setTempDesc(path.description);
      setTempImage(path.coverImage || '');
      setTempCourseIds(path.courseIds);
    } else {
      setEditingPath(null);
      setTempTitle('');
      setTempDesc('');
      setTempImage('');
      setTempCourseIds([]);
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!tempTitle.trim()) return;
    
    const newPath: LearningPath = {
      id: editingPath ? editingPath.id : crypto.randomUUID(),
      title: tempTitle,
      description: tempDesc,
      coverImage: tempImage,
      courseIds: tempCourseIds
    };

    await saveLearningPath(newPath);
    // If it was new, set it as editing so we can assign immediately
    if (!editingPath) {
        setEditingPath(newPath);
    }
    
    // Refresh list but don't close if we want to assign
    const p = await getLearningPaths();
    setPaths(p);
    
    if (activeTab === 'config' && !editingPath) {
        // Just created
        alert("Carrera creada. Ahora puedes asignarla.");
        setActiveTab('assign');
    } else {
        setIsModalOpen(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("¿Eliminar esta carrera? Los cursos individuales no se borrarán.")) {
      await deleteLearningPath(id);
      loadData();
    }
  };

  const toggleCourse = (courseId: string) => {
    setTempCourseIds(prev => 
      prev.includes(courseId) ? prev.filter(id => id !== courseId) : [...prev, courseId]
    );
  };

  const handleDeptToggle = async (deptId: string, isChecked: boolean) => {
      if (!editingPath) return;
      await togglePathInDepartment(deptId, editingPath.id, isChecked);
      setDepartments(await getDepartments()); // Refresh to update checkbox UI
  };

  const handleMassAssignByJob = async () => {
      if (!editingPath || !jobTitleQuery) return;
      const result = await assignPathToJobTitle(editingPath.id, jobTitleQuery);
      setMassAssignCount(result.count);
      if (result.count > 0) {
          await sendMassEmailNotification(result.users, `Nueva Carrera: ${editingPath.title}`);
      }
      setTimeout(() => setMassAssignCount(null), 4000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Carreras y Rutas de Aprendizaje</h1>
          <p className="text-slate-500">Agrupa cursos en secuencias lógicas y asígnalas por Área o Puesto.</p>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <Plus className="w-4 h-4 mr-2" />
          Nueva Carrera
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12">Cargando...</div>
      ) : paths.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-dashed border-slate-300">
           <Map className="w-12 h-12 text-slate-300 mx-auto mb-4" />
           <p className="text-slate-500 mb-4">No hay carreras configuradas.</p>
           <Button onClick={() => handleOpenModal()}>Crear la primera</Button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {paths.map(path => (
            <div key={path.id} className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
              <div className="h-32 bg-slate-200 relative">
                  {path.coverImage && <img src={path.coverImage} className="w-full h-full object-cover" />}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <h3 className="text-white font-bold text-xl px-4 text-center">{path.title}</h3>
                  </div>
              </div>
              <div className="p-5 flex-1">
                 <p className="text-sm text-slate-600 mb-4">{path.description}</p>
                 
                 <div className="space-y-2">
                     <h4 className="text-xs font-bold text-slate-400 uppercase">Secuencia de Cursos ({path.courseIds.length})</h4>
                     <div className="flex flex-wrap gap-2">
                         {path.courseIds.map((cId, idx) => {
                             const c = courses.find(cx => cx.id === cId);
                             return c ? (
                                 <div key={cId} className="flex items-center text-xs bg-slate-50 px-2 py-1 rounded border border-slate-200">
                                     <span className="font-bold mr-1">{idx + 1}.</span> {c.title}
                                 </div>
                             ) : null;
                         })}
                     </div>
                 </div>
              </div>
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between">
                <Button variant="ghost" size="sm" onClick={() => handleOpenModal(path)}>
                  <Edit2 className="w-4 h-4 mr-1" /> Editar / Asignar
                </Button>
                <button 
                  onClick={() => handleDelete(path.id)}
                  className="text-red-500 hover:text-red-700 text-sm font-medium flex items-center px-3 py-1 rounded hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4 mr-1" /> Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
             {/* Modal Header */}
             <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
               <h3 className="text-lg font-bold text-slate-900">
                 {editingPath ? 'Gestionar Carrera' : 'Nueva Carrera'}
               </h3>
               <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                 <X className="w-5 h-5" />
               </button>
             </div>

             {/* Tabs */}
             <div className="flex border-b border-slate-200 px-6">
                 <button 
                    onClick={() => setActiveTab('config')}
                    className={`py-3 mr-6 font-medium text-sm border-b-2 transition-colors ${activeTab === 'config' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500'}`}
                 >
                     Configuración
                 </button>
                 <button 
                    onClick={() => setActiveTab('assign')}
                    disabled={!editingPath}
                    className={`py-3 font-medium text-sm border-b-2 transition-colors ${activeTab === 'assign' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 disabled:opacity-50'}`}
                 >
                     Audiencia y Asignación
                 </button>
             </div>

             <div className="p-6 overflow-y-auto space-y-4 flex-1">
                {activeTab === 'config' ? (
                    <>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Título de la Carrera</label>
                                <input
                                    type="text"
                                    value={tempTitle}
                                    onChange={e => setTempTitle(e.target.value)}
                                    className="w-full px-4 py-2 bg-white text-slate-900 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500"
                                    placeholder="Ej. Onboarding Ventas"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">URL Imagen de Portada</label>
                                <input
                                    type="text"
                                    value={tempImage}
                                    onChange={e => setTempImage(e.target.value)}
                                    className="w-full px-4 py-2 bg-white text-slate-900 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
                            <textarea
                                value={tempDesc}
                                onChange={e => setTempDesc(e.target.value)}
                                className="w-full px-4 py-2 bg-white text-slate-900 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500"
                                placeholder="Objetivo de esta ruta..."
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Seleccionar Cursos (En orden)</label>
                            <div className="space-y-2 border rounded-md p-2 max-h-48 overflow-y-auto bg-slate-50">
                                {courses.map(course => (
                                <label 
                                    key={course.id} 
                                    className={`flex items-center p-3 rounded-md border cursor-pointer transition-all ${
                                    tempCourseIds.includes(course.id)
                                        ? 'border-indigo-500 bg-indigo-50'
                                        : 'border-slate-200 bg-white hover:border-slate-300'
                                    }`}
                                >
                                    <div className={`w-5 h-5 rounded border flex items-center justify-center mr-3 ${
                                    tempCourseIds.includes(course.id) ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 bg-white'
                                    }`}>
                                    {tempCourseIds.includes(course.id) && <Check className="w-3 h-3 text-white" />}
                                    </div>
                                    <input 
                                    type="checkbox" 
                                    className="hidden" 
                                    checked={tempCourseIds.includes(course.id)}
                                    onChange={() => toggleCourse(course.id)}
                                    />
                                    <div className="flex-1">
                                    <div className="font-medium text-slate-900 text-sm">{course.title}</div>
                                    </div>
                                    {tempCourseIds.includes(course.id) && (
                                        <span className="text-xs font-bold text-indigo-600 bg-white px-2 rounded border border-indigo-200">
                                            Orden: {tempCourseIds.indexOf(course.id) + 1}
                                        </span>
                                    )}
                                </label>
                                ))}
                            </div>
                        </div>
                    </>
                ) : (
                    // ASSIGN TAB
                    <div className="space-y-6 animate-fade-in">
                        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg text-sm text-blue-800">
                            <p><strong>Nota:</strong> Al asignar una Carrera, todos los cursos contenidos en ella se asignarán automáticamente a los usuarios correspondientes.</p>
                        </div>

                        {/* Dept Assign */}
                        <div>
                            <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                                <Briefcase className="w-4 h-4 text-slate-500" />
                                Asignar por Departamento (Automático)
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-40 overflow-y-auto">
                                {departments.map(dept => {
                                    const isAssigned = (dept.pathIds || []).includes(editingPath!.id);
                                    return (
                                        <label key={dept.id} className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${
                                            isAssigned ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:bg-slate-50'
                                        }`}>
                                            <input 
                                                type="checkbox" 
                                                className="h-4 w-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 mr-3"
                                                checked={isAssigned}
                                                onChange={(e) => handleDeptToggle(dept.id, e.target.checked)}
                                            />
                                            <span className={`font-medium ${isAssigned ? 'text-indigo-900' : 'text-slate-700'}`}>
                                                {dept.name}
                                            </span>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Job Assign */}
                        <div className="pt-6 border-t border-slate-100">
                            <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                                <Users className="w-4 h-4 text-slate-500" />
                                Asignar por Puesto (Masivo)
                            </h4>
                            <div className="flex gap-2">
                                <select 
                                    className="flex-1 px-4 py-2 bg-white text-slate-900 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500"
                                    value={jobTitleQuery}
                                    onChange={(e) => setJobTitleQuery(e.target.value)}
                                >
                                    <option value="">Seleccionar Puesto...</option>
                                    {jobTitles.map(title => (
                                        <option key={title} value={title}>{title}</option>
                                    ))}
                                </select>
                                <Button onClick={handleMassAssignByJob} disabled={!jobTitleQuery}>
                                    Asignar
                                </Button>
                            </div>
                            {massAssignCount !== null && (
                                <div className="mt-2 p-2 bg-green-100 text-green-700 text-xs rounded border border-green-200">
                                    Se asignó la carrera a {massAssignCount} usuarios con este puesto.
                                </div>
                            )}
                        </div>
                    </div>
                )}
             </div>

             <div className="p-6 border-t border-slate-100 bg-slate-50 shrink-0 flex justify-end gap-3">
               <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
                   {activeTab === 'config' ? 'Cancelar' : 'Cerrar'}
               </Button>
               {activeTab === 'config' && (
                   <Button onClick={handleSave} disabled={!tempTitle.trim()}>
                       <Save className="w-4 h-4 mr-2" /> Guardar
                   </Button>
               )}
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
