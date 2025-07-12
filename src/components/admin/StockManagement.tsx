'use client';

import { useState, useEffect } from "react";
import { Package, Plus, Download, Edit2, History, ChevronDown, ChevronUp, X, Check, Minus } from "lucide-react";
import { Product } from "@/types";
import { updateProductStock } from "@/app/actions";
import { useRouter } from "next/navigation";

export const StockManagement = ({ initialProducts }: { initialProducts: Product[] }) => {
  const [inventory, setInventory] = useState<Product[]>(initialProducts);
  const [sortConfig, setSortConfig] = useState<{key: keyof Product; direction: 'asc' | 'desc'} | null>(null);
  const [showStockForm, setShowStockForm] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [adjustment, setAdjustment] = useState<{type: 'add' | 'remove', amount: number}>({ type: 'add', amount: 0 });
  const router = useRouter();

  useEffect(() => {
    setInventory(initialProducts);
  }, [initialProducts]);

  const handleStockUpdate = async () => {
    if (selectedProduct && adjustment.amount > 0) {
      const newStock = adjustment.type === 'add' 
        ? selectedProduct.stock + adjustment.amount 
        : selectedProduct.stock - adjustment.amount;
      
      await updateProductStock(selectedProduct.id, newStock);
      router.refresh();
      setShowStockForm(false);
      setSelectedProduct(null);
      setAdjustment({ type: 'add', amount: 0 });
    }
  };

  const openStockModal = (product: Product) => {
    setSelectedProduct(product);
    setShowStockForm(true);
  }
  
  const sortedInventory = [...inventory].sort((a, b) => {
    if (!sortConfig) return 0;
    const key = sortConfig.key;
    
    let aValue, bValue;

    if (key === 'name' || key === 'category') {
      aValue = a.ingredient?.[key as keyof typeof a.ingredient] || '';
      bValue = b.ingredient?.[key as keyof typeof b.ingredient] || '';
    } else {
      aValue = a[key as keyof Product];
      bValue = b[key as keyof Product];
    }
    
    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const requestSort = (key: any) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Package className="w-6 h-6 text-indigo-400" />
          <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
            Inventory Management
          </h2>
        </div>
        <div className="flex space-x-3">
          <button className="px-4 py-2 border border-gray-600 hover:bg-gray-700 rounded-lg flex items-center space-x-2 transition-colors">
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-800">
              <tr>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer"
                  onClick={() => requestSort('name')}
                >
                    Ingredient
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer"
                  onClick={() => requestSort('category')}
                >
                    Category
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer"
                  onClick={() => requestSort('stock')}
                >
                    Current Stock
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {sortedInventory.map((item) => (
                <tr 
                  key={item.id} 
                  className="hover:bg-gray-700/50 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-200">
                    {item.ingredient?.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 rounded-full text-xs capitalize bg-blue-900/30 text-blue-400">
                      {item.ingredient?.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-400">
                    {item.stock} tons
                    <div className="w-full bg-gray-700 rounded-full h-1.5 mt-1">
                      <div 
                        className="h-1.5 rounded-full" 
                        style={{ 
                          width: `${Math.min(100, (item.stock / item.moq) / 2 * 100)}%`, // Example calculation
                          backgroundColor: item.stock > item.moq ? '#10B981' : '#EF4444'
                        }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Min Order: {item.moq} tons
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      item.stock < item.moq ? 'bg-red-900/30 text-red-400' : 'bg-green-900/30 text-green-400'
                    }`}>
                      {item.stock < item.moq ? 'Low Stock' : 'In Stock'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button onClick={() => openStockModal(item)} className="text-indigo-400 hover:text-indigo-300 mr-4 transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button className="text-gray-400 hover:text-gray-300 transition-colors">
                      <History className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showStockForm && selectedProduct && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Adjust Stock for {selectedProduct.ingredient?.name}</h3>
                <button 
                  onClick={() => setShowStockForm(false)}
                  className="text-gray-400 hover:text-gray-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-400">Current Stock: <span className="font-bold text-white">{selectedProduct.stock} tons</span></p>
                </div>
                <div className="flex items-center gap-2">
                   <button 
                     onClick={() => setAdjustment({...adjustment, type: 'add'})}
                     className={`px-3 py-2 rounded-lg flex items-center gap-2 ${adjustment.type === 'add' ? 'bg-green-600 text-white' : 'bg-gray-700'}`}>
                      <Plus className="w-4 h-4" /> Add
                   </button>
                   <button 
                     onClick={() => setAdjustment({...adjustment, type: 'remove'})}
                     className={`px-3 py-2 rounded-lg flex items-center gap-2 ${adjustment.type === 'remove' ? 'bg-red-600 text-white' : 'bg-gray-700'}`}>
                      <Minus className="w-4 h-4" /> Remove
                   </button>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Adjustment Amount (tons)</label>
                  <input 
                    type="number"
                    value={adjustment.amount}
                    onChange={(e) => setAdjustment({...adjustment, amount: Number(e.target.value)})}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-gray-200"
                  />
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button 
                    type="button" 
                    onClick={() => setShowStockForm(false)}
                    className="px-4 py-2 border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="button" 
                    onClick={handleStockUpdate}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    Confirm Adjustment
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
