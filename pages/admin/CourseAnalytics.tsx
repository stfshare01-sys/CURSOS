import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Course, CourseAnalytics } from '../../types';
import { getCourseById, getCourseStats } from '../../services/store';
import { Button } from '../../components/Button';
import { ArrowLeft, Star, Users, CheckCircle, BarChart2, MessageSquare, AlertTriangle, HelpCircle } from 'lucide-react';

export const CourseAnalyticsPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [stats, setStats] = useState<CourseAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) loadData(id);
  }, [id]);

  const loadData = async (courseId: string) => {
    const [c, s] = await Promise.all([
        getCourseById(courseId),
        getCourseStats(courseId)
    ]);
    setCourse(c || null);
    setStats(s);
    setLoading(false);
  };

  if (loading) return <div className="p-12 text-center">Calculando métricas...</div>;
  if (!course || !stats) return <div className="p-12 text-center">Curso no encontrado</div>;

  const passRate = stats.totalEnrolled > 0 
    ? Math.round((stats.completedCount / stats.totalEnrolled) * 100) 
    : 0;

  // Find max value for bar chart scaling
  const maxBucketVal = Math.max(...stats.scoreBuckets, 1);

  return (
    <div className="space-y-8 animate-fade-in pb-12">
        {/* Header */}
        <div className="flex items-center gap-4">
            <button onClick={() => navigate('/admin/courses')} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <ArrowLeft className="w-5 h-5 text-slate-500" />
            </button>
            <div>
                <h1 className="text-2xl font-bold text-slate-900">{course.title}</h1>
                <p className="text-slate-500 text-sm">Analítica detallada y feedback de estudiantes</p>
            </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-indigo-50 rounded-lg"><Users className="w-5 h-5 text-indigo-600" /></div>
                    <span className="text-sm font-bold text-slate-500 uppercase">Alcance</span>
                </div>
                <div className="text-3xl font-black text-slate-900">{stats.totalEnrolled}</div>
                <div className="text-xs text-slate-400">Estudiantes asignados</div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-green-50 rounded-lg"><CheckCircle className="w-5 h-5 text-green-600" /></div>
                    <span className="text-sm font-bold text-slate-500 uppercase">Finalización</span>
                </div>
                <div className="text-3xl font-black text-slate-900">{passRate}%</div>
                <div className="text-xs text-slate-400">{stats.completedCount} completados</div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-yellow-50 rounded-lg"><Star className="w-5 h-5 text-yellow-600" /></div>
                    <span className="text-sm font-bold text-slate-500 uppercase">Satisfacción</span>
                </div>
                <div className="text-3xl font-black text-slate-900">{stats.avgRating} <span className="text-lg text-slate-400 font-normal">/ 5</span></div>
                <div className="text-xs text-slate-400">Promedio de valoración</div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-blue-50 rounded-lg"><BarChart2 className="w-5 h-5 text-blue-600" /></div>
                    <span className="text-sm font-bold text-slate-500 uppercase">Rendimiento</span>
                </div>
                <div className="text-3xl font-black text-slate-900">{stats.avgScore}%</div>
                <div className="text-xs text-slate-400">Nota promedio examen</div>
            </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
            {/* Score Distribution Chart */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
                    <BarChart2 className="w-5 h-5 text-slate-400" />
                    Distribución de Notas
                </h3>
                <div className="h-64 flex items-end justify-between gap-4 px-2">
                    {stats.scoreBuckets.map((count, idx) => {
                        const heightPct = (count / maxBucketVal) * 100;
                        const labels = ['0-20', '21-40', '41-60', '61-80', '81-100'];
                        const colors = ['bg-red-300', 'bg-orange-300', 'bg-yellow-300', 'bg-blue-300', 'bg-green-400'];
                        
                        return (
                            <div key={idx} className="flex-1 flex flex-col items-center group">
                                <div className="text-xs font-bold text-slate-500 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">{count}</div>
                                <div 
                                    className={`w-full rounded-t-md transition-all duration-500 ${colors[idx]} relative group-hover:brightness-90`}
                                    style={{ height: `${heightPct}%`, minHeight: '4px' }}
                                >
                                </div>
                                <div className="text-xs text-slate-400 mt-2 font-mono">{labels[idx]}</div>
                            </div>
                        );
                    })}
                </div>
                <p className="text-xs text-center text-slate-400 mt-4">Rango de puntaje (%)</p>
            </div>

            {/* Question Analysis (Most Failed) */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <HelpCircle className="w-5 h-5 text-slate-400" />
                    Análisis de Preguntas
                </h3>
                <p className="text-xs text-slate-500 mb-4">Preguntas donde los estudiantes fallan más frecuentemente.</p>
                
                <div className="space-y-4 max-h-[300px] overflow-y-auto">
                    {stats.questionsAnalysis && stats.questionsAnalysis.length > 0 ? (
                        stats.questionsAnalysis.slice(0, 5).map((q, idx) => (
                            <div key={idx} className="border-b border-slate-50 pb-3 last:border-0">
                                <div className="flex justify-between items-start mb-1">
                                    <div className="text-sm font-medium text-slate-800 pr-4">{q.questionText}</div>
                                    <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded shrink-0">
                                        {q.failRate}% Error
                                    </span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
                                    <div className="bg-red-400 h-1.5 rounded-full" style={{ width: `${q.failRate}%` }}></div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-10 text-slate-400 text-sm">
                            No hay datos de preguntas disponibles aún.
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* Feedback List */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-[400px]">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-slate-400" />
                    Comentarios de Estudiantes
                </h3>
                <span className="text-xs bg-slate-100 px-2 py-1 rounded-full text-slate-500 font-bold">
                    {stats.feedback.length} Opiniones
                </span>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {stats.feedback.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 italic">
                        No hay comentarios escritos aún.
                    </div>
                ) : (
                    stats.feedback.map((item, idx) => (
                        <div key={idx} className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <div className="text-sm font-bold text-slate-900">{item.userName}</div>
                                    <div className="text-xs text-slate-400">{new Date(item.date).toLocaleDateString()}</div>
                                </div>
                                <div className="flex">
                                    {[...Array(5)].map((_, i) => (
                                        <Star key={i} className={`w-3 h-3 ${i < item.rating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-300'}`} />
                                    ))}
                                </div>
                            </div>
                            <p className="text-sm text-slate-700 italic">"{item.comment}"</p>
                        </div>
                    ))
                )}
            </div>
        </div>
    </div>
  );
};