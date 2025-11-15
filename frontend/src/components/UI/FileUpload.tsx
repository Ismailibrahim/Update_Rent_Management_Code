'use client';

import React, { useState, useRef } from 'react';
import { Button } from './Button';
import { Upload, X, File, FileText, Image as ImageIcon, FileType, Eye } from 'lucide-react';

interface FileUploadProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
  maxFiles?: number;
  acceptedTypes?: string[];
  maxSize?: number; // in MB
  className?: string;
}

export default function FileUpload({
  files,
  onFilesChange,
  maxFiles = 5,
  acceptedTypes = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'],
  maxSize = 10,
  className = ''
}: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFiles = (newFiles: File[]) => {
    const validFiles: File[] = [];
    const errors: string[] = [];

    newFiles.forEach(file => {
      // Check file size
      if (file.size > maxSize * 1024 * 1024) {
        errors.push(`${file.name} is too large. Maximum size is ${maxSize}MB.`);
        return;
      }

      // Check file type
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!acceptedTypes.includes(fileExtension)) {
        errors.push(`${file.name} is not a supported file type.`);
        return;
      }

      // Check if file already exists
      if (files.some(existingFile => existingFile.name === file.name && existingFile.size === file.size)) {
        errors.push(`${file.name} is already uploaded.`);
        return;
      }

      validFiles.push(file);
    });

    // Check max files limit
    if (files.length + validFiles.length > maxFiles) {
      errors.push(`Maximum ${maxFiles} files allowed.`);
    }

    if (errors.length > 0) {
      alert(errors.join('\n'));
    }

    if (validFiles.length > 0) {
      onFilesChange([...files, ...validFiles]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    onFilesChange(newFiles);
  };

  const viewFile = (file: File) => {
    const url = URL.createObjectURL(file);
    window.open(url, '_blank');
    // Clean up the URL after a delay to free memory
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return <FileType className="h-4 w-4 text-red-500" />;
      case 'doc':
      case 'docx':
        return <FileText className="h-4 w-4 text-blue-500" />;
      case 'jpg':
      case 'jpeg':
      case 'png':
        return <ImageIcon className="h-4 w-4 text-green-500" />;
      default:
        return <File className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragActive
            ? 'border-blue-400 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
        <p className="text-sm text-gray-600 mb-2">
          Drag and drop files here, or{' '}
          <button
            type="button"
            onClick={openFileDialog}
            className="text-blue-600 hover:text-blue-700 underline"
          >
            browse
          </button>
        </p>
        <p className="text-xs text-gray-500">
          Accepted formats: {acceptedTypes.join(', ')} (max {maxSize}MB each)
        </p>
        <p className="text-xs text-gray-500">
          Maximum {maxFiles} files
        </p>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={acceptedTypes.join(',')}
        onChange={handleFileInput}
        className="hidden"
      />

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Uploaded Files:</h4>
          <div className="space-y-2">
            {files.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
              >
                <div className="flex items-center space-x-3">
                  {getFileIcon(file.name)}
                  <div>
                    <p className="text-sm font-medium text-gray-900">{file.name}</p>
                    <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => viewFile(file)}
                    className="text-blue-600 hover:text-blue-700"
                    title={`View ${file.name}`}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeFile(index)}
                    className="text-red-600 hover:text-red-700"
                    title={`Remove ${file.name}`}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
