import { useState } from "react";
import { Package, Plus, Download, Edit2, History, ArrowUpDown, ChevronDown, ChevronUp, X } from "lucide-react";

interface InventoryItem {
  id: number;
  name: string;
  category: string;
  current: number;
  unit: string;
  min: number;
  lastUpdated: string;
  supplier: string;
}

export const StockManagement = () => {
  const [sortConfig, setSortConfig] = useState<{key: keyof InventoryItem; direction: 'asc' | 'desc'} | null>(null);
  const [expandedItem, setExpandedItem] = useState<number | null>(null);
  const [showStockForm, setShowStockForm] = useState(false);

  const inventory: InventoryItem[] = [
    { id: 1, name: 'Corn Meal', category: 'Grains', current: 1200, unit: 'kg', min: 500, lastUpdated: '2023-05-15', supplier: 'AgriCorp' },
    { id: 2, name: 'Soybean Meal', category: 'Protein', current: 850, unit: 'kg', min: 400, lastUpdated: '2023-05-10', supplier: 'ProteinPlus' },
    { id: 3, name: 'Fish Meal', category: 'Protein', current: 320, unit: 'kg', min: 200, lastUpdated: '2023-05-12', supplier: 'MarineSupplies' },
    { id: 4, name: 'Wheat Bran', category: 'Grains', current: 1500, unit: 'kg', min: 800, lastUpdated: '2023-05-08', supplier: 'GrainMasters' },
    { id: 5, name: 'Vitamin Premix', category: 'Additives', current: 45, unit: 'kg', min: 30, lastUpdated: '2023-05-01', supplier: 'NutriScience' },
  ];

  const sortedInventory = [...inventory].sort((a, b) => {
    if (!sortConfig) return 0;
    if (a[sortConfig.key] < b[sortConfig.key]) {
      return sortConfig.direction === 'asc' ? -1 : 1;
    }
    if (a[sortConfig.key] > b[sortConfig.key]) {
      return sortConfig.direction === 'asc' ? 1 : -1;
    }
    return 0;
  });

  const requestSort = (key: keyof InventoryItem) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const toggleExpand = (id: number) => {
    setExpandedItem(expandedItem === id ? null : id);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Package className="w-6 h-6 text-indigo-400" />
          <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
            Inventory Management
          </h2>
        </div>
        <div className="flex space-x-3">
          <button 
            onClick={() => setShowStockForm(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg flex items-center space-x-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Stock</span>
          </button>
          <button className="px-4 py-2 border border-gray-600 hover:bg-gray-700 rounded-lg flex items-center space-x-2 transition-colors">
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-800">
              <tr>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer"
                  onClick={() => requestSort('name')}
                >
                  <div className="flex items-center">
                    Ingredient
                    {sortConfig?.key === 'name' && (
                      sortConfig.direction === 'asc' ? 
                        <ChevronUp className="ml-1 w-4 h-4" /> : 
                        <ChevronDown className="ml-1 w-4 h-4" />
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer"
                  onClick={() => requestSort('category')}
                >
                  <div className="flex items-center">
                    Category
                    {sortConfig?.key === 'category' && (
                      sortConfig.direction === 'asc' ? 
                        <ChevronUp className="ml-1 w-4 h-4" /> : 
                        <ChevronDown className="ml-1 w-4 h-4" />
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer"
                  onClick={() => requestSort('current')}
                >
                  <div className="flex items-center">
                    Current Stock
                    {sortConfig?.key === 'current' && (
                      sortConfig.direction === 'asc' ? 
                        <ChevronUp className="ml-1 w-4 h-4" /> : 
                        <ChevronDown className="ml-1 w-4 h-4" />
                    )}
                  </div>
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
                <>
                  <tr 
                    key={item.id} 
                    className="hover:bg-gray-700/50 transition-colors cursor-pointer"
                    onClick={() => toggleExpand(item.id)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-200">
                      {item.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        item.category === 'Protein' ? 'bg-blue-900/30 text-blue-400' :
                        item.category === 'Grains' ? 'bg-amber-900/30 text-amber-400' :
                        'bg-purple-900/30 text-purple-400'
                      }`}>
                        {item.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-400">
                      {item.current} {item.unit}
                      <div className="w-full bg-gray-700 rounded-full h-1.5 mt-1">
                        <div 
                          className="h-1.5 rounded-full" 
                          style={{ 
                            width: `${Math.min(100, (item.current / item.min) * 100)}%`,
                            backgroundColor: item.current >= item.min ? '#10B981' : '#EF4444'
                          }}
                        ></div>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Min: {item.min} {item.unit}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        item.current < item.min ? 'bg-red-900/30 text-red-400' : 'bg-green-900/30 text-green-400'
                      }`}>
                        {item.current < item.min ? 'Low Stock' : 'Adequate'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button className="text-indigo-400 hover:text-indigo-300 mr-4 transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button className="text-gray-400 hover:text-gray-300 transition-colors">
                        <History className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                  {expandedItem === item.id && (
                    <tr className="bg-gray-800/70">
                      <td colSpan={5} className="px-6 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div>
                            <h4 className="text-sm font-medium text-gray-400 mb-2">Stock Details</h4>
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <span className="text-gray-500">Current:</span>
                                <span className="text-gray-200">{item.current} {item.unit}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500">Minimum:</span>
                                <span className="text-gray-200">{item.min} {item.unit}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500">Difference:</span>
                                <span className={`${
                                  item.current - item.min >= 0 ? 'text-green-400' : 'text-red-400'
                                }`}>
                                  {item.current - item.min >= 0 ? '+' : ''}{item.current - item.min} {item.unit}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-gray-400 mb-2">Supplier Info</h4>
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <span className="text-gray-500">Supplier:</span>
                                <span className="text-gray-200">{item.supplier}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500">Last Order:</span>
                                <span className="text-gray-200">{item.lastUpdated}</span>
                              </div>
                            </div>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-gray-400 mb-2">Quick Actions</h4>
                            <div className="flex space-x-3">
                              <button className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm transition-colors">
                                Order More
                              </button>
                              <button className="px-3 py-1.5 border border-gray-600 hover:bg-gray-700 rounded-lg text-sm transition-colors">
                                View History
                              </button>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stock Movement Chart */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
        <h3 className="text-lg font-medium mb-4">Stock Movement Analytics</h3>
        <div className="h-80 bg-gray-700/50 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <ArrowUpDown className="w-8 h-8 text-indigo-400" />
            </div>
            <p className="text-gray-400">Stock movement visualization</p>
            <p className="text-sm text-gray-500 mt-1">Last 30 days of inventory changes</p>
          </div>
        </div>
      </div>

      {/* Add Stock Modal */}
      {showStockForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Add Stock Inventory</h3>
                <button 
                  onClick={() => setShowStockForm(false)}
                  className="text-gray-400 hover:text-gray-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Ingredient Name</label>
                  <input 
                    type="text" 
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-gray-200"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Current Stock</label>
                    <input 
                      type="number" 
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-gray-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Minimum Required</label>
                    <input 
                      type="number" 
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-gray-200"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Unit</label>
                  <select className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-gray-200">
                    <option>kg</option>
                    <option>lb</option>
                    <option>g</option>
                    <option>t</option>
                  </select>
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
                    type="submit" 
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
                  >
                    Add to Inventory
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};