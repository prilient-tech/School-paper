import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import axios from 'axios';
import { PlusIcon, EyeIcon, PencilIcon, TrashIcon, DocumentArrowDownIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import AddQuestionsModal from './AddQuestionsModal';

const QuestionPapers = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showAddQuestionsModal, setShowAddQuestionsModal] = useState(false);
  const [selectedPaper, setSelectedPaper] = useState(null);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(null);
  const exportDropdownRef = useRef(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    subject: '',
    duration: 60,
    instructions: '',
    difficulty: 'mixed'
  });

  const queryClient = useQueryClient();

  // Close export dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Close dropdown if clicking outside the export button area
      if (exportDropdownOpen && !event.target.closest('[data-export-dropdown]')) {
        setExportDropdownOpen(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [exportDropdownOpen]);

  // Fetch question papers
  const { data: questionPapers, isLoading, error } = useQuery('questionPapers', async () => {
    const response = await axios.get('/api/question-papers');
    return response.data.data;
  });

  // Fetch subjects for dropdown
  const { data: subjects } = useQuery('subjects', async () => {
    const response = await axios.get('/api/subjects');
    return response.data.data;
  });

  // Create question paper mutation
  const createMutation = useMutation(
    async (data) => {
      const response = await axios.post('/api/question-papers', data);
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('questionPapers');
        setShowCreateModal(false);
        setFormData({
          title: '',
          description: '',
          subject: '',
          duration: 60,
          instructions: '',
          difficulty: 'mixed'
        });
      }
    }
  );

  // Delete question paper mutation
  const deleteMutation = useMutation(
    async (id) => {
      await axios.delete(`/api/question-papers/${id}`);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('questionPapers');
      }
    }
  );

  const handleCreatePaper = (e) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const handleViewPaper = async (paper) => {
    try {
      const response = await axios.get(`/api/question-papers/${paper._id}`);
      setSelectedPaper(response.data.data);
      setShowViewModal(true);
    } catch (error) {
      console.error('Error fetching question paper details:', error);
    }
  };

  const handleDeletePaper = (id) => {
    if (window.confirm('Are you sure you want to delete this question paper?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleAddQuestions = (paper) => {
    setSelectedPaper(paper);
    setShowAddQuestionsModal(true);
  };

  const handleQuestionsAdded = () => {
    // Refresh the selected paper data
    if (selectedPaper) {
      handleViewPaper(selectedPaper);
    }
  };

  const handleExportPaper = async (paper, format = 'json') => {
    try {
      if (format === 'json') {
        // Export as JSON
        const response = await axios.get(`/api/question-papers/${paper._id}`);
        const questionPaper = response.data.data;

        // Create downloadable JSON file
        const dataStr = JSON.stringify(questionPaper, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${paper.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else if (format === 'pdf') {
        // Export as PDF using browser print
        await handlePDFExport(paper);
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export question paper');
    }
  };

  const handlePDFExport = async (paper) => {
    try {
      // Fetch full question paper data
      const response = await axios.get(`/api/question-papers/${paper._id}`);
      const questionPaper = response.data.data;

      // Create PDF content
      const pdfContent = generatePDFContent(questionPaper);

      // Open in new window for printing
      const printWindow = window.open('', '_blank');
      printWindow.document.write(pdfContent);
      printWindow.document.close();

      // Wait for content to load then print
      printWindow.onload = () => {
        printWindow.print();
        printWindow.close();
      };
    } catch (error) {
      console.error('PDF export error:', error);
      alert('Failed to generate PDF');
    }
  };

  const generatePDFContent = (questionPaper) => {
    const questions = questionPaper.questions || [];
    const totalMarks = questions.reduce((sum, q) => sum + (q.marks || 1), 0);

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${questionPaper.title}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
          .info { margin-bottom: 30px; }
          .info-row { display: flex; justify-content: space-between; margin-bottom: 10px; }
          .instructions { background: #f5f5f5; padding: 15px; margin-bottom: 30px; border-radius: 5px; }
          .question { margin-bottom: 25px; page-break-inside: avoid; }
          .question-header { display: flex; justify-content: space-between; margin-bottom: 10px; }
          .question-number { font-weight: bold; }
          .question-marks { font-weight: bold; }
                     .question-text { margin-bottom: 10px; }
          .options { margin-left: 20px; }
          .option { margin-bottom: 5px; }
          .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #666; }
          @media print {
            body { margin: 20px; }
            .question { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${questionPaper.title}</h1>
          <p><strong>Subject:</strong> ${questionPaper.subject?.name || 'N/A'}</p>
        </div>
        
        <div class="info">
          <div class="info-row">
            <span><strong>Duration:</strong> ${questionPaper.duration} minutes</span>
            <span><strong>Total Marks:</strong> ${totalMarks}</span>
          </div>
          <div class="info-row">
            <span><strong>Difficulty:</strong> ${questionPaper.difficulty}</span>
            <span><strong>Questions:</strong> ${questions.length}</span>
          </div>
        </div>
        
        ${questionPaper.instructions ? `
        <div class="instructions">
          <h3>Instructions:</h3>
          <p>${questionPaper.instructions}</p>
        </div>
        ` : ''}
        
        <div class="questions">
          ${questions.map((q, index) => `
            <div class="question">
              <div class="question-header">
                <span class="question-number">Q${index + 1}.</span>
                <span class="question-marks">[${q.marks || 1} marks]</span>
              </div>
                             <div class="question-text">${q.question.question}</div>
                             ${q.question.options && q.question.options.length > 0 ? `
                 <div class="options">
                   ${q.question.options.map((option, optIndex) => `
                     <div class="option">
                       ${String.fromCharCode(65 + optIndex)}. ${option.text}
                     </div>
                   `).join('')}
                 </div>
               ` : ''}
            </div>
          `).join('')}
        </div>
        
        <div class="footer">
          <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
        </div>
      </body>
      </html>
    `;
  };

  if (isLoading) return <div className="flex justify-center items-center h-64">Loading...</div>;
  if (error) return <div className="text-red-500">Error loading question papers</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Question Papers</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary flex items-center"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Create Question Paper
        </button>
      </div>

      <div className="bg-white shadow-md rounded-lg relative">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Title
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Subject
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Duration
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Marks
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Difficulty
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {questionPapers?.map((paper) => (
              <tr key={paper._id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {paper.title}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {paper.subject?.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {paper.duration} minutes
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {paper.totalMarks || 0}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${paper.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                    paper.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      paper.difficulty === 'hard' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                    }`}>
                    {paper.difficulty}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleViewPaper(paper)}
                      className="text-blue-600 hover:text-blue-900"
                      title="View Details"
                    >
                      <EyeIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleAddQuestions(paper)}
                      className="text-green-600 hover:text-green-900"
                      title="Add Questions"
                    >
                      <PlusIcon className="h-4 w-4" />
                    </button>
                    <div className="relative" ref={exportDropdownRef} data-export-dropdown>
                                             <button
                         onClick={() => setExportDropdownOpen(exportDropdownOpen === paper._id ? null : paper._id)}
                         className="text-purple-600 hover:text-purple-900 flex items-center"
                         title="Export"
                       >
                        <DocumentArrowDownIcon className="h-4 w-4" />
                        <ChevronDownIcon className="h-3 w-3 ml-1" />
                      </button>

                      {exportDropdownOpen === paper._id && (
                          <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-md shadow-xl z-50 border border-gray-200">
                            <div className="py-1">
                              <button
                                onClick={() => {
                                  handleExportPaper(paper, 'pdf');
                                  setExportDropdownOpen(null);
                                }}
                                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              >
                                Export as PDF
                              </button>
                              <button
                                onClick={() => {
                                  handleExportPaper(paper, 'json');
                                  setExportDropdownOpen(null);
                                }}
                                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              >
                                Export as JSON
                              </button>
                            </div>
                          </div>
                        )}
                    </div>
                    <button
                      className="text-yellow-600 hover:text-yellow-900"
                      title="Edit"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeletePaper(paper._id)}
                      className="text-red-600 hover:text-red-900"
                      title="Delete"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Question Paper Modal */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">Create New Question Paper</h3>
            </div>
            <form onSubmit={handleCreatePaper} className="card-body">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="input"
                    placeholder="Enter question paper title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="input"
                    rows="3"
                    placeholder="Enter description"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subject *
                  </label>
                  <select
                    required
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="input"
                  >
                    <option value="">Select a subject</option>
                    {subjects?.map((subject) => (
                      <option key={subject._id} value={subject._id}>
                        {subject.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Duration (minutes) *
                  </label>
                  <input
                    type="number"
                    required
                    min="15"
                    max="300"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                    className="input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Difficulty
                  </label>
                  <select
                    value={formData.difficulty}
                    onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                    className="input"
                  >
                    <option value="mixed">Mixed</option>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Instructions
                  </label>
                  <textarea
                    value={formData.instructions}
                    onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                    className="input"
                    rows="3"
                    placeholder="Enter instructions for students"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isLoading}
                  className="btn btn-primary"
                >
                  {createMutation.isLoading ? 'Creating...' : 'Create Question Paper'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Question Paper Modal */}
      {showViewModal && selectedPaper && (
        <div className="modal-overlay">
          <div className="modal-content max-w-4xl">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">{selectedPaper.title}</h3>
            </div>
            <div className="card-body">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm text-gray-600">Subject</p>
                  <p className="font-medium">{selectedPaper.subject?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Duration</p>
                  <p className="font-medium">{selectedPaper.duration} minutes</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Marks</p>
                  <p className="font-medium">{selectedPaper.totalMarks || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Difficulty</p>
                  <p className="font-medium capitalize">{selectedPaper.difficulty}</p>
                </div>
              </div>

              {selectedPaper.description && (
                <div className="mb-6">
                  <p className="text-sm text-gray-600 mb-2">Description</p>
                  <p className="text-gray-900">{selectedPaper.description}</p>
                </div>
              )}

              {selectedPaper.instructions && (
                <div className="mb-6">
                  <p className="text-sm text-gray-600 mb-2">Instructions</p>
                  <p className="text-gray-900">{selectedPaper.instructions}</p>
                </div>
              )}

              <div>
                <p className="text-sm text-gray-600 mb-2">Questions ({selectedPaper.questions?.length || 0})</p>
                {selectedPaper.questions && selectedPaper.questions.length > 0 ? (
                  <div className="space-y-4">
                    {selectedPaper.questions.map((q, index) => (
                      <div key={q.question._id} className="p-4 border border-gray-200 rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-sm font-medium text-gray-500">Q{index + 1}</span>
                          <span className="text-sm text-gray-500">{q.marks} marks</span>
                        </div>
                        <p className="text-gray-900 mb-2">{q.question.question}</p>
                        <div className="flex space-x-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${q.question.type === 'mcq' ? 'bg-blue-100 text-blue-800' :
                            q.question.type === 'short_answer' ? 'bg-green-100 text-green-800' :
                              q.question.type === 'long_answer' ? 'bg-purple-100 text-purple-800' :
                                'bg-gray-100 text-gray-800'
                            }`}>
                            {q.question.type.toUpperCase()}
                          </span>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${q.question.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                            q.question.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                            {q.question.difficulty}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 italic">No questions added yet</p>
                )}
              </div>

              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowViewModal(false)}
                  className="btn btn-secondary"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Questions Modal */}
      {showAddQuestionsModal && selectedPaper && (
        <AddQuestionsModal
          questionPaperId={selectedPaper._id}
          onClose={() => setShowAddQuestionsModal(false)}
          onQuestionsAdded={handleQuestionsAdded}
        />
      )}
    </div>
  );
};

export default QuestionPapers;
