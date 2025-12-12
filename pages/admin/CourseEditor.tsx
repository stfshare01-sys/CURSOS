
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Course, Department, Question, Chapter, CourseStatus, Resource, VideoInteraction } from '../../types';
import { getCourseById, saveCourse, getDepartments, assignCourseToJobTitle, toggleCourseInDepartment, getJobTitles, getCourses } from '../../services/store';
import { generateQuizFromContent, generateLessonContent, generateLessonAudio, generateDialogueAudio, generateCourseStructure } from '../../services/geminiService';
import { sendMassEmailNotification } from '../../services/notificationService';
import { Button } from '../../components/Button';
import { RichTextEditor } from '../../components/RichTextEditor';
import { Save, Sparkles, AlertCircle, Plus, Trash, ArrowLeft, CheckCircle, Users, Briefcase, Video, Image as ImageIcon, Mic, FileText, Wand2, Eye, Loader2, Link, File, Clock, MessageSquare, Play, X, Shield, Lock } from 'lucide-react';

export const CourseEditor: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === 'new';

  const [course, setCourse] = useState<Course>({
    id: isNew ? crypto.randomUUID() : '',
    title: '',
    description: '',
    coverImage: '',
    chapters: [],
    status: 'DRAFT',
    quiz: null,
    prerequisites: [],
    resources: [],
    requiresSignature: false,
    createdAt: Date.now()
  });

  const [activeTab, setActiveTab] = useState<'content' | 'quiz' | 'resources' | 'settings' | 'assign'>('content');
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  
  // Assignment State
  const [departments, setDepartments] = useState<Department[]>([]);
  const [jobTitles, setJobTitles] = useState<string[]>([]);
  const [jobTitleQuery, setJobTitleQuery] = useState('');
  const [massAssignCount, setMassAssignCount] = useState<number | null>(null);
  const [otherCourses, setOtherCourses] = useState<Course[]>([]);
  
  // AI State
  const [aiPromptCount, setAiPromptCount] = useState(5);
  const [generatingQuiz, setGeneratingQuiz] = useState(false);
  const [generatingContent, setGeneratingContent] = useState(false);
  const [generatingAudio, setGeneratingAudio] = useState(false);
  const [generatingStructure, setGeneratingStructure] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Resources State
  const [newResource, setNewResource] = useState<Resource>({ id: '', title: '', type: 'LINK', url: '' });

  // Interaction State
  const [newInteractionTime, setNewInteractionTime] = useState(0);
  const [newInteractionQuestion, setNewInteractionQuestion] = useState('');

  // Dialogue State
  const [dialogueNarrator, setDialogueNarrator] = useState('');
  const [dialogueExpert, setDialogueExpert] = useState('');

  useEffect(() => {
    const init = async () => {
        const [depts, titles, allCourses] = await Promise.all([getDepartments(), getJobTitles(), getCourses()]);
        setDepartments(depts);
        setJobTitles(titles);
        setOtherCourses(allCourses.filter(c => c.id !== id));

        if (!isNew && id) {
          const c = await getCourseById(id);
          if (c) {
            setCourse(prev => ({...c, resources: c.resources || [] }));
            if (c.chapters.length > 0) setActiveChapterId(c.chapters[0].id);
          }
        }
        setLoading(false);
    };
    init();
  }, [id, isNew]);

  const handleSave = async (silent = false) => {
    if (!course.title) return alert("El título es obligatorio");
    if (course.chapters.length === 0 && !silent) return alert("Debes agregar al menos un capítulo/lección.");
    
    setSaving(true);
    await saveCourse(course);
    setSaving(false);
    
    if (isNew && !silent) navigate(`/admin/course/${course.id}`, { replace: true });
  };

  const handlePreview = async () => {
      await handleSave(true); 
      navigate(`/student/course/${course.id}`);
  };

  // --- Chapter Management ---
  const addChapter = () => {
      const newChapter: Chapter = {
          id: crypto.randomUUID(),
          title: 'Nueva Lección',
          content: '<h3>Introducción</h3><p>Comienza a escribir aquí...</p>',
          estimatedMinutes: 5,
          videoInteractions: []
      };
      setCourse(prev => ({...prev, chapters: [...prev.chapters, newChapter]}));
      setActiveChapterId(newChapter.id);
  };

  const removeChapter = (chId: string) => {
      if(!confirm("¿Eliminar esta lección?")) return;
      const newChapters = course.chapters.filter(c => c.id !== chId);
      setCourse(prev => ({...prev, chapters: newChapters}));
      if (activeChapterId === chId) setActiveChapterId(newChapters[0]?.id || null);
  };

  const updateChapter = (chId: string, field: keyof Chapter, value: any) => {
      setCourse(prev => ({
          ...prev,
          chapters: prev.chapters.map(c => c.id === chId ? { ...c, [field]: value } : c)
      }));
  };

  const handleFileUpload = (chId: string, field: 'imageUrl' | 'audioUrl', file: File | null) => {
      if (!file) return;
      const reader = new FileReader();
      reader.onloadend = () => {
          updateChapter(chId, field, reader.result as string);
      };
      reader.readAsDataURL(file);
  };

  // --- Video Interaction Management ---
  const addVideoInteraction = (chId: string) => {
      if (!newInteractionQuestion) return alert("Escribe la pregunta.");
      
      const newInteraction: VideoInteraction = {
          id: crypto.randomUUID(),
          timestamp: Number(newInteractionTime),
          question: {
              id: crypto.randomUUID(),
              text: newInteractionQuestion,
              options: ["Verdadero", "Falso"],
              correctOptionIndex: 0
          }
      };

      const chapter = course.chapters.find(c => c.id === chId);
      if(chapter) {
          const updatedInteractions = [...(chapter.videoInteractions || []), newInteraction].sort((a,b) => a.timestamp - b.timestamp);
          updateChapter(chId, 'videoInteractions', updatedInteractions);
          setNewInteractionQuestion('');
          setNewInteractionTime(0);
      }
  };

  const removeVideoInteraction = (chId: string, intId: string) => {
      const chapter = course.chapters.find(c => c.id === chId);
      if(chapter) {
          const updated = chapter.videoInteractions?.filter(i => i.id !== intId);
          updateChapter(chId, 'videoInteractions', updated);
      }
  };

  // --- Resource Management ---
  const addResource = () => {
      if (!newResource.title || !newResource.url) return alert("Título y URL requeridos");
      setCourse(prev => ({
          ...prev,
          resources: [...(prev.resources || []), { ...newResource, id: crypto.randomUUID() }]
      }));
      setNewResource({ id: '', title: '', type: 'LINK', url: '' });
  };

  const removeResource = (resId: string) => {
      setCourse(prev => ({
          ...prev,
          resources: (prev.resources || []).filter(r => r.id !== resId)
      }));
  };

  // --- AI ACTIONS ---

  const handleGenerateStructure = async () => {
      if (!course.title || !course.description) return alert("Ingresa un Título y Descripción para que la IA entienda el contexto.");
      if (course.chapters.length > 0 && !confirm("Esto reemplazará las lecciones actuales. ¿Continuar?")) return;

      setGeneratingStructure(true);
      try {
          const chapters = await generateCourseStructure(course.title, course.description);
          setCourse(prev => ({ ...prev, chapters }));
          if (chapters.length > 0) setActiveChapterId(chapters[0].id);
      } catch (e) {
          alert("Error generando la estructura.");
      } finally {
          setGeneratingStructure(false);
      }
  };

  const handleGenerateAudio = async (chId: string, isDialogue = false) => {
    const chapter = course.chapters.find(c => c.id === chId);
    if (!chapter) return;

    setGeneratingAudio(true);
    try {
        let audioDataUri;
        if (isDialogue) {
            if (!dialogueNarrator || !dialogueExpert) return alert("Completa ambos roles.");
            audioDataUri = await generateDialogueAudio(dialogueNarrator, dialogueExpert);
        } else {
            if (!chapter.content || chapter.content.length < 10) return alert("Escribe contenido en la lección primero.");
            audioDataUri = await generateLessonAudio(chapter.content);
        }
        updateChapter(chId, 'audioUrl', audioDataUri);
    } catch (e) {
        alert("Error generando audio.");
    } finally {
        setGeneratingAudio(false);
    }
  };

  const handleGenerateContent = async (chId: string) => {
    const chapter = course.chapters.find(c => c.id === chId);
    if (!chapter) return;
    if (!course.title) return alert("Define el título del curso primero.");
    if (chapter.content.length > 50) {
        if (!confirm("Esto reemplazará el contenido actual. ¿Continuar?")) return;
    }

    setGeneratingContent(true);
    try {
        const html = await generateLessonContent(course.title, chapter.title);
        updateChapter(chId, 'content', html);
    } catch (e) {
        alert("Error generando contenido.");
    } finally {
        setGeneratingContent(false);
    }
  };

  // --- Assignment Logic ---
  const handleDeptToggle = async (deptId: string, isChecked: boolean) => {
    await toggleCourseInDepartment(deptId, course.id, isChecked);
    setDepartments(await getDepartments());
  };

  const handleSelectAllDepartments = async (isChecked: boolean) => {
      await Promise.all(departments.map(d => toggleCourseInDepartment(d.id, course.id, isChecked)));
      setDepartments(await getDepartments());
  };

  const handleMassAssignByJob = async () => {
      if(!jobTitleQuery) return;
      setSaving(true);
      const result = await assignCourseToJobTitle(course.id, jobTitleQuery);
      setMassAssignCount(result.count);
      if (result.count > 0) {
        await sendMassEmailNotification(result.users, course.title);
      }
      setSaving(false);
      setTimeout(() => setMassAssignCount(null), 4000);
  };

  // --- Prerequisite Logic ---
  const togglePrerequisite = (prereqId: string) => {
      const current = course.prerequisites || [];
      const updated = current.includes(prereqId) 
          ? current.filter(id => id !== prereqId) 
          : [...current, prereqId];
      setCourse({ ...course, prerequisites: updated });
  };

  // --- AI Quiz ---
  const generateAIQuiz = async () => {
    if (course.chapters.length === 0) return alert("Agrega contenido al curso primero.");
    setGeneratingQuiz(true);
    setAiError(null);
    try {
      const questions = await generateQuizFromContent(course.chapters, aiPromptCount);
      setCourse(prev => ({
        ...prev,
        quiz: {
          passingScore: 80,
          questions: questions
        }
      }));
    } catch (err: any) {
      setAiError(err.message);
    } finally {
      setGeneratingQuiz(false);
    }
  };

  const updateQuestion = (idx: number, field: keyof Question, value: any) => {
    if (!course.quiz) return;
    const newQuestions = [...course.quiz.questions];
    newQuestions[idx] = { ...newQuestions[idx], [field]: value };
    setCourse({ ...course, quiz: { ...course.quiz, questions: newQuestions } });
  };

  const updateOption = (qIdx: number, oIdx: number, value: string) => {
    if (!course.quiz) return;
    const newQuestions = [...course.quiz.questions];
    const newOptions = [...newQuestions[qIdx].options];
    newOptions[oIdx] = value;
    newQuestions[qIdx].options = newOptions;
    setCourse({ ...course, quiz: { ...course.quiz, questions: newQuestions } });
  };

  const addQuestion = () => {
    const newQ: Question = {
      id: crypto.randomUUID(),
      text: "Nueva Pregunta",
      options: ["Opción A", "Opción B", "Opción C", "Opción D"],
      correctOptionIndex: 0
    };
    const currentQuestions = course.quiz?.questions || [];
    setCourse({
      ...course,
      quiz: { passingScore: course.quiz?.passingScore || 80, questions: [...currentQuestions, newQ] }
    });
  };

  const removeQuestion = (idx: number) => {
    if (!course.quiz) return;
    const newQuestions = course.quiz.questions.filter((_, i) => i !== idx);
    setCourse({ ...course, quiz: { ...course.quiz, questions: newQuestions } });
  };

  if (loading) return <div className="p-12 text-center">Cargando editor...</div>;

  const activeChapter = course.chapters.find(c => c.id === activeChapterId);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-slate-200 sticky top-20 z-40 gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/admin/courses')} className="p-2 hover:bg-slate-100 rounded-full">
            <ArrowLeft className="w-5 h-5 text-slate-500" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">{isNew ? 'Nuevo Curso' : 'Editar Curso'}</h1>
            <div className="text-xs text-slate-500 flex items-center gap-2">
               ID: <span className="font-mono">{course.id.substring(0,8)}...</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
           {!isNew && (
             <Button variant="ghost" onClick={handlePreview} title="Ver como estudiante">
                <Eye className="w-4 h-4 mr-2 text-slate-500" /> Vista Previa
             </Button>
           )}

           <div className="h-8 w-px bg-slate-200 mx-2 hidden md:block"></div>

           <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase">Estatus:</span>
              <select 
                value={course.status}
                onChange={(e) => setCourse({...course, status: e.target.value as CourseStatus})}
                className={`text-sm font-bold border-0 rounded-md py-1.5 pl-3 pr-8 ring-1 ring-inset focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6 ${
                    course.status === 'PUBLISHED' ? 'bg-green-50 text-green-700 ring-green-600/20' :
                    course.status === 'ARCHIVED' ? 'bg-orange-50 text-orange-700 ring-orange-600/20' :
                    'bg-slate-50 text-slate-700 ring-slate-300'
                }`}
              >
                <option value="DRAFT">Borrador</option>
                <option value="PUBLISHED">Publicado</option>
                <option value="ARCHIVED">Archivado</option>
              </select>
           </div>

           <Button onClick={() => handleSave(false)} isLoading={saving} className="ml-2">
             <Save className="w-4 h-4 mr-2" />
             Guardar
           </Button>
        </div>
      </div>

      <div className="flex border-b border-slate-200 overflow-x-auto bg-white rounded-t-xl px-2 pt-2">
        <button
          onClick={() => setActiveTab('content')}
          className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'content' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          1. Lecciones
        </button>
        <button
          onClick={() => setActiveTab('quiz')}
          className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'quiz' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          2. Examen (IA)
        </button>
        <button
          onClick={() => setActiveTab('resources')}
          className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'resources' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          3. Recursos Descargables
        </button>
        <button
            onClick={() => setActiveTab('settings')}
            className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'settings' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
        >
            4. Configuración y Legal
        </button>
        <button
            onClick={() => !isNew && setActiveTab('assign')}
            disabled={isNew}
            className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'assign' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 cursor-not-allowed'
            }`}
        >
            5. Audiencia
        </button>
      </div>

      {activeTab === 'content' && (
        <div className="bg-white rounded-b-xl border border-t-0 border-slate-200 shadow-sm min-h-[600px] flex">
            {/* ... Content Tab implementation ... */}
            <div className="w-72 border-r border-slate-200 bg-slate-50 flex flex-col">
                <div className="p-4 border-b border-slate-200">
                    <h3 className="font-bold text-slate-700 mb-2">Estructura del Curso</h3>
                    <Button onClick={addChapter} size="sm" className="w-full">
                        <Plus className="w-4 h-4 mr-2" /> Nueva Lección
                    </Button>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {course.chapters.map((ch, idx) => (
                        <div 
                            key={ch.id} 
                            onClick={() => setActiveChapterId(ch.id)}
                            className={`group p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md flex items-center justify-between ${
                                activeChapterId === ch.id 
                                ? 'bg-white border-indigo-500 shadow-sm ring-1 ring-indigo-500' 
                                : 'bg-white border-slate-200 hover:border-indigo-300'
                            }`}
                        >
                            <div className="flex items-center overflow-hidden">
                                <span className="bg-slate-100 text-slate-500 text-xs font-mono px-1.5 py-0.5 rounded mr-2 shrink-0">{idx + 1}</span>
                                <span className="text-sm font-medium text-slate-800 truncate">{ch.title}</span>
                            </div>
                        </div>
                    ))}
                    {course.chapters.length === 0 && (
                        <div className="text-center p-4 text-slate-400 text-sm italic">
                            No hay lecciones.
                        </div>
                    )}
                </div>
            </div>

            <div className="flex-1 p-8 bg-white overflow-y-auto">
                {/* ... Main Content Area ... */}
                <div className="max-w-4xl mx-auto space-y-8">
                    <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-100 mb-8 relative">
                        <h2 className="text-sm font-bold text-indigo-900 uppercase tracking-wide mb-3">Información General del Curso</h2>
                        
                        <div className="absolute top-4 right-4">
                            <Button 
                                size="sm" 
                                variant="secondary" 
                                className="bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-sm"
                                onClick={handleGenerateStructure}
                                isLoading={generatingStructure}
                                title="La IA creará lecciones basadas en el título y descripción"
                            >
                                <Wand2 className="w-4 h-4 mr-2 text-indigo-600" />
                                Generar Temario con IA
                            </Button>
                        </div>

                        <div className="grid gap-4">
                             <div>
                                <label className="block text-xs font-bold text-indigo-800 mb-1">Título del Curso</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 bg-white text-slate-900 border border-indigo-200 rounded-md focus:ring-2 focus:ring-indigo-500"
                                    value={course.title}
                                    onChange={e => setCourse({ ...course, title: e.target.value })}
                                />
                             </div>
                             <div>
                                <label className="block text-xs font-bold text-indigo-800 mb-1">Descripción Corta</label>
                                <textarea
                                    className="w-full px-3 py-2 bg-white text-slate-900 border border-indigo-200 rounded-md focus:ring-2 focus:ring-indigo-500 h-16"
                                    value={course.description}
                                    onChange={e => setCourse({ ...course, description: e.target.value })}
                                />
                             </div>
                             <div>
                                <label className="block text-xs font-bold text-indigo-800 mb-1">Imagen de Portada (URL)</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 bg-white text-slate-900 border border-indigo-200 rounded-md focus:ring-2 focus:ring-indigo-500"
                                    value={course.coverImage || ''}
                                    onChange={e => setCourse({ ...course, coverImage: e.target.value })}
                                />
                             </div>
                        </div>
                    </div>

                    {activeChapter ? (
                        <div className="animate-fade-in space-y-6">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                                <h2 className="text-xl font-bold text-slate-900">Editar Lección</h2>
                                <button onClick={() => removeChapter(activeChapter.id)} className="text-red-500 hover:text-red-700 text-sm flex items-center">
                                    <Trash className="w-4 h-4 mr-1" /> Eliminar Lección
                                </button>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Título de la Lección</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-2 text-lg font-bold text-slate-900 bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500"
                                    value={activeChapter.title}
                                    onChange={e => updateChapter(activeChapter.id, 'title', e.target.value)}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Video className="w-5 h-5 text-red-500" />
                                        <label className="text-sm font-bold text-slate-700">Video (YouTube)</label>
                                    </div>
                                    <input
                                        type="text"
                                        className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-md text-sm"
                                        placeholder="https://youtube.com/..."
                                        value={activeChapter.videoUrl || ''}
                                        onChange={e => updateChapter(activeChapter.id, 'videoUrl', e.target.value)}
                                    />
                                    
                                    {/* Video Interaction Manager */}
                                    {activeChapter.videoUrl && (
                                        <div className="mt-4 border-t border-slate-200 pt-4">
                                            <h4 className="text-xs font-bold text-slate-600 uppercase mb-2 flex items-center gap-1">
                                                <AlertCircle className="w-3 h-3" /> Interacciones
                                            </h4>
                                            <div className="space-y-2 mb-3">
                                                {(activeChapter.videoInteractions || []).map(int => (
                                                    <div key={int.id} className="bg-white p-2 rounded border border-slate-200 text-xs flex justify-between items-center">
                                                        <span className="text-slate-900">{int.timestamp}s: {int.question.text}</span>
                                                        <button onClick={() => removeVideoInteraction(activeChapter.id, int.id)} className="text-red-500"><X className="w-3 h-3"/></button>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="flex gap-2 text-xs">
                                                <input 
                                                    type="number" 
                                                    placeholder="Seg" 
                                                    className="w-16 p-2 border border-slate-300 rounded bg-white text-slate-900" 
                                                    value={newInteractionTime} 
                                                    onChange={e => setNewInteractionTime(Number(e.target.value))} 
                                                />
                                                <input 
                                                    type="text" 
                                                    placeholder="Pregunta (V/F)" 
                                                    className="flex-1 p-2 border border-slate-300 rounded bg-white text-slate-900" 
                                                    value={newInteractionQuestion} 
                                                    onChange={e => setNewInteractionQuestion(e.target.value)} 
                                                />
                                                <button onClick={() => addVideoInteraction(activeChapter.id)} className="bg-indigo-600 text-white px-2 rounded">+</button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 relative">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Mic className="w-5 h-5 text-purple-500" />
                                        <label className="text-sm font-bold text-slate-700">Audio / Narración IA</label>
                                    </div>
                                    
                                    <div className="flex gap-2 mb-4">
                                        <input
                                            type="text"
                                            className="flex-1 px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-md text-sm"
                                            placeholder="URL del audio..."
                                            value={activeChapter.audioUrl || ''}
                                            onChange={e => updateChapter(activeChapter.id, 'audioUrl', e.target.value)}
                                        />
                                        <Button 
                                            type="button" 
                                            size="sm" 
                                            onClick={() => handleGenerateAudio(activeChapter.id, false)}
                                            className="bg-purple-600 hover:bg-purple-700 border-0"
                                            title="Generar Narración (Monólogo)"
                                            isLoading={generatingAudio}
                                        >
                                            <Mic className="w-4 h-4" />
                                        </Button>
                                    </div>

                                    {/* Dialogue Scripter */}
                                    <div className="border-t border-slate-200 pt-3">
                                        <div className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1">
                                            <MessageSquare className="w-3 h-3" /> Generador de Diálogo (Multi-Voz)
                                        </div>
                                        <textarea 
                                            placeholder="Guion Narrador..." 
                                            className="w-full text-xs p-2 border border-slate-300 rounded mb-2 bg-white text-slate-900"
                                            value={dialogueNarrator}
                                            onChange={e => setDialogueNarrator(e.target.value)}
                                        />
                                        <textarea 
                                            placeholder="Guion Experto (Fenrir)..." 
                                            className="w-full text-xs p-2 border border-slate-300 rounded mb-2 bg-white text-slate-900"
                                            value={dialogueExpert}
                                            onChange={e => setDialogueExpert(e.target.value)}
                                        />
                                        <Button 
                                            size="sm" 
                                            className="w-full bg-indigo-600"
                                            onClick={() => handleGenerateAudio(activeChapter.id, true)}
                                            isLoading={generatingAudio}
                                        >
                                            <Wand2 className="w-3 h-3 mr-2" /> Generar Conversación
                                        </Button>
                                    </div>
                                </div>
                            </div>
                            
                             <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                <div className="flex items-center gap-2 mb-2">
                                    <ImageIcon className="w-5 h-5 text-indigo-500" />
                                    <label className="text-sm font-bold text-slate-700">Imagen de Soporte</label>
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        className="flex-1 px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-md text-sm"
                                        placeholder="URL de la imagen..."
                                        value={activeChapter.imageUrl || ''}
                                        onChange={e => updateChapter(activeChapter.id, 'imageUrl', e.target.value)}
                                    />
                                    <div className="relative overflow-hidden">
                                        <Button type="button" variant="secondary" size="sm">Subir</Button>
                                        <input 
                                            type="file" 
                                            accept="image/*"
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                            onChange={(e) => handleFileUpload(activeChapter.id, 'imageUrl', e.target.files?.[0] || null)}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <FileText className="w-5 h-5 text-slate-500" />
                                        <label className="text-sm font-bold text-slate-700">Contenido de la Lección</label>
                                    </div>
                                    
                                    {/* AI Writer Button */}
                                    <button 
                                        onClick={() => handleGenerateContent(activeChapter.id)}
                                        disabled={generatingContent}
                                        className="text-xs flex items-center gap-1 bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-3 py-1.5 rounded-full font-bold hover:shadow-md transition-all disabled:opacity-70"
                                    >
                                        {generatingContent ? (
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                        ) : (
                                            <Sparkles className="w-3 h-3" />
                                        )}
                                        {generatingContent ? 'Escribiendo...' : 'Autocompletar con IA'}
                                    </button>
                                </div>
                                
                                <RichTextEditor 
                                    value={activeChapter.content} 
                                    onChange={(val) => updateChapter(activeChapter.id, 'content', val)} 
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-20 text-slate-400">
                            <p>Selecciona una lección del menú izquierdo para editar su contenido.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}

      {/* Quiz Tab */}
      {activeTab === 'quiz' && (
        <div className="space-y-8 animate-fade-in">
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-xl border border-indigo-100 shadow-sm">
            <div className="flex items-start justify-between flex-col md:flex-row gap-4">
              <div>
                <h3 className="text-lg font-bold text-indigo-900 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-600" />
                  Generador de Exámenes con IA
                </h3>
                <p className="text-sm text-indigo-700 mt-1 max-w-xl">
                  La IA leerá todas las lecciones creadas y generará un examen integral.
                </p>
              </div>
              <div className="flex items-center gap-2 bg-white p-3 rounded-lg border border-indigo-100 shadow-sm">
                <span className="text-sm text-slate-700 font-bold pl-2">Preguntas:</span>
                <input 
                  type="number" 
                  min="1" 
                  max="20" 
                  value={aiPromptCount} 
                  onChange={e => setAiPromptCount(parseInt(e.target.value))}
                  className="w-20 border border-slate-300 rounded text-center text-sm py-1 bg-white text-slate-900 font-bold focus:ring-2 focus:ring-indigo-500"
                />
                <Button onClick={generateAIQuiz} isLoading={generatingQuiz} size="sm">
                  Generar Borrador
                </Button>
              </div>
            </div>
            {aiError && (
              <div className="mt-4 p-3 bg-red-50 text-red-700 text-sm rounded-md flex items-center border border-red-100">
                <AlertCircle className="w-4 h-4 mr-2" />
                {aiError}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-semibold text-slate-900">Preguntas del Examen ({course.quiz?.questions.length || 0})</h3>
              <div className="flex items-center gap-4">
                <label className="text-sm text-slate-700 font-medium">
                  Puntaje de Aprobación (%):
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={course.quiz?.passingScore || 80}
                    onChange={e => setCourse(prev => ({ ...prev, quiz: { ...prev.quiz!, passingScore: parseInt(e.target.value) } }))}
                    className="ml-2 w-16 px-2 py-1 bg-white border border-slate-300 rounded text-center text-slate-900 font-bold focus:ring-indigo-500"
                    disabled={!course.quiz}
                  />
                </label>
                <Button size="sm" variant="secondary" onClick={addQuestion}>
                  <Plus className="w-4 h-4 mr-1" /> Agregar Pregunta
                </Button>
              </div>
            </div>

            {!course.quiz || course.quiz.questions.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                Aún no hay preguntas. Usa la IA para generarlas o agrégalas manualmente.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {course.quiz.questions.map((q, qIdx) => (
                  <div key={q.id} className="p-6 bg-slate-50/50 hover:bg-slate-100 transition-colors group">
                    <div className="flex justify-between items-start mb-4 gap-4">
                      <div className="flex-1">
                        <span className="text-xs font-bold text-slate-500 mb-2 block uppercase tracking-wide">Pregunta {qIdx + 1}</span>
                        <input
                          type="text"
                          value={q.text}
                          onChange={e => updateQuestion(qIdx, 'text', e.target.value)}
                          className="w-full font-semibold text-slate-900 bg-white border border-slate-300 rounded-md focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none p-3 shadow-sm"
                          placeholder="Ingresa el texto de la pregunta..."
                        />
                      </div>
                      <button 
                        onClick={() => removeQuestion(qIdx)}
                        className="mt-6 text-slate-400 hover:text-red-600 transition-colors p-2 rounded-full hover:bg-red-50"
                      >
                        <Trash className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="space-y-3 pl-4">
                      {q.options.map((opt, oIdx) => (
                        <div key={oIdx} className="flex items-center gap-3">
                          <button
                            onClick={() => updateQuestion(qIdx, 'correctOptionIndex', oIdx)}
                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                              q.correctOptionIndex === oIdx 
                                ? 'border-green-500 bg-green-50' 
                                : 'border-slate-300 bg-white hover:border-slate-400'
                            }`}
                          >
                            {q.correctOptionIndex === oIdx && <div className="w-3 h-3 bg-green-500 rounded-full" />}
                          </button>
                          <input
                            type="text"
                            value={opt}
                            onChange={e => updateOption(qIdx, oIdx, e.target.value)}
                            className={`flex-1 text-sm bg-white text-slate-900 border border-slate-300 rounded-md focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:outline-none px-3 py-2 ${
                              q.correctOptionIndex === oIdx ? 'text-green-800 font-medium bg-green-50 border-green-200' : 'text-slate-700'
                            }`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'resources' && (
          <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                      <File className="w-5 h-5 text-indigo-600" /> 
                      Recursos Descargables
                  </h3>
                  <p className="text-sm text-slate-500 mb-6">
                      Adjunta documentos PDF, enlaces externos o videos complementarios para que los estudiantes puedan descargarlos.
                  </p>
                  
                  {/* Add Resource Form */}
                  <div className="flex gap-2 mb-6 items-end bg-slate-50 p-4 rounded-lg border border-slate-200">
                      <div className="flex-1">
                          <label className="block text-xs font-bold text-slate-500 mb-1">Título del Recurso</label>
                          <input 
                              type="text" 
                              className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded text-sm"
                              placeholder="Ej. Manual de Usuario en PDF"
                              value={newResource.title}
                              onChange={e => setNewResource({...newResource, title: e.target.value})}
                          />
                      </div>
                      <div className="w-32">
                          <label className="block text-xs font-bold text-slate-500 mb-1">Tipo</label>
                          <select 
                              className="w-full px-3 py-2 border border-slate-300 rounded text-sm bg-white text-slate-900"
                              value={newResource.type}
                              onChange={e => setNewResource({...newResource, type: e.target.value as any})}
                          >
                              <option value="PDF">Documento PDF</option>
                              <option value="LINK">Enlace Web</option>
                              <option value="FILE">Archivo General</option>
                              <option value="VIDEO">Video Externo</option>
                          </select>
                      </div>
                      <div className="flex-1">
                          <label className="block text-xs font-bold text-slate-500 mb-1">URL / Enlace</label>
                          <input 
                              type="text" 
                              className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded text-sm"
                              placeholder="https://..."
                              value={newResource.url}
                              onChange={e => setNewResource({...newResource, url: e.target.value})}
                          />
                      </div>
                      <Button onClick={addResource} disabled={!newResource.title || !newResource.url}>
                          <Plus className="w-4 h-4" />
                      </Button>
                  </div>

                  {/* Resource List */}
                  <div className="space-y-2">
                      {course.resources && course.resources.length > 0 ? (
                          course.resources.map(res => (
                              <div key={res.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 transition-colors">
                                  <div className="flex items-center gap-3">
                                      <div className={`p-2 rounded ${res.type === 'PDF' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                                          {res.type === 'PDF' ? <FileText className="w-4 h-4"/> : <Link className="w-4 h-4"/>}
                                      </div>
                                      <div>
                                          <div className="font-bold text-sm text-slate-700">{res.title}</div>
                                          <div className="text-xs text-slate-400 truncate max-w-xs">{res.url}</div>
                                      </div>
                                  </div>
                                  <button onClick={() => removeResource(res.id)} className="text-slate-400 hover:text-red-500 p-2">
                                      <Trash className="w-4 h-4" />
                                  </button>
                              </div>
                          ))
                      ) : (
                          <div className="text-center py-8 text-slate-400 italic bg-slate-50 rounded-lg border border-dashed border-slate-200">
                              No hay recursos adjuntos.
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* NEW SETTINGS TAB */}
      {activeTab === 'settings' && (
          <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
              
              {/* Prerrequisitos Section */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                      <Link className="w-5 h-5 text-indigo-600" /> 
                      Prerrequisitos
                  </h3>
                  <p className="text-sm text-slate-500 mb-4">
                      Selecciona qué cursos debe completar el estudiante <strong>antes</strong> de poder iniciar este curso.
                  </p>
                  
                  <div className="space-y-2 border rounded-md p-2 max-h-60 overflow-y-auto bg-slate-50 mb-6">
                      {otherCourses.length === 0 ? (
                          <p className="text-slate-400 italic text-sm p-2">No hay otros cursos disponibles.</p>
                      ) : (
                          otherCourses.map(oc => {
                              const isPrereq = (course.prerequisites || []).includes(oc.id);
                              return (
                                  <label key={oc.id} className={`flex items-center p-3 rounded bg-white border cursor-pointer ${isPrereq ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200'}`}>
                                      <input 
                                          type="checkbox" 
                                          className="h-4 w-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 mr-3"
                                          checked={isPrereq}
                                          onChange={() => togglePrerequisite(oc.id)}
                                      />
                                      <span className="text-sm font-medium text-slate-700">{oc.title}</span>
                                  </label>
                              )
                          })
                      )}
                  </div>
              </div>

              {/* Legal & Compliance Section */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                      <Shield className="w-24 h-24 text-red-600" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2 relative z-10">
                      <Shield className="w-5 h-5 text-red-600" /> 
                      Compliance y Legal
                  </h3>
                  
                  <div className="relative z-10">
                      <label className={`flex items-start p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          course.requiresSignature 
                          ? 'border-red-500 bg-red-50' 
                          : 'border-slate-200 hover:border-slate-300'
                      }`}>
                          <input 
                              type="checkbox" 
                              className="h-5 w-5 text-red-600 rounded border-gray-300 focus:ring-red-500 mt-1 mr-4"
                              checked={course.requiresSignature || false}
                              onChange={(e) => setCourse({...course, requiresSignature: e.target.checked})}
                          />
                          <div>
                              <div className="font-bold text-slate-900">Requerir Firma Digital</div>
                              <p className="text-sm text-slate-600 mt-1">
                                  Si se activa, el estudiante deberá escribir su nombre completo y aceptar una declaración jurada al finalizar el curso. 
                                  Esto es obligatorio para cursos de ética, seguridad y normativas legales.
                              </p>
                          </div>
                      </label>
                  </div>
              </div>
          </div>
      )}

      {activeTab === 'assign' && !isNew && (
         <div className="grid md:grid-cols-2 gap-8 animate-fade-in">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden h-fit">
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2 justify-between">
                    <div className="flex items-center gap-2">
                        <Briefcase className="w-5 h-5 text-slate-500" />
                        <h3 className="font-bold text-slate-900">Vincular con Departamentos</h3>
                    </div>
                    <div className="flex items-center bg-white px-2 py-1 rounded border border-slate-200">
                        <label className="text-xs text-indigo-700 font-bold cursor-pointer hover:underline flex items-center">
                             <input 
                                type="checkbox" 
                                className="mr-2 h-3 w-3 text-indigo-600 rounded border-slate-300"
                                onChange={(e) => handleSelectAllDepartments(e.target.checked)}
                             />
                             Seleccionar Todos
                        </label>
                    </div>
                </div>
                <div className="p-6">
                    <div className="space-y-2 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                        {departments.map(dept => {
                            const isAssigned = dept.courseIds.includes(course.id);
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
                        {departments.length === 0 && <p className="text-slate-500 italic">No hay departamentos configurados.</p>}
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden h-fit">
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                    <Users className="w-5 h-5 text-slate-500" />
                    <h3 className="font-bold text-slate-900">Asignación Masiva por Puesto</h3>
                </div>
                <div className="p-6">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Seleccionar Puesto (Job Title)</label>
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
                        </div>
                        
                        {massAssignCount !== null && (
                            <div className="p-3 bg-green-50 text-green-700 rounded-md flex items-center text-sm animate-fade-in border border-green-200">
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Se asignó y notificó a {massAssignCount} empleados.
                            </div>
                        )}
                    </div>
                </div>
            </div>
         </div>
      )}
    </div>
  );
};
