
'use client';

import { useState, useEffect } from "react";
import { Plus, Search, Trash2, Copy } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { S3Asset, deleteS3Asset } from "@/app/actions";
import { useToast } from "@/components/ui/use-toast";
import { ImageUploadModal } from "./ImageUploadModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export const AssetManagement = ({ initialAssets }: { initialAssets: S3Asset[] }) => {
  const [assets, setAssets] = useState<S3Asset[]>(initialAssets);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState<S3Asset | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    setAssets(initialAssets);
  }, [initialAssets]);

  const handleUploadSuccess = () => {
    setIsModalOpen(false);
    toast({
      title: "Upload successful!",
      description: "Your new image is now available in the library.",
    });
    router.refresh();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "URL Copied!",
      description: "The CloudFront URL has been copied to your clipboard.",
    });
  };

  const confirmDelete = (asset: S3Asset) => {
    setAssetToDelete(asset);
    setIsAlertOpen(true);
  };

  const handleDelete = async () => {
    console.log('handleDelete')
    if (!assetToDelete) return;
    console.log(assetToDelete)

    const result = await deleteS3Asset(assetToDelete.key);

    if (result.success) {
      toast({
        title: "Asset Deleted",
        description: `Successfully deleted ${assetToDelete.key} from S3.`,
      });
      // Refresh the page to get the updated list of assets
      router.refresh();
    } else {
      toast({
        title: "Deletion Failed",
        description: result.error,
        variant: 'destructive',
      });
    }
    // Close the dialog
    setAssetToDelete(null);
    setIsAlertOpen(false);
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
                  onClick={() => confirmDelete(asset)}
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
      </div>
      <ImageUploadModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onUploadSuccess={handleUploadSuccess}
      />
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the asset
              <code className="font-mono bg-gray-700 rounded-sm px-1 mx-1">{assetToDelete?.key}</code> from your S3 bucket.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-500">
              Yes, delete asset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
