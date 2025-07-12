
'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, X, CheckCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { getSignedS3Url } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

interface ImageUploadProps {
  onUploadSuccess: (url: string) => void;
}

export const ImageUpload = ({ onUploadSuccess }: ImageUploadProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const { toast } = useToast();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const selectedFile = acceptedFiles[0];
      if (selectedFile.size > 10 * 1024 * 1024) { // 10MB limit
         setError('File size cannot exceed 10MB.');
         return;
      }
      setFile(selectedFile);
      setError(null);
      setIsSuccess(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'] },
    multiple: false,
  });

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      const signedUrlResult = await getSignedS3Url(file.name, file.type, file.size);

      if (!signedUrlResult.success || !signedUrlResult.signedUrl || !signedUrlResult.assetUrl) {
        throw new Error(signedUrlResult.error || 'Could not get a signed URL.');
      }

      const xhr = new XMLHttpRequest();
      xhr.open('PUT', signedUrlResult.signedUrl);
      xhr.setRequestHeader('Content-Type', file.type);
      
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(percentComplete);
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          setIsSuccess(true);
          onUploadSuccess(signedUrlResult.assetUrl);
        } else {
          throw new Error(`Upload failed: ${xhr.statusText}`);
        }
      };

      xhr.onerror = () => {
        throw new Error('An error occurred during the upload.');
      };
      
      xhr.send(file);

    } catch (err: any) {
      const errorMessage = err.message || 'An unknown error occurred.';
      setError(errorMessage);
      toast({
        title: "Upload Failed",
        description: errorMessage,
        variant: "destructive",
      });
      setIsUploading(false);
    }
  };

  return (
    <div className="p-6 space-y-4 flex flex-col items-center h-full justify-center">
      <div
        {...getRootProps()}
        className={`w-full flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors
          ${isDragActive ? 'border-indigo-400 bg-gray-700/50' : 'border-gray-600 hover:border-indigo-500'}`}
      >
        <input {...getInputProps()} />
        <UploadCloud className="w-12 h-12 text-gray-400 mb-2" />
        <p className="text-gray-300">
          {isDragActive ? 'Drop the image here...' : 'Drag & drop an image here, or click to select'}
        </p>
        <p className="text-xs text-gray-500 mt-1">PNG, JPG, GIF up to 10MB</p>
      </div>

      {error && <p className="text-sm text-red-400 text-center">{error}</p>}

      {file && !isSuccess && (
        <div className="bg-gray-700/50 p-4 rounded-lg space-y-3 w-full max-w-sm">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <Image 
                src={URL.createObjectURL(file)} 
                alt="Preview" 
                width={40} 
                height={40}
                className="rounded-md object-cover h-10 w-10" 
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{file.name}</p>
              <p className="text-xs text-gray-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
             <button onClick={() => setFile(null)} className="text-gray-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
          {isUploading && (
            <Progress value={uploadProgress} className="w-full" />
          )}
        </div>
      )}

       {isSuccess && (
        <div className="bg-green-900/30 border border-green-500/50 text-green-300 p-4 rounded-lg flex items-center justify-center gap-3">
          <CheckCircle className="w-6 h-6" />
          <p className="font-medium">Upload Complete!</p>
        </div>
       )}
       
       <Button
        onClick={handleUpload}
        disabled={!file || isUploading || isSuccess}
        className="mt-4 bg-indigo-600 hover:bg-indigo-500 text-white disabled:bg-gray-600 disabled:cursor-not-allowed"
      >
        {isUploading ? `Uploading ${uploadProgress}%...` : 'Upload to S3'}
      </Button>
    </div>
  );
};
