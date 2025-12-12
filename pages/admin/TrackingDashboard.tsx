
import React, { useEffect, useState } from 'react';
import { User, CourseProgress, Course, Department } from '../../types';
import { getEmployeeProgress, getCourses, getDepartments } from '../../services/store';
import { CheckCircle, Clock, Search, Filter, AlertCircle, BarChart2, Calendar, User as UserIcon } from 'lucide-react';

interface EnrollmentRow {
  userId: string;
  userName: string;
  userJob: string;
  deptName: string;
  courseId: string;
  courseTitle: string;
  status: 'COMPLETED' | 'PENDING';
  score?: number;
  completedAt?: number;
}

export const TrackingDashboard: React.FC = () => {
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([]);
  const [filteredEnrollments, setFilteredEnrollments] = useState<EnrollmentRow[]>([]);
  
  // Metadata for Filters
  const [courses, setCourses] = useState<Course[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  // Filter State
  const [searchText, setSearchText] = useState('');
  const [filterCourse, setFilterCourse] = useState('ALL');
  const [filterDept, setFilterDept] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchText, filterCourse, filterDept, filterStatus, enrollments]);

  const loadData = async () => {
    setLoading(true);
    const [empData, courseData, deptData] = await Promise.all([
      getEmployeeProgress(), 
      getCourses(),
      getDepartments()
    ]);

    setCourses(courseData);
    setDepartments(deptData);

    // Transform Data into Flat Enrollments
    const flatList: EnrollmentRow[] = [];

    empData.forEach(user => {
      // Find user's department
      const dept = deptData.find(d => d.id === user.departmentId);
      const deptName = dept ? dept.name : 'Sin Dept.';

      // Iterate assigned courses
      user.assignedCourseIds.forEach(cId => {
        const course = courseData.find(c => c.id === cId);
        // Only include if course still exists (sanity check)
        if (!course) return;

        const progress = user.progress.find(p => p.courseId === cId);
        const isCompleted = progress && progress.status === 'COMPLETED';

        flatList.push({
          userId: user.id,
          userName: user.name,
          userJob: user.jobTitle || 'General',
          deptName,
          courseId: cId,
          courseTitle: course.title,
          status: isCompleted ? 'COMPLETED' : 'PENDING',
          score: progress?.score,
          completedAt: progress?.completedAt
        });
      });
    });

    setEnrollments(flatList);
    setFilteredEnrollments(flatList);
    setLoading(false);
  };

  const applyFilters = () => {
    let result = enrollments;

    // Search
    if (searchText.trim()) {
      const lower = searchText.toLowerCase();
      result = result.filter(r => 
        r.userName.toLowerCase().includes(lower) || 
        r.userJob.toLowerCase().includes(lower)
      );
    }

    // Course
    if (filterCourse !== 'ALL') {
      result = result.filter(r => r.courseId === filterCourse);
    }

    // Department
    if (filterDept !== 'ALL') {
      result = result.filter(r => r.deptName === filterDept);
    }

    // Status
    if (filterStatus !== 'ALL') {
      result = result.filter(r => r.status === filterStatus);
    }

    setFilteredEnrollments(result);
  };

  // KPI Calculations based on FILTERED data
  const totalRecords = filteredEnrollments.length;
  const completedCount = filteredEnrollments.filter(r => r.status === 'COMPLETED').length;
  const pendingCount = totalRecords - completedCount;
  const completionRate = totalRecords > 0 ? Math.round((completedCount / totalRecords) * 100) : 0;
  
  const completedWithScore = filteredEnrollments.filter(r => r.score !== undefined);
  const avgScore = completedWithScore.length > 0 
    ? Math.round(completedWithScore.reduce((acc, curr) => acc + (curr.score || 0), 0) / completedWithScore.length) 
    : 0;

  if (loading) return <div className="p-12 text-center">Analizando datos...</div>;

  return (
    <div className="space-y-8">
        <div>
            <h1 className="text-2xl font-bold text-slate-900">Tablero de Seguimiento y Cumplimiento</h1>
            <p className="text-slate-500">Analiza el progreso de la capacitación por curso, área o empleado.</p>
        </div>

        {/* KPI Dashboard (Top Section) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="p-4 bg-blue-50 rounded-full">
                    <BarChart2 className="w-8 h-8 text-blue-600" />
                </div>
                <div>
                    <div className="text-sm text-slate-500 font-medium uppercase">Tasa de Finalización</div>
                    <div className="text-3xl font-black text-slate-900">{completionRate}%</div>
                    <div className="text-xs text-slate-400">{completedCount} de {totalRecords} asignaciones</div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="p-4 bg-green-50 rounded-full">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <div>
                    <div className="text-sm text-slate-500 font-medium uppercase">Promedio de Notas</div>
                    <div className="text-3xl font-black text-slate-900">{avgScore}%</div>
                    <div className="text-xs text-slate-400">En cursos completados</div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="p-4 bg-orange-50 rounded-full">
                    <AlertCircle className="w-8 h-8 text-orange-600" />
                </div>
                <div>
                    <div className="text-sm text-slate-500 font-medium uppercase">Pendientes</div>
                    <div className="text-3xl font-black text-slate-900">{pendingCount}</div>
                    <div className="text-xs text-slate-400">Usuarios por terminar</div>
                </div>
            </div>
        </div>
      
        {/* Filters Bar */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
           {/* Search */}
           <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Buscar</label>
              <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                      type="text" 
                      placeholder="Nombre o Puesto..." 
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-white text-slate-900 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500"
                  />
              </div>
           </div>

           {/* Course Filter */}
           <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Curso</label>
              <select 
                className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500"
                value={filterCourse}
                onChange={(e) => setFilterCourse(e.target.value)}
              >
                <option value="ALL">Todos los Cursos</option>
                {courses.map(c => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
           </div>

           {/* Department Filter */}
           <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Departamento</label>
              <select 
                className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500"
                value={filterDept}
                onChange={(e) => setFilterDept(e.target.value)}
              >
                <option value="ALL">Todos los Deptos.</option>
                {departments.map(d => (
                  <option key={d.id} value={d.name}>{d.name}</option>
                ))}
              </select>
           </div>

           {/* Status Filter */}
           <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Estatus</label>
              <select 
                className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="ALL">Todos</option>
                <option value="COMPLETED">Completados</option>
                <option value="PENDING">Pendientes</option>
              </select>
           </div>
        </div>

        {/* Enrollments List */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto max-h-[500px]">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                        <tr>
                            <th className="px-6 py-3 font-semibold text-slate-700">Empleado / Puesto</th>
                            <th className="px-6 py-3 font-semibold text-slate-700">Departamento</th>
                            <th className="px-6 py-3 font-semibold text-slate-700">Curso Asignado</th>
                            <th className="px-6 py-3 font-semibold text-slate-700">Estatus</th>
                            <th className="px-6 py-3 font-semibold text-slate-700">Calificación</th>
                            <th className="px-6 py-3 font-semibold text-slate-700">Fecha</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredEnrollments.map((row, idx) => (
                            <tr key={`${row.userId}-${row.courseId}-${idx}`} className="hover:bg-slate-50">
                                <td className="px-6 py-3">
                                    <div className="font-bold text-slate-900">{row.userName}</div>
                                    <div className="text-xs text-slate-500">{row.userJob}</div>
                                </td>
                                <td className="px-6 py-3 text-slate-600">{row.deptName}</td>
                                <td className="px-6 py-3 font-medium text-slate-800">{row.courseTitle}</td>
                                <td className="px-6 py-3">
                                    {row.status === 'COMPLETED' ? (
                                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-green-100 text-green-800">
                                            <CheckCircle className="w-3 h-3 mr-1" /> Completado
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-yellow-100 text-yellow-800">
                                            <Clock className="w-3 h-3 mr-1" /> Pendiente
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-3">
                                    {row.score !== undefined ? (
                                        <span className={`font-bold ${row.score >= 80 ? 'text-green-600' : 'text-orange-500'}`}>
                                            {row.score}%
                                        </span>
                                    ) : <span className="text-slate-300">-</span>}
                                </td>
                                <td className="px-6 py-3 text-slate-500">
                                    {row.completedAt ? new Date(row.completedAt).toLocaleDateString() : '-'}
                                </td>
                            </tr>
                        ))}
                        {filteredEnrollments.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                    No se encontraron registros con los filtros actuales.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
  );
};
