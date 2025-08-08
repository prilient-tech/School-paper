import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import axios from 'axios';
import { MagnifyingGlassIcon, PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';

const AddQuestionsModal = ({ questionPaperId, onClose, onQuestionsAdded }) => {
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    subject: '',
    chapter: '',
    type: '',
    difficulty: ''
  });

  const queryClient = useQueryClient();

  // Fetch available questions
  const { data: questions, isLoading } = useQuery(
    ['questions', filters, searchTerm],
    async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (filters.subject) params.append('subject', filters.subject);
      if (filters.chapter) params.append('chapter', filters.chapter);
      if (filters.type) params.append('type', filters.type);
      if (filters.difficulty) params.append('difficulty', filters.difficulty);
      
      const response = await axios.get(`/api/questions?${params.toString()}`);
      return response.data.data;
    }
  );

  // Fetch subjects and chapters for filters
  const { data: subjects } = useQuery('subjects', async () => {
    const response = await axios.get('/api/subjects');
    return response.data.data;
  });

  const { data: chapters } = useQuery('chapters', async () => {
    const response = await axios.get('/api/chapters');
    return response.data.data;
  });

  // Add questions mutation
  const addQuestionsMutation = useMutation(
    async (data) => {
      const response = await axios.post(`/api/question-papers/${questionPaperId}/add-questions`, data);
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('questionPapers');
        onQuestionsAdded();
        onClose();
      }
    }
  );

  const handleQuestionSelect = (question) => {
    const isSelected = selectedQuestions.find(q => q.question === question._id);
    if (isSelected) {
      setSelectedQuestions(selectedQuestions.filter(q => q.question !== question._id));
    } else {
      setSelectedQuestions([...selectedQuestions, {
        question: question._id,
        order: selectedQuestions.length + 1,
        marks: question.marks || 1
      }]);
    }
  };

  const handleAddQuestions = () => {
    if (selectedQuestions.length > 0) {
      addQuestionsMutation.mutate({ questions: selectedQuestions });
    }
  };

  const isQuestionSelected = (questionId) => {
    return selectedQuestions.find(q => q.question === questionId);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-6xl max-h-[90vh]">
        <div className="card-header">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">Add Questions to Question Paper</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>
        
        <div className="card-body">
          {/* Search and Filters */}
          <div className="mb-6 space-y-4">
            <div className="flex space-x-4">
              <div className="flex-1">
                <div className="relative">
                  <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search questions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="input pl-10"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                <select
                  value={filters.subject}
                  onChange={(e) => setFilters({ ...filters, subject: e.target.value })}
                  className="input"
                >
                  <option value="">All Subjects</option>
                  {subjects?.map((subject) => (
                    <option key={subject._id} value={subject._id}>
                      {subject.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Chapter</label>
                <select
                  value={filters.chapter}
                  onChange={(e) => setFilters({ ...filters, chapter: e.target.value })}
                  className="input"
                >
                  <option value="">All Chapters</option>
                  {chapters?.map((chapter) => (
                    <option key={chapter._id} value={chapter._id}>
                      {chapter.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={filters.type}
                  onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                  className="input"
                >
                  <option value="">All Types</option>
                  <option value="mcq">MCQ</option>
                  <option value="short_answer">Short Answer</option>
                  <option value="long_answer">Long Answer</option>
                  <option value="true_false">True/False</option>
                  <option value="fill_blank">Fill in the Blank</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
                <select
                  value={filters.difficulty}
                  onChange={(e) => setFilters({ ...filters, difficulty: e.target.value })}
                  className="input"
                >
                  <option value="">All Difficulties</option>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
            </div>
          </div>

          {/* Selected Questions Summary */}
          {selectedQuestions.length > 0 && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-blue-900">
                    {selectedQuestions.length} question(s) selected
                  </p>
                  <p className="text-sm text-blue-700">
                    Total marks: {selectedQuestions.reduce((sum, q) => sum + q.marks, 0)}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedQuestions([])}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Clear Selection
                </button>
              </div>
            </div>
          )}

          {/* Questions List */}
          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="flex justify-center items-center h-32">
                <div className="loading-spinner-lg"></div>
              </div>
            ) : questions && questions.length > 0 ? (
              <div className="space-y-3">
                {questions.map((question) => (
                  <div
                    key={question._id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      isQuestionSelected(question._id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleQuestionSelect(question)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm text-gray-900 mb-2">{question.question}</p>
                        <div className="flex space-x-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            question.type === 'mcq' ? 'bg-blue-100 text-blue-800' :
                            question.type === 'short_answer' ? 'bg-green-100 text-green-800' :
                            question.type === 'long_answer' ? 'bg-purple-100 text-purple-800' :
                            question.type === 'true_false' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {question.type.toUpperCase()}
                          </span>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            question.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                            question.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {question.difficulty}
                          </span>
                          <span className="text-xs text-gray-500">
                            {question.subject?.name} • {question.chapter?.name}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        <span className="text-sm text-gray-500">{question.marks || 1} marks</span>
                        {isQuestionSelected(question._id) && (
                          <PlusIcon className="h-4 w-4 text-blue-600" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No questions found matching your criteria
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleAddQuestions}
              disabled={selectedQuestions.length === 0 || addQuestionsMutation.isLoading}
              className="btn btn-primary"
            >
              {addQuestionsMutation.isLoading ? 'Adding...' : `Add ${selectedQuestions.length} Question(s)`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddQuestionsModal; 