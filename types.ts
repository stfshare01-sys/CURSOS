

export enum Role {
  ADMIN = 'ADMIN',
  EMPLOYEE = 'EMPLOYEE'
}

export type CourseStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface Department {
  id: string;
  name: string;
  courseIds: string[]; // List of courses assigned to this department automatically
  pathIds?: string[]; // NEW: List of Learning Paths assigned
}

export interface User {
  id: string;
  name: string;
  role: Role;
  jobTitle?: string; // Puesto de trabajo
  completedCourseIds: string[];
  assignedCourseIds: string[]; // IDs of courses assigned to this user
  assignedPathIds?: string[]; // NEW: IDs of Learning Paths assigned
  isActive: boolean; // Soft delete / Access control
  departmentId?: string; // Optional link to a department
}

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctOptionIndex: number;
}

export interface VideoInteraction {
    id: string;
    timestamp: number; // Seconds when video pauses
    question: Question;
}

export interface Quiz {
  passingScore: number; // percentage 0-100
  questions: Question[];
}

export interface Chapter {
  id: string;
  title: string;
  content: string; // Text content (Markdown supported conceptually)
  videoUrl?: string; // Optional YouTube URL
  videoInteractions?: VideoInteraction[]; // New: Stops video to ask questions
  imageUrl?: string; // Optional Image URL or Base64
  audioUrl?: string; // Optional Audio URL or Base64
  estimatedMinutes?: number;
}

export interface Resource {
    id: string;
    title: string;
    type: 'PDF' | 'LINK' | 'VIDEO' | 'FILE';
    url: string;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  coverImage?: string; // Thumbnail for the dashboard
  chapters: Chapter[]; // List of modules/lessons
  status: CourseStatus; // Modified from boolean to 3-state enum
  quiz: Quiz | null;
  prerequisites?: string[]; // List of Course IDs required before starting this one
  resources?: Resource[]; // New downloadable resources
  requiresSignature?: boolean; // NEW: Compliance check
  createdAt: number;
}

export interface DigitalSignature {
    signedName: string;
    timestamp: number;
    declaration: string;
    ipHash: string; // Simulated IP Hash
}

export interface CourseProgress {
  userId: string;
  courseId: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  completedChapterIds?: string[]; // Track progress per chapter
  score?: number;
  completedAt?: number;
  rating?: number; // 1 to 5 stars
  feedback?: string; // Optional text feedback
  signature?: DigitalSignature; // NEW: Audit proof
}

export interface LearningPath {
    id: string;
    title: string;
    description: string;
    courseIds: string[]; // Ordered list of courses
    coverImage?: string;
}

export interface Scenario {
    id: string;
    title: string;
    description: string;
    role: string; // The role the AI plays (e.g. "Angry Customer")
    difficulty: 'Fácil' | 'Medio' | 'Difícil';
    voice: string; // 'Kore', 'Fenrir', etc.
    systemInstruction: string; // The prompt
    color: string; // Tailwind class for UI
}

export interface Badge {
    id: string;
    label: string;
    icon: string; // Lucide icon name concept
    color: string;
    description: string;
}

export interface AuditLog {
    id: string;
    userId: string;
    userName: string;
    action: string;
    details: string;
    timestamp: number;
    ip?: string; // Simulated IP
}

export interface AppNotification {
    id: string;
    userId: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning';
    read: boolean;
    createdAt: number;
}

export interface FeedbackItem {
    userName: string;
    rating: number;
    comment: string;
    date: number;
}

export interface QuestionAnalysis {
    questionText: string;
    failRate: number; // 0 to 100
    totalAttempts: number;
}

export interface CourseAnalytics {
    totalEnrolled: number;
    completedCount: number;
    avgScore: number;
    avgRating: number;
    feedback: FeedbackItem[];
    scoreBuckets: number[]; // [0-20, 21-40, 41-60, 61-80, 81-100]
    questionsAnalysis: QuestionAnalysis[]; // New field
}
