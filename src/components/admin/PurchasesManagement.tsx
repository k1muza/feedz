'use client';

import { useState } from "react";
import { ShoppingBag, Plus, Download, Search, Filter, X } from "lucide-react";
import { Product, getProducts, updateStock } from "@/data/products";

interface PurchaseOrder {
  id: string;
  supplier: string;
  date: string;
  total: number;
  status: 'Pending' | 'Completed' | 'Cancelled';
  items: { productId: string, quantity: number, productName: string }[];
}

export const PurchasesManagement = () => {
  const [purchases, setPurchases] = useState<PurchaseOrder[]>([
    { id: 'PO-2023-001', supplier: 'AgriCorp', date: '2023-05-20', total: 12500, status: 'Completed', items: [{productId: 'en-cg', quantity: 10, productName: 'Corn, grain, yellow'}] },
  ]);
  const [showPurchaseForm, setShowPurchaseForm] = useState(false);
  const [newPurchase, setNewPurchase] = useState({ supplier: '', productId: '', quantity: 0 });
  const products = getProducts();

  const handleAddPurchase = () => {
    if (newPurchase.supplier && newPurchase.productId && newPurchase.quantity > 0) {
      const product = products.find(p => p.id === newPurchase.productId);
      if (!product) return;

      const purchaseAmount = product.price * newPurchase.quantity * 0.8; // Assume purchase price is 80% of sale price

      const purchase: PurchaseOrder = {
        id: `PO-${Date.now().toString().slice(-4)}`,
        supplier: newPurchase.supplier,
        date: new Date().toISOString().split('T')[0],
        total: purchaseAmount,
        status: 'Completed',
        items: [{
          productId: product.id,
          quantity: newPurchase.quantity,
          productName: product.ingredient?.name || 'Unknown Product'
        }]
      };

      setPurchases([...purchases, purchase]);

      // Update stock
      updateStock(product.id, product.stock + newPurchase.quantity);
      
      setShowPurchaseForm(false);
      setNewPurchase({ supplier: '', productId: '', quantity: 0 });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <ShoppingBag className="w-6 h-6 text-indigo-400" />
          <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
            Purchase Orders
          </h2>
        </div>
        <div className="flex space-x-3">
          <button onClick={() => setShowPurchaseForm(true)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg flex items-center space-x-2 transition-colors">
            <Plus className="w-4 h-4" />
            <span>New Purchase</span>
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
            placeholder="Search by PO number or supplier..."
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">PO Number</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Supplier</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Items</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {purchases.map((order) => (
                <tr key={order.id} className="hover:bg-gray-700/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-indigo-400">{order.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{order.supplier}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-400">{order.date}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-400">{order.items.map(i => `${i.quantity} x ${i.productName}`).join(', ')}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-400">${order.total.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs ${order.status === 'Completed' ? 'bg-green-900/30 text-green-400' : 'bg-amber-900/30 text-amber-400'}`}>
                      {order.status}
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

       {showPurchaseForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Create New Purchase Order</h3>
                <button 
                  onClick={() => setShowPurchaseForm(false)}
                  className="text-gray-400 hover:text-gray-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Supplier Name</label>
                  <input 
                    type="text"
                    value={newPurchase.supplier}
                    onChange={(e) => setNewPurchase({...newPurchase, supplier: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Product</label>
                  <select
                    value={newPurchase.productId}
                    onChange={(e) => setNewPurchase({...newPurchase, productId: e.target.value})}
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
                    value={newPurchase.quantity}
                    onChange={(e) => setNewPurchase({...newPurchase, quantity: Number(e.target.value)})}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg"
                  />
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button 
                    type="button" 
                    onClick={() => setShowPurchaseForm(false)}
                    className="px-4 py-2 border border-gray-600 rounded-lg hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button 
                    type="button" 
                    onClick={handleAddPurchase}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg"
                  >
                    Create Purchase Order
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
