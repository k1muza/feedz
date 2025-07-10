
'use client';

import { useState } from "react";
import { Search, X, CheckCircle } from "lucide-react";
import Image from "next/image";
import { allAssets } from "@/data/assets";

interface AssetSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (src: string) => void;
}

export const AssetSelectionModal = ({ isOpen, onClose, onSelect }: AssetSelectionModalProps) => {
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSelect = () => {
    if (selectedAsset) {
      onSelect(selectedAsset);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-xl w-full max-w-4xl h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex justify-between items-center flex-shrink-0">
          <h3 className="text-lg font-medium text-white">Select an Asset</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 flex-grow overflow-y-auto">
            <div className="relative mb-4">
                <Search className="absolute top-1/2 left-3 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                    type="text"
                    placeholder="Search assets..."
                    className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
                {allAssets.map((asset) => (
                    <button 
                        key={asset.id} 
                        onClick={() => setSelectedAsset(asset.src)}
                        className={`relative group bg-gray-900 rounded-lg overflow-hidden aspect-square border-2 ${selectedAsset === asset.src ? 'border-indigo-500' : 'border-transparent'}`}
                    >
                        <Image src={asset.src} alt={asset.alt} fill className="object-cover" />
                        {selectedAsset === asset.src && (
                            <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                                <CheckCircle className="w-8 h-8 text-indigo-400" />
                            </div>
                        )}
                    </button>
                ))}
            </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700 flex justify-end space-x-3 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 border border-gray-600 rounded-lg hover:bg-gray-700">
            Cancel
          </button>
          <button
            onClick={handleSelect}
            disabled={!selectedAsset}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg disabled:bg-gray-600 disabled:cursor-not-allowed"
          >
            Select Image
          </button>
        </div>
      </div>
    </div>
  );
};
