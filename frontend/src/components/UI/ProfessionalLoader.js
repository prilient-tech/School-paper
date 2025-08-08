import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ProfessionalLoader = ({ message = "Processing your PDF...", pdfId = null }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [dots, setDots] = useState('');
  const [processingStatus, setProcessingStatus] = useState(null);
  const [timeoutReached, setTimeoutReached] = useState(false);

  const steps = [
    "Analyzing document structure",
    "Extracting key concepts",
    "Processing content",
    "Generating questions",
    "Creating answer options",
    "Validating content",
    "Finalizing results"
  ];

  // Animate dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Animate steps - only when not processing
  useEffect(() => {
    if (processingStatus === 'processing' || processingStatus === 'completed' || processingStatus === 'failed') {
      return;
    }
    
    const interval = setInterval(() => {
      setCurrentStep(prev => {
        // Don't loop back to 0, stay at the last step when processing
        if (prev >= steps.length - 1) {
          return prev;
        }
        return prev + 1;
      });
    }, 2000);
    return () => clearInterval(interval);
  }, [steps.length, processingStatus]);



  // Check PDF processing status if pdfId is provided
  useEffect(() => {
    if (!pdfId) return;

    const checkStatus = async () => {
      try {
        const response = await axios.get(`/api/pdfs/${pdfId}`);
        const pdf = response.data.data;
        setProcessingStatus(pdf.processingStatus);
        
        // If processing is complete or failed, stop checking
        if (pdf.processingStatus === 'completed' || pdf.processingStatus === 'failed') {
          return;
        }
      } catch (error) {
        console.log('Error checking PDF status:', error);
      }
    };

    const interval = setInterval(checkStatus, 3000);
    checkStatus(); // Check immediately

    // Set a timeout to stop checking after 5 minutes
    const timeout = setTimeout(() => {
      setTimeoutReached(true);
      clearInterval(interval);
    }, 5 * 60 * 1000); // 5 minutes

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [pdfId]);

  // Calculate progress based on status and current step
  const calculateProgress = () => {
    if (processingStatus === 'completed') return 100;
    if (processingStatus === 'failed') return 100;
    if (timeoutReached) return 100;
    if (processingStatus === 'processing') return Math.min(85, ((currentStep + 1) / steps.length) * 100);
    return Math.min(70, ((currentStep + 1) / steps.length) * 100);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-lg w-full mx-4 shadow-xl">
        {/* Professional header */}
        <div className="text-center mb-8">
          <div className="flex justify-center items-center mb-6">
            {/* Professional loading animation */}
            <div className="relative">
              <div className="w-20 h-20 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 bg-blue-600 rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>
          
          <h3 className="text-2xl font-semibold text-gray-800 mb-2">
            Processing Document
          </h3>
          <p className="text-gray-600">
            {message}
          </p>
        </div>

        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-medium text-gray-700">Progress</span>
            <span className="text-sm text-gray-500">
              {processingStatus === 'completed' ? '100%' : 
               processingStatus === 'failed' ? 'Error' :
               timeoutReached ? 'Timeout' :
               processingStatus === 'processing' ? 'Processing...' :
               `${Math.round(calculateProgress())}%`}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className={`h-3 rounded-full transition-all duration-1000 ease-out ${
                processingStatus === 'failed' ? 'bg-red-500' :
                processingStatus === 'completed' ? 'bg-green-500' :
                timeoutReached ? 'bg-orange-500' :
                'bg-blue-600'
              }`}
              style={{ 
                width: `${Math.round(calculateProgress())}%`
              }}
            ></div>
          </div>
          {processingStatus && (
            <div className="mt-3 text-center">
              <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                processingStatus === 'completed' ? 'bg-green-100 text-green-800' :
                processingStatus === 'failed' ? 'bg-red-100 text-red-800' :
                timeoutReached ? 'bg-orange-100 text-orange-800' :
                'bg-blue-100 text-blue-800'
              }`}>
                {processingStatus === 'completed' ? 'Processing Complete' :
                 processingStatus === 'failed' ? 'Processing Failed' :
                 timeoutReached ? 'Processing Timeout' :
                 'Processing...'}
              </span>
            </div>
          )}
        </div>

        {/* Current step */}
        <div className="text-center mb-6">
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <p className="text-sm font-medium text-gray-800">
              {processingStatus === 'processing' ? 'Processing document and generating questions...' :
               processingStatus === 'completed' ? 'Processing completed successfully!' :
               processingStatus === 'failed' ? 'Processing failed' :
               timeoutReached ? 'Processing timeout - please check the PDFs page for status' :
               steps[currentStep]}
            </p>
            <div className="text-lg mt-2 text-gray-500">{dots}</div>
          </div>
        </div>

        {/* Status information */}
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center justify-center space-x-2 text-sm text-blue-800">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
            <span>AI is analyzing your content and generating questions</span>
          </div>
        </div>

        {/* Subtle animated elements */}
        <div className="absolute top-4 right-4">
          <div className="flex space-x-1">
            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"></div>
            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfessionalLoader; 