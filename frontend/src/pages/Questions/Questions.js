import React, { useState } from 'react';
import { useQuery } from 'react-query';
import axios from 'axios';
import { ChevronDownIcon, ChevronRightIcon, ChevronLeftIcon, ChevronDoubleLeftIcon, ChevronDoubleRightIcon } from '@heroicons/react/24/outline';

const Questions = () => {
  const [expandedQuestions, setExpandedQuestions] = useState(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Fetch questions with pagination
  const { data: questionsData, isLoading, error } = useQuery(
    ['questions', currentPage, pageSize], 
    async () => {
      const response = await axios.get(`/api/questions?page=${currentPage}&limit=${pageSize}`);
      return response.data;
    }
  );

  const questions = questionsData?.data || [];
  const pagination = questionsData?.pagination || {};

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
        <h1 className="text-2xl font-bold text-gray-900">Questions</h1>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
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
               </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {questions?.map((question) => (
              <tr key={question._id} className="hover:bg-gray-50">
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
                   {question.marks || 1}
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
