
'use client';

import { useState } from "react";
import { Plus, Download, MoreHorizontal, Search, Trash2, Copy } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { S3Asset } from "@/app/actions";
import { useToast } from "@/components/ui/use-toast";
import { ImageUploadModal } from "./ImageUploadModal";


export const AssetManagement = ({ initialAssets }: { initialAssets: S3Asset[] }) => {
  const [assets, setAssets] = useState<S3Asset[]>(initialAssets);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleUploadSuccess = () => {
    setIsModalOpen(false);
    toast({
      title: "Upload successful!",
      description: "Your new image is now available in the library.",
    });
    router.refresh(); // This will re-fetch server data and re-render the component
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "URL Copied!",
      description: "The CloudFront URL has been copied to your clipboard.",
    });
  };

  const handleDelete = (key: string) => {
    // In a real app, this would be a server action to delete from S3
    console.log("Delete requested for:", key);
    toast({
      title: "Deletion not implemented",
      description: "This is a UI demonstration. A backend action is required to delete S3 objects.",
      variant: 'destructive',
    });
  };

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h2 className="text-2xl font-bold text-white">
            Asset Library (S3)
          </h2>
          <div className="flex space-x-3">
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg flex items-center space-x-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Image</span>
            </button>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-3 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by asset name..."
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
          </div>
        </div>

        {/* Assets Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {assets.map((asset) => (
            <div key={asset.key} className="relative group bg-gray-800/50 border border-gray-700 rounded-lg overflow-hidden aspect-square">
              <Image
                src={asset.url}
                alt={asset.key}
                fill
                sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 15vw"
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-2 gap-2">
                <button
                  onClick={() => copyToClipboard(asset.url)}
                  className="p-2 w-10 h-10 bg-indigo-600 text-white rounded-full hover:bg-indigo-500 transition-colors flex items-center justify-center"
                  title="Copy CloudFront URL"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(asset.key)}
                  className="p-2 w-10 h-10 bg-red-600 text-white rounded-full hover:bg-red-500 transition-colors flex items-center justify-center"
                  title="Delete from S3"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                <p className="text-xs text-white truncate">{asset.key}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="bg-gray-800/50 border border-yellow-500/30 text-yellow-300 rounded-lg p-4 text-sm mt-6">
          <p><strong className="font-medium text-yellow-200">Developer Note:</strong> The asset list is now fetched from your S3 bucket. Deletion functionality requires a corresponding server action.</p>
        </div>
      </div>
      <ImageUploadModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onUploadSuccess={handleUploadSuccess}
      />
    </>
  );
};
