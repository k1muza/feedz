
'use client';

import { useState, useEffect } from "react";
import { Search, X, CheckCircle, UploadCloud } from "lucide-react";
import Image from "next/image";
import { S3Asset, listS3Assets } from "@/app/actions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImageUpload } from "./ImageUpload";


interface AssetSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (src: string) => void;
}

export const AssetSelectionModal = ({ isOpen, onClose, onSelect }: AssetSelectionModalProps) => {
  const [assets, setAssets] = useState<S3Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("choose");

  useEffect(() => {
    if (isOpen) {
      const fetchAssets = async () => {
        setLoading(true);
        const s3Assets = await listS3Assets();
        setAssets(s3Assets);
        setLoading(false);
      };
      fetchAssets();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelect = () => {
    if (selectedAsset) {
      onSelect(selectedAsset);
      onClose(); // Close after selection
    }
  };

  const handleUploadSuccess = (newAssetUrl: string) => {
    // Add the new asset to the list and switch to the choose tab
    const newAsset: S3Asset = {
      key: newAssetUrl.split('/').pop() || 'new-asset',
      url: newAssetUrl,
      size: 0, // Size is unknown from URL alone
      lastModified: new Date(),
    };
    setAssets(prev => [newAsset, ...prev]);
    setActiveTab("choose");
    setSelectedAsset(newAssetUrl);
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-xl w-full max-w-4xl h-[80vh] flex flex-col">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b border-gray-700 flex justify-between items-center flex-shrink-0">
                <div>
                    <h3 className="text-lg font-medium text-white">Select an Asset</h3>
                    <TabsList className="mt-2">
                        <TabsTrigger value="choose">Choose Existing</TabsTrigger>
                        <TabsTrigger value="upload">Upload New</TabsTrigger>
                    </TabsList>
                </div>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-200">
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Content */}
            <div className="flex-grow overflow-y-auto">
                <TabsContent value="choose" className="p-4 h-full">
                    <div className="relative mb-4">
                        <Search className="absolute top-1/2 left-3 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search assets..."
                            className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                        />
                    </div>
                    {loading ? (
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
                            {[...Array(12)].map((_, i) => (
                                <div key={i} className="aspect-square bg-gray-700 rounded-lg animate-pulse" />
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
                            {assets.map((asset) => (
                                <button 
                                    key={asset.key} 
                                    onClick={() => setSelectedAsset(asset.url)}
                                    className={`relative group bg-gray-900 rounded-lg overflow-hidden aspect-square border-2 ${selectedAsset === asset.url ? 'border-indigo-500' : 'border-transparent'}`}
                                >
                                    <Image src={asset.url} alt={asset.key} fill className="object-cover" sizes="(max-width: 768px) 33vw, 15vw"/>
                                    {selectedAsset === asset.url && (
                                        <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                                            <CheckCircle className="w-8 h-8 text-indigo-400" />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </TabsContent>
                <TabsContent value="upload" className="p-4 h-full">
                    <ImageUpload onUploadSuccess={handleUploadSuccess} />
                </TabsContent>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-700 flex justify-end space-x-3 flex-shrink-0">
            <button onClick={onClose} className="px-4 py-2 border border-gray-600 rounded-lg hover:bg-gray-700">
                Cancel
            </button>
            <button
                onClick={handleSelect}
                disabled={!selectedAsset || activeTab !== 'choose'}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
                Select Image
            </button>
            </div>
        </Tabs>
      </div>
    </div>
  );
};
