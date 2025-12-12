
import { Course, CourseProgress, Role, User, Department, CourseStatus, Scenario, AuditLog, AppNotification, LearningPath, DigitalSignature, CourseAnalytics, FeedbackItem, QuestionAnalysis } from '../types';

const STORAGE_KEYS = {
  COURSES: 'agilelms_courses_v3',
  USERS: 'agilelms_users',
  PROGRESS: 'agilelms_progress',
  CURRENT_USER: 'agilelms_current_user',
  DEPARTMENTS: 'agilelms_departments',
  JOB_TITLES: 'agilelms_job_titles',
  SCENARIOS: 'agilelms_scenarios',
  AUDIT_LOGS: 'agilelms_audit_logs',
  NOTIFICATIONS: 'agilelms_notifications',
  LEARNING_PATHS: 'agilelms_learning_paths' 
};

// ... (Rest of Default Data and Basic Helpers remain the same - abbreviated for brevity) ...
// Default Job Titles
const DEFAULT_JOB_TITLES = [
  'Director General',
  'Gerente de Ventas',
  'Gerente de TI',
  'Gerente de RRHH',
  'Ejecutivo de Cuentas',
  'Desarrollador Senior',
  'Desarrollador Junior',
  'Analista de RRHH',
  'Soporte Técnico',
  'Operario',
  'Becario',
  'Consultor Externo'
];

// Initial Mock Data
const MOCK_DEPARTMENTS: Department[] = [
  { id: 'dept-1', name: 'Tecnología (TI)', courseIds: ['c-security', 'c-git', 'c-excel'], pathIds: [] },
  { id: 'dept-2', name: 'Recursos Humanos', courseIds: ['c-onboarding', 'c-ethics', 'c-wellness'], pathIds: ['path-1'] },
  { id: 'dept-3', name: 'Ventas y Marketing', courseIds: ['c-sales-101', 'c-crm'], pathIds: ['path-2'] },
  { id: 'dept-4', name: 'Operaciones', courseIds: ['c-safety', 'c-wellness'], pathIds: [] }
];

// Mock Learning Paths
const DEFAULT_PATHS: LearningPath[] = [
    {
        id: 'path-1',
        title: 'Onboarding Corporativo',
        description: 'La ruta esencial para todos los nuevos ingresos. Conoce la cultura, seguridad y herramientas.',
        courseIds: ['c-onboarding', 'c-security', 'c-ethics', 'c-wellness'],
        coverImage: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&q=80&w=2000'
    },
    {
        id: 'path-2',
        title: 'Carrera de Ventas B2B',
        description: 'De novato a experto en ventas consultivas y manejo de CRM.',
        courseIds: ['c-sales-101', 'c-crm', 'c-leadership'],
        coverImage: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&q=80&w=2000'
    }
];

// ... (MOCK_USERS, DEFAULT_SCENARIOS, DEFAULT_COURSES remain same) ...
const MOCK_USERS: User[] = [
  { 
    id: 'u1', 
    name: 'Alicia Administradora', 
    role: Role.ADMIN, 
    jobTitle: 'Director General',
    completedCourseIds: [],
    assignedCourseIds: [],
    assignedPathIds: [],
    isActive: true
  },
  { 
    id: 'u2', 
    name: 'Roberto Desarrollador', 
    role: Role.EMPLOYEE, 
    jobTitle: 'Desarrollador Senior',
    completedCourseIds: [],
    assignedCourseIds: ['c-security', 'c-git', 'c-wellness', 'c-excel'],
    assignedPathIds: [],
    isActive: true,
    departmentId: 'dept-1'
  },
  { 
    id: 'u3', 
    name: 'Carla Ventas', 
    role: Role.EMPLOYEE, 
    jobTitle: 'Ejecutivo de Cuentas',
    completedCourseIds: [],
    assignedCourseIds: ['c-sales-101', 'c-crm', 'c-onboarding', 'c-security', 'c-ethics', 'c-wellness'], 
    assignedPathIds: ['path-2'],
    isActive: true,
    departmentId: 'dept-3'
  }
];

const DEFAULT_SCENARIOS: Scenario[] = [
    {
        id: 'sales-1',
        title: 'Venta Difícil: Cliente Escéptico',
        description: 'Intentas vender nuestro software premium.',
        role: 'Gerente de Compras',
        difficulty: 'Medio',
        voice: 'Kore',
        color: 'bg-blue-600',
        systemInstruction: '...'
    }
];

const DEFAULT_COURSES: Course[] = [
  {
    id: 'c-security',
    title: 'Seguridad de la Información',
    description: 'Domina los protocolos esenciales.',
    coverImage: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b',
    status: 'PUBLISHED',
    requiresSignature: true, 
    createdAt: Date.now(),
    resources: [],
    chapters: [{ id: 'ch-1', title: 'Intro', content: '...', estimatedMinutes: 5 }],
    quiz: { passingScore: 80, questions: [{ id: 'q1', text: 'Q1', options: ['A','B'], correctOptionIndex: 0 }] }
  }
];

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- Auth Service --- (Same as before)
const getLocalUsers = (): User[] => {
  const stored = localStorage.getItem(STORAGE_KEYS.USERS);
  if (!stored) {
    saveLocalUsers(MOCK_USERS);
    return MOCK_USERS;
  }
  return JSON.parse(stored);
};
const saveLocalUsers = (users: User[]) => {
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
};
export const login = async (role: Role): Promise<User> => {
  await delay(500);
  const users = getLocalUsers();
  const user = users.find(u => u.role === role && u.isActive);
  if (!user) throw new Error("No active user found");
  localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
  await logAction(user.id, 'LOGIN', `Inicio de sesión exitoso como ${role}`);
  return user;
};
export const getCurrentUser = (): User | null => {
  const stored = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
  return stored ? JSON.parse(stored) : null;
};
export const logout = async () => {
  const user = getCurrentUser();
  if (user) await logAction(user.id, 'LOGOUT', 'Cierre de sesión');
  localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
};

// --- Audit & Reports ---

export const getAuditLogs = async (): Promise<AuditLog[]> => {
    const stored = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
    return stored ? JSON.parse(stored) : [];
};

export const getReportedIssues = async (): Promise<AuditLog[]> => {
    const logs = await getAuditLogs();
    return logs.filter(l => l.action === 'ISSUE_REPORTED');
};

export const logAction = async (userId: string, action: string, details: string) => {
    const logs = await getAuditLogs();
    const users = getLocalUsers();
    const user = users.find(u => u.id === userId);
    
    const newLog: AuditLog = {
        id: crypto.randomUUID(),
        userId,
        userName: user ? user.name : 'Unknown',
        action,
        details,
        timestamp: Date.now(),
        ip: '192.168.1.1' 
    };
    
    logs.unshift(newLog); 
    if (logs.length > 200) logs.pop();
    
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(logs));
};

// --- Notification Service --- (Same)
export const getNotifications = (userId: string): AppNotification[] => {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS) || '[]');
    return all.filter((n: AppNotification) => n.userId === userId).sort((a: any, b: any) => b.createdAt - a.createdAt);
};
export const createNotification = (userId: string, title: string, message: string, type: 'info' | 'success' | 'warning' = 'info') => {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS) || '[]');
    const newNotif: AppNotification = { id: crypto.randomUUID(), userId, title, message, type, read: false, createdAt: Date.now() };
    all.push(newNotif);
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(all));
};
export const markNotificationAsRead = (id: string) => {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS) || '[]');
    const updated = all.map((n: AppNotification) => n.id === id ? { ...n, read: true } : n);
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(updated));
};
export const markAllNotificationsAsRead = (userId: string) => {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS) || '[]');
    const updated = all.map((n: AppNotification) => n.userId === userId ? { ...n, read: true } : n);
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(updated));
};

// --- Job & Dept Services (Existing) ---
export const getJobTitles = async (): Promise<string[]> => {
    await delay(200);
    const stored = localStorage.getItem(STORAGE_KEYS.JOB_TITLES);
    if (!stored) { localStorage.setItem(STORAGE_KEYS.JOB_TITLES, JSON.stringify(DEFAULT_JOB_TITLES)); return DEFAULT_JOB_TITLES; }
    return JSON.parse(stored);
};
export const addJobTitle = async (title: string): Promise<void> => {
    await delay(300);
    const titles = await getJobTitles();
    if (!titles.includes(title)) { titles.push(title); titles.sort(); localStorage.setItem(STORAGE_KEYS.JOB_TITLES, JSON.stringify(titles)); }
};
export const deleteJobTitle = async (title: string): Promise<void> => {
    await delay(300);
    const titles = await getJobTitles();
    const newTitles = titles.filter(t => t !== title);
    localStorage.setItem(STORAGE_KEYS.JOB_TITLES, JSON.stringify(newTitles));
};
const getLocalDepartments = (): Department[] => {
  const stored = localStorage.getItem(STORAGE_KEYS.DEPARTMENTS);
  if (!stored) { saveLocalDepartments(MOCK_DEPARTMENTS); return MOCK_DEPARTMENTS; }
  return JSON.parse(stored);
};
const saveLocalDepartments = (depts: Department[]) => { localStorage.setItem(STORAGE_KEYS.DEPARTMENTS, JSON.stringify(depts)); };
export const getDepartments = async (): Promise<Department[]> => { await delay(200); return getLocalDepartments(); };

export const saveDepartment = async (dept: Department): Promise<void> => {
  await delay(400);
  const depts = getLocalDepartments();
  const index = depts.findIndex(d => d.id === dept.id);
  if (index >= 0) depts[index] = dept; else depts.push(dept);
  saveLocalDepartments(depts);
  
  // Update Users in this Department
  const users = getLocalUsers();
  let usersUpdated = false;
  
  // Get all courses from the department's assigned paths
  const paths = getLocalPaths();
  const coursesFromPaths = (dept.pathIds || []).flatMap(pId => {
      const p = paths.find(path => path.id === pId);
      return p ? p.courseIds : [];
  });

  const totalCourseIds = Array.from(new Set([...dept.courseIds, ...coursesFromPaths]));

  const updatedUsers = users.map(u => {
    if (u.departmentId === dept.id) {
      // Merge direct dept courses + path courses + existing user assignments
      const mergedCourses = Array.from(new Set([...u.assignedCourseIds, ...totalCourseIds]));
      
      // Also merge Path IDs
      const mergedPaths = Array.from(new Set([...(u.assignedPathIds || []), ...(dept.pathIds || [])]));

      usersUpdated = true;
      return { ...u, assignedCourseIds: mergedCourses, assignedPathIds: mergedPaths };
    }
    return u;
  });
  if (usersUpdated) saveLocalUsers(updatedUsers);
};

export const deleteDepartment = async (id: string): Promise<void> => {
  await delay(300);
  const depts = getLocalDepartments().filter(d => d.id !== id);
  saveLocalDepartments(depts);

  // Remove department reference from users
  const users = getLocalUsers();
  const updatedUsers = users.map(u => {
      if (u.departmentId === id) {
          return { ...u, departmentId: undefined };
      }
      return u;
  });
  saveLocalUsers(updatedUsers);
};

// --- User Mgmt ---
export const getEmployees = async (): Promise<User[]> => { await delay(300); return getLocalUsers().filter(u => u.role === Role.EMPLOYEE); };
export const registerEmployee = async (name: string, departmentId?: string, jobTitle?: string): Promise<User> => {
  await delay(400);
  const users = getLocalUsers();
  const paths = getLocalPaths();
  const depts = getLocalDepartments();

  let initialCourses: string[] = [];
  let initialPaths: string[] = [];

  // Inherit from Department
  if (departmentId) {
    const targetDept = depts.find(d => d.id === departmentId);
    if (targetDept) {
        initialCourses = [...targetDept.courseIds];
        initialPaths = [...(targetDept.pathIds || [])];
        
        // Resolve courses from paths
        const coursesFromPaths = initialPaths.flatMap(pId => {
            const p = paths.find(path => path.id === pId);
            return p ? p.courseIds : [];
        });
        initialCourses = Array.from(new Set([...initialCourses, ...coursesFromPaths]));
    }
  }

  const newUser: User = { 
      id: crypto.randomUUID(), 
      name, 
      role: Role.EMPLOYEE, 
      jobTitle: jobTitle || 'Empleado', 
      completedCourseIds: [], 
      assignedCourseIds: initialCourses, 
      assignedPathIds: initialPaths,
      departmentId, 
      isActive: true 
  };
  users.push(newUser);
  saveLocalUsers(users);
  return newUser;
};

export const toggleUserStatus = async (userId: string): Promise<void> => {
  await delay(200);
  const users = getLocalUsers();
  const idx = users.findIndex(u => u.id === userId);
  if (idx >= 0) { users[idx].isActive = !users[idx].isActive; saveLocalUsers(users); }
};

export const updateUserCourses = async (userId: string, courseIds: string[], pathIds?: string[]): Promise<void> => {
  await delay(300);
  const users = getLocalUsers();
  const idx = users.findIndex(u => u.id === userId);
  
  if (idx >= 0) { 
      // If paths are provided, we need to resolve their courses and add them to courseIds
      let finalCourseIds = [...courseIds];
      if (pathIds && pathIds.length > 0) {
          const paths = getLocalPaths();
          const coursesFromPaths = pathIds.flatMap(pId => {
              const p = paths.find(path => path.id === pId);
              return p ? p.courseIds : [];
          });
          finalCourseIds = Array.from(new Set([...finalCourseIds, ...coursesFromPaths]));
      }

      users[idx].assignedCourseIds = finalCourseIds; 
      if (pathIds) users[idx].assignedPathIds = pathIds;
      
      saveLocalUsers(users); 
  }
};

export const enrollStudent = async (userId: string, courseId: string): Promise<void> => {
    await delay(300);
    const users = getLocalUsers();
    const index = users.findIndex(u => u.id === userId);
    if (index >= 0 && !users[index].assignedCourseIds.includes(courseId)) {
        users[index].assignedCourseIds.push(courseId);
        saveLocalUsers(users);
        const currentUser = getCurrentUser();
        if (currentUser?.id === userId) localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(users[index]));
    }
}

export const assignCourseToJobTitle = async (courseId: string, jobTitleQuery: string): Promise<{ count: number, users: string[] }> => {
  await delay(500);
  const users = getLocalUsers();
  let count = 0;
  const affectedNames: string[] = [];
  const updatedUsers = users.map(u => {
    if (u.role === Role.EMPLOYEE && u.jobTitle === jobTitleQuery && !u.assignedCourseIds.includes(courseId)) {
        count++;
        affectedNames.push(u.name);
        return { ...u, assignedCourseIds: [...u.assignedCourseIds, courseId] };
    }
    return u;
  });
  if (count > 0) saveLocalUsers(updatedUsers);
  return { count, users: affectedNames };
};

// --- NEW: Path Assignment Logic ---

export const assignPathToJobTitle = async (pathId: string, jobTitleQuery: string): Promise<{ count: number, users: string[] }> => {
    await delay(500);
    const users = getLocalUsers();
    const paths = getLocalPaths();
    const path = paths.find(p => p.id === pathId);
    
    if (!path) return { count: 0, users: [] };

    let count = 0;
    const affectedNames: string[] = [];
    
    const updatedUsers = users.map(u => {
        if (u.role === Role.EMPLOYEE && u.jobTitle === jobTitleQuery) {
            // Add Path ID if not present
            const currentPaths = u.assignedPathIds || [];
            const newPaths = currentPaths.includes(pathId) ? currentPaths : [...currentPaths, pathId];
            
            // Add all courses from path
            const currentCourses = u.assignedCourseIds;
            const newCourses = Array.from(new Set([...currentCourses, ...path.courseIds]));
            
            if (newPaths.length !== currentPaths.length || newCourses.length !== currentCourses.length) {
                count++;
                affectedNames.push(u.name);
                return { ...u, assignedCourseIds: newCourses, assignedPathIds: newPaths };
            }
        }
        return u;
    });

    if (count > 0) saveLocalUsers(updatedUsers);
    return { count, users: affectedNames };
};

export const togglePathInDepartment = async (departmentId: string, pathId: string, add: boolean): Promise<void> => {
    const depts = getLocalDepartments();
    const deptIdx = depts.findIndex(d => d.id === departmentId);
    if (deptIdx >= 0) {
        const dept = depts[deptIdx];
        const currentPaths = dept.pathIds || [];
        
        if (add && !currentPaths.includes(pathId)) {
            dept.pathIds = [...currentPaths, pathId];
        } else if (!add) {
            dept.pathIds = currentPaths.filter(id => id !== pathId);
        }
        
        await saveDepartment(dept); // This triggers user updates automatically
    }
}

// --- Course Service (Existing) ---
const getLocalCourses = (): Course[] => {
  const stored = localStorage.getItem(STORAGE_KEYS.COURSES);
  if (!stored) { saveLocalCourses(DEFAULT_COURSES); return DEFAULT_COURSES; }
  return JSON.parse(stored);
};
const saveLocalCourses = (courses: Course[]) => { localStorage.setItem(STORAGE_KEYS.COURSES, JSON.stringify(courses)); };
export const getCourses = async (): Promise<Course[]> => { await delay(300); return getLocalCourses(); };
export const getCourseById = async (id: string): Promise<Course | undefined> => { await delay(200); return getLocalCourses().find(c => c.id === id); };
export const saveCourse = async (course: Course): Promise<void> => {
  await delay(500);
  const courses = getLocalCourses();
  const index = courses.findIndex(c => c.id === course.id);
  if (index >= 0) courses[index] = course; else courses.push(course);
  saveLocalCourses(courses);
};

export const deleteCourse = async (id: string): Promise<void> => {
  await delay(300);
  const courses = getLocalCourses().filter(c => c.id !== id);
  saveLocalCourses(courses);

  // CASCADE DELETE: Remove course from Users, Departments, and Paths
  const users = getLocalUsers();
  const updatedUsers = users.map(u => ({
      ...u,
      assignedCourseIds: u.assignedCourseIds.filter(cId => cId !== id),
      completedCourseIds: u.completedCourseIds.filter(cId => cId !== id)
  }));
  saveLocalUsers(updatedUsers);

  const depts = getLocalDepartments();
  const updatedDepts = depts.map(d => ({
      ...d,
      courseIds: d.courseIds.filter(cId => cId !== id)
  }));
  saveLocalDepartments(updatedDepts);

  const paths = getLocalPaths();
  const updatedPaths = paths.map(p => ({
      ...p,
      courseIds: p.courseIds.filter(cId => cId !== id)
  }));
  localStorage.setItem(STORAGE_KEYS.LEARNING_PATHS, JSON.stringify(updatedPaths));
};

export const toggleCourseInDepartment = async (departmentId: string, courseId: string, add: boolean): Promise<void> => {
    const depts = getLocalDepartments();
    const deptIdx = depts.findIndex(d => d.id === departmentId);
    if (deptIdx >= 0) {
        const dept = depts[deptIdx];
        if (add && !dept.courseIds.includes(courseId)) dept.courseIds.push(courseId);
        else if (!add) dept.courseIds = dept.courseIds.filter(id => id !== courseId);
        await saveDepartment(dept);
    }
}

// --- Learning Paths Service (NEW) ---

const getLocalPaths = (): LearningPath[] => {
    const stored = localStorage.getItem(STORAGE_KEYS.LEARNING_PATHS);
    if (!stored) {
        localStorage.setItem(STORAGE_KEYS.LEARNING_PATHS, JSON.stringify(DEFAULT_PATHS));
        return DEFAULT_PATHS;
    }
    return JSON.parse(stored);
}

export const getLearningPaths = async (): Promise<LearningPath[]> => {
    await delay(300);
    return getLocalPaths();
};

export const saveLearningPath = async (path: LearningPath) => {
    await delay(300);
    const paths = getLocalPaths();
    const index = paths.findIndex(p => p.id === path.id);
    if(index >= 0) paths[index] = path;
    else paths.push(path);
    localStorage.setItem(STORAGE_KEYS.LEARNING_PATHS, JSON.stringify(paths));
};

export const deleteLearningPath = async (id: string) => {
    await delay(300);
    const paths = getLocalPaths().filter(p => p.id !== id);
    localStorage.setItem(STORAGE_KEYS.LEARNING_PATHS, JSON.stringify(paths));

    // CASCADE DELETE: Remove Path ID from Users and Departments
    const users = getLocalUsers();
    const updatedUsers = users.map(u => ({
        ...u,
        assignedPathIds: (u.assignedPathIds || []).filter(pId => pId !== id)
    }));
    saveLocalUsers(updatedUsers);

    const depts = getLocalDepartments();
    const updatedDepts = depts.map(d => ({
        ...d,
        pathIds: (d.pathIds || []).filter(pId => pId !== id)
    }));
    saveLocalDepartments(updatedDepts);
};

// --- Scenarios (Existing) ---
const getLocalScenarios = (): Scenario[] => {
    const stored = localStorage.getItem(STORAGE_KEYS.SCENARIOS);
    if (!stored) { localStorage.setItem(STORAGE_KEYS.SCENARIOS, JSON.stringify(DEFAULT_SCENARIOS)); return DEFAULT_SCENARIOS; }
    return JSON.parse(stored);
};
export const getScenarios = async (): Promise<Scenario[]> => { await delay(300); return getLocalScenarios(); };
export const saveScenario = async (scenario: Scenario): Promise<void> => {
    await delay(300);
    const scenarios = getLocalScenarios();
    const index = scenarios.findIndex(s => s.id === scenario.id);
    if (index >= 0) scenarios[index] = scenario; else scenarios.push(scenario);
    localStorage.setItem(STORAGE_KEYS.SCENARIOS, JSON.stringify(scenarios));
};
export const deleteScenario = async (id: string): Promise<void> => {
    await delay(300);
    const scenarios = getLocalScenarios().filter(s => s.id !== id);
    localStorage.setItem(STORAGE_KEYS.SCENARIOS, JSON.stringify(scenarios));
};

// --- Progress & Analytics ---

const getLocalProgress = (): CourseProgress[] => {
  const stored = localStorage.getItem(STORAGE_KEYS.PROGRESS);
  if (!stored) return [];
  return JSON.parse(stored);
};
const saveLocalProgress = (progress: CourseProgress[]) => { localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(progress)); };

export const submitQuizResult = async (userId: string, courseId: string, score: number, passed: boolean, signature?: DigitalSignature): Promise<void> => {
  await delay(600);
  if (!passed) return; 
  const allProgress = getLocalProgress();
  const existingIndex = allProgress.findIndex(p => p.userId === userId && p.courseId === courseId);
  const record: CourseProgress = {
    userId, courseId, status: 'COMPLETED', score, completedAt: Date.now(), signature,
    rating: existingIndex >= 0 ? allProgress[existingIndex].rating : undefined,
    feedback: existingIndex >= 0 ? allProgress[existingIndex].feedback : undefined
  };
  if (existingIndex >= 0) allProgress[existingIndex] = record; else allProgress.push(record);
  saveLocalProgress(allProgress);
  const auditDetails = signature ? `Curso ID ${courseId} aprobado con firma digital: ${signature.signedName}` : `Curso ID ${courseId} aprobado con ${score}%`;
  await logAction(userId, 'COURSE_COMPLETED', auditDetails);
};

export const submitCourseFeedback = async (userId: string, courseId: string, rating: number, feedback: string): Promise<void> => {
    await delay(300);
    const allProgress = getLocalProgress();
    const index = allProgress.findIndex(p => p.userId === userId && p.courseId === courseId);
    if (index >= 0) { allProgress[index].rating = rating; allProgress[index].feedback = feedback; saveLocalProgress(allProgress); }
};

export const getCourseAverageRating = async (courseId: string): Promise<{ avg: number, count: number }> => {
    const allProgress = getLocalProgress();
    const courseRatings = allProgress.filter(p => p.courseId === courseId && p.rating);
    if (courseRatings.length === 0) return { avg: 0, count: 0 };
    const sum = courseRatings.reduce((acc, curr) => acc + (curr.rating || 0), 0);
    return { avg: parseFloat((sum / courseRatings.length).toFixed(1)), count: courseRatings.length };
}

export const getCourseStats = async (courseId: string): Promise<CourseAnalytics> => {
    await delay(500);
    const users = getLocalUsers();
    const progress = getLocalProgress();
    const courses = getLocalCourses();
    const course = courses.find(c => c.id === courseId);

    const courseProgress = progress.filter(p => p.courseId === courseId);
    const enrolledUsers = users.filter(u => u.assignedCourseIds.includes(courseId));
    const completedProgress = courseProgress.filter(p => p.status === 'COMPLETED');
    
    const totalScore = completedProgress.reduce((acc, curr) => acc + (curr.score || 0), 0);
    const avgScore = completedProgress.length > 0 ? Math.round(totalScore / completedProgress.length) : 0;
    
    const ratedProgress = completedProgress.filter(p => p.rating);
    const totalRating = ratedProgress.reduce((acc, curr) => acc + (curr.rating || 0), 0);
    const avgRating = ratedProgress.length > 0 ? parseFloat((totalRating / ratedProgress.length).toFixed(1)) : 0;

    const feedbackList: FeedbackItem[] = ratedProgress.filter(p => p.feedback).map(p => {
            const user = users.find(u => u.id === p.userId);
            return { userName: user ? user.name : 'Usuario Eliminado', rating: p.rating || 0, comment: p.feedback || '', date: p.completedAt || 0 };
        }).sort((a, b) => b.date - a.date);

    const buckets = [0, 0, 0, 0, 0];
    completedProgress.forEach(p => {
        const s = p.score || 0;
        if (s <= 20) buckets[0]++; else if (s <= 40) buckets[1]++; else if (s <= 60) buckets[2]++; else if (s <= 80) buckets[3]++; else buckets[4]++;
    });

    // --- Generate Mock Question Analysis (Since we don't store individual answers yet) ---
    const questionsAnalysis: QuestionAnalysis[] = [];
    if (course && course.quiz) {
        course.quiz.questions.forEach((q, idx) => {
            // Simulate random failure rate for demo purposes
            // In real app, we would query a QuestionResult table
            const failRate = Math.floor(Math.random() * 40) + 5; // 5% to 45% fail rate
            questionsAnalysis.push({
                questionText: q.text,
                failRate: failRate,
                totalAttempts: completedProgress.length
            });
        });
        // Sort by highest fail rate
        questionsAnalysis.sort((a, b) => b.failRate - a.failRate);
    }

    return {
        totalEnrolled: enrolledUsers.length,
        completedCount: completedProgress.length,
        avgScore,
        avgRating,
        feedback: feedbackList,
        scoreBuckets: buckets,
        questionsAnalysis // Added field
    };
};

export const getEmployeeProgress = async (): Promise<(User & { progress: CourseProgress[] })[]> => {
  await delay(400);
  const allProgress = getLocalProgress();
  const users = getLocalUsers();
  return users.filter(u => u.role === Role.EMPLOYEE).map(user => ({ ...user, progress: allProgress.filter(p => p.userId === user.id) }));
};
export const getUserCompletedCourses = async (userId: string): Promise<CourseProgress[]> => { return getLocalProgress().filter(p => p.userId === userId && p.status === 'COMPLETED'); };
export const getLeaderboard = async (): Promise<(User & { points: number, courses: number, avgScore: number })[]> => {
  await delay(400);
  const users = getLocalUsers().filter(u => u.role === Role.EMPLOYEE && u.isActive);
  const progress = getLocalProgress();
  return users.map(user => {
      const userProgress = progress.filter(p => p.userId === user.id && p.status === 'COMPLETED');
      const coursesCount = userProgress.length;
      const totalScore = userProgress.reduce((acc, curr) => acc + (curr.score || 0), 0);
      const avgScore = coursesCount > 0 ? Math.round(totalScore / coursesCount) : 0;
      const points = (coursesCount * 500) + (totalScore * 5);
      return { ...user, points, courses: coursesCount, avgScore };
  }).sort((a, b) => b.points - a.points).slice(0, 5);
};
export const getGlobalStats = async () => {
    await delay(300);
    const users = getLocalUsers().filter(u => u.role === Role.EMPLOYEE);
    const courses = getLocalCourses();
    const progress = getLocalProgress();
    const completedCount = progress.filter(p => p.status === 'COMPLETED').length;
    const totalAssignments = users.reduce((acc, u) => acc + u.assignedCourseIds.length, 0);
    const completionRate = totalAssignments > 0 ? Math.round((completedCount / totalAssignments) * 100) : 0;
    return { totalUsers: users.length, activeCourses: courses.filter(c => c.status === 'PUBLISHED').length, completionRate, recentActivity: (await getAuditLogs()).slice(0, 10) };
};
