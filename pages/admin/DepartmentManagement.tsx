
import React, { useEffect, useState } from 'react';
import { Course, Department, LearningPath } from '../../types';
import { getDepartments, getCourses, saveDepartment, deleteDepartment, getLearningPaths } from '../../services/store';
import { Button } from '../../components/Button';
import { Plus, Trash2, Edit2, X, Check, Briefcase, BookOpen, Map } from 'lucide-react';

export const DepartmentManagement: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tempName, setTempName] = useState('');
  const [tempCourseIds, setTempCourseIds] = useState<string[]>([]);
  const [tempPathIds, setTempPathIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [depts, allCourses, allPaths] = await Promise.all([getDepartments(), getCourses(), getLearningPaths()]);
    setDepartments(depts);
    setCourses(allCourses);
    setPaths(allPaths);
    setLoading(false);
  };

  const handleOpenModal = (dept?: Department) => {
    if (dept) {
      setEditingDept(dept);
      setTempName(dept.name);
      setTempCourseIds(dept.courseIds);
      setTempPathIds(dept.pathIds || []);
    } else {
      setEditingDept(null);
      setTempName('');
      setTempCourseIds([]);
      setTempPathIds([]);
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!tempName.trim()) return;
    setSaving(true);
    
    const newDept: Department = {
      id: editingDept ? editingDept.id : crypto.randomUUID(),
      name: tempName,
      courseIds: tempCourseIds,
      pathIds: tempPathIds
    };

    await saveDepartment(newDept);
    setSaving(false);
    setIsModalOpen(false);
    loadData();
  };

  const handleDelete = async (id: string) => {
    if (confirm("¿Estás seguro de eliminar este departamento? Esto no eliminará a los usuarios, pero perderán la asociación.")) {
      await deleteDepartment(id);
      loadData();
    }
  };

  const toggleCourse = (courseId: string) => {
    setTempCourseIds(prev => 
      prev.includes(courseId) ? prev.filter(id => id !== courseId) : [...prev, courseId]
    );
  };

  const togglePath = (pathId: string) => {
      setTempPathIds(prev =>
        prev.includes(pathId) ? prev.filter(id => id !== pathId) : [...prev, pathId]
      );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Departamentos y Grupos</h1>
          <p className="text-slate-500">Crea grupos y define las mallas curriculares para asignación automática.</p>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Departamento
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12">Cargando...</div>
      ) : departments.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-dashed border-slate-300">
           <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-4" />
           <p className="text-slate-500 mb-4">No hay departamentos configurados.</p>
           <Button onClick={() => handleOpenModal()}>Crear el primero</Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {departments.map(dept => (
            <div key={dept.id} className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
              <div className="p-5 border-b border-slate-100 flex justify-between items-start">
                <div>
                   <h3 className="text-lg font-bold text-slate-900">{dept.name}</h3>
                   <div className="flex gap-2 text-xs text-slate-500 mt-1">
                        <span>{dept.courseIds.length} Cursos</span>
                        <span>•</span>
                        <span>{dept.pathIds?.length || 0} Carreras</span>
                   </div>
                </div>
                <div className="p-2 bg-indigo-50 rounded-lg">
                   <Briefcase className="w-5 h-5 text-indigo-600" />
                </div>
              </div>
              <div className="p-5 flex-1">
                 <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Malla Curricular</h4>
                 
                 {/* Preview Paths */}
                 {(dept.pathIds && dept.pathIds.length > 0) && (
                     <div className="mb-3 space-y-1">
                         {dept.pathIds.map(pId => {
                             const p = paths.find(path => path.id === pId);
                             return p ? (
                                <div key={pId} className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded flex items-center font-bold">
                                    <Map className="w-3 h-3 mr-1" /> {p.title}
                                </div>
                             ) : null;
                         })}
                     </div>
                 )}

                 {/* Preview Courses */}
                 {dept.courseIds.length > 0 ? (
                    <ul className="space-y-2">
                      {dept.courseIds.slice(0, 3).map(cId => {
                        const c = courses.find(cx => cx.id === cId);
                        return c ? (
                          <li key={cId} className="text-sm text-slate-700 flex items-center">
                            <BookOpen className="w-3 h-3 mr-2 text-indigo-400" />
                            <span className="truncate">{c.title}</span>
                          </li>
                        ) : null;
                      })}
                      {dept.courseIds.length > 3 && (
                        <li className="text-xs text-slate-400 italic pl-5">
                          + {dept.courseIds.length - 3} cursos más...
                        </li>
                      )}
                    </ul>
                 ) : (
                   <p className="text-sm text-slate-400 italic">Sin cursos individuales asignados.</p>
                 )}
              </div>
              <div className="p-4 bg-slate-50 border-t border-slate-100 rounded-b-xl flex justify-between">
                <Button variant="ghost" size="sm" onClick={() => handleOpenModal(dept)}>
                  <Edit2 className="w-4 h-4 mr-1" /> Editar
                </Button>
                <button 
                  onClick={() => handleDelete(dept.id)}
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
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]">
             <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
               <h3 className="text-lg font-bold text-slate-900">
                 {editingDept ? 'Editar Departamento' : 'Nuevo Departamento'}
               </h3>
               <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                 <X className="w-5 h-5" />
               </button>
             </div>

             <div className="p-6 overflow-y-auto space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nombre del Departamento / Grupo</label>
                  <input
                    type="text"
                    value={tempName}
                    onChange={e => setTempName(e.target.value)}
                    className="w-full px-4 py-2 bg-white text-slate-900 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500"
                    placeholder="Ej. Ventas, TI, Gerencia..."
                  />
                </div>

                {/* Paths Selection */}
                <div>
                    <h4 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
                        <Map className="w-4 h-4 text-indigo-600" />
                        Carreras (Packs)
                    </h4>
                    <div className="space-y-2 border rounded-md p-2 max-h-40 overflow-y-auto bg-indigo-50">
                        {paths.map(path => (
                            <label key={path.id} className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${
                                tempPathIds.includes(path.id) ? 'border-indigo-500 bg-white' : 'border-indigo-100 bg-indigo-50/50 hover:bg-white'
                            }`}>
                                <div className={`w-5 h-5 rounded border flex items-center justify-center mr-3 ${
                                    tempPathIds.includes(path.id) ? 'bg-indigo-600 border-indigo-600' : 'border-indigo-300 bg-white'
                                }`}>
                                    {tempPathIds.includes(path.id) && <Check className="w-3 h-3 text-white" />}
                                </div>
                                <input 
                                    type="checkbox" 
                                    className="hidden" 
                                    checked={tempPathIds.includes(path.id)}
                                    onChange={() => togglePath(path.id)}
                                />
                                <div className="flex-1">
                                    <div className="font-bold text-slate-900 text-sm">{path.title}</div>
                                </div>
                            </label>
                        ))}
                        {paths.length === 0 && <p className="text-center text-slate-400 text-xs">No hay carreras disponibles.</p>}
                    </div>
                </div>

                {/* Courses Selection */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-3">
                    Asignar Cursos Individuales
                    <span className="block text-xs font-normal text-slate-500 mt-1">
                      Estos cursos se suman a los de las carreras seleccionadas.
                    </span>
                  </label>
                  
                  <div className="space-y-2 border rounded-md p-2 max-h-60 overflow-y-auto bg-slate-50">
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
                      </label>
                    ))}
                    {courses.length === 0 && <p className="text-center text-sm text-slate-500">No hay cursos disponibles.</p>}
                  </div>
                </div>
             </div>

             <div className="p-6 border-t border-slate-100 bg-slate-50 shrink-0 flex justify-end gap-3">
               <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
               <Button onClick={handleSave} isLoading={saving} disabled={!tempName.trim()}>Guardar</Button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
