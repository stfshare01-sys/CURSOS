

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Course, Chapter, Resource, VideoInteraction } from '../../types';
import { getCourseById, submitQuizResult, getCurrentUser, submitCourseFeedback, logAction } from '../../services/store';
import { createTutorSession } from '../../services/geminiService';
import { Button } from '../../components/Button';
import { ArrowLeft, CheckCircle, XCircle, Award, PlayCircle, FileText, Menu, ChevronRight, Maximize2, Minimize2, User, MessageSquare, Send, X, Bot, Star, File, Link, Download, Play, Pause, AlertCircle, Smartphone, Flag, AlertTriangle, ShieldCheck, PenTool } from 'lucide-react';
import { Chat, GenerateContentResponse } from "@google/genai";
import confetti from 'canvas-confetti';
import { generateCertificate } from '../../services/pdfService';

interface ChatMessage {
    id: string;
    role: 'user' | 'model';
    text: string;
}

export const CoursePlayer: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  
  // Navigation State
  const [activeChapterIndex, setActiveChapterIndex] = useState(0);
  const [mode, setMode] = useState<'learn' | 'quiz' | 'result'>('learn');
  const [viewMode, setViewMode] = useState<'classic' | 'stories'>('classic');
  const [sidebarOpen, setSidebarOpen] = useState(true); 
  const [zenMode, setZenMode] = useState(false);
  const [resourcePanelOpen, setResourcePanelOpen] = useState(false);
  const [autoAdvance, setAutoAdvance] = useState(true);

  // Interaction State
  const [currentInteraction, setCurrentInteraction] = useState<VideoInteraction | null>(null);
  const [interactionAnswer, setInteractionAnswer] = useState<number | null>(null);
  const [showInteractionResult, setShowInteractionResult] = useState(false);
  const [interactionError, setInteractionError] = useState(false);

  // Signature State
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [signatureName, setSignatureName] = useState('');
  const [signatureCheck, setSignatureCheck] = useState(false);

  // Report Issue State
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportType, setReportType] = useState('video_issue');
  const [reportText, setReportText] = useState('');

  // Quiz State
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [score, setScore] = useState(0);
  const [passed, setPassed] = useState(false);

  // Feedback State
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  // Chat State
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMsg, setInputMsg] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatSessionRef = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Media Refs
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoIframeRef = useRef<HTMLIFrameElement>(null); 
  const [mockVideoTime, setMockVideoTime] = useState(0);
  const videoIntervalRef = useRef<any>(null);

  // Stories Timer Ref
  const storiesIntervalRef = useRef<any>(null);
  const [storyProgress, setStoryProgress] = useState(0);

  useEffect(() => {
    if (id) getCourseById(id).then(c => {
        setCourse(c || null);
    });
  }, [id]);

  useEffect(() => {
      if (course && course.chapters[activeChapterIndex]) {
          const content = course.chapters[activeChapterIndex].content;
          chatSessionRef.current = createTutorSession(content);
          setMessages([{
              id: 'intro',
              role: 'model',
              text: `Hola, soy tu tutor de IA para esta lección: "${course.chapters[activeChapterIndex].title}". ¿Tienes alguna duda sobre el contenido?`
          }]);
          
          setCurrentInteraction(null);
          setMockVideoTime(0);
          if (videoIntervalRef.current) clearInterval(videoIntervalRef.current);
          
          if (course.chapters[activeChapterIndex].videoUrl) {
              videoIntervalRef.current = setInterval(() => {
                  setMockVideoTime(prev => {
                      const chapter = course.chapters[activeChapterIndex];
                      if(chapter.videoInteractions) {
                          const hit = chapter.videoInteractions.find(i => Math.abs(i.timestamp - prev) < 1);
                          if (hit && !currentInteraction) {
                              setCurrentInteraction(hit);
                          }
                      }
                      return currentInteraction ? prev : prev + 1;
                  });
              }, 1000);
          }

          if (viewMode === 'stories') {
              setStoryProgress(0);
              if (storiesIntervalRef.current) clearInterval(storiesIntervalRef.current);
              
              const duration = 15000;
              const step = 100;
              
              storiesIntervalRef.current = setInterval(() => {
                  setStoryProgress(prev => {
                      if (prev >= 100) {
                          clearInterval(storiesIntervalRef.current);
                          if (activeChapterIndex < course.chapters.length - 1) {
                              handleNextChapter();
                          }
                          return 100;
                      }
                      return prev + (step / duration) * 100;
                  });
              }, step);
          }
      }
      return () => {
          if (videoIntervalRef.current) clearInterval(videoIntervalRef.current);
          if (storiesIntervalRef.current) clearInterval(storiesIntervalRef.current);
      }
  }, [activeChapterIndex, course, currentInteraction, viewMode]);

  useEffect(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chatOpen]);

  const toggleZenMode = () => {
    if (!zenMode) {
        setZenMode(true);
        setSidebarOpen(false);
        if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen().catch(err => console.log(err));
        }
    } else {
        setZenMode(false);
        setSidebarOpen(true);
        if (document.exitFullscreen) {
            document.exitFullscreen().catch(err => console.log(err));
        }
    }
  };

  const handleNextChapter = () => {
      if (!course) return;
      if (activeChapterIndex < course.chapters.length - 1) {
          setActiveChapterIndex(prev => prev + 1);
          window.scrollTo(0, 0);
      } else {
          if (course.quiz && course.quiz.questions.length > 0) {
            setMode('quiz');
          } else {
            completeCourseWithoutQuiz();
          }
      }
  };

  const completeCourseWithoutQuiz = async () => {
     if (!course) return;
     
     // Correct Order: Check signature requirement BEFORE setting mode to result
     if (course.requiresSignature) {
         setShowSignatureModal(true);
         return;
     }

     setScore(100);
     setPassed(true);
     setMode('result');
     setViewMode('classic');
     
     confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 }
     });

     const user = getCurrentUser();
     if (user) {
        await submitQuizResult(user.id, course.id, 100, true);
     }
  };

  const handleSignatureSubmit = async () => {
      if (!signatureCheck || !signatureName.trim() || !course) return;
      const user = getCurrentUser();
      
      if (user && signatureName.toLowerCase() !== user.name.toLowerCase()) {
          alert("El nombre de la firma debe coincidir exactamente con tu nombre de usuario.");
          return;
      }

      setShowSignatureModal(false);
      
      const finalScore = mode === 'quiz' ? score : 100;
      
      if (user) {
          await submitQuizResult(user.id, course.id, finalScore, true, {
              signedName: signatureName,
              timestamp: Date.now(),
              declaration: "Declaro bajo juramento haber completado este curso personalmente.",
              ipHash: crypto.randomUUID()
          });
      }

      setScore(finalScore);
      setPassed(true);
      setMode('result');
      setViewMode('classic');
      
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 }
     });
  };

  const handlePrevChapter = () => {
      if (activeChapterIndex > 0) {
          setActiveChapterIndex(prev => prev - 1);
          window.scrollTo(0, 0);
      }
  };

  const handleStoryTap = (e: React.MouseEvent) => {
      const width = window.innerWidth;
      const x = e.clientX;
      if (x > width / 2) {
          handleNextChapter();
      } else {
          handlePrevChapter();
      }
  };

  const submitInteraction = (optionIdx: number) => {
      if(!currentInteraction) return;
      const isCorrect = optionIdx === currentInteraction.question.correctOptionIndex;
      setInteractionAnswer(optionIdx);
      setShowInteractionResult(true);
      
      if (!isCorrect) {
          setInteractionError(true);
      } else {
          setInteractionError(false);
          setTimeout(() => {
              setCurrentInteraction(null);
              setInteractionAnswer(null);
              setShowInteractionResult(false);
              setMockVideoTime(t => t + 2);
          }, 2000);
      }
  };

  const handleRetryInteraction = () => {
      setInteractionAnswer(null);
      setShowInteractionResult(false);
      setInteractionError(false);
      setMockVideoTime(Math.max(0, mockVideoTime - 5));
      setCurrentInteraction(null);
  };

  const handleAudioEnded = () => {
      if (autoAdvance) {
          handleNextChapter();
      }
  };

  const handleOptionSelect = (qId: string, oIdx: number) => {
    setAnswers(prev => ({ ...prev, [qId]: oIdx }));
  };

  const submitQuiz = async () => {
    if (!course || !course.quiz) return;

    let correctCount = 0;
    course.quiz.questions.forEach(q => {
      if (answers[q.id] === q.correctOptionIndex) correctCount++;
    });

    const finalScore = Math.round((correctCount / course.quiz.questions.length) * 100);
    const isPassed = finalScore >= course.quiz.passingScore;

    setScore(finalScore);
    
    if (isPassed) {
        if (course.requiresSignature) {
            setShowSignatureModal(true);
        } else {
            setPassed(true);
            setMode('result');
            confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
            const user = getCurrentUser();
            if (user) {
                await submitQuizResult(user.id, course.id, finalScore, true);
            }
        }
    } else {
        setPassed(false);
        setMode('result');
    }
  };

  const handleFeedbackSubmit = async () => {
      const user = getCurrentUser();
      if (user && course && rating > 0) {
          await submitCourseFeedback(user.id, course.id, rating, feedback);
          setFeedbackSubmitted(true);
      }
  };

  const handleSendChat = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!inputMsg.trim() || !chatSessionRef.current) return;
      
      const userText = inputMsg;
      setInputMsg('');
      
      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'user', text: userText }]);
      setIsTyping(true);
      
      try {
          const result = await chatSessionRef.current.sendMessage({ message: userText });
          const responseText = result.text;
          
          setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'model', text: responseText }]);
      } catch (err) {
          setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'model', text: "Lo siento, tuve un problema al procesar tu pregunta. Intenta de nuevo." }]);
      } finally {
          setIsTyping(false);
      }
  };

  const handleReportSubmit = async () => {
      if (!reportText) return;
      const user = getCurrentUser();
      await logAction(user?.id || 'anon', 'ISSUE_REPORTED', `[${reportType}] ${reportText} (Curso: ${course?.title})`);
      setReportModalOpen(false);
      setReportText('');
      alert("Reporte enviado. Gracias por ayudarnos a mejorar.");
  };

  const handleDownloadCertificate = async () => {
      const user = getCurrentUser();
      if (!user || !course) return;
      await logAction(user.id, 'CERTIFICATE_DOWNLOADED', `Certificado descargado para curso ${course.title}`);
      const record = { completedAt: Date.now() }; 
      const dateStr = new Date(record.completedAt!).toLocaleDateString();
      generateCertificate(user.name, course.title, dateStr);
  };

  if (!course) return <div className="p-12 text-center">Cargando curso...</div>;

  const currentChapter = course.chapters[activeChapterIndex];

  // --- STORIES MODE RENDER ---
  if (viewMode === 'stories' && mode === 'learn' && currentChapter) {
      return (
          <div className="fixed inset-0 bg-black z-[200] flex items-center justify-center">
              <div className="w-full max-w-md h-full md:h-[90vh] md:rounded-2xl relative bg-slate-900 overflow-hidden shadow-2xl flex flex-col">
                  {/* ... Stories UI ... */}
                  <div className="absolute top-0 left-0 right-0 z-20 p-2 flex gap-1">
                      {course.chapters.map((_, idx) => (
                          <div key={idx} className="h-1 bg-white/30 flex-1 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-white transition-all duration-300 ease-linear"
                                style={{ 
                                    width: idx < activeChapterIndex ? '100%' : 
                                           idx === activeChapterIndex ? `${storyProgress}%` : '0%' 
                                }}
                              />
                          </div>
                      ))}
                  </div>

                  <div className="absolute top-4 left-0 right-0 z-20 px-4 flex justify-between items-center text-white">
                      <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-xs">
                              {activeChapterIndex + 1}
                          </div>
                          <span className="font-bold text-sm shadow-black drop-shadow-md truncate max-w-[200px]">{currentChapter.title}</span>
                      </div>
                      <button onClick={() => setViewMode('classic')} className="p-2 bg-black/20 rounded-full hover:bg-black/40 backdrop-blur-sm">
                          <X className="w-5 h-5" />
                      </button>
                  </div>

                  <div className="flex-1 relative" onClick={handleStoryTap}>
                      {currentChapter.videoUrl ? (
                          <div className="absolute inset-0 flex items-center bg-black">
                              <iframe
                                width="100%"
                                height="100%"
                                src={`https://www.youtube.com/embed/${currentChapter.videoUrl.split('v=')[1]?.split('&')[0]}?autoplay=1&controls=0&modestbranding=1`}
                                frameBorder="0"
                                allow="autoplay; encrypted-media"
                                allowFullScreen
                                className="pointer-events-none"
                              ></iframe>
                          </div>
                      ) : (
                          <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 to-purple-900 flex flex-col justify-center p-8">
                              {currentChapter.imageUrl && (
                                  <img src={currentChapter.imageUrl} className="w-full max-h-60 object-cover rounded-xl mb-6 shadow-lg" />
                              )}
                              <h2 className="text-2xl font-bold text-white mb-4 text-center leading-tight">{currentChapter.title}</h2>
                              <div 
                                className="prose prose-invert prose-sm max-h-[40vh] overflow-hidden text-center text-indigo-100"
                                dangerouslySetInnerHTML={{ __html: currentChapter.content }}
                              />
                              {currentChapter.audioUrl && (
                                  <div className="mt-6 flex justify-center">
                                      <div className="bg-white/10 backdrop-blur-md p-3 rounded-full animate-pulse">
                                          <PlayCircle className="w-8 h-8 text-white" />
                                      </div>
                                      <audio src={currentChapter.audioUrl} autoPlay className="hidden" />
                                  </div>
                              )}
                          </div>
                      )}
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 z-20 p-6 bg-gradient-to-t from-black/90 to-transparent pt-12">
                      <p className="text-center text-white/50 text-xs animate-pulse mb-4">
                          Toca los lados para navegar
                      </p>
                      <Button className="w-full bg-white text-black hover:bg-slate-200" onClick={() => setViewMode('classic')}>
                          Ver Detalles / Interactuar
                      </Button>
                  </div>
              </div>
          </div>
      );
  }

  // --- CLASSIC RENDER ---
  return (
    <div className={`flex h-screen overflow-hidden bg-slate-50 fixed inset-0 z-[100] ${zenMode ? 'bg-black' : ''}`}>
      
      {/* Signature Modal */}
      {showSignatureModal && (
          <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in-up">
                  <div className="bg-red-600 p-6 text-white text-center">
                      <ShieldCheck className="w-12 h-12 mx-auto mb-2" />
                      <h2 className="text-xl font-bold uppercase tracking-widest">Firma Digital Requerida</h2>
                      <p className="text-red-100 text-sm">Este es un curso de cumplimiento obligatorio</p>
                  </div>
                  <div className="p-8 space-y-6">
                      <div className="bg-slate-50 p-4 rounded-lg text-sm text-slate-600 border border-slate-200 italic">
                          "Por la presente certifico que he completado todo el material del curso <strong>{course.title}</strong> y comprendo las políticas aquí descritas. Entiendo que esta firma digital tiene validez interna para auditorías de cumplimiento."
                      </div>
                      
                      <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-slate-50">
                          <input 
                              type="checkbox" 
                              className="h-5 w-5 text-red-600 rounded border-gray-300 focus:ring-red-500 mr-3"
                              checked={signatureCheck}
                              onChange={e => setSignatureCheck(e.target.checked)}
                          />
                          <span className="text-sm font-bold text-slate-800">Acepto los términos de la declaración jurada</span>
                      </label>

                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre Completo (Firma)</label>
                          <div className="relative">
                              <PenTool className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                              <input 
                                  type="text" 
                                  className="w-full pl-9 pr-4 py-3 bg-white text-slate-900 border-2 border-slate-300 rounded-lg font-serif text-lg focus:border-red-500 focus:ring-0 placeholder:font-sans placeholder:text-sm"
                                  placeholder="Escribe tu nombre exacto..."
                                  value={signatureName}
                                  onChange={e => setSignatureName(e.target.value)}
                              />
                          </div>
                          <p className="text-xs text-slate-400 mt-2">Debe coincidir con tu nombre de usuario.</p>
                      </div>

                      <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                          <Button variant="ghost" onClick={() => setShowSignatureModal(false)}>Cancelar</Button>
                          <Button 
                            className="bg-red-600 hover:bg-red-700" 
                            disabled={!signatureCheck || !signatureName.trim()}
                            onClick={handleSignatureSubmit}
                          >
                              Firmar y Finalizar
                          </Button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Report Issue Modal */}
      {reportModalOpen && (
          <div className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm animate-fade-in-up">
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-orange-500" /> Reportar Problema
                  </h3>
                  <div className="space-y-3">
                      <select 
                        className="w-full p-2 border rounded bg-white text-slate-900"
                        value={reportType}
                        onChange={e => setReportType(e.target.value)}
                      >
                          <option value="video_issue">Video no carga</option>
                          <option value="content_error">Error en el texto</option>
                          <option value="audio_issue">Problema de audio</option>
                          <option value="bug">Bug de la plataforma</option>
                      </select>
                      <textarea 
                        className="w-full p-2 border rounded h-24 text-sm bg-white text-slate-900"
                        placeholder="Describe el problema..."
                        value={reportText}
                        onChange={e => setReportText(e.target.value)}
                      />
                      <div className="flex justify-end gap-2">
                          <Button variant="ghost" onClick={() => setReportModalOpen(false)}>Cancelar</Button>
                          <Button onClick={handleReportSubmit}>Enviar Reporte</Button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Sidebar Navigation */}
      {mode === 'learn' && sidebarOpen && !zenMode && (
        <div className={`w-80 bg-white border-r border-slate-200 flex-col hidden md:flex h-full`}>
            <div className="p-4 border-b border-slate-100 bg-slate-50">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Curso</div>
                <h2 className="font-bold text-slate-900 leading-tight">{course.title}</h2>
            </div>
            <div className="flex-1 overflow-y-auto">
                {course.chapters.map((ch, idx) => {
                    const isActive = idx === activeChapterIndex;
                    const isPast = idx < activeChapterIndex;
                    
                    return (
                        <button 
                            key={ch.id} 
                            onClick={() => setActiveChapterIndex(idx)}
                            className={`w-full text-left p-4 border-b border-slate-50 flex items-start gap-3 transition-colors ${
                                isActive ? 'bg-indigo-50 border-l-4 border-l-indigo-600' : 'hover:bg-slate-50 border-l-4 border-l-transparent'
                            }`}
                        >
                            <div className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                                isActive ? 'bg-indigo-600 text-white' : isPast ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-500'
                            }`}>
                                {isPast ? <CheckCircle className="w-4 h-4" /> : idx + 1}
                            </div>
                            <div>
                                <div className={`text-sm font-medium ${isActive ? 'text-indigo-900' : 'text-slate-700'}`}>
                                    {ch.title}
                                </div>
                                <div className="text-xs text-slate-400 mt-1 flex items-center">
                                    {ch.videoUrl ? <PlayCircle className="w-3 h-3 mr-1" /> : <FileText className="w-3 h-3 mr-1" />}
                                    {ch.estimatedMinutes} min
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>
            
            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-2">
                <label className="flex items-center text-xs text-slate-600 cursor-pointer">
                    <input type="checkbox" checked={autoAdvance} onChange={e => setAutoAdvance(e.target.checked)} className="mr-2" />
                    Autoreproducir
                </label>
                {course.resources && course.resources.length > 0 && (
                    <button 
                        onClick={() => setResourcePanelOpen(true)}
                        className="w-full flex items-center justify-center py-2 text-sm text-indigo-600 font-bold bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                    >
                        <File className="w-4 h-4 mr-2" /> Recursos ({course.resources.length})
                    </button>
                )}
                <Button variant="ghost" className="w-full justify-start" onClick={() => navigate('/student/dashboard')}>
                    <ArrowLeft className="w-4 h-4 mr-2" /> Salir del Curso
                </Button>
            </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className={`flex-1 overflow-y-auto relative ${zenMode ? 'bg-slate-900 flex justify-center' : 'bg-slate-50'}`}>
        
        {/* Header Controls */}
        <div className={`absolute top-4 right-6 z-40 flex gap-2 ${zenMode ? 'opacity-0 hover:opacity-100 transition-opacity' : ''}`}>
             
             {/* Report Button */}
             <button 
                onClick={() => setReportModalOpen(true)}
                className="p-2 bg-white/90 backdrop-blur rounded-full shadow-md text-slate-400 hover:text-red-500 transition-colors"
                title="Reportar Error"
             >
                <Flag className="w-5 h-5" />
             </button>

             {/* Stories Mode Toggle */}
             {mode === 'learn' && (
                 <button 
                    onClick={() => setViewMode('stories')}
                    className="p-2 bg-white/90 backdrop-blur rounded-full shadow-md text-indigo-600 hover:bg-indigo-50 transition-colors"
                    title="Modo Historias (Móvil)"
                 >
                    <Smartphone className="w-5 h-5" />
                 </button>
             )}

             <button 
                onClick={toggleZenMode}
                className="p-2 bg-white/90 backdrop-blur rounded-full shadow-md text-slate-700 hover:text-indigo-600 transition-colors"
                title={zenMode ? "Salir de Pantalla Completa" : "Modo Enfoque"}
             >
                {zenMode ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
             </button>
             
             {zenMode && (
                 <button 
                    onClick={() => { toggleZenMode(); navigate('/student/dashboard'); }}
                    className="p-2 bg-red-100/90 backdrop-blur rounded-full shadow-md text-red-600 hover:bg-red-200 transition-colors"
                    title="Salir del Curso"
                 >
                    <ArrowLeft className="w-5 h-5" />
                 </button>
             )}
        </div>

        {/* Chat FAB */}
        {mode === 'learn' && (
            <button
                onClick={() => setChatOpen(!chatOpen)}
                className={`fixed bottom-8 right-8 z-50 p-4 rounded-full shadow-2xl transition-all hover:scale-105 flex items-center gap-2 font-bold ${
                    chatOpen ? 'bg-red-500 text-white rotate-0' : 'bg-indigo-600 text-white'
                }`}
            >
                {chatOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
                {!chatOpen && <span className="hidden md:inline">Tutor IA</span>}
            </button>
        )}

        {/* Resources Side Panel */}
        {resourcePanelOpen && (
            <div className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-sm flex justify-end" onClick={() => setResourcePanelOpen(false)}>
                <div className="w-80 bg-white h-full shadow-2xl p-6 overflow-y-auto animate-fade-in-up" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-lg text-slate-900">Recursos</h3>
                        <button onClick={() => setResourcePanelOpen(false)}><X className="w-5 h-5 text-slate-400" /></button>
                    </div>
                    <div className="space-y-3">
                        {course.resources?.map(res => (
                            <a 
                                key={res.id} 
                                href={res.url} 
                                target="_blank" 
                                rel="noreferrer"
                                className="block p-4 border border-slate-200 rounded-xl hover:border-indigo-500 hover:shadow-md transition-all group"
                            >
                                <div className="flex items-center gap-3 mb-2">
                                    <div className={`p-2 rounded-lg ${res.type === 'PDF' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                                        {res.type === 'PDF' ? <FileText className="w-5 h-5"/> : <Link className="w-5 h-5"/>}
                                    </div>
                                    <span className="text-xs font-bold text-slate-400">{res.type}</span>
                                </div>
                                <div className="font-bold text-slate-800 text-sm group-hover:text-indigo-700">{res.title}</div>
                            </a>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {/* Chat Interface */}
        {chatOpen && (
            <div className="fixed bottom-24 right-8 z-50 w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col h-[500px] animate-fade-in-up overflow-hidden">
                <div className="bg-indigo-600 p-4 text-white flex items-center gap-3 shadow-sm">
                    <div className="bg-white/20 p-2 rounded-full"><Bot className="w-5 h-5" /></div>
                    <div>
                        <h3 className="font-bold text-sm">Tutor Virtual</h3>
                        <p className="text-xs text-indigo-200">Pregunta sobre esta lección</p>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                    {messages.map(msg => (
                        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] rounded-2xl p-3 text-sm shadow-sm ${
                                msg.role === 'user' 
                                ? 'bg-indigo-600 text-white rounded-br-none' 
                                : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'
                            }`}>
                                {msg.text}
                            </div>
                        </div>
                    ))}
                    {isTyping && (
                         <div className="flex justify-start">
                             <div className="bg-white border border-slate-200 p-3 rounded-2xl rounded-bl-none shadow-sm flex gap-1">
                                 <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                                 <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                                 <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                             </div>
                         </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
                <form onSubmit={handleSendChat} className="p-3 bg-white border-t border-slate-100 flex gap-2">
                    <input 
                        className="flex-1 bg-white border border-slate-300 rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 transition-colors text-slate-900"
                        placeholder="Escribe tu duda..."
                        value={inputMsg}
                        onChange={e => setInputMsg(e.target.value)}
                    />
                    <button 
                        type="submit" 
                        disabled={!inputMsg.trim() || isTyping}
                        className="p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </form>
            </div>
        )}

        <div className={`w-full ${zenMode ? 'max-w-5xl py-10 px-8' : 'max-w-4xl mx-auto p-6 md:p-12'}`}>
            
            {mode === 'learn' && currentChapter && (
                <div className="space-y-8 animate-fade-in pb-20">
                    {!zenMode && (
                        <div className="flex items-center justify-between md:hidden mb-4">
                             <Button variant="ghost" size="sm" onClick={() => navigate('/student/dashboard')}>
                                <ArrowLeft className="w-4 h-4 mr-1" /> Salir
                             </Button>
                             <span className="text-sm font-bold text-slate-500">
                                 {activeChapterIndex + 1} / {course.chapters.length}
                             </span>
                        </div>
                    )}

                    <h1 className={`text-3xl font-bold ${zenMode ? 'text-white' : 'text-slate-900'}`}>{currentChapter.title}</h1>

                    {/* STICKY Audio Player */}
                    {currentChapter.audioUrl && (
                        <div className={`sticky top-0 z-30 p-4 rounded-xl border flex items-center gap-4 backdrop-blur-md shadow-lg transition-all ${
                            zenMode ? 'bg-slate-800/80 border-slate-700 text-white' : 'bg-white/80 border-indigo-100'
                        }`}>
                            <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white shrink-0 shadow-sm animate-pulse">
                                <PlayCircle className="w-6 h-6" />
                            </div>
                            <div className="flex-1">
                                <div className={`text-xs font-bold uppercase mb-1 ${zenMode ? 'text-indigo-300' : 'text-indigo-800'}`}>Narración de Lección (IA)</div>
                                <audio 
                                    ref={audioRef}
                                    controls 
                                    className="w-full h-8" 
                                    src={currentChapter.audioUrl} 
                                    onEnded={handleAudioEnded}
                                />
                            </div>
                        </div>
                    )}

                    {/* Video Player */}
                    {currentChapter.videoUrl && (
                        <div className="relative aspect-video bg-black rounded-xl overflow-hidden shadow-lg group">
                            {currentInteraction ? (
                                <div className="absolute inset-0 bg-black/90 z-20 flex flex-col items-center justify-center p-8 animate-fade-in">
                                    <div className="max-w-md w-full text-center">
                                        <div className="mb-6">
                                            <AlertCircle className="w-12 h-12 text-yellow-400 mx-auto mb-2" />
                                            <h3 className="text-xl font-bold text-white mb-4">Pregunta Interactiva</h3>
                                            <p className="text-lg font-medium text-slate-200">{currentInteraction.question.text}</p>
                                        </div>
                                        
                                        {!showInteractionResult ? (
                                            <div className="space-y-3">
                                                {currentInteraction.question.options.map((opt, idx) => (
                                                    <button 
                                                        key={idx}
                                                        onClick={() => submitInteraction(idx)}
                                                        className="w-full p-4 rounded-lg bg-slate-800 hover:bg-indigo-600 text-white text-left transition-colors border border-slate-700"
                                                    >
                                                        {opt}
                                                    </button>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="animate-fade-in-up">
                                                {interactionError ? (
                                                    <div className="bg-red-500/20 border border-red-500 text-red-200 p-4 rounded-lg mb-4">
                                                        Incorrecto. Debes repasar esta sección.
                                                    </div>
                                                ) : (
                                                    <div className="bg-green-500/20 border border-green-500 text-green-200 p-4 rounded-lg mb-4">
                                                        ¡Correcto! Continuando el video...
                                                    </div>
                                                )}
                                                {interactionError && (
                                                    <Button onClick={handleRetryInteraction} variant="secondary">
                                                        Reintentar (Retroceder 5s)
                                                    </Button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : null}

                            <iframe
                                ref={videoIframeRef}
                                width="100%"
                                height="100%"
                                src={`https://www.youtube.com/embed/${currentChapter.videoUrl.split('v=')[1]?.split('&')[0]}?controls=1`}
                                frameBorder="0"
                                allowFullScreen
                                className={currentInteraction ? 'blur-sm' : ''}
                            ></iframe>
                        </div>
                    )}

                    {/* Image */}
                    {currentChapter.imageUrl && (
                        <div className="rounded-xl overflow-hidden border border-slate-200">
                            <img src={currentChapter.imageUrl} alt={currentChapter.title} className="w-full h-auto object-cover max-h-[500px]" />
                        </div>
                    )}

                    {/* Text Content */}
                    <div 
                       className={`prose prose-lg max-w-none ${zenMode ? 'text-slate-300 prose-invert' : 'text-slate-700'}`}
                       dangerouslySetInnerHTML={{ __html: currentChapter.content }}
                    />

                    {/* Navigation Footer */}
                    <div className={`flex justify-between items-center pt-12 border-t mt-12 ${zenMode ? 'border-slate-800' : 'border-slate-200'}`}>
                        <Button 
                            variant="secondary" 
                            disabled={activeChapterIndex === 0}
                            onClick={handlePrevChapter}
                        >
                            Anterior
                        </Button>
                        <Button onClick={handleNextChapter} className="group">
                            {activeChapterIndex === course.chapters.length - 1 
                                ? (course.quiz ? 'Finalizar y Tomar Examen' : 'Finalizar Curso') 
                                : 'Siguiente Lección'
                            }
                            <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                        </Button>
                    </div>
                </div>
            )}

            {mode === 'quiz' && course.quiz && (
                <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
                    <Button variant="ghost" onClick={() => setMode('learn')} className="mb-4 pl-0">
                         <ArrowLeft className="w-4 h-4 mr-2" /> Volver al Contenido
                    </Button>

                    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
                        <div className="bg-indigo-600 p-8 text-white text-center">
                            <Award className="w-16 h-16 mx-auto mb-4 text-indigo-200" />
                            <h2 className="text-2xl font-bold mb-2">Evaluación Final</h2>
                            <p className="text-indigo-100">
                                Demuestra tu conocimiento para obtener el certificado.
                                <br/>
                                <span className="font-bold text-white mt-2 inline-block">Nota mínima: {course.quiz.passingScore}%</span>
                            </p>
                        </div>
                        
                        <div className="p-8 space-y-12">
                            {course.quiz.questions.map((q, idx) => (
                            <div key={q.id}>
                                <h3 className="text-lg font-medium text-slate-900 mb-4">
                                <span className="text-indigo-600 font-bold mr-2">{idx + 1}.</span>
                                {q.text}
                                </h3>
                                <div className="space-y-3 pl-6">
                                {q.options.map((opt, oIdx) => (
                                    <label key={oIdx} className={`flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all ${
                                    answers[q.id] === oIdx 
                                        ? 'border-indigo-600 bg-indigo-50' 
                                        : 'border-slate-100 hover:border-slate-300'
                                    }`}>
                                    <input
                                        type="radio"
                                        name={q.id}
                                        className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                                        checked={answers[q.id] === oIdx}
                                        onChange={() => handleOptionSelect(q.id, oIdx)}
                                    />
                                    <span className="ml-3 text-slate-700">{opt}</span>
                                    </label>
                                ))}
                                </div>
                            </div>
                            ))}
                        </div>

                        <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end">
                            <Button 
                            size="lg"
                            onClick={submitQuiz}
                            disabled={Object.keys(answers).length < course.quiz.questions.length}
                            >
                            Enviar Respuestas
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {mode === 'result' && (
                <div className={`max-w-md mx-auto text-center mt-12 p-10 rounded-3xl shadow-xl border animate-fade-in ${
                    zenMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'
                }`}>
                <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 ${
                    passed ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                }`}>
                    {passed ? <Award className="w-12 h-12" /> : <XCircle className="w-12 h-12" />}
                </div>
                
                <h2 className={`text-3xl font-black mb-2 ${zenMode ? 'text-white' : 'text-slate-900'}`}>
                    {passed ? '¡Aprobado!' : 'No Aprobado'}
                </h2>
                
                <div className={`text-6xl font-black mb-6 tracking-tighter ${zenMode ? 'text-indigo-400' : 'text-slate-900'}`}>{score}%</div>
                
                <p className={`mb-8 text-lg ${zenMode ? 'text-slate-300' : 'text-slate-600'}`}>
                    {passed 
                    ? "Has completado satisfactoriamente el curso. Puedes descargar tu certificado." 
                    : "No alcanzaste el puntaje necesario. Te recomendamos repasar los capítulos."}
                </p>

                {/* Signature Receipt */}
                {passed && course.requiresSignature && (
                    <div className="mb-6 bg-slate-50 border border-slate-200 p-4 rounded-lg text-left text-xs">
                        <h4 className="font-bold text-slate-800 uppercase mb-2 flex items-center gap-1"><ShieldCheck className="w-3 h-3"/> Recibo de Firma</h4>
                        <p className="text-slate-600 mb-1">Firmado por: <strong>{getCurrentUser()?.name}</strong></p>
                        <p className="text-slate-400 font-mono">TS: {Date.now()}</p>
                    </div>
                )}

                {/* Rating Section - Only if Passed */}
                {passed && !feedbackSubmitted && (
                    <div className={`mb-8 p-4 rounded-xl ${zenMode ? 'bg-slate-700' : 'bg-slate-50'}`}>
                        <h3 className={`text-sm font-bold mb-3 uppercase ${zenMode ? 'text-slate-300' : 'text-slate-500'}`}>Califica este curso</h3>
                        <div className="flex justify-center gap-2 mb-4">
                            {[1, 2, 3, 4, 5].map(star => (
                                <button
                                    key={star}
                                    onClick={() => setRating(star)}
                                    className={`transition-transform hover:scale-110 ${rating >= star ? 'text-yellow-400' : 'text-slate-300'}`}
                                >
                                    <Star className="w-8 h-8 fill-current" />
                                </button>
                            ))}
                        </div>
                        {rating > 0 && (
                            <div className="animate-fade-in">
                                <textarea
                                    className={`w-full p-3 rounded-md text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${zenMode ? 'bg-slate-600 text-white placeholder-slate-400' : 'bg-white border border-slate-200'}`}
                                    placeholder="¿Qué te pareció el curso? (Opcional)"
                                    rows={2}
                                    value={feedback}
                                    onChange={e => setFeedback(e.target.value)}
                                />
                                <Button size="sm" onClick={handleFeedbackSubmit}>Enviar Opinión</Button>
                            </div>
                        )}
                    </div>
                )}
                {feedbackSubmitted && (
                    <div className="mb-8 p-3 bg-green-50 text-green-700 rounded-lg text-sm font-bold flex items-center justify-center">
                        <CheckCircle className="w-4 h-4 mr-2" /> ¡Gracias por tu opinión!
                    </div>
                )}

                <div className="space-y-3">
                    {passed ? (
                    <Button className="w-full h-12 text-lg animate-pulse" onClick={handleDownloadCertificate}>
                        <Download className="w-5 h-5 mr-2" />
                        Descargar Certificado
                    </Button>
                    ) : (
                    <Button className="w-full h-12 text-lg" onClick={() => { setAnswers({}); setMode('quiz'); }}>
                        Reintentar Examen
                    </Button>
                    )}
                    <Button variant="ghost" className={`w-full ${zenMode ? 'text-slate-300 hover:text-white hover:bg-slate-700' : ''}`} onClick={() => navigate('/student/dashboard')}>
                        Volver al Tablero
                    </Button>
                </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
