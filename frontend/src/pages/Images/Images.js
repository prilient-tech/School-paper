import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import toast from 'react-hot-toast';
import axios from 'axios';
import { PlusIcon, TrashIcon, EyeIcon, XMarkIcon } from '@heroicons/react/24/outline';
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
  
  // For production, use the same domain with /api prefix
  // Since backend is hosted on the same domain with /api path
  if (process.env.NODE_ENV === 'production' || !window.location.port) {
    return '';
  }
  
  // For development with different ports, construct from current URL
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

const Images = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [selectedPdf, setSelectedPdf] = useState(null);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    chapter: ''
  });

  const queryClient = useQueryClient();

  // Fetch Images (converted to PDFs)
  const { data: images, isLoading, error, refetch } = useQuery('images', async () => {
    const response = await axios.get('/api/images');
    console.log('Images data:', response.data.data);
    return response.data.data;
  }, {
    refetchInterval: (data) => {
      // Only poll if there are items still processing
      if (data && data.some(item => item.processingStatus === 'processing')) {
        return 5000; // Refetch every 5 seconds if processing
      }
      return false; // Stop polling if all items are completed
    },
    refetchIntervalInBackground: true
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

  // Upload Images mutation
  const uploadImages = useMutation(async (formDataToSend) => {
    const response = await axios.post('/api/images', formDataToSend, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }, {
    onSuccess: () => {
      queryClient.invalidateQueries('images');
      toast.success('Images uploaded and converted to PDF successfully');
      setIsModalOpen(false);
      setSelectedFiles([]);
      setFormData({ title: '', subject: '', chapter: '' });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to upload images');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (selectedFiles.length === 0) {
      toast.error('Please select at least one image file');
      return;
    }

    const formDataToSend = new FormData();
    selectedFiles.forEach((file, index) => {
      formDataToSend.append('images', file);
    });
    formDataToSend.append('title', formData.title);
    formDataToSend.append('subject', formData.subject);
    formDataToSend.append('chapter', formData.chapter);

    uploadImages.mutate(formDataToSend);
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = files.filter(file => {
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      return validTypes.includes(file.type);
    });

    if (validFiles.length !== files.length) {
      toast.error('Some files were skipped. Only JPG, PNG, GIF, and WebP images are allowed.');
    }

    if (validFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...validFiles]);
    }
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const openModal = () => {
    setSelectedFiles([]);
    setFormData({ title: '', subject: '', chapter: '' });
    setIsModalOpen(true);
  };

  if (isLoading) return <div className="flex justify-center items-center h-64">Loading...</div>;
  if (error) return <div className="text-red-500">Error loading images</div>;

  // Show professional loader during image upload and PDF conversion
  if (uploadImages.isLoading) {
    return <ProfessionalLoader message="Converting your images to PDF..." />;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Images to PDF</h1>
        <div className="flex space-x-2">
          <button
            onClick={() => refetch()}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 flex items-center"
          >
            Refresh
          </button>
          <button
            onClick={openModal}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Upload Images
          </button>
        </div>
      </div>

      {/* Images List */}
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
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {images?.map((image) => (
              <tr key={image._id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {image.title}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {image.subject?.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {image.chapter?.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex flex-col">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      image.processingStatus === 'completed' ? 'bg-green-100 text-green-800' :
                      image.processingStatus === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {image.processingStatus}
                    </span>
                    {image.pdfUrl && (
                      <span className="text-xs text-gray-400 mt-1 truncate" title={image.pdfUrl}>
                        PDF: {image.pdfUrl.split('/').pop()}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex space-x-2">
                    {image.processingStatus === 'completed' && image.pdfUrl ? (
                      <button
                        onClick={() => {
                          console.log('Clicked on image:', image);
                          console.log('PDF URL:', image.pdfUrl);
                          console.log('Processing status:', image.processingStatus);
                          
                          if (image.processingStatus === 'completed' && image.pdfUrl) {
                            // Create a copy of the image with the correct backend URL
                            const backendUrl = getBackendUrl();
                            let finalPdfUrl = image.pdfUrl;
                            
                            // If backend is on same domain (production), use /api prefix
                            // If backend is on different port (development), use full backend URL
                            if (backendUrl) {
                              // Development: backend on different port
                              finalPdfUrl = `${backendUrl}${image.pdfUrl}`;
                            } else {
                              // Production: backend on same domain with /api prefix
                              finalPdfUrl = `/api${image.pdfUrl}`;
                            }
                            
                            // Debug logging
                            console.log('Image PDF URL Debug:', {
                              originalPdfUrl: image.pdfUrl,
                              backendUrl,
                              finalPdfUrl,
                              environment: process.env.NODE_ENV,
                              origin: window.location.origin,
                              port: window.location.port
                            });
                            
                            const imageWithBackendUrl = {
                              ...image,
                              pdfUrl: finalPdfUrl
                            };

                            console.log('Image with backend URL:', imageWithBackendUrl);
                            
                            console.log('Backend URL:', backendUrl);
                            console.log('Original PDF URL:', image.pdfUrl);
                            console.log('Final PDF URL:', finalPdfUrl);
                            
                            setSelectedPdf(imageWithBackendUrl);
                            setShowPdfModal(true);
                          } else {
                            alert('PDF is not ready yet. Please wait for processing to complete.');
                          }
                        }}
                        className="text-blue-600 hover:text-blue-900"
                        title="View PDF"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                    ) : (
                      <span className="text-gray-400" title="PDF not ready yet">
                        <EyeIcon className="h-4 w-4" />
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Upload Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">Upload Images</h3>
            </div>
            <form onSubmit={handleSubmit} className="card-body">
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
                    placeholder="Enter title for the PDF"
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
                    Chapter *
                  </label>
                  <select
                    required
                    value={formData.chapter}
                    onChange={(e) => setFormData({ ...formData, chapter: e.target.value })}
                    className="input"
                  >
                    <option value="">Select a chapter</option>
                    {chapters?.map((chapter) => (
                      <option key={chapter._id} value={chapter._id}>
                        {chapter.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Images *
                  </label>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileChange}
                    className="input"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Supported formats: JPG, PNG, GIF, WebP. Images will be converted to PDF in the order selected.
                  </p>
                </div>

                {/* Selected Files Preview */}
                {selectedFiles.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Selected Images ({selectedFiles.length})
                    </label>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {selectedFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="text-sm text-gray-700 truncate">{file.name}</span>
                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadImages.isLoading || selectedFiles.length === 0}
                  className="btn btn-primary"
                >
                  {uploadImages.isLoading ? 'Uploading...' : 'Upload Images'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PDF Viewer Modal */}
      {showPdfModal && selectedPdf && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-lg shadow-xl w-[90vw] max-w-6xl max-h-[90vh] overflow-hidden" style={{ zIndex: 10000 }}>
            <div className="card-header flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">
                PDF Viewer: {selectedPdf.title}
              </h3>
              <button
                onClick={() => {
                  setShowPdfModal(false);
                  setSelectedPdf(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="card-body p-0">
              <div className="h-[70vh] w-full bg-gray-100">
                {selectedPdf.pdfUrl ? (
                                      <div className="h-full flex flex-col">
                      <div className="flex-1 bg-gray-100 flex items-center justify-center">
                        <div className="text-center">
                          <div className="mb-4">
                            <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <h3 className="text-lg font-medium text-gray-900 mb-2">PDF Ready for Download</h3>
                          <p className="text-sm text-gray-500 mb-4">
                            {selectedPdf.pdfUrl.split('/').pop()}
                          </p>
                          <div className="space-y-2">
                            <button
                              onClick={() => {
                                console.log('Opening PDF in new tab:', selectedPdf.pdfUrl);
                                window.open(selectedPdf.pdfUrl, '_blank');
                              }}
                              className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                            >
                              Open PDF in New Tab
                            </button>
                            <button
                              onClick={() => {
                                const link = document.createElement('a');
                                link.href = selectedPdf.pdfUrl;
                                link.download = selectedPdf.pdfUrl.split('/').pop();
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                              }}
                              className="w-full bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
                            >
                              Download PDF
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="p-2 bg-gray-50 border-t">
                        <p className="text-xs text-gray-600 text-center">
                          PDF URL: {selectedPdf.pdfUrl}
                        </p>
                      </div>
                    </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-500">PDF URL not available</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Images; 