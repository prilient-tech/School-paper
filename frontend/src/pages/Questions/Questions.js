import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import axios from 'axios';
import { ChevronDownIcon, ChevronRightIcon, ChevronLeftIcon, ChevronDoubleRightIcon, ChevronDoubleLeftIcon, PencilIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const Questions = () => {
  const [expandedQuestions, setExpandedQuestions] = useState(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filters, setFilters] = useState({
    subject: '',
    chapter: '',
    type: '',
    difficulty: '',
    search: ''
  });
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [editingMarks, setEditingMarks] = useState(null);
  const [editingMarksValue, setEditingMarksValue] = useState('');
  const [bulkEditMode, setBulkEditMode] = useState(false);
  const [selectedQuestions, setSelectedQuestions] = useState(new Set());
  const [bulkMarksValue, setBulkMarksValue] = useState('');
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [failedUpdates, setFailedUpdates] = useState([]);
  
  const queryClient = useQueryClient();

  // Fetch questions with pagination and filters
  const { data: questionsData, isLoading, error } = useQuery(
    ['questions', currentPage, pageSize, filters, sortBy, sortOrder], 
    async () => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString()
      });
      
      // Add filters to query params
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      
      // Add sort parameters
      params.append('sortBy', sortBy);
      params.append('sortOrder', sortOrder);
      
      const response = await axios.get(`/api/questions?${params.toString()}`);
      return response.data;
    }
  );

  const questions = questionsData?.data || [];
  const pagination = questionsData?.pagination || {};

  // Fetch subjects and chapters for filters
  const { data: subjects } = useQuery('subjects', async () => {
    const response = await axios.get('/api/subjects');
    return response.data.data;
  });

  const { data: chapters } = useQuery('chapters', async () => {
    const response = await axios.get('/api/chapters');
    return response.data.data;
  });

  // Update question marks mutation
  const updateQuestionMarks = useMutation(async ({ questionId, marks }) => {
    const response = await axios.patch(`/api/questions/${questionId}/marks`, { marks });
    return response.data;
  }, {
    onSuccess: () => {
      queryClient.invalidateQueries(['questions']);
      toast.success('Marks updated successfully');
      setEditingMarks(null);
      setEditingMarksValue('');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update marks');
    }
  });

  const handleFilterChange = (key, value) => {
    setFilters(prev => {
      const newFilters = { ...prev, [key]: value };
      
      // If subject changes, clear chapter filter
      if (key === 'subject') {
        newFilters.chapter = '';
      }
      
      return newFilters;
    });
    setCurrentPage(1); // Reset to first page when filters change
  };

  const resetFilters = () => {
    setFilters({
      subject: '',
      chapter: '',
      type: '',
      difficulty: '',
      search: ''
    });
    setCurrentPage(1);
  };

  const startEditingMarks = (questionId, currentMarks) => {
    setEditingMarks(questionId);
    setEditingMarksValue(currentMarks.toString());
  };

  const saveMarks = (questionId) => {
    const marks = parseInt(editingMarksValue);
    if (isNaN(marks) || marks < 1) {
      toast.error('Please enter a valid mark (minimum 1)');
      return;
    }
    updateQuestionMarks.mutate({ questionId, marks });
  };

  const cancelEditingMarks = () => {
    setEditingMarks(null);
    setEditingMarksValue('');
  };

  const generateCSV = (questions) => {
    const headers = ['Question', 'Type', 'Difficulty', 'Subject', 'Chapter', 'Marks', 'Source'];
    const rows = questions.map(q => [
      q.question,
      q.type,
      q.difficulty,
      q.subject?.name || '',
      q.chapter?.name || '',
      q.marks || 1,
      q.sourcePdf?.title || 'Manual'
    ]);
    
    return [headers, ...rows]
      .map(row => row.map(cell => `"${cell?.toString().replace(/"/g, '""')}"`).join(','))
      .join('\n');
  };

  const downloadCSV = (content, filename) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleQuestionSelection = (questionId) => {
    const newSelected = new Set(selectedQuestions);
    if (newSelected.has(questionId)) {
      newSelected.delete(questionId);
    } else {
      newSelected.add(questionId);
    }
    setSelectedQuestions(newSelected);
  };

  const selectAllQuestions = () => {
    if (selectedQuestions.size === questions.length) {
      setSelectedQuestions(new Set());
    } else {
      setSelectedQuestions(new Set(questions.map(q => q._id)));
    }
  };

  const bulkUpdateMarks = async () => {
    const marks = parseInt(bulkMarksValue);
    if (isNaN(marks) || marks < 1) {
      toast.error('Please enter a valid mark (minimum 1)');
      return;
    }

    setIsBulkUpdating(true);
    setFailedUpdates([]); // Clear previous failed updates
    try {
      const questionIds = Array.from(selectedQuestions);
      const promises = questionIds.map(async (questionId) => {
        try {
          return await axios.patch(`/api/questions/${questionId}/marks`, { marks });
        } catch (error) {
          return { error: true, questionId, errorMessage: error.response?.data?.message || 'Update failed' };
        }
      });
      
      const results = await Promise.all(promises);
      
      // Check for errors
      const errors = results.filter(result => result.error);
      const successes = results.filter(result => !result.error);
      
      if (errors.length > 0) {
        const errorMessage = `Updated ${successes.length} questions. Failed to update ${errors.length} questions.`;
        toast.error(errorMessage);
        
        // Track failed updates for display
        setFailedUpdates(errors);
        
        // Log detailed errors for debugging
        errors.forEach(error => {
          console.error(`Failed to update question ${error.questionId}:`, error.errorMessage);
        });
      } else {
        toast.success(`Successfully updated marks for ${successes.length} questions`);
        setFailedUpdates([]);
      }
      
      queryClient.invalidateQueries(['questions']);
      setSelectedQuestions(new Set());
      setBulkMarksValue('');
      setBulkEditMode(false);
    } catch (error) {
      toast.error('Failed to update questions: ' + (error.response?.data?.message || error.message));
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const toggleQuestionExpansion = (questionId) => {
    const newExpanded = new Set(expandedQuestions);
    if (newExpanded.has(questionId)) {
      newExpanded.delete(questionId);
    } else {
      newExpanded.add(questionId);
    }
    setExpandedQuestions(newExpanded);
  };

  const renderQuestionOptions = (question) => {
    if (!question.options || question.options.length === 0) {
      return null;
    }

    return (
      <div className="mt-3 pl-4 border-l-2 border-gray-200">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Options:</h4>
        <div className="space-y-2">
          {question.options.map((option, index) => (
            <div
              key={index}
              className={`flex items-center p-2 rounded-md text-sm ${
                option.isCorrect
                  ? 'bg-green-50 border border-green-200 text-green-800'
                  : 'bg-gray-50 border border-gray-200 text-gray-700'
              }`}
            >
              <span className="font-medium mr-2">
                {String.fromCharCode(65 + index)}.
              </span>
              <span>{option.text}</span>
              {option.isCorrect && (
                <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                  Correct
                </span>
              )}
            </div>
          ))}
        </div>
        {question.explanation && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <h5 className="text-sm font-medium text-blue-800 mb-1">Explanation:</h5>
            <p className="text-sm text-blue-700">{question.explanation}</p>
          </div>
        )}
      </div>
    );
  };

  const renderQuestionContent = (question) => {
    const isExpanded = expandedQuestions.has(question._id);
    
    return (
      <div className="space-y-2">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm text-gray-900 leading-relaxed">{question.question}</p>
            
            {/* Source Information */}
            {question.sourcePdf && (
              <div className="mt-2 text-xs text-gray-500">
                <span className="font-medium">Source:</span> {question.sourcePdf.title || 'PDF Document'}
                {question.metadata?.chunkIndex !== undefined && (
                  <span className="ml-2">(Chunk {question.metadata.chunkIndex + 1})</span>
                )}
              </div>
            )}
            
            {/* Show/Hide Options Button */}
            {(question.options && question.options.length > 0) && (
              <button
                onClick={() => toggleQuestionExpansion(question._id)}
                className="mt-2 flex items-center text-xs text-blue-600 hover:text-blue-800"
              >
                {isExpanded ? (
                  <>
                    <ChevronDownIcon className="h-3 w-3 mr-1" />
                    Hide details
                  </>
                ) : (
                  <>
                    <ChevronRightIcon className="h-3 w-3 mr-1" />
                    Show details
                  </>
                )}
              </button>
            )}
          </div>
        </div>
        
        {isExpanded && (
          <div className="space-y-3">
            {/* Question Options */}
            {renderQuestionOptions(question)}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) return <div className="flex justify-center items-center h-64">Loading...</div>;
  if (error) return <div className="text-red-500">Error loading questions</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Questions</h1>
          {questions.length > 0 && (
            <p className="text-sm text-gray-600 mt-1">
              Showing {questions.length} question{questions.length !== 1 ? 's' : ''} 
              {pagination.total > questions.length && ` of ${pagination.total} total`}
            </p>
          )}
        </div>
        {questions.length > 0 && (
          <button
            onClick={() => {
              const csvContent = generateCSV(questions);
              downloadCSV(csvContent, 'questions.csv');
            }}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            Export CSV
          </button>
        )}
      </div>

      {/* Filter Controls */}
      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
          {/* Subject Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
            <select
              value={filters.subject}
              onChange={(e) => handleFilterChange('subject', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Subjects</option>
              {subjects?.map((subject) => (
                <option key={subject._id} value={subject._id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </div>

          {/* Chapter Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Chapter</label>
            <select
              value={filters.chapter}
              onChange={(e) => handleFilterChange('chapter', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={!filters.subject}
            >
              <option value="">All Chapters</option>
                             {chapters
                 ?.filter(chapter => !filters.subject || chapter.subject._id === filters.subject)
                 .map((chapter) => (
                   <option key={chapter._id} value={chapter._id}>
                     {chapter.name}
                   </option>
                 ))}
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
            <select
              value={filters.type}
              onChange={(e) => handleFilterChange('type', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Types</option>
              <option value="mcq">MCQ</option>
              <option value="short_answer">Short Answer</option>
              <option value="long_answer">Long Answer</option>
              <option value="true_false">True/False</option>
              <option value="fill_blank">Fill in the Blank</option>
            </select>
          </div>

          {/* Difficulty Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty</label>
            <select
              value={filters.difficulty}
              onChange={(e) => handleFilterChange('difficulty', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Difficulties</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          {/* Search Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              placeholder="Search questions..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Sort Controls */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
            <div className="flex space-x-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="createdAt">Date Created</option>
                <option value="marks">Marks</option>
                <option value="difficulty">Difficulty</option>
                <option value="type">Type</option>
                <option value="question">Question Text</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                title={sortOrder === 'asc' ? 'Sort Descending' : 'Sort Ascending'}
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>
          </div>

          {/* Reset Button */}
          <div className="flex items-end">
            <button
              onClick={resetFilters}
              className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      {/* Active Filters Summary */}
      {Object.values(filters).some(value => value) && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-blue-800">Active Filters:</span>
              {filters.subject && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Subject: {subjects?.find(s => s._id === filters.subject)?.name}
                </span>
              )}
              {filters.chapter && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Chapter: {chapters?.find(c => c._id === filters.chapter)?.name}
                </span>
              )}
              {filters.type && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Type: {filters.type.toUpperCase()}
                </span>
              )}
              {filters.difficulty && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Difficulty: {filters.difficulty}
                </span>
              )}
              {filters.search && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Search: "{filters.search}"
                </span>
              )}
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Total Marks: {questions.reduce((sum, q) => sum + (q.marks || 1), 0)}
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                Avg Marks: {(questions.reduce((sum, q) => sum + (q.marks || 1), 0) / questions.length).toFixed(1)}
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                Marks Distribution: {(() => {
                  const distribution = {};
                  questions.forEach(q => {
                    const marks = q.marks || 1;
                    distribution[marks] = (distribution[marks] || 0) + 1;
                  });
                  return Object.entries(distribution)
                    .sort(([a], [b]) => parseInt(a) - parseInt(b))
                    .map(([marks, count]) => `${marks}(${count})`)
                    .join(', ');
                })()}
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                Sort: {sortBy === 'createdAt' ? 'Date' : sortBy === 'marks' ? 'Marks' : sortBy === 'difficulty' ? 'Difficulty' : sortBy === 'type' ? 'Type' : 'Question'} {sortOrder === 'asc' ? '↑' : '↓'}
              </span>
            </div>
            <button
              onClick={resetFilters}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Clear All
            </button>
          </div>
        </div>
      )}

      {/* Bulk Edit Controls */}
      {questions.length > 0 && (
        <div className="bg-white shadow-md rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={selectedQuestions.size === questions.length}
                  onChange={selectAllQuestions}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Select All ({selectedQuestions.size}/{questions.length})
                  {selectedQuestions.size > 0 && (
                    <span className="ml-2 text-green-600 font-medium">
                      • Total Marks: {Array.from(selectedQuestions)
                        .map(id => questions.find(q => q._id === id))
                        .reduce((sum, q) => sum + (q?.marks || 1), 0)}
                      • Avg Marks: {(Array.from(selectedQuestions)
                        .map(id => questions.find(q => q._id === id))
                        .reduce((sum, q) => sum + (q?.marks || 1), 0) / selectedQuestions.size).toFixed(1)}
                    </span>
                  )}
                </span>
              </label>
              
              {selectedQuestions.size > 0 && (
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    value={bulkMarksValue}
                    onChange={(e) => setBulkMarksValue(e.target.value)}
                    placeholder="Marks"
                    min="1"
                    className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                                     <button
                     onClick={bulkUpdateMarks}
                     disabled={isBulkUpdating}
                     className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                   >
                     {isBulkUpdating ? (
                       <div className="flex items-center space-x-2">
                         <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                         <span>Updating...</span>
                       </div>
                     ) : (
                       `Update ${selectedQuestions.size} Questions`
                     )}
                   </button>
                  <button
                    onClick={() => {
                      setSelectedQuestions(new Set());
                      setBulkMarksValue('');
                    }}
                    className="px-3 py-1 bg-gray-500 text-white text-sm rounded hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
            
            <button
              onClick={() => setBulkEditMode(!bulkEditMode)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                bulkEditMode 
                  ? 'bg-red-600 text-white hover:bg-red-700' 
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {bulkEditMode ? 'Exit Bulk Edit' : 'Bulk Edit Marks'}
            </button>
          </div>
        </div>
      )}

      {/* Failed Updates Display */}
      {failedUpdates.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-red-800">
              Failed to Update {failedUpdates.length} Questions
            </h3>
            <button
              onClick={() => setFailedUpdates([])}
              className="text-sm text-red-600 hover:text-red-800 font-medium"
            >
              Dismiss
            </button>
          </div>
          <div className="space-y-2">
            {failedUpdates.map((error, index) => (
              <div key={index} className="text-sm text-red-700 bg-red-100 p-2 rounded">
                <span className="font-medium">Question ID:</span> {error.questionId} - {error.errorMessage}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {bulkEditMode && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={selectedQuestions.size === questions.length}
                    onChange={selectAllQuestions}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Question
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Difficulty
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Subject
              </th>
                             <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                 Chapter
               </th>
               <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                 Source
               </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                   Marks
                   {questions.length > 0 && (
                     <div className="text-xs font-normal text-gray-400 mt-1">
                       Total: {questions.reduce((sum, q) => sum + (q.marks || 1), 0)}
                     </div>
                   )}
                 </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {questions?.map((question) => (
              <tr key={question._id} className="hover:bg-gray-50 group">
                {bulkEditMode && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedQuestions.has(question._id)}
                      onChange={() => toggleQuestionSelection(question._id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                )}
                <td className="px-6 py-4 text-sm text-gray-900 max-w-md">
                  {renderQuestionContent(question)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    question.type === 'mcq' ? 'bg-blue-100 text-blue-800' :
                    question.type === 'short_answer' ? 'bg-green-100 text-green-800' :
                    question.type === 'long_answer' ? 'bg-purple-100 text-purple-800' :
                    question.type === 'true_false' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {question.type.toUpperCase()}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    question.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                    question.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {question.difficulty}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {question.subject?.name}
                </td>
                                 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                   {question.chapter?.name}
                 </td>
                 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                   {question.sourcePdf?.title ? (
                     <span className="text-blue-600 hover:text-blue-800 cursor-pointer">
                       {question.sourcePdf.title}
                     </span>
                   ) : (
                     <span className="text-gray-400">Manual</span>
                   )}
                 </td>
                 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                   {editingMarks === question._id ? (
                     <div className="flex items-center space-x-2">
                       <input
                         type="number"
                         value={editingMarksValue}
                         onChange={(e) => setEditingMarksValue(e.target.value)}
                         min="1"
                         className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                         autoFocus
                       />
                       <button
                         onClick={() => saveMarks(question._id)}
                         disabled={updateQuestionMarks.isLoading}
                         className="text-green-600 hover:text-green-800 disabled:opacity-50"
                         title="Save marks"
                       >
                         {updateQuestionMarks.isLoading ? (
                           <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                         ) : (
                           <CheckIcon className="h-4 w-4" />
                         )}
                       </button>
                       <button
                         onClick={cancelEditingMarks}
                         className="text-red-600 hover:text-red-800"
                       >
                         <XMarkIcon className="h-4 w-4" />
                       </button>
                     </div>
                   ) : (
                     <div className="flex items-center space-x-2">
                       <span className="font-medium">{question.marks || 1}</span>
                       <button
                         onClick={() => startEditingMarks(question._id, question.marks || 1)}
                         className="text-blue-600 hover:text-blue-800 opacity-0 group-hover:opacity-100 transition-opacity"
                         title="Edit marks"
                       >
                         <PencilIcon className="h-3 w-3" />
                       </button>
                     </div>
                   )}
                 </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {pagination.total > 0 && (
        <div className="mt-6 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-700">
              Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
              {pagination.total} questions
            </span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="ml-4 border border-gray-300 rounded-md px-2 py-1 text-sm"
            >
              <option value={5}>5 per page</option>
              <option value={10}>10 per page</option>
              <option value={20}>20 per page</option>
              <option value={50}>50 per page</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="p-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              <ChevronDoubleLeftIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </button>
            
            <span className="px-3 py-2 text-sm text-gray-700">
              Page {pagination.page} of {pagination.pages || 1}
            </span>
            
            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage >= (pagination.pages || 1)}
              className="p-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              <ChevronRightIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => setCurrentPage(pagination.pages || 1)}
              disabled={currentPage >= (pagination.pages || 1)}
              className="p-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              <ChevronDoubleRightIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Questions;
