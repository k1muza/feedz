
'use client';

import { useState } from "react";
import { X } from "lucide-react";
import { ImageUpload } from "./ImageUpload";


interface ImageUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: () => void;
}

export const ImageUploadModal = ({ isOpen, onClose, onUploadSuccess }: ImageUploadModalProps) => {

  if (!isOpen) return null;

  const handleUploadSuccess = (newAssetUrl: string) => {
    onUploadSuccess();
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-xl w-full max-w-2xl h-[70vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex justify-between items-center flex-shrink-0">
            <h3 className="text-lg font-medium text-white">Upload New Asset</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-200">
                <X className="w-5 h-5" />
            </button>
        </div>

        {/* Content */}
        <div className="flex-grow overflow-y-auto">
            <ImageUpload onUploadSuccess={handleUploadSuccess} />
        </div>
      </div>
    </div>
  );
};
