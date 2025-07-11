
'use client';

import { useState } from "react";
import { Plus, Download, MoreHorizontal, Search, Trash2, UploadCloud, Link as LinkIcon, Copy } from "lucide-react";
import Image from "next/image";
import { allAssets, addAsset, deleteAsset } from "@/data/assets";
import { Asset } from "@/types/assets";

export const AssetManagement = () => {
  const [assets, setAssets] = useState<Asset[]>(allAssets);

  const handleUpload = () => {
    // In a real S3 integration, this would trigger a file input dialog.
    // The selected file would then be uploaded to a presigned S3 URL
    // fetched from a backend API route.
    const newAsset = {
      id: `asset-${Date.now()}`,
      src: `https://placehold.co/600x400.png?text=S3+Upload`,
      alt: 'A new uploaded image from S3',
      type: 'image',
      tags: ['s3-upload'],
    };
    addAsset(newAsset);
    setAssets([...allAssets]); // Re-fetch all assets to update the view
  };

  const handleDelete = (id: string) => {
    // In a real S3 integration, this would call a backend API
    // to delete the object from the S3 bucket.
    deleteAsset(id);
    setAssets([...allAssets]); // Re-fetch to update
  };
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here to confirm the copy.
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h2 className="text-2xl font-bold text-white">
          Asset Library (S3)
        </h2>
        <div className="flex space-x-3">
          <button 
            onClick={handleUpload}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg flex items-center space-x-2 transition-colors"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload to S3</span>
          </button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by asset name or tag..."
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          />
        </div>
      </div>

      {/* Assets Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {assets.map((asset) => (
          <div key={asset.id} className="relative group bg-gray-800/50 border border-gray-700 rounded-lg overflow-hidden aspect-square">
            <Image 
              src={asset.src} 
              alt={asset.alt} 
              fill 
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-2 gap-2">
              <button 
                onClick={() => copyToClipboard(asset.src)}
                className="p-2 w-10 h-10 bg-indigo-600 text-white rounded-full hover:bg-indigo-500 transition-colors flex items-center justify-center"
                title="Copy S3 URL"
              >
                <Copy className="w-4 h-4" />
              </button>
              <button 
                onClick={() => handleDelete(asset.id)}
                className="p-2 w-10 h-10 bg-red-600 text-white rounded-full hover:bg-red-500 transition-colors flex items-center justify-center"
                title="Delete from S3"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
               <p className="text-xs text-white truncate">{asset.alt}</p>
            </div>
          </div>
        ))}
      </div>
       <div className="bg-gray-800/50 border border-yellow-500/30 text-yellow-300 rounded-lg p-4 text-sm mt-6">
        <p><strong className="font-medium text-yellow-200">Developer Note:</strong> This is a UI demonstration. A full AWS S3 integration requires backend API routes for secure credential management and pre-signed URL generation. The upload/delete buttons are currently wired to the mock asset service.</p>
      </div>
    </div>
  );
};
