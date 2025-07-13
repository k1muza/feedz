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
  FlaskConical,
  MessageSquare,
  Mail,
  Newspaper,
  LogOut,
  Shield,
  Receipt,
  ChevronDown,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import withAuth from '@/components/auth/withAuth';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

const navSections = [
    {
      title: 'Catalog',
      icon: Package,
      links: [
        { path: '/admin/products', label: 'Products', icon: Package },
        { path: '/admin/ingredients', label: 'Ingredients', icon: FlaskConical },
        { path: '/admin/stock', label: 'Stock Management', icon: Package },
      ],
    },
    {
      title: 'Sales',
      icon: ShoppingCart,
      links: [
        { path: '/admin/invoices', label: 'Invoices', icon: Receipt },
      ],
    },
    {
      title: 'Content',
      icon: FileText,
      links: [
        { path: '/admin/blog', label: 'Blog', icon: FileText },
        { path: '/admin/assets', label: 'Assets', icon: ImageIcon },
        { path: '/admin/policies', label: 'Policies', icon: Shield },
      ],
    },
    {
      title: 'Engagement',
      icon: Users,
      links: [
        { path: '/admin/conversations', label: 'Conversations', icon: MessageSquare },
        { path: '/admin/inquiries', label: 'Inquiries', icon: Mail },
        { path: '/admin/subscribers', label: 'Subscribers', icon: Newspaper },
      ],
    },
     {
      title: 'Administration',
      icon: SettingsIcon,
      links: [
        { path: '/admin/users', label: 'Users', icon: Users },
        { path: '/admin/settings', label: 'Settings', icon: SettingsIcon },
      ],
    },
];

function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { user, logout } = useAuth();
  
  const isLinkActive = (path: string) => pathname.startsWith(path);

  const toggleSidebar = () => setSidebarCollapsed(!sidebarCollapsed);

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100">
      {/* Sidebar */}
      <aside className={`
        ${sidebarCollapsed ? 'w-16' : 'w-60'} 
        bg-gray-900/90 backdrop-blur-lg border-r border-gray-800 
        flex flex-col z-10 transition-all duration-300 ease-in-out
      `}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
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
            className="p-1.5 rounded-md hover:bg-gray-800 text-gray-400 hover:text-gray-200 transition-colors"
          >
            {sidebarCollapsed ? <Menu className="w-5 h-5" /> : <X className="w-5 h-5" />}
          </button>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 flex flex-col py-3 overflow-y-auto">
          <div className="space-y-1 px-2">
            <Link
              href="/admin"
              className={`
                flex items-center w-full p-3 rounded-lg transition-all group relative
                ${pathname === '/admin' 
                  ? 'bg-indigo-500/15 text-indigo-400' 
                  : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'
                }
                ${sidebarCollapsed ? 'justify-center' : ''}
              `}
              title={sidebarCollapsed ? "Dashboard" : undefined}
            >
              <Home className="w-5 h-5" />
              {!sidebarCollapsed && <span className="font-medium ml-3">Dashboard</span>}
              {sidebarCollapsed && (
                <div className="absolute left-full ml-3 px-3 py-2 bg-gray-800 text-white text-sm rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                  Dashboard
                </div>
              )}
            </Link>

            {navSections.map((section) => (
              <Collapsible 
                key={section.title} 
                defaultOpen={section.links.some(l => isLinkActive(l.path))}
              >
                <CollapsibleTrigger 
                  className={cn(
                    "flex items-center w-full p-3 rounded-lg text-gray-400 hover:bg-gray-800/50 group/trigger transition-colors",
                    sidebarCollapsed ? "justify-center" : "justify-between"
                  )}
                >
                  <div className="flex items-center">
                    <section.icon className="w-5 h-5" />
                    {!sidebarCollapsed && (
                      <span className="font-semibold text-xs uppercase tracking-wider ml-3">
                        {section.title}
                      </span>
                    )}
                  </div>
                  
                  {!sidebarCollapsed && (
                    <ChevronDown className="w-4 h-4 transition-transform [&[data-state=open]]:rotate-180" />
                  )}
                  
                  {sidebarCollapsed && (
                    <div className="absolute left-full ml-3 px-3 py-2 bg-gray-800 text-white text-sm rounded-md shadow-lg opacity-0 group-hover/trigger:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                      {section.title}
                    </div>
                  )}
                </CollapsibleTrigger>
                
                <CollapsibleContent className="mt-1 space-y-1">
                  {section.links.map(({ path, label, icon: Icon }) => (
                    <Link
                      key={path}
                      href={path}
                      className={`
                        flex items-center w-full py-2.5 rounded-lg transition-all group relative
                        ${isLinkActive(path)
                          ? 'bg-indigo-500/15 text-indigo-400' 
                          : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'
                        }
                        ${sidebarCollapsed ? 'justify-center px-4' : 'px-4 pl-8'}
                      `}
                      title={sidebarCollapsed ? label : undefined}
                    >
                      <Icon className="w-4 h-4" />
                      {!sidebarCollapsed && <span className="font-medium ml-3 text-sm">{label}</span>}
                      {sidebarCollapsed && (
                        <div className="absolute left-full ml-3 px-3 py-2 bg-gray-800 text-white text-sm rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                          {label}
                        </div>
                      )}
                    </Link>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        </nav>
        
        {/* User Profile */}
        <div className="p-4 border-t border-gray-800">
          <div className={`flex items-center group ${sidebarCollapsed ? 'justify-center' : 'space-x-3'}`}>
            <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0">
              <User className="w-4 h-4 text-indigo-400" />
            </div>
            
            {!sidebarCollapsed && (
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{user?.displayName || 'Admin'}</p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
            )}
            
            {sidebarCollapsed && (
              <div className="absolute left-full ml-3 px-3 py-2 bg-gray-800 text-white text-sm rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none w-48">
                <p className="font-medium truncate">{user?.displayName || 'Admin'}</p>
                <p className="text-gray-300 text-xs truncate mt-1">{user?.email}</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center justify-between px-6 py-4 bg-gray-900/80 backdrop-blur-lg border-b border-gray-800 z-10">
          <div className="flex items-center">
            <button 
              onClick={toggleSidebar}
              className="mr-4 p-1.5 rounded-md hover:bg-gray-800 text-gray-400 hover:text-gray-200 transition-colors md:hidden"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-semibold text-gray-100">
              {navSections.flatMap(s => s.links).find(item => isLinkActive(item.path))?.label || 'Dashboard'}
            </h2>
          </div>
          
          <button 
            onClick={logout}
            className="flex items-center space-x-2 bg-gray-800 hover:bg-red-900/50 px-3 py-2 rounded-lg transition-colors text-red-400"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm">Logout</span>
          </button>
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

export default withAuth(DashboardLayout);
