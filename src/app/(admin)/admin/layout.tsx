
'use client';

import {
  AlertCircle,
  Cat,
  Database as DatabaseIcon,
  Droplet,
  FileText,
  Home,
  Image as ImageIcon,
  Menu,
  Package,
  Pencil,
  Search,
  Settings as SettingsIcon,
  User,
  Users,
  X,
  ShoppingCart,
  ShoppingBag,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode, useState } from 'react';
import { Toaster } from 'react-hot-toast';

export default function DashboardLayout({
  children,
}: {
  children: ReactNode
}) {
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  const navItems = [
    { path: '/admin', label: 'Dashboard', icon: Home },
    { path: '/admin/stock', label: 'Stock Management', icon: Package },
    { path: '/admin/products', label: 'Products', icon: Package },
    { path: '/admin/assets', label: 'Assets', icon: ImageIcon },
    { path: '/admin/blog', label: 'Blog', icon: FileText },
    { path: '/admin/users', label: 'Users', icon: Users },
    { path: '/admin/settings', label: 'Settings', icon: SettingsIcon },
  ];

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100">
      {/* Sidebar */}
      <aside className={`${sidebarCollapsed ? 'w-20' : 'w-64'} bg-gray-900/80 backdrop-blur-lg border-r border-gray-800 z-10 transition-all duration-300 ease-in-out`}>
        <div className="flex items-center justify-between px-4 py-5 border-b border-gray-800">
          {!sidebarCollapsed && (
            <div className="flex items-center space-x-2">
              <Droplet className="w-6 h-6 text-indigo-400" />
              <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
                FeedSport
              </h1>
            </div>
          )}
          <button 
            onClick={toggleSidebar}
            className="p-1 rounded-md hover:bg-gray-800 text-gray-400 hover:text-gray-200"
          >
            {sidebarCollapsed ? <Menu className="w-5 h-5" /> : <X className="w-5 h-5" />}
          </button>
        </div>
        
        <nav className="mt-6 flex flex-col space-y-1 px-2">
          {navItems.map(({ path, label, icon: Icon }) => (
            <Link
              key={path}
              href={path}
              className={`flex items-center w-full px-4 py-3 rounded-lg transition-all group ${
                pathname.startsWith(path) && (path !== '/admin' || pathname === '/admin')
                  ? 'bg-indigo-500/10 text-indigo-400 border-l-4 border-indigo-400' 
                  : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'
              }`}
              title={sidebarCollapsed ? label : undefined}
            >
              <Icon className="w-5 h-5" />
              {!sidebarCollapsed && (
                <span className="font-medium ml-3">{label}</span>
              )}
              {sidebarCollapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded-md opacity-0 group-hover:opacity-100 whitespace-nowrap">
                  {label}
                </div>
              )}
            </Link>
          ))}
        </nav>
        
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-800">
          <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'space-x-3'}`}>
            <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center">
              <User className="w-4 h-4 text-indigo-400" />
            </div>
            {!sidebarCollapsed && (
              <div>
                <p className="text-sm font-medium">Admin User</p>
                <p className="text-xs text-gray-500">admin@feedsport.com</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <header className="flex items-center justify-between px-6 py-4 bg-gray-900/80 backdrop-blur-lg border-b border-gray-800 z-10">
          <div className="flex items-center">
            <button 
              onClick={toggleSidebar}
              className="mr-4 p-1 rounded-md hover:bg-gray-800 text-gray-400 hover:text-gray-200 md:hidden"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-semibold text-gray-100">
              {navItems.find(item => pathname.startsWith(item.path) && (item.path !== '/admin' || pathname === '/admin'))?.label || 'Dashboard'}
            </h2>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute top-1/2 left-3 w-5 h-5 text-gray-400 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search..."
                className="pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-gray-200 placeholder-gray-500"
              />
            </div>
            
            <button className="relative p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors">
              <AlertCircle className="w-5 h-5 text-gray-400" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-xs">
                3
              </span>
            </button>
            
            <button className="flex items-center space-x-2 bg-gray-800 hover:bg-gray-700 px-3 py-2 rounded-lg transition-colors">
              <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center">
                <User className="w-4 h-4 text-indigo-400" />
              </div>
              <span className="text-sm">Admin</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-auto relative">
          <div className="absolute inset-0 -z-10 opacity-10 pointer-events-none">
            <div className="absolute inset-0 bg-[radial-gradient(#2e2e2e_1px,transparent_1px)] [background-size:16px_16px]"></div>
          </div>
          
          {children}
        </main>
      </div>

      <Toaster position="top-right" />
    </div>
  );
}
