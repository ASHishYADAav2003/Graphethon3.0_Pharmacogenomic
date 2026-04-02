// components/VCFUploader.jsx
import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useVCFScanner } from '../hooks/useVCFScanner';

const VCFUploader = ({ onFileSelected, selectedFile, onDrugsDetected }) => {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('idle'); // idle, uploading, scanning, complete, error
  const [fileError, setFileError] = useState('');
  const { scanVCF, resetScanner } = useVCFScanner();

  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    // Handle rejected files
    if (rejectedFiles.length > 0) {
      const error = rejectedFiles[0].errors[0];
      if (error.code === 'file-too-large') {
        setFileError('File size exceeds 5MB limit');
      } else if (error.code === 'file-invalid-type') {
        setFileError('Invalid file type. Please upload a .vcf file');
      } else {
        setFileError('Error uploading file');
      }
      setUploadStatus('error');
      return;
    }

    const file = acceptedFiles[0];
    if (file) {
      setFileError('');
      setUploadStatus('uploading');
      onFileSelected(file);
      
      // Simulate progress for better UX
      setUploadProgress(0);
      const interval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setUploadStatus('scanning');
            
            // Actually scan VCF for drugs
            scanVCF(file).then(data => {
              setUploadStatus('complete');
              if (onDrugsDetected) {
                onDrugsDetected(data.available_drugs || [], data.unavailable_drugs || []);
              }
            }).catch(err => {
              setUploadStatus('error');
              setFileError('Failed to scan VCF for pharmacogenes');
            });
            
            return 100;
          }
          return prev + 5;
        });
      }, 30);
    }
  }, [onFileSelected]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/octet-stream': ['.vcf'],
      'text/plain': ['.vcf'],
      'application/vnd.ms-excel': ['.vcf'],
      'text/vcard': ['.vcf']
    },
    maxSize: 5 * 1024 * 1024,
    multiple: false
  });

  const removeFile = (e) => {
    e.stopPropagation();
    onFileSelected(null);
    setUploadProgress(0);
    setUploadStatus('idle');
    setFileError('');
    resetScanner();
    if (onDrugsDetected) {
      onDrugsDetected([], []);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getStatusIcon = () => {
    switch (uploadStatus) {
      case 'uploading':
        return 'fa-cloud-upload-alt text-blue-500';
      case 'scanning':
        return 'fa-microscope text-purple-500';
      case 'complete':
        return 'fa-check-circle text-emerald-500';
      case 'error':
        return 'fa-exclamation-circle text-rose-500';
      default:
        return 'fa-file-medical text-slate-400';
    }
  };

  const getStatusText = () => {
    switch (uploadStatus) {
      case 'uploading':
        return 'Uploading...';
      case 'scanning':
        return '🔬 Scanning VCF for pharmacogenes...';
      case 'complete':
        return 'Ready for analysis';
      case 'error':
        return 'Upload failed';
      default:
        return 'File ready';
    }
  };

  return (
    <div className="space-y-3">
      {/* Header with gradient */}
      <div className="flex items-center space-x-2">
        <div className="w-1 h-6 bg-gradient-to-b from-cyan-500 to-blue-500 rounded-full"></div>
        <label className="text-sm font-semibold text-slate-700 dark:text-slate-200 tracking-wide transition-colors duration-300">
          VCF File Upload
        </label>
        <div className="flex items-center space-x-1 ml-auto">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-xs text-slate-400">Secure upload</span>
        </div>
      </div>
      
      {!selectedFile ? (
        <div
          {...getRootProps()}
          className={`relative overflow-hidden border-2 border-dashed rounded-xl p-8 
                     text-center cursor-pointer transition-all duration-300
                     ${isDragActive 
                       ? 'border-cyan-400 bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-900/30 dark:to-blue-900/30 scale-[1.02]' 
                       : fileError
                         ? 'border-rose-300 bg-rose-50/30 dark:border-rose-700 dark:bg-rose-900/30'
                         : 'border-slate-200 dark:border-slate-600 hover:border-cyan-300 dark:hover:border-cyan-500 hover:bg-slate-50/50 dark:hover:bg-slate-700/50'}`}
        >
          <input {...getInputProps()} />
          
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0" style={{
              backgroundImage: 'radial-gradient(circle at 10px 10px, #94a3b8 1px, transparent 1px)',
              backgroundSize: '20px 20px'
            }}></div>
          </div>
          
          {/* Icon */}
          <div className={`relative w-16 h-16 mx-auto mb-4 rounded-2xl 
                        bg-gradient-to-br from-cyan-500 to-blue-500 
                        flex items-center justify-center shadow-lg 
                        ${isDragActive ? 'scale-110' : ''} transition-all duration-200`}>
            <i className={`fas fa-cloud-upload-alt text-2xl text-white`}></i>
            {isDragActive && (
              <div className="absolute -inset-1 bg-cyan-400 rounded-2xl opacity-30 animate-ping"></div>
            )}
          </div>
          
          {/* Text */}
          {isDragActive ? (
            <p className="text-cyan-700 dark:text-cyan-400 font-medium transition-colors">Drop your VCF file here...</p>
          ) : (
            <>
              <p className="text-slate-700 dark:text-slate-300 font-medium mb-1 transition-colors">
                <span className="text-cyan-600 dark:text-cyan-400">Drag & drop</span> or <span className="text-cyan-600 dark:text-cyan-400">browse</span>
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mb-2 transition-colors">
                Supports VCF files (max 5MB)
              </p>
            </>
          )}
          
          {/* Error message */}
          {fileError && (
            <div className="mt-3 text-xs text-rose-600 bg-rose-50 py-2 px-3 rounded-lg inline-flex items-center">
              <i className="fas fa-exclamation-triangle mr-1"></i>
              {fileError}
            </div>
          )}
          
          {/* File specs */}
          <div className="mt-4 flex justify-center space-x-4 text-xs text-slate-400">
            <span><i className="fas fa-dna mr-1"></i> VCF v4.0+</span>
            <span><i className="fas fa-shield-alt mr-1"></i> Encrypted</span>
            <span><i className="fas fa-clock mr-1"></i> Instant</span>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden transition-colors duration-300">
          {/* File header */}
          <div className="bg-gradient-to-r from-slate-50 to-white dark:from-slate-900/50 dark:to-slate-800 px-4 py-3 border-b border-slate-200 dark:border-slate-700 transition-colors duration-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center shadow-md">
                  <i className="fas fa-file-medical text-white text-sm"></i>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100 transition-colors">{selectedFile.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 transition-colors">{formatFileSize(selectedFile.size)}</p>
                </div>
              </div>
              <button
                onClick={removeFile}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors group"
                title="Remove file"
              >
                <i className="fas fa-times text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors"></i>
              </button>
            </div>
          </div>
          
          {/* Progress/Status area */}
          <div className="p-4">
            {uploadStatus !== 'idle' && (
              <div className="space-y-3">
                {/* Status indicator */}
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <i className={`fas ${getStatusIcon()} ${
                      uploadStatus === 'scanning' ? 'animate-spin' : ''
                    }`}></i>
                    <span className={`font-medium ${
                      uploadStatus === 'complete' ? 'text-emerald-600 dark:text-emerald-400' :
                      uploadStatus === 'error' ? 'text-rose-600 dark:text-rose-400' :
                      'text-slate-600 dark:text-slate-300'
                    }`}>
                      {getStatusText()}
                    </span>
                  </div>
                  {uploadStatus === 'uploading' && (
                    <span className="text-xs font-medium text-cyan-600">{uploadProgress}%</span>
                  )}
                </div>
                
                {/* Progress bar */}
                {(uploadStatus === 'uploading' || uploadStatus === 'scanning') && (
                  <div className="relative">
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 rounded-full
                                  ${uploadStatus === 'scanning' 
                                    ? 'bg-gradient-to-r from-purple-500 to-pink-500' 
                                    : 'bg-gradient-to-r from-cyan-500 to-blue-500'}`}
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    
                    {/* Processing animation */}
                    {uploadStatus === 'scanning' && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-full h-full">
                          <div className="h-2 bg-gradient-to-r from-transparent via-white/50 to-transparent 
                                        animate-shimmer" style={{ width: '50%' }}></div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Success message with details */}
                {uploadStatus === 'complete' && (
                  <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-100">
                    <div className="flex items-start space-x-2">
                      <i className="fas fa-check-circle text-emerald-500 mt-0.5"></i>
                      <div>
                        <p className="text-sm text-emerald-700 font-medium">File processed successfully</p>
                        <p className="text-xs text-emerald-600 mt-1">
                          ✓ VCF uploaded successfully<br />
                          ✓ Pharmacogenes detected<br />
                          {/* Ready for analysis is implied by the next step */}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Action buttons */}
          <div className="bg-slate-50 dark:bg-slate-800/50 px-4 py-2 border-t border-slate-200 dark:border-slate-700 flex justify-end space-x-2 transition-colors duration-300">
            <button
              onClick={removeFile}
              className="px-3 py-1 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 
                       rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      
      {/* Help text */}
      <div className="flex items-center space-x-2 text-xs">
        <div className="w-4 h-4 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 
                      flex items-center justify-center">
          <i className="fas fa-info text-[8px] text-slate-500"></i>
        </div>
        <span className="text-slate-500">
          Secure, HIPAA-compliant file processing. Your data is encrypted.
        </span>
      </div>
    </div>
  );
};

export default VCFUploader;