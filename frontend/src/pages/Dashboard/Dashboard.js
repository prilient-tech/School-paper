import React from 'react';
import { useQuery } from 'react-query';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import {
  UsersIcon,
  BookOpenIcon,
  DocumentTextIcon,
  QuestionMarkCircleIcon,
  ClipboardDocumentListIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

const Dashboard = () => {
  const { user, isSuperAdmin, isAdmin, isTeacher } = useAuth();

  // Fetch dashboard data
  const { data: statsData, isLoading: statsLoading } = useQuery('dashboardStats', async () => {
    const response = await axios.get('/api/dashboard/stats');
    return response.data.data;
  });

  const { data: activities, isLoading: activitiesLoading } = useQuery('dashboardActivities', async () => {
    const response = await axios.get('/api/dashboard/recent-activity');
    return response.data.data;
  });

  const { data: systemStatus, isLoading: statusLoading } = useQuery('dashboardStatus', async () => {
    const response = await axios.get('/api/dashboard/system-status');
    return response.data.data;
  });

  // Build stats array based on user role and real data
  const stats = [
    {
      name: 'Total Users',
      value: statsData?.totalUsers || '0',
      icon: UsersIcon,
      color: 'bg-blue-500',
      show: isAdmin(),
    },
    {
      name: 'Total Subjects',
      value: statsData?.totalSubjects || '0',
      icon: BookOpenIcon,
      color: 'bg-green-500',
      show: isAdmin(),
    },
    {
      name: 'Total Chapters',
      value: statsData?.totalChapters || '0',
      icon: DocumentTextIcon,
      color: 'bg-yellow-500',
      show: isAdmin(),
    },
    {
      name: isTeacher() ? 'My PDFs' : 'Total PDFs',
      value: isTeacher() ? (statsData?.myPDFs || '0') : (statsData?.totalPDFs || '0'),
      icon: DocumentTextIcon,
      color: 'bg-purple-500',
      show: isTeacher(),
    },
    {
      name: isTeacher() ? 'My Questions' : 'Total Questions',
      value: isTeacher() ? (statsData?.myQuestions || '0') : (statsData?.totalQuestions || '0'),
      icon: QuestionMarkCircleIcon,
      color: 'bg-indigo-500',
      show: isTeacher(),
    },
    {
      name: isTeacher() ? 'My Question Papers' : 'Question Papers',
      value: isTeacher() ? (statsData?.myQuestionPapers || '0') : (statsData?.totalQuestionPapers || '0'),
      icon: ClipboardDocumentListIcon,
      color: 'bg-pink-500',
      show: isTeacher(),
    },
  ].filter(stat => stat.show);

  const quickActions = [
    {
      name: 'Upload PDF',
      description: 'Upload and process new PDF documents',
      href: '/pdfs',
      icon: DocumentTextIcon,
      show: isTeacher(),
    },
    {
      name: 'Generate Questions',
      description: 'Create AI-generated questions from content',
      href: '/questions',
      icon: QuestionMarkCircleIcon,
      show: isTeacher(),
    },
    {
      name: 'Create Question Paper',
      description: 'Build custom question papers',
      href: '/question-papers',
      icon: ClipboardDocumentListIcon,
      show: isTeacher(),
    },
    {
      name: 'Manage Users',
      description: 'Add, edit, or remove users',
      href: '/users',
      icon: UsersIcon,
      show: isAdmin(),
    },
    {
      name: 'Manage Subjects',
      description: 'Create and organize subjects',
      href: '/subjects',
      icon: BookOpenIcon,
      show: isAdmin(),
    },
    {
      name: 'Manage Chapters',
      description: 'Organize content by chapters',
      href: '/chapters',
      icon: DocumentTextIcon,
      show: isAdmin(),
    },
  ].filter(action => action.show);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Welcome back, {user?.name}! Here's what's happening with your AI Education Platform.
        </p>
      </div>

      {/* Stats */}
      {stats.length > 0 && (
        <div>
          <h2 className="text-lg font-medium text-gray-900 mb-4">Overview</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {stats.map((stat) => (
              <div key={stat.name} className="card">
                <div className="card-body">
                  <div className="flex items-center">
                    <div className={`flex-shrink-0 ${stat.color} rounded-md p-3`}>
                      <stat.icon className="h-6 w-6 text-white" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          {stat.name}
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {stat.value}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      {quickActions.length > 0 && (
        <div>
          <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {quickActions.map((action) => (
              <div key={action.name} className="card hover:shadow-md transition-shadow">
                <div className="card-body">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <action.icon className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-sm font-medium text-gray-900">
                        {action.name}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {action.description}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div>
        <h2 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h2>
        <div className="card">
          <div className="card-body">
            {activitiesLoading ? (
              <div className="text-center py-4">
                <div className="loading-spinner mx-auto"></div>
                <p className="text-sm text-gray-500 mt-2">Loading recent activity...</p>
              </div>
            ) : activities && activities.length > 0 ? (
              <div className="space-y-4">
                {activities.map((activity, index) => {
                  const IconComponent = 
                    activity.icon === 'DocumentTextIcon' ? DocumentTextIcon :
                    activity.icon === 'QuestionMarkCircleIcon' ? QuestionMarkCircleIcon :
                    activity.icon === 'ClipboardDocumentListIcon' ? ClipboardDocumentListIcon :
                    DocumentTextIcon;

                  const colorClasses = 
                    activity.color === 'green' ? 'bg-green-100 text-green-600' :
                    activity.color === 'blue' ? 'bg-blue-100 text-blue-600' :
                    activity.color === 'purple' ? 'bg-purple-100 text-purple-600' :
                    'bg-gray-100 text-gray-600';

                  const timeAgo = new Date(activity.timestamp).toLocaleDateString() + ' ' + 
                    new Date(activity.timestamp).toLocaleTimeString();

                  return (
                    <div key={index} className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <div className={`h-8 w-8 ${colorClasses.replace('text-', 'bg-').replace('-600', '-100')} rounded-full flex items-center justify-center`}>
                          <IconComponent className={`h-4 w-4 ${colorClasses}`} />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {activity.title}
                        </p>
                        <p className="text-sm text-gray-500">{activity.description}</p>
                        <p className="text-xs text-gray-400">{timeAgo}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-gray-500">No recent activity</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* System Status */}
      <div>
        <h2 className="text-lg font-medium text-gray-900 mb-4">System Status</h2>
        {statusLoading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="card">
                <div className="card-body text-center">
                  <div className="loading-spinner mx-auto mb-2"></div>
                  <h3 className="text-sm font-medium text-gray-900">Loading...</h3>
                  <p className="text-xs text-gray-500 mt-1">Checking status</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {systemStatus && Object.entries(systemStatus).map(([key, status]) => {
              const isOnline = status.status === 'online' || status.status === 'connected' || status.status === 'available' || status.status === 'active';
              const statusColor = isOnline ? 'green' : 'red';
              
              return (
                <div key={key} className="card">
                  <div className="card-body text-center">
                    <div className={`flex items-center justify-center h-8 w-8 bg-${statusColor}-100 rounded-full mx-auto mb-2`}>
                      <div className={`h-2 w-2 bg-${statusColor}-600 rounded-full`}></div>
                    </div>
                    <h3 className="text-sm font-medium text-gray-900">
                      {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">{status.message}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
