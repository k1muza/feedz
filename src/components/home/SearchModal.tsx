'use client';

import { FaSearch, FaTimes } from 'react-icons/fa';

export default function SearchModal({ showSearch, setShowSearch }: { showSearch: boolean, setShowSearch: (show: boolean) => void }) {
  if (!showSearch) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg w-full max-w-4xl mx-4">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-lg font-medium">Search Feed Products</h3>
          <button
            onClick={() => setShowSearch(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            <FaTimes />
          </button>
        </div>
        <div className="p-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search for feeds, ingredients, livestock types..."
              className="w-full p-4 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            <button className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-green-600 text-white p-2 rounded-full">
              <FaSearch />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}