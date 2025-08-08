import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  Bars3Icon,
  XMarkIcon,
  HomeIcon,
  UsersIcon,
  BookOpenIcon,
  DocumentTextIcon,
  PhotoIcon,
  QuestionMarkCircleIcon,
  ClipboardDocumentListIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout, isSuperAdmin, isAdmin, isTeacher } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
    ...(isAdmin() ? [{ name: 'Users', href: '/users', icon: UsersIcon }] : []),
    ...(isAdmin() ? [{ name: 'Subjects', href: '/subjects', icon: BookOpenIcon }] : []),
    ...(isAdmin() ? [{ name: 'Chapters', href: '/chapters', icon: DocumentTextIcon }] : []),
    ...(isTeacher() ? [{ name: 'PDFs', href: '/pdfs', icon: DocumentTextIcon }] : []),
    ...(isTeacher() ? [{ name: 'Images', href: '/images', icon: PhotoIcon }] : []),
    ...(isTeacher() ? [{ name: 'Questions', href: '/questions', icon: QuestionMarkCircleIcon }] : []),
    ...(isTeacher() ? [{ name: 'Question Papers', href: '/question-papers', icon: ClipboardDocumentListIcon }] : []),
    { name: 'Profile', href: '/profile', icon: UserCircleIcon },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActiveRoute = (href) => {
    return location.pathname === href;
  };

  return (
    <div className="h-screen flex overflow-hidden bg-gray-100">
      {/* Sidebar */}
      <div className={`sidebar ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'} lg:translate-x-0 lg:relative lg:flex-shrink-0`}>
        <div className="flex items-center justify-between h-16 px-4 bg-primary-600">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <h1 className="text-white text-lg font-semibold">AI Education</h1>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-white hover:text-gray-300"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        
        <nav className="mt-5 px-2 space-y-1">
          {navigation.map((item) => (
            <a
              key={item.name}
              href={item.href}
              className={`nav-link ${
                isActiveRoute(item.href) ? 'nav-link-active' : ''
              }`}
              onClick={(e) => {
                e.preventDefault();
                navigate(item.href);
                setSidebarOpen(false);
              }}
            >
              <item.icon className="mr-3 h-5 w-5" />
              {item.name}
            </a>
          ))}
        </nav>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 overflow-auto focus:outline-none lg:ml-0">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white shadow">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-gray-500 hover:text-gray-700"
            >
              <Bars3Icon className="h-6 w-6" />
            </button>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="h-8 w-8 bg-primary-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                  <p className="text-xs text-gray-500 capitalize">{user?.role?.replace('_', ' ')}</p>
                </div>
              </div>
              
              <button
                onClick={handleLogout}
                className="text-gray-500 hover:text-gray-700 p-1 rounded-md"
                title="Logout"
              >
                <ArrowRightOnRectangleIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 relative z-0 focus:outline-none">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
