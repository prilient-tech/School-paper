import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';

// Context
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Components
import Layout from './components/Layout/Layout';
import LoadingSpinner from './components/UI/LoadingSpinner';

// Pages
import Login from './pages/Auth/Login';
import Dashboard from './pages/Dashboard/Dashboard';
import Users from './pages/Users/Users';
import Subjects from './pages/Subjects/Subjects';
import Chapters from './pages/Chapters/Chapters';
import PDFs from './pages/PDFs/PDFs';
import Images from './pages/Images/Images';
import Questions from './pages/Questions/Questions';
import QuestionPapers from './pages/QuestionPapers/QuestionPapers';
import Profile from './pages/Profile/Profile';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// App Routes Component
const AppRoutes = () => {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />
      
      {/* Protected Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        
        {/* Super Admin & Admin Routes */}
        <Route
          path="users"
          element={
            <ProtectedRoute allowedRoles={['super_admin', 'admin']}>
              <Users />
            </ProtectedRoute>
          }
        />
        
        {/* Admin Routes */}
        <Route
          path="subjects"
          element={
            <ProtectedRoute allowedRoles={['super_admin', 'admin']}>
              <Subjects />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="chapters"
          element={
            <ProtectedRoute allowedRoles={['super_admin', 'admin']}>
              <Chapters />
            </ProtectedRoute>
          }
        />
        
        {/* Teacher & Admin Routes */}
        <Route
          path="pdfs"
          element={
            <ProtectedRoute allowedRoles={['teacher', 'admin', 'super_admin']}>
              <PDFs />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="images"
          element={
            <ProtectedRoute allowedRoles={['teacher', 'admin', 'super_admin']}>
              <Images />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="questions"
          element={
            <ProtectedRoute allowedRoles={['teacher', 'admin', 'super_admin']}>
              <Questions />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="question-papers"
          element={
            <ProtectedRoute allowedRoles={['teacher', 'admin', 'super_admin']}>
              <QuestionPapers />
            </ProtectedRoute>
          }
        />
        
        {/* All Authenticated Users */}
        <Route path="profile" element={<Profile />} />
      </Route>
      
      {/* Catch all route */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

// Main App Component
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <div className="App">
            <AppRoutes />
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#363636',
                  color: '#fff',
                },
                success: {
                  duration: 3000,
                  iconTheme: {
                    primary: '#22c55e',
                    secondary: '#fff',
                  },
                },
                error: {
                  duration: 5000,
                  iconTheme: {
                    primary: '#ef4444',
                    secondary: '#fff',
                  },
                },
              }}
            />
          </div>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
