
'use client';

import {
  AlertCircle,
  Cat,
  Database as DatabaseIcon,
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
  LayoutGrid,
  Truck,
  Target,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import withAuth from '@/components/auth/withAuth';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { AuthProvider } from '@/context/AuthContext';

const navSections = [
    {
      title: 'Catalog',
      icon: Package,
      links: [
        { path: '/admin/products', label: 'Products', icon: Package },
        { path: '/admin/ingredients', label: 'Ingredients', icon: FlaskConical },
        { path: '/admin/stock', label: 'Stock Management', icon: Package },
        { path: '/admin/suppliers', label: 'Suppliers', icon: Truck },
      ],
    },
    {
      title: 'Sales',
      icon: ShoppingCart,
      links: [
        { path: '/admin/leads', label: 'Leads', icon: Target },
        { path: '/admin/invoices', label: 'Invoices', icon: Receipt },
      ],
    },
    {
      title: 'Content',
      icon: FileText,
      links: [
        { path: '/admin/content-dashboard', label: 'Content Overview', icon: LayoutGrid },
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
        { path: '/admin/team', label: 'Team', icon: Users },
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
    <div className="admin-theme flex h-screen bg-ash-950 text-ash-100">
      {/* Sidebar */}
      <aside className={`
        ${sidebarCollapsed ? 'w-16' : 'w-60'} 
        bg-ash-900 border-r border-ash-700 
        flex flex-col z-10 transition-all duration-300 ease-in-out
      `}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-ash-700">
          {!sidebarCollapsed && (
            <div>
              <p className="fs-label text-ash-400">FeedSport admin</p>
              <h1 className="m-0 text-xl font-bold tracking-[-.03em] text-ash-100">FeedSport</h1>
            </div>
          )}
          <button 
            onClick={toggleSidebar}
            className="p-1.5 rounded-md hover:bg-ash-800 text-ash-400 hover:text-ash-200 transition-colors"
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
                  ? 'bg-harvest-500/15 text-harvest-400' 
                  : 'text-ash-400 hover:bg-ash-800/50 hover:text-ash-200'
                }
                ${sidebarCollapsed ? 'justify-center' : ''}
              `}
              title={sidebarCollapsed ? "Dashboard" : undefined}
            >
              <Home className="w-5 h-5" />
              {!sidebarCollapsed && <span className="font-medium ml-3">Analytics</span>}
              {sidebarCollapsed && (
                <div className="absolute left-full ml-3 px-3 py-2 bg-ash-800 text-ash-100 text-sm rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                  Analytics
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
                    "flex items-center w-full p-3 rounded-lg text-ash-400 hover:bg-ash-800/50 group/trigger transition-colors",
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
                    <div className="absolute left-full ml-3 px-3 py-2 bg-ash-800 text-ash-100 text-sm rounded-md shadow-lg opacity-0 group-hover/trigger:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
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
                          ? 'bg-harvest-500/15 text-harvest-400' 
                          : 'text-ash-400 hover:bg-ash-800/50 hover:text-ash-200'
                        }
                        ${sidebarCollapsed ? 'justify-center px-4' : 'px-4 pl-8'}
                      `}
                      title={sidebarCollapsed ? label : undefined}
                    >
                      <Icon className="w-4 h-4" />
                      {!sidebarCollapsed && <span className="font-medium ml-3 text-sm">{label}</span>}
                      {sidebarCollapsed && (
                        <div className="absolute left-full ml-3 px-3 py-2 bg-ash-800 text-ash-100 text-sm rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
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
        <div className="p-4 border-t border-ash-700">
          <div className={`flex items-center group ${sidebarCollapsed ? 'justify-center' : 'space-x-3'}`}>
            <div className="w-8 h-8 rounded-full bg-harvest-500/20 flex items-center justify-center shrink-0">
              <User className="w-4 h-4 text-harvest-400" />
            </div>
            
            {!sidebarCollapsed && (
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{user?.displayName || 'Admin'}</p>
                <p className="text-xs text-ash-500 truncate">{user?.email}</p>
              </div>
            )}
            
            {sidebarCollapsed && (
              <div className="absolute left-full ml-3 px-3 py-2 bg-ash-800 text-ash-100 text-sm rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none w-48">
                <p className="font-medium truncate">{user?.displayName || 'Admin'}</p>
                <p className="text-ash-300 text-xs truncate mt-1">{user?.email}</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center justify-between px-6 py-4 bg-ash-900 border-b border-ash-700 z-10">
          <div className="flex items-center">
            <button 
              onClick={toggleSidebar}
              className="mr-4 p-1.5 rounded-md hover:bg-ash-800 text-ash-400 hover:text-ash-200 transition-colors md:hidden"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-semibold text-ash-100">
              {navSections.flatMap(s => s.links).find(item => isLinkActive(item.path))?.label || 'Analytics'}
            </h2>
          </div>
          
          <button 
            onClick={logout}
            className="flex items-center space-x-2 border border-ash-700 px-3 py-2 rounded-[4px] transition-colors text-ash-300 hover:border-[#8f3420] hover:bg-[#3a1d16] hover:text-[#f6e0d9]"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm">Logout</span>
          </button>
        </header>

        <main className="flex-1 p-6 overflow-auto relative">
          {children}
        </main>
      </div>

      <Toaster position="top-right" toastOptions={{ style: { background: '#2b2d29', color: '#f3f0e8', border: '1px solid #45473f', borderRadius: '4px' } }} />
    </div>
  );
}

const AuthenticatedLayout = ({ children }: { children: ReactNode }) => {
    return (
        <AuthProvider>
            <DashboardLayout>{children}</DashboardLayout>
        </AuthProvider>
    )
}

export default withAuth(AuthenticatedLayout);
