

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Course, User, CourseProgress } from '../../types';
import { getCourses, getCurrentUser, enrollStudent, getUserCompletedCourses } from '../../services/store';
import { recommendCourses, RecommendationResult } from '../../services/geminiService';
import { Button } from '../../components/Button';
import { PlayCircle, Sparkles, BookOpen, Search, Filter, Lock } from 'lucide-react';

export const StudentCatalog: React.FC = () => {
  const navigate = useNavigate();
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendationResult[]>([]);
  const [userProgress, setUserProgress] = useState<CourseProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrollingId, setEnrollingId] = useState<string | null>(null);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const user = getCurrentUser();
    if (!user) return;

    const [allCourses, progress] = await Promise.all([
        getCourses(),
        getUserCompletedCourses(user.id)
    ]);
    
    // Filter courses NOT assigned to user
    const unassigned = allCourses.filter(c => 
        c.status === 'PUBLISHED' && !user.assignedCourseIds.includes(c.id)
    );
    
    setAvailableCourses(unassigned);
    setUserProgress(progress);

    // Get AI Recs if there are enough courses
    if (unassigned.length > 0) {
        // Run in background to not block UI
        recommendCourses(user, unassigned).then(recs => setRecommendations(recs));
    }
    
    setLoading(false);
  };

  const handleEnroll = async (courseId: string) => {
    const user = getCurrentUser();
    if (!user) return;
    
    setEnrollingId(courseId);
    await enrollStudent(user.id, courseId);
    setEnrollingId(null);
    navigate(`/student/course/${courseId}`);
  };

  const isLocked = (course: Course) => {
      if (!course.prerequisites || course.prerequisites.length === 0) return false;
      const completedIds = userProgress.map(p => p.courseId);
      return !course.prerequisites.every(id => completedIds.includes(id));
  };

  const filteredList = availableCourses.filter(c => c.title.toLowerCase().includes(filter.toLowerCase()));

  if (loading) return <div className="p-12 text-center">Cargando catálogo...</div>;

  return (
    <div className="space-y-8 animate-fade-in">
        <div>
            <h1 className="text-2xl font-bold text-slate-900">Catálogo de Cursos</h1>
            <p className="text-slate-500">Explora y descubre nuevas habilidades para tu crecimiento.</p>
        </div>

        {/* AI Recommendations Section */}
        {recommendations.length > 0 && (
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
                <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="w-5 h-5 text-yellow-300" />
                    <h2 className="font-bold text-lg">Seleccionados para ti por IA</h2>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                    {recommendations.map(rec => {
                        const course = availableCourses.find(c => c.id === rec.courseId);
                        if (!course) return null;
                        return (
                            <div key={rec.courseId} className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 hover:bg-white/20 transition-colors flex flex-col md:flex-row gap-4 items-center md:items-start">
                                {course.coverImage && (
                                    <img src={course.coverImage} className="w-16 h-16 rounded-lg object-cover bg-slate-800" />
                                )}
                                <div className="flex-1">
                                    <h3 className="font-bold text-white leading-tight mb-1">{course.title}</h3>
                                    <p className="text-indigo-100 text-xs italic mb-3">"{rec.reason}"</p>
                                    <Button 
                                        size="sm" 
                                        className="bg-white text-indigo-600 hover:bg-indigo-50 border-0"
                                        onClick={() => handleEnroll(course.id)}
                                        isLoading={enrollingId === course.id}
                                    >
                                        Inscribirme Ahora
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        )}

        {/* Search Bar */}
        <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200 shadow-sm max-w-md">
            <Search className="w-4 h-4 text-slate-400 ml-2" />
            <input 
                type="text" 
                placeholder="Buscar cursos..." 
                className="flex-1 outline-none text-sm bg-white text-slate-900 placeholder-slate-400 p-1"
                value={filter}
                onChange={e => setFilter(e.target.value)}
            />
        </div>

        {/* Course Grid */}
        {filteredList.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-xl border border-dashed border-slate-300">
                <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <BookOpen className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-medium text-slate-900">No hay cursos disponibles</h3>
                <p className="text-slate-500">
                    {availableCourses.length === 0 
                        ? "¡Increíble! Ya tienes asignados todos los cursos publicados." 
                        : "Intenta con otra búsqueda."}
                </p>
            </div>
        ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredList.map(course => {
                    const locked = isLocked(course);
                    return (
                        <div key={course.id} className={`bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow group ${locked ? 'grayscale-[0.5] opacity-80' : ''}`}>
                            <div className="h-40 bg-slate-200 relative overflow-hidden">
                                {course.coverImage ? (
                                    <img src={course.coverImage} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                ) : (
                                    <div className="flex items-center justify-center h-full text-slate-400">
                                        <BookOpen className="w-10 h-10" />
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                                
                                {locked && (
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-sm z-10">
                                        <Lock className="w-10 h-10 text-white/80" />
                                    </div>
                                )}

                                <div className="absolute bottom-3 left-4 right-4">
                                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-white/20 text-white backdrop-blur-md border border-white/30 mb-1">
                                        {course.chapters.length} Lecciones
                                    </span>
                                    <h3 className="text-white font-bold text-base leading-tight line-clamp-2">{course.title}</h3>
                                </div>
                            </div>
                            <div className="p-5 flex-1 flex flex-col">
                                <p className="text-slate-600 text-sm line-clamp-3 mb-4 flex-1">{course.description}</p>
                                
                                {locked ? (
                                    <Button variant="secondary" className="w-full cursor-not-allowed bg-slate-100 text-slate-500" disabled>
                                        Prerrequisitos Pendientes
                                    </Button>
                                ) : (
                                    <Button 
                                        variant="secondary" 
                                        className="w-full border border-slate-200"
                                        onClick={() => handleEnroll(course.id)}
                                        isLoading={enrollingId === course.id}
                                    >
                                        <PlayCircle className="w-4 h-4 mr-2" />
                                        Inscribirme
                                    </Button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        )}
    </div>
  );
};
