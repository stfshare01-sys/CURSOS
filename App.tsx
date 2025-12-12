

import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './pages/Login';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { CourseEditor } from './pages/admin/CourseEditor';
import { TrackingDashboard } from './pages/admin/TrackingDashboard';
import { UserManagement } from './pages/admin/UserManagement';
import { DepartmentManagement } from './pages/admin/DepartmentManagement';
import { CourseAnalyticsPage } from './pages/admin/CourseAnalytics';
import { ScenarioManagement } from './pages/admin/ScenarioManagement';
import { OverviewDashboard } from './pages/admin/OverviewDashboard';
import { LearningPathManagement } from './pages/admin/LearningPathManagement';
import { StudentDashboard } from './pages/student/StudentDashboard';
import { StudentCatalog } from './pages/student/StudentCatalog';
import { CoursePlayer } from './pages/student/CoursePlayer';
import { LiveRoleplay } from './pages/student/LiveRoleplay';
import { Layout } from './components/Layout';
import { getCurrentUser } from './services/store';
import { Role } from './types';

// Protected Route Wrapper
interface ProtectedRouteProps {
  children: React.ReactNode;
  role: Role | 'ANY'; // Modified to allow specific routes for ANY logged in user
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, role }) => {
  const user = getCurrentUser();
  
  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (role !== 'ANY' && user.role !== role) {
    // If Admin tries to access student specific dashboard, redirect
    if (user.role === Role.ADMIN && role === Role.EMPLOYEE) {
        // Exception: Admins can view Course Player (handled by route, but here for safety)
        return <Navigate to="/admin/dashboard" replace />;
    }
    if (user.role === Role.EMPLOYEE && role === Role.ADMIN) {
        return <Navigate to="/student/dashboard" replace />;
    }
  }

  return <Layout user={user}>{children}</Layout>;
};

const App: React.FC = () => {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        
        {/* Admin Routes */}
        <Route path="/admin/dashboard" element={
          <ProtectedRoute role={Role.ADMIN}>
            <OverviewDashboard />
          </ProtectedRoute>
        } />
        <Route path="/admin/courses" element={
          <ProtectedRoute role={Role.ADMIN}>
            <AdminDashboard />
          </ProtectedRoute>
        } />
        <Route path="/admin/paths" element={
          <ProtectedRoute role={Role.ADMIN}>
            <LearningPathManagement />
          </ProtectedRoute>
        } />
        <Route path="/admin/users" element={
          <ProtectedRoute role={Role.ADMIN}>
            <UserManagement />
          </ProtectedRoute>
        } />
        <Route path="/admin/departments" element={
          <ProtectedRoute role={Role.ADMIN}>
            <DepartmentManagement />
          </ProtectedRoute>
        } />
        <Route path="/admin/tracking" element={
          <ProtectedRoute role={Role.ADMIN}>
            <TrackingDashboard />
          </ProtectedRoute>
        } />
        <Route path="/admin/scenarios" element={
          <ProtectedRoute role={Role.ADMIN}>
            <ScenarioManagement />
          </ProtectedRoute>
        } />
        <Route path="/admin/course/:id" element={
          <ProtectedRoute role={Role.ADMIN}>
            <CourseEditor />
          </ProtectedRoute>
        } />
        <Route path="/admin/analytics/:id" element={
          <ProtectedRoute role={Role.ADMIN}>
            <CourseAnalyticsPage />
          </ProtectedRoute>
        } />

        {/* Student Routes */}
        <Route path="/student/dashboard" element={
          <ProtectedRoute role={Role.EMPLOYEE}>
            <StudentDashboard />
          </ProtectedRoute>
        } />
        <Route path="/student/catalog" element={
          <ProtectedRoute role={Role.EMPLOYEE}>
            <StudentCatalog />
          </ProtectedRoute>
        } />
        <Route path="/student/live" element={
          <ProtectedRoute role={Role.EMPLOYEE}>
            <LiveRoleplay />
          </ProtectedRoute>
        } />
        
        {/* Course Player - Accessible by BOTH Admin (Preview) and Employee */}
        <Route path="/student/course/:id" element={
          <ProtectedRoute role={'ANY'}>
            <CoursePlayer />
          </ProtectedRoute>
        } />
      </Routes>
    </HashRouter>
  );
};

export default App;
