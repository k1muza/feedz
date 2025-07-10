
'use client';

import { useState } from "react";
import { ShoppingCart, Plus, Download, ChevronDown, ChevronUp, Search, Filter } from "lucide-react";

interface Sale {
  id: string;
  customer: string;
  date: string;
  total: number;
  status: 'Paid' | 'Pending' | 'Overdue';
  items: number;
}

export const SalesManagement = () => {
  const [sortConfig, setSortConfig] = useState<{key: keyof Sale; direction: 'asc' | 'desc'} | null>(null);
  
  const sales: Sale[] = [
    { id: 'INV-2023-0123', customer: 'Green Valley Farms', date: '2023-05-18', total: 7200, status: 'Paid', items: 4 },
    { id: 'INV-2023-0124', customer: 'Sunrise Agriculture', date: '2023-05-21', total: 4500, status: 'Pending', items: 2 },
    { id: 'INV-2023-0125', customer: 'Crestwood Cattle Co.', date: '2023-04-15', total: 11500, status: 'Overdue', items: 8 },
    { id: 'INV-2023-0126', customer: 'Happy Hen Poultry', date: '2023-05-27', total: 3250, status: 'Paid', items: 3 },
    { id: 'INV-2023-0127', customer: 'Riverbend Swine', date: '2023-06-02', total: 6800, status: 'Pending', items: 5 },
  ];

  const sortedSales = [...sales].sort((a, b) => {
    if (!sortConfig) return 0;
    if (a[sortConfig.key] < b[sortConfig.key]) {
      return sortConfig.direction === 'asc' ? -1 : 1;
    }
    if (a[sortConfig.key] > b[sortConfig.key]) {
      return sortConfig.direction === 'asc' ? 1 : -1;
    }
    return 0;
  });

  const requestSort = (key: keyof Sale) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getStatusChip = (status: Sale['status']) => {
    switch (status) {
      case 'Paid': return 'bg-green-900/30 text-green-400';
      case 'Pending': return 'bg-amber-900/30 text-amber-400';
      case 'Overdue': return 'bg-red-900/30 text-red-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <ShoppingCart className="w-6 h-6 text-indigo-400" />
          <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
            Sales Overview
          </h2>
        </div>
        <div className="flex space-x-3">
          <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg flex items-center space-x-2 transition-colors">
            <Plus className="w-4 h-4" />
            <span>New Sale</span>
          </button>
          <button className="px-4 py-2 border border-gray-600 hover:bg-gray-700 rounded-lg flex items-center space-x-2 transition-colors">
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by invoice or customer..."
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          />
        </div>
        <button className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg flex items-center space-x-2 hover:bg-gray-700 transition-colors">
          <Filter className="w-4 h-4" />
          <span>Filter</span>
        </button>
      </div>

      {/* Sales Table */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-800">
              <tr>
                {['id', 'customer', 'date', 'total', 'status'].map((key) => (
                  <th 
                    key={key}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer"
                    onClick={() => requestSort(key as keyof Sale)}
                  >
                    <div className="flex items-center">
                      {key.replace('_', ' ')}
                      {sortConfig?.key === key && (
                        sortConfig.direction === 'asc' ? 
                          <ChevronUp className="ml-1 w-4 h-4" /> : 
                          <ChevronDown className="ml-1 w-4 h-4" />
                      )}
                    </div>
                  </th>
                ))}
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {sortedSales.map((sale) => (
                <tr key={sale.id} className="hover:bg-gray-700/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-indigo-400">{sale.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{sale.customer}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-400">{sale.date}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-400">${sale.total.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs ${getStatusChip(sale.status)}`}>
                      {sale.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button className="text-indigo-400 hover:text-indigo-300">View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
