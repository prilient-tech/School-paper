import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import toast from 'react-hot-toast';
import axios from 'axios';
import ProfessionalLoader from '../../components/UI/ProfessionalLoader';

// Get backend URL dynamically
const getBackendUrl = () => {
  // Check for environment variable first
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  
  // In development with proxy, use relative URL
  if (process.env.NODE_ENV === 'development' && window.location.port === '3000') {
    return '';
  }
  
  // For production or different ports, construct from current URL
  const currentOrigin = window.location.origin;
  const currentPort = window.location.port;
  
  // If frontend is on port 3000, backend is likely on 5025
  if (currentPort === '3000') {
    return currentOrigin.replace('3000', '5025');
  }
  
  // For other cases, try to construct backend URL
  // You can customize this based on your deployment setup
  return currentOrigin.replace(/:\d+/, ':5025');
};

const PDFs = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    chapter: ''
  });

  const queryClient = useQueryClient();

  // Fetch PDFs
  const { data: pdfs, isLoading, error } = useQuery('pdfs', async () => {
    const response = await axios.get('/api/pdfs');
    return response.data.data;
  });

  // Fetch subjects and chapters for dropdowns
  const { data: subjects } = useQuery('subjects', async () => {
    const response = await axios.get('/api/subjects');
    return response.data.data;
  });

  const { data: chapters } = useQuery('chapters', async () => {
    const response = await axios.get('/api/chapters');
    return response.data.data;
  });

  const [uploadedPdfId, setUploadedPdfId] = useState(null);

  // Upload PDF mutation
  const uploadPDF = useMutation(async (formDataToSend) => {
    const response = await axios.post('/api/pdfs', formDataToSend, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }, {
    onSuccess: (data) => {
      setUploadedPdfId(data.data._id);
      queryClient.invalidateQueries('pdfs');
      toast.success('PDF uploaded successfully');
      setIsModalOpen(false);
      setSelectedFile(null);
      setFormData({ title: '', subject: '', chapter: '' });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to upload PDF');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error('Please select a PDF file');
      return;
    }

    const formDataToSend = new FormData();
    formDataToSend.append('pdf', selectedFile);
    formDataToSend.append('title', formData.title);
    formDataToSend.append('subject', formData.subject);
    formDataToSend.append('chapter', formData.chapter);

    uploadPDF.mutate(formDataToSend);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
    } else {
      toast.error('Please select a valid PDF file');
    }
  };

  const openModal = () => {
    setSelectedFile(null);
    setFormData({ title: '', subject: '', chapter: '' });
    setUploadedPdfId(null);
    setIsModalOpen(true);
  };

  if (isLoading) return <div className="flex justify-center items-center h-64">Loading...</div>;
  if (error) return <div className="text-red-500">Error loading PDFs</div>;

  // Show professional loader during PDF upload and processing
  if (uploadPDF.isLoading || (uploadedPdfId && !uploadPDF.isSuccess)) {
    return <ProfessionalLoader 
      message="Processing your PDF and generating questions..." 
      pdfId={uploadedPdfId}
    />;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">PDFs</h1>
        <button
          onClick={openModal}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Upload PDF
        </button>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
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
                Chapter
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Uploaded By
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {pdfs?.map((pdf) => (
              <tr key={pdf._id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {pdf.title}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {pdf.subject?.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {pdf.chapter?.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    pdf.processingStatus === 'completed' ? 'bg-green-100 text-green-800' :
                    pdf.processingStatus === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                    pdf.processingStatus === 'failed' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {pdf.processingStatus}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {pdf.uploadedBy?.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                     {(() => {
                     // Construct the PDF URL with correct backend URL
                     const pdfPath = pdf.pdfUrl || pdf.filePath || `/uploads/${pdf.filename || pdf.fileName}`;
                     const backendUrl = getBackendUrl();
                     const fullPdfUrl = backendUrl ? `${backendUrl}${pdfPath}` : pdfPath;
                     
                     return (
                       <a
                         href={fullPdfUrl}
                         target="_blank"
                         rel="noopener noreferrer"
                         className="text-indigo-600 hover:text-indigo-900 mr-4"
                         onClick={(e) => {
                           // Prevent default behavior and handle PDF viewing
                           e.preventDefault();
                           
                           // Create a new window/tab with the PDF using full backend URL
                           const newWindow = window.open(fullPdfUrl, '_blank');
                           
                           // If popup is blocked, show a message and offer alternative
                           if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
                             toast.error('Popup blocked! Opening PDF in same tab...', {
                               duration: 3000,
                             });
                             // Fallback: open in same tab after a short delay
                             setTimeout(() => {
                               window.location.href = fullPdfUrl;
                             }, 1000);
                           }
                         }}
                       >
                         View
                       </a>
                     );
                   })()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Upload PDF</h3>
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Title
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subject
                  </label>
                  <select
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select Subject</option>
                    {subjects?.map((subject) => (
                      <option key={subject._id} value={subject._id}>
                        {subject.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Chapter
                  </label>
                  <select
                    value={formData.chapter}
                    onChange={(e) => setFormData({ ...formData, chapter: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select Chapter</option>
                    {chapters?.map((chapter) => (
                      <option key={chapter._id} value={chapter._id}>
                        {chapter.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    PDF File
                  </label>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    disabled={uploadPDF.isLoading}
                  >
                    {uploadPDF.isLoading ? 'Uploading...' : 'Upload'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PDFs;
