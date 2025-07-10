'use client';

import { useState } from "react";
import { ShoppingCart, Plus, Download, Search, Filter, X } from "lucide-react";
import { Product, getProducts, updateStock } from "@/data/products";

interface Sale {
  id: string;
  customer: string;
  date: string;
  total: number;
  status: 'Paid' | 'Pending' | 'Overdue';
  items: { productId: string, quantity: number, productName: string }[];
}

export const SalesManagement = () => {
  const [sales, setSales] = useState<Sale[]>([
    { id: 'INV-2023-0123', customer: 'Green Valley Farms', date: '2023-05-18', total: 7200, status: 'Paid', items: [{productId: 'soy-48', quantity: 5, productName: 'Soybean Meal'}] },
  ]);
  const [showSaleForm, setShowSaleForm] = useState(false);
  const [newSale, setNewSale] = useState({ customer: '', productId: '', quantity: 0 });
  const products = getProducts();

  const handleAddSale = () => {
    if (newSale.customer && newSale.productId && newSale.quantity > 0) {
        const product = products.find(p => p.id === newSale.productId);
        if (!product) return;

        const saleAmount = product.price * newSale.quantity;

        const sale: Sale = {
            id: `INV-${Date.now().toString().slice(-4)}`,
            customer: newSale.customer,
            date: new Date().toISOString().split('T')[0],
            total: saleAmount,
            status: 'Pending',
            items: [{
                productId: product.id,
                quantity: newSale.quantity,
                productName: product.ingredient?.name || 'Unknown Product'
            }]
        };

        setSales([...sales, sale]);
        
        // Update stock
        updateStock(product.id, product.stock - newSale.quantity);

        setShowSaleForm(false);
        setNewSale({ customer: '', productId: '', quantity: 0 });
    }
  }


  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <ShoppingCart className="w-6 h-6 text-indigo-400" />
          <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
            Sales Overview
          </h2>
        </div>
        <div className="flex space-x-3">
          <button onClick={() => setShowSaleForm(true)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg flex items-center space-x-2 transition-colors">
            <Plus className="w-4 h-4" />
            <span>New Sale</span>
          </button>
          <button className="px-4 py-2 border border-gray-600 hover:bg-gray-700 rounded-lg flex items-center space-x-2 transition-colors">
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

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

      <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Invoice ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Items</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {sales.map((sale) => (
                <tr key={sale.id} className="hover:bg-gray-700/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-indigo-400">{sale.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{sale.customer}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-400">{sale.date}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-400">{sale.items.map(i => `${i.quantity} x ${i.productName}`).join(', ')}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-400">${sale.total.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs ${sale.status === 'Paid' ? 'bg-green-900/30 text-green-400' : sale.status === 'Pending' ? 'bg-amber-900/30 text-amber-400' : 'bg-red-900/30 text-red-400'}`}>
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
      
      {showSaleForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Create New Sale</h3>
                <button 
                  onClick={() => setShowSaleForm(false)}
                  className="text-gray-400 hover:text-gray-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Customer Name</label>
                  <input 
                    type="text"
                    value={newSale.customer}
                    onChange={(e) => setNewSale({...newSale, customer: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Product</label>
                  <select
                    value={newSale.productId}
                    onChange={(e) => setNewSale({...newSale, productId: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg"
                  >
                      <option value="">Select Product</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.ingredient?.name}</option>)}
                  </select>
                </div>
                 <div>
                  <label className="block text-sm text-gray-400 mb-2">Quantity (tons)</label>
                  <input 
                    type="number" 
                    value={newSale.quantity}
                    onChange={(e) => setNewSale({...newSale, quantity: Number(e.target.value)})}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg"
                  />
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button 
                    type="button" 
                    onClick={() => setShowSaleForm(false)}
                    className="px-4 py-2 border border-gray-600 rounded-lg hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button 
                    type="button" 
                    onClick={handleAddSale}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg"
                  >
                    Create Sale
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
