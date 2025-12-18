import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, getDoc, getDocs, setDoc, updateDoc, query, where, deleteDoc, writeBatch } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { User, Course, CourseProgress, Department, LearningPath, AuditLog, AppNotification, Role, Scenario, DigitalSignature, CourseAnalytics, FeedbackItem, QuestionAnalysis } from '../types';

// --- 1. CONFIGURACIÓN SEGURA (Firebase) ---
const firebaseConfig = {
  apiKey: import.meta.env.VITE_API_KEY,
  authDomain: import.meta.env.VITE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_APP_ID
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);

// --- 2. HELPERS Y SEEDING MEJORADO (Carga inicial de estructura) ---
const DEFAULT_JOB_TITLES = ['Director General', 'Gerente de Ventas', 'Gerente de TI', 'Gerente de RRHH', 'Desarrollador Senior', 'Operario'];

const seedDatabaseIfEmpty = async () => {
    try {
        // Verificamos si ya existen usuarios para no sobrescribir
        const usersSnap = await getDocs(collection(db, 'users'));
        if (!usersSnap.empty) return; 

        console.log("🏗️ Estructurando Base de Datos (Creando colecciones base)...");
        const batch = writeBatch(db);

        // A) Crear Usuario Admin por defecto
        const admin: User = { 
            id: 'u1', name: 'Admin Inicial', role: Role.ADMIN, jobTitle: 'Director General', 
            completedCourseIds: [], assignedCourseIds: [], isActive: true 
        };
        batch.set(doc(db, 'users', admin.id), admin);
        
        // B) Crear Configuración de Puestos (Para que funcione el dropdown)
        batch.set(doc(db, 'settings', 'jobTitles'), { list: DEFAULT_JOB_TITLES });

        // C) Crear Departamento Base (Para que no esté vacía la sección)
        const defaultDept: Department = { id: 'dept-general', name: 'General', courseIds: [] };
        batch.set(doc(db, 'departments', defaultDept.id), defaultDept);

        await batch.commit();
        console.log("✅ Estructura de Base de Datos creada correctamente.");
    } catch (e) {
        console.error("Error en seeding:", e);
    }
};
// Ejecutamos la carga inicial
seedDatabaseIfEmpty();

// Helper para simular delay si es necesario
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));


// --- 3. TODAS LAS FUNCIONES DEL ARCHIVO ORIGINAL (INTACTAS) ---

// === AUTH SERVICE ===

export const login = async (role: Role): Promise<User> => {
    // 1. Buscamos si existe el usuario en la nube
    const q = query(collection(db, 'users'), where('role', '==', role), where('isActive', '==', true));
    const s = await getDocs(q);
    
    // 2. Si no existe, LO CREAMOS en lugar de lanzar error (Auto-fix)
    if (s.empty) {
        console.log(`⚠️ Creando usuario de emergencia para rol: ${role}...`);
        
        const newUser: User = {
            id: role === Role.ADMIN ? 'admin-auto' : 'emp-auto',
            name: role === Role.ADMIN ? 'Administrador (Auto)' : 'Empleado de Prueba',
            role: role,
            jobTitle: role === Role.ADMIN ? 'Director' : 'Desarrollador',
            completedCourseIds: [],
            assignedCourseIds: [],
            assignedPathIds: [],
            isActive: true,
            // Asignamos el departamento base que creamos en el seeding
            departmentId: role === Role.EMPLOYEE ? 'dept-general' : undefined 
        };

        await setDoc(doc(db, 'users', newUser.id), newUser);
        
        localStorage.setItem('agilelms_current_user', JSON.stringify(newUser));
        await logAction(newUser.id, 'LOGIN', `Inicio de sesión (Auto-creado) como ${role}`);
        return newUser;
    }
    
    // 3. Si ya existía, entramos normal
    const user = s.docs[0].data() as User;
    localStorage.setItem('agilelms_current_user', JSON.stringify(user));
    await logAction(user.id, 'LOGIN', `Inicio de sesión como ${role}`);
    return user;
};

export const getCurrentUser = (): User | null => {
    const s = localStorage.getItem('agilelms_current_user'); return s ? JSON.parse(s) : null;
};

export const logout = async () => { 
    const u = getCurrentUser();
    if (u) await logAction(u.id, 'LOGOUT', 'Cierre de sesión');
    localStorage.removeItem('agilelms_current_user'); 
};


// === USER MANAGEMENT ===

export const getAllUsers = async (): Promise<User[]> => { 
    const s = await getDocs(collection(db, 'users')); return s.docs.map(d => d.data() as User); 
};

export const getUser = async (id: string): Promise<User | null> => { 
    const d = await getDoc(doc(db, 'users', id)); return d.exists() ? d.data() as User : null; 
};

export const createUser = async (user: User) => { await setDoc(doc(db, 'users', user.id), user); };

export const updateUser = async (id: string, data: Partial<User>) => { await updateDoc(doc(db, 'users', id), data); };

export const getEmployees = async (): Promise<User[]> => {
    const q = query(collection(db, 'users'), where('role', '==', 'EMPLOYEE'));
    const s = await getDocs(q); return s.docs.map(d => d.data() as User);
};

export const registerEmployee = async (name: string, departmentId?: string, jobTitle?: string): Promise<User> => {
    const newUser: User = { 
        id: crypto.randomUUID(), name, role: Role.EMPLOYEE, jobTitle: jobTitle || 'Empleado', 
        completedCourseIds: [], assignedCourseIds: [], assignedPathIds: [], departmentId, isActive: true 
    };
    await createUser(newUser);
    return newUser;
};

export const toggleUserStatus = async (userId: string) => {
    const user = await getUser(userId);
    if (user) await updateDoc(doc(db, 'users', userId), { isActive: !user.isActive });
};

export const updateUserCourses = async (userId: string, courseIds: string[], pathIds?: string[]) => {
    const data: any = { assignedCourseIds: courseIds };
    if (pathIds) data.assignedPathIds = pathIds;
    await updateDoc(doc(db, 'users', userId), data);
};

export const enrollStudent = async (userId: string, courseId: string) => {
    const user = await getUser(userId);
    if (user && !user.assignedCourseIds.includes(courseId)) {
        await updateDoc(doc(db, 'users', userId), { assignedCourseIds: [...user.assignedCourseIds, courseId] });
    }
};


// === COURSE SERVICE ===

export const getCourses = async (): Promise<Course[]> => { 
    const s = await getDocs(collection(db, 'courses')); return s.docs.map(d => d.data() as Course); 
};

export const getCourseById = async (id: string): Promise<Course | undefined> => { 
    const d = await getDoc(doc(db, 'courses', id)); return d.exists() ? d.data() as Course : undefined; 
};

export const saveCourse = async (c: Course) => { await setDoc(doc(db, 'courses', c.id), c, { merge: true }); };

export const createCourse = saveCourse; // Alias para compatibilidad
export const updateCourse = async (id: string, d: Partial<Course>) => { await updateDoc(doc(db, 'courses', id), d); };

export const deleteCourse = async (id: string) => { await deleteDoc(doc(db, 'courses', id)); };

export const toggleCourseInDepartment = async (deptId: string, courseId: string, add: boolean) => {
    const dept = (await getDoc(doc(db, 'departments', deptId))).data() as Department;
    if (!dept) return;
    let newIds = dept.courseIds || [];
    if (add && !newIds.includes(courseId)) newIds.push(courseId);
    else if (!add) newIds = newIds.filter(id => id !== courseId);
    await updateDoc(doc(db, 'departments', deptId), { courseIds: newIds });
};


// === DEPARTMENT SERVICE ===

export const getDepartments = async (): Promise<Department[]> => { 
    const s = await getDocs(collection(db, 'departments')); return s.docs.map(d => d.data() as Department); 
};

export const saveDepartment = async (d: Department) => { await setDoc(doc(db, 'departments', d.id), d, { merge: true }); };

export const createDepartment = saveDepartment; // Alias
export const updateDepartment = async (id: string, d: Partial<Department>) => { await updateDoc(doc(db, 'departments', id), d); };

export const deleteDepartment = async (id: string) => { await deleteDoc(doc(db, 'departments', id)); };


// === JOB TITLES SERVICE ===

export const getJobTitles = async (): Promise<string[]> => {
    const d = await getDoc(doc(db, 'settings', 'jobTitles'));
    return d.exists() ? d.data().list : DEFAULT_JOB_TITLES;
};

export const addJobTitle = async (title: string) => {
    const current = await getJobTitles();
    if (!current.includes(title)) await setDoc(doc(db, 'settings', 'jobTitles'), { list: [...current, title].sort() });
};

export const deleteJobTitle = async (title: string) => {
    const current = await getJobTitles();
    await setDoc(doc(db, 'settings', 'jobTitles'), { list: current.filter(t => t !== title) });
};

export const assignCourseToJobTitle = async (courseId: string, jobTitle: string) => {
    const users = await getEmployees();
    const batch = writeBatch(db);
    let count = 0;
    const affectedNames: string[] = [];
    users.forEach(u => {
        if (u.jobTitle === jobTitle && !u.assignedCourseIds.includes(courseId)) {
            batch.update(doc(db, 'users', u.id), { assignedCourseIds: [...u.assignedCourseIds, courseId] });
            count++;
            affectedNames.push(u.name);
        }
    });
    if (count > 0) await batch.commit();
    return { count, users: affectedNames };
};

export const assignPathToJobTitle = async (pathId: string, jobTitle: string) => {
    // Implementación compatible básica
    return { count: 0, users: [] };
};


// === LEARNING PATHS SERVICE ===

export const getLearningPaths = async (): Promise<LearningPath[]> => { 
    const s = await getDocs(collection(db, 'learningPaths')); return s.docs.map(d => d.data() as LearningPath); 
};

export const saveLearningPath = async (p: LearningPath) => { await setDoc(doc(db, 'learningPaths', p.id), p, { merge: true }); };
export const createLearningPath = saveLearningPath; // Alias
export const updateLearningPath = async (id: string, d: Partial<LearningPath>) => { await updateDoc(doc(db, 'learningPaths', id), d); };

export const deleteLearningPath = async (id: string) => { await deleteDoc(doc(db, 'learningPaths', id)); };

export const togglePathInDepartment = async (deptId: string, pathId: string, add: boolean) => {
    const dept = (await getDoc(doc(db, 'departments', deptId))).data() as Department;
    if (!dept) return;
    let newIds = dept.pathIds || [];
    if (add && !newIds.includes(pathId)) newIds.push(pathId);
    else if (!add) newIds = newIds.filter(id => id !== pathId);
    await updateDoc(doc(db, 'departments', deptId), { pathIds: newIds });
};


// === PROGRESS & ANALYTICS SERVICE ===

export const saveProgress = async (p: CourseProgress) => { 
    await setDoc(doc(db, 'progress', `${p.userId}_${p.courseId}`), p, { merge: true }); 
};

export const getProgress = async (userId: string, courseId: string): Promise<CourseProgress | null> => {
    const d = await getDoc(doc(db, 'progress', `${userId}_${courseId}`));
    return d.exists() ? d.data() as CourseProgress : null;
};

export const getUserProgress = async (userId: string): Promise<CourseProgress[]> => {
    const q = query(collection(db, 'progress'), where('userId', '==', userId));
    const s = await getDocs(q); return s.docs.map(d => d.data() as CourseProgress);
};

export const getEmployeeProgress = async (): Promise<(User & { progress: CourseProgress[] })[]> => {
    const employees = await getEmployees();
    const allProgressSnap = await getDocs(collection(db, 'progress'));
    const allProgress = allProgressSnap.docs.map(d => d.data() as CourseProgress);
    
    return employees.map(user => ({
        ...user,
        progress: allProgress.filter(p => p.userId === user.id)
    }));
};

export const submitQuizResult = async (userId: string, courseId: string, score: number, passed: boolean, signature?: DigitalSignature) => {
    if (!passed) return;
    const progress: CourseProgress = { 
        userId, courseId, status: 'COMPLETED', score, completedAt: Date.now(), signature 
    };
    await saveProgress(progress);
    await logAction(userId, 'COURSE_COMPLETED', `Curso ${courseId} aprobado con ${score}%`);
};

export const submitCourseFeedback = async (userId: string, courseId: string, rating: number, feedback: string) => {
    await updateDoc(doc(db, 'progress', `${userId}_${courseId}`), { rating, feedback });
};

export const getCourseAverageRating = async (courseId: string): Promise<{ avg: number, count: number }> => {
    const q = query(collection(db, 'progress'), where('courseId', '==', courseId));
    const s = await getDocs(q);
    const ratings = s.docs.map(d => (d.data() as CourseProgress).rating).filter(r => r !== undefined && r > 0) as number[];
    if (ratings.length === 0) return { avg: 0, count: 0 };
    const sum = ratings.reduce((a, b) => a + b, 0);
    return { avg: parseFloat((sum / ratings.length).toFixed(1)), count: ratings.length };
};

export const getUserCompletedCourses = async (userId: string): Promise<CourseProgress[]> => {
    const q = query(collection(db, 'progress'), where('userId', '==', userId), where('status', '==', 'COMPLETED'));
    const s = await getDocs(q); return s.docs.map(d => d.data() as CourseProgress);
};

export const getLeaderboard = async () => {
    const employees = await getEmployees();
    const allProgress = (await getDocs(collection(db, 'progress'))).docs.map(d => d.data() as CourseProgress);
    return employees.map(u => {
        const uProg = allProgress.filter(p => p.userId === u.id && p.status === 'COMPLETED');
        const totalScore = uProg.reduce((sum, p) => sum + (p.score || 0), 0);
        const points = (uProg.length * 500) + (totalScore * 5);
        const avgScore = uProg.length > 0 ? Math.round(totalScore / uProg.length) : 0;
        return { ...u, points, courses: uProg.length, avgScore };
    }).sort((a, b) => b.points - a.points).slice(0, 5);
};

export const getGlobalStats = async () => {
    const users = await getAllUsers();
    const courses = await getCourses();
    const progress = (await getDocs(collection(db, 'progress'))).docs.map(d => d.data() as CourseProgress);
    const completed = progress.filter(p => p.status === 'COMPLETED').length;
    return { 
        totalUsers: users.length, 
        activeCourses: courses.filter(c => c.status === 'PUBLISHED').length, 
        completionRate: 0, 
        recentActivity: [] 
    };
};

export const getCourseStats = async (courseId: string): Promise<CourseAnalytics> => {
    const progress = (await getDocs(query(collection(db, 'progress'), where('courseId', '==', courseId)))).docs.map(d => d.data() as CourseProgress);
    const completed = progress.filter(p => p.status === 'COMPLETED');
    const totalScore = completed.reduce((a, b) => a + (b.score || 0), 0);
    const avgScore = completed.length ? Math.round(totalScore / completed.length) : 0;
    
    // Feedback y ratings
    const rated = completed.filter(p => p.rating);
    const avgRating = rated.length ? rated.reduce((a,b) => a + (b.rating||0), 0) / rated.length : 0;
    const feedbackList: FeedbackItem[] = rated.filter(p => p.feedback).map(p => ({ userName: 'Usuario', rating: p.rating||0, comment: p.feedback||'', date: p.completedAt||0 }));
    
    return {
        totalEnrolled: progress.length,
        completedCount: completed.length,
        avgScore,
        avgRating,
        feedback: feedbackList,
        scoreBuckets: [0,0,0,0,0], 
        questionsAnalysis: []
    };
};


// === AUDIT & NOTIFICATIONS ===

export const logAction = async (userId: string, action: string, details: string) => {
    const log: AuditLog = {
        id: crypto.randomUUID(), userId, userName: 'Usuario', action, details, timestamp: Date.now()
    };
    await setDoc(doc(db, 'auditLogs', log.id), log);
};

export const getAuditLogs = async (): Promise<AuditLog[]> => { 
    const s = await getDocs(collection(db, 'auditLogs')); return s.docs.map(d => d.data() as AuditLog); 
};

export const getReportedIssues = async (): Promise<AuditLog[]> => {
    const q = query(collection(db, 'auditLogs'), where('action', '==', 'ISSUE_REPORTED'));
    const s = await getDocs(q); return s.docs.map(d => d.data() as AuditLog);
};

export const getNotifications = async (userId: string): Promise<AppNotification[]> => {
    const q = query(collection(db, 'notifications'), where('userId', '==', userId));
    const s = await getDocs(q); return s.docs.map(d => d.data() as AppNotification);
};

export const getNotificationsSync = (userId: string): AppNotification[] => []; 

export const createNotification = async (userId: string, title: string, message: string, type: 'info' | 'success' | 'warning' = 'info') => {
    const notif: AppNotification = { id: crypto.randomUUID(), userId, title, message, type, read: false, createdAt: Date.now() };
    await setDoc(doc(db, 'notifications', notif.id), notif);
};

export const markNotificationAsRead = async (id: string) => { await updateDoc(doc(db, 'notifications', id), { read: true }); };

export const markAllNotificationsAsRead = async (userId: string) => {
    const q = query(collection(db, 'notifications'), where('userId', '==', userId), where('read', '==', false));
    const s = await getDocs(q);
    const batch = writeBatch(db);
    s.docs.forEach(d => batch.update(d.ref, { read: true }));
    await batch.commit();
};


// === SCENARIOS & STORAGE ===

export const getScenarios = async (): Promise<Scenario[]> => { 
    const s = await getDocs(collection(db, 'scenarios')); return s.docs.map(d => d.data() as Scenario); 
};
export const saveScenario = async (s: Scenario) => { await setDoc(doc(db, 'scenarios', s.id), s, { merge: true }); };
export const deleteScenario = async (id: string) => { await deleteDoc(doc(db, 'scenarios', id)); };

export const uploadFile = async (file: File, path: string): Promise<string> => {
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return await getDownloadURL(storageRef);
};