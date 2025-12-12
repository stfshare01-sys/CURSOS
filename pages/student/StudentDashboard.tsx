
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Course, CourseProgress, User, Badge, LearningPath } from '../../types';
import { getCourses, getUserCompletedCourses, getLeaderboard, getLearningPaths } from '../../services/store';
import { getCurrentUser } from '../../services/store';
import { Button } from '../../components/Button';
import { PlayCircle, CheckCircle, Award, Lock, Trophy, Zap, Clock, Star, Medal, Map, ArrowRight } from 'lucide-react';
import { generateCertificate } from '../../services/pdfService';

export const StudentDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [progress, setProgress] = useState<CourseProgress[]>([]);
  const [leaderboard, setLeaderboard] = useState<(User & { points: number })[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [learningPaths, setLearningPaths] = useState<LearningPath[]>([]);
  const currentUser = getCurrentUser();
  const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'paths'>('active');
  const [userPoints, setUserPoints] = useState(0);

  useEffect(() => {
    const load = async () => {
      if (!currentUser) return;
      const allCourses = await getCourses();
      
      // Filter: Must be PUBLISHED AND ASSIGNED to the user
      const assignedIds = currentUser.assignedCourseIds || [];
      const visibleCourses = allCourses.filter(c => 
        c.status === 'PUBLISHED' && assignedIds.includes(c.id)
      );

      setCourses(visibleCourses);
      const userProgress = await getUserCompletedCourses(currentUser.id);
      setProgress(userProgress);

      const lb = await getLeaderboard();
      setLeaderboard(lb);
      
      const paths = await getLearningPaths();
      // Filter paths where user has access to at least one course (simple logic)
      // or show all paths to encourage growth
      setLearningPaths(paths);

      const me = lb.find(u => u.id === currentUser.id);
      setUserPoints(me ? me.points : 0);

      calculateBadges(userProgress);
    };
    load();
  }, []);

  const calculateBadges = (userProgress: CourseProgress[]) => {
      const earned: Badge[] = [];
      const count = userProgress.length;

      // Logic for badges (Mocked logic for demo)
      if (count >= 1) {
          earned.push({ id: 'b1', label: 'Iniciado', icon: 'Zap', color: 'bg-yellow-400', description: 'Completaste tu primer curso' });
      }
      if (count >= 3) {
          earned.push({ id: 'b2', label: 'Constante', icon: 'Star', color: 'bg-blue-400', description: 'Completaste 3 cursos' });
      }
      if (count >= 5) {
          earned.push({ id: 'b3', label: 'Experto', icon: 'Award', color: 'bg-purple-500', description: 'Completaste 5 cursos' });
      }
      
      const perfectScores = userProgress.filter(p => (p.score || 0) === 100).length;
      if (perfectScores >= 1) {
          earned.push({ id: 'b4', label: 'Perfeccionista', icon: 'Medal', color: 'bg-red-500', description: 'Obtuviste 100% en un examen' });
      }

      setBadges(earned);
  };

  const getStatus = (courseId: string) => {
    return progress.find(p => p.courseId === courseId);
  };

  const handleDownloadCertificate = (course: Course) => {
    if (!currentUser) return;
    const record = getStatus(course.id);
    if (record) {
      const dateStr = new Date(record.completedAt!).toLocaleDateString();
      generateCertificate(currentUser.name, course.title, dateStr);
    }
  };

  const isLocked = (course: Course) => {
      if (!course.prerequisites || course.prerequisites.length === 0) return false;
      // Check if all prereqs are in the progress list
      const completedIds = progress.map(p => p.courseId);
      return !course.prerequisites.every(id => completedIds.includes(id));
  };

  const completedCourseIds = progress.map(p => p.courseId);
  
  const displayedCourses = activeTab === 'active' 
    ? courses.filter(c => !completedCourseIds.includes(c.id))
    : courses.filter(c => completedCourseIds.includes(c.id));

  // Level Logic
  const level = Math.floor(userPoints / 1000) + 1;
  const nextLevelPoints = level * 1000;
  const currentLevelStart = (level - 1) * 1000;
  const progressPct = ((userPoints - currentLevelStart) / (nextLevelPoints - currentLevelStart)) * 100;

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      {/* Main Content: Courses */}
      <div className="flex-1 space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Mi Aprendizaje</h1>
              <p className="text-slate-500">Bienvenido de vuelta, {currentUser?.name.split(' ')[0]}</p>
            </div>
            
            <div className="flex p-1 bg-white rounded-lg border border-slate-200">
                <button
                    onClick={() => setActiveTab('active')}
                    className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                        activeTab === 'active' ? 'bg-indigo-100 text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                    En Curso ({courses.length - completedCourseIds.length})
                </button>
                <button
                    onClick={() => setActiveTab('paths')}
                    className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                        activeTab === 'paths' ? 'bg-indigo-100 text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                    Carreras ({learningPaths.length})
                </button>
                <button
                    onClick={() => setActiveTab('completed')}
                    className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                        activeTab === 'completed' ? 'bg-indigo-100 text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                    Completados ({completedCourseIds.length})
                </button>
            </div>
        </div>

        {activeTab === 'paths' ? (
            <div className="space-y-6">
                {learningPaths.map(path => {
                    // Calculate path progress
                    const totalCourses = path.courseIds.length;
                    const completedCount = path.courseIds.filter(id => completedCourseIds.includes(id)).length;
                    const percent = totalCourses > 0 ? Math.round((completedCount / totalCourses) * 100) : 0;
                    
                    return (
                        <div key={path.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col md:flex-row">
                            <div className="w-full md:w-48 h-32 md:h-auto bg-slate-200 relative">
                                <img src={path.coverImage} className="absolute inset-0 w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/20" />
                            </div>
                            <div className="flex-1 p-6">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900">{path.title}</h3>
                                        <p className="text-sm text-slate-500">{path.description}</p>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-2xl font-black text-indigo-600">{percent}%</div>
                                    </div>
                                </div>
                                
                                {/* Progress Bar */}
                                <div className="w-full bg-slate-100 rounded-full h-2 mb-4">
                                    <div className="bg-indigo-600 h-2 rounded-full transition-all duration-1000" style={{ width: `${percent}%` }}></div>
                                </div>

                                {/* Path Steps */}
                                <div className="flex items-center gap-2 overflow-x-auto pb-2">
                                    {path.courseIds.map((cId, idx) => {
                                        const isDone = completedCourseIds.includes(cId);
                                        const course = courses.find(c => c.id === cId) || { title: 'Curso Privado' }; // Fallback if course not in user list yet
                                        
                                        return (
                                            <div key={cId} className="flex items-center shrink-0">
                                                <div 
                                                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                                                        isDone 
                                                        ? 'bg-green-100 border-green-500 text-green-700' 
                                                        : 'bg-white border-slate-300 text-slate-400'
                                                    }`}
                                                    title={course.title}
                                                >
                                                    {isDone ? <CheckCircle className="w-4 h-4" /> : idx + 1}
                                                </div>
                                                {idx < path.courseIds.length - 1 && (
                                                    <div className={`w-8 h-0.5 mx-1 ${isDone ? 'bg-green-500' : 'bg-slate-200'}`} />
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        ) : displayedCourses.length === 0 ? (
           <div className="text-center py-20 bg-white rounded-xl border border-dashed border-slate-300">
             <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
               {activeTab === 'active' ? <CheckCircle className="w-10 h-10 text-green-400" /> : <Clock className="w-10 h-10 text-slate-400" />}
             </div>
             <h2 className="text-xl font-bold text-slate-900 mb-2">
                 {activeTab === 'active' ? "¡Estás al día!" : "Aún no has completado cursos"}
             </h2>
             <p className="text-slate-500">
                 {activeTab === 'active' 
                    ? "No tienes cursos pendientes por realizar." 
                    : "Completa tus cursos asignados para ver tus certificados aquí."}
             </p>
           </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {displayedCourses.map(course => {
              const status = getStatus(course.id);
              const isCompleted = !!status;
              const locked = isLocked(course);

              return (
                <div key={course.id} className={`bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow group ${locked ? 'opacity-70 grayscale-[0.5]' : ''}`}>
                  <div className="h-32 bg-indigo-600 relative overflow-hidden">
                    {course.coverImage && <img src={course.coverImage} className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:scale-105 transition-transform duration-500" />}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                    
                    {locked && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm z-10">
                            <Lock className="w-8 h-8 text-white/80" />
                        </div>
                    )}

                    <div className="absolute bottom-4 left-4 right-4">
                      <h3 className="text-white font-bold text-lg leading-tight">{course.title}</h3>
                    </div>
                  </div>
                  <div className="p-5 flex-1">
                    <p className="text-slate-600 text-sm line-clamp-2 mb-4">{course.description}</p>
                    
                    <div className="flex items-center gap-3 mb-2">
                        {isCompleted ? (
                            <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-200">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Nota: {status.score}%
                            </div>
                        ) : (
                            <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                                <PlayCircle className="w-3 h-3 mr-1" />
                                {course.chapters.length} Lecciones
                            </div>
                        )}
                        {status?.rating && (
                            <div className="flex items-center text-xs font-bold text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-full border border-yellow-200">
                                <Star className="w-3 h-3 mr-1 fill-current" />
                                {status.rating}/5
                            </div>
                        )}
                    </div>
                  </div>
                  <div className="p-4 border-t border-slate-100 bg-slate-50">
                    {locked ? (
                        <Button className="w-full bg-slate-300 text-slate-500 cursor-not-allowed hover:bg-slate-300" disabled>
                            <Lock className="w-4 h-4 mr-2" />
                            Bloqueado (Faltan Prerrequisitos)
                        </Button>
                    ) : isCompleted ? (
                      <div className="flex gap-2">
                        <Button variant="secondary" className="flex-1 text-xs" onClick={() => navigate(`/student/course/${course.id}`)}>
                            Repasar
                        </Button>
                        <Button className="flex-1 text-xs" onClick={() => handleDownloadCertificate(course)}>
                          <Award className="w-3 h-3 mr-2" />
                          Certificado
                        </Button>
                      </div>
                    ) : (
                      <Button className="w-full" onClick={() => navigate(`/student/course/${course.id}`)}>
                        <PlayCircle className="w-4 h-4 mr-2" />
                        Comenzar
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Sidebar: Level, Badges & Leaderboard */}
      <div className="w-full lg:w-80 shrink-0 space-y-6">
          
          {/* LEVEL CARD */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl shadow-lg p-6 text-white relative overflow-hidden">
              <div className="absolute right-0 top-0 opacity-10">
                  <Trophy className="w-32 h-32 -mr-6 -mt-6" />
              </div>
              <div className="relative z-10">
                  <div className="text-xs font-bold text-indigo-200 uppercase tracking-wide mb-1">Tu Progreso</div>
                  <div className="flex justify-between items-end mb-2">
                      <h3 className="text-3xl font-black">Nivel {level}</h3>
                      <span className="text-sm font-medium opacity-80">{userPoints} XP</span>
                  </div>
                  <div className="w-full bg-black/20 rounded-full h-3 mb-2">
                      <div 
                        className="bg-yellow-400 h-3 rounded-full shadow-lg transition-all duration-1000"
                        style={{ width: `${progressPct}%` }}
                      ></div>
                  </div>
                  <p className="text-[10px] text-center opacity-70">
                      Faltan {nextLevelPoints - userPoints} XP para el nivel {level + 1}
                  </p>
              </div>
          </div>

          {/* BADGES SECTION */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-slate-800">
                      <Medal className="w-5 h-5 text-indigo-600" />
                      Mis Insignias
                  </div>
                  <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold">
                      {badges.length}
                  </span>
              </div>
              <div className="p-4 grid grid-cols-4 gap-2">
                  {badges.map(badge => (
                      <div key={badge.id} className="group relative flex flex-col items-center">
                          <div className={`w-12 h-12 rounded-full ${badge.color} text-white flex items-center justify-center shadow-md mb-1 cursor-help`}>
                              <Star className="w-6 h-6 fill-current" />
                          </div>
                          
                          {/* Tooltip */}
                          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-32 bg-slate-900 text-white text-xs p-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 text-center">
                              <div className="font-bold mb-1">{badge.label}</div>
                              {badge.description}
                          </div>
                      </div>
                  ))}
                  {badges.length === 0 && (
                      <div className="col-span-4 text-center py-4 text-slate-400 text-xs italic">
                          Completa cursos para ganar medallas.
                      </div>
                  )}
              </div>
          </div>

          {/* LEADERBOARD */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 bg-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-slate-800">
                      <Trophy className="w-5 h-5 text-yellow-600" />
                      Top Empleados
                  </div>
              </div>
              <div className="p-2">
                  {leaderboard.map((user, idx) => (
                      <div key={user.id} className={`flex items-center p-3 rounded-lg mb-1 ${currentUser?.id === user.id ? 'bg-indigo-50 border border-indigo-100' : 'hover:bg-slate-50'}`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm mr-3 shrink-0 ${
                              idx === 0 ? 'bg-yellow-100 text-yellow-700' : 
                              idx === 1 ? 'bg-slate-200 text-slate-600' :
                              idx === 2 ? 'bg-orange-100 text-orange-700' :
                              'bg-white border border-slate-200 text-slate-500'
                          }`}>
                              {idx + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                              <div className="font-bold text-slate-900 text-sm truncate">
                                  {user.name} {currentUser?.id === user.id && '(Tú)'}
                              </div>
                              <div className="text-xs text-slate-500 truncate">{user.jobTitle}</div>
                          </div>
                          <div className="text-right">
                              <div className="font-black text-indigo-600 text-sm">{user.points}</div>
                              <div className="text-[10px] text-slate-400 uppercase">pts</div>
                          </div>
                      </div>
                  ))}
                  {leaderboard.length === 0 && <div className="p-4 text-center text-slate-400 text-sm">Aún no hay datos.</div>}
              </div>
          </div>
      </div>
    </div>
  );
};
