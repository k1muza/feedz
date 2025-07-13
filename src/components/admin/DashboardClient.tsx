
'use client';

import { Activity, FileText, Package, Users } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import type { Product, BlogPost, User } from '@/types';
import Image from 'next/image';
import { AnalyticsDashboard } from './AnalyticsDashboard';

interface DashboardClientProps {
    products: Product[];
    blogPosts: BlogPost[];
    users: User[];
}

interface TooltipProps {
  active?: boolean;
  payload?: {
    name: string;
    value: number;
    payload: { category: string; count: number }}[];
}

const CustomTooltip = ({ active, payload }: TooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-800 p-3 border border-gray-700 rounded-lg shadow-lg">
        <p className="font-medium capitalize">{payload[0].payload.category.replace('-', ' ')}</p>
        <p className="text-indigo-300">
          {payload[0].value} {payload[0].name.toLowerCase()}
        </p>
      </div>
    );
  }
  return null;
};

export function DashboardClient({ products, blogPosts, users }: DashboardClientProps) {
  // Stats
  const totalProducts = products.length;
  const totalPosts = blogPosts.length;
  const totalUsers = users.length;
  
  // Bar chart data: Products by Category
  const categoryCounts = products.reduce((acc, p) => {
    const category = p.ingredient?.category || 'Uncategorized';
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const barData = Object.entries(categoryCounts)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);

  const BAR_COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7f7f', '#8dd1e1', '#a4de6c', '#d0ed57'];

  const recentProducts = [...products]
    .sort((a, b) => (b.id || '').localeCompare(a.id || '')) // Basic sort, could be by date if available
    .slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400">Your content and analytics at a glance</p>
        </div>
        <div className="flex items-center space-x-2 bg-indigo-900/30 px-4 py-2 rounded-lg">
          <Activity className="w-5 h-5 text-indigo-400" />
          <span className="text-sm">Last updated: Today</span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          { title: 'Total Products', value: totalProducts, icon: Package, color: 'bg-indigo-500/20' },
          { title: 'Total Blog Posts', value: totalPosts, icon: FileText, color: 'bg-emerald-500/20' },
          { title: 'Total Users', value: totalUsers, icon: Users, color: 'bg-amber-500/20' },
        ].map((stat, idx) => (
          <div 
            key={idx} 
            className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700 rounded-xl p-5 hover:border-indigo-400/30 transition-all duration-300 hover:scale-[1.02]"
          >
            <div className="flex items-center justify-between">
              <div className={`p-3 rounded-lg ${stat.color}`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-white">{stat.value}</p>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-white mt-4">{stat.title}</h3>
          </div>
        ))}
      </div>

      {/* Graphs Section */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700 rounded-xl p-5">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-white">Products by Category</h3>
              <p className="text-gray-400 text-sm">Distribution of products</p>
            </div>
            <div className="bg-gray-700/50 px-3 py-1 rounded-full text-sm">
              {Object.keys(categoryCounts).length} categories
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 5, right: 20, bottom: 5, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis 
                  dataKey="category"
                  tickFormatter={(value) => value.replace('-', ' ')}
                  tick={{ fill: '#ccc', fontSize: 12 }}
                  interval={0}
                />
                <YAxis 
                  tick={{ fill: '#ccc', fontSize: 12 }} 
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(129, 140, 248, 0.1)' }}/>
                <Bar dataKey="count" name="products">
                  {barData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-2 bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
            <div>
                <h3 className="text-lg font-semibold text-white">Recently Added Products</h3>
                <p className="text-gray-400 text-sm">Latest additions to your catalog</p>
            </div>
            </div>
            <ul className="space-y-3">
            {recentProducts.map((product, index) => (
                <li 
                key={product.id} 
                className="flex items-center p-3 bg-gray-800/30 rounded-lg hover:bg-gray-800/50 transition-colors group"
                >
                <div className="flex-shrink-0 h-10 w-10 relative">
                    <Image className="rounded-md object-cover" src={product.images[0]} alt={product.ingredient?.name || ''} fill />
                </div>
                <div className="flex-1 min-w-0 ml-3">
                    <p className="text-sm font-medium text-white truncate group-hover:text-indigo-300 transition-colors">
                    {product.ingredient?.name}
                    </p>
                    <div className="flex justify-between mt-1">
                    <p className="text-xs text-gray-400 capitalize">{product.ingredient?.category?.replace('-', ' ')}</p>
                    </div>
                </div>
                </li>
            ))}
            </ul>
        </div>
      </div>
      
      {/* Analytics Section */}
      <AnalyticsDashboard />

    </div>
  );
}
