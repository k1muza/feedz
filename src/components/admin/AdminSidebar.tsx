'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Package, Home, ShoppingCart, Users, LineChart, Wheat } from 'lucide-react';

import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

export default function AdminSidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => pathname === href;

  return (
    <>
      <SidebarHeader>
        <div className="flex items-center gap-2 p-2">
            <Wheat className="h-6 w-6 text-primary" />
            <span className="font-semibold text-lg">FeedSport Admin</span>
        </div>
      </SidebarHeader>
      <Separator />
      <SidebarContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton href="/admin" isActive={isActive('/admin')} tooltip="Dashboard">
              <Home />
              <span>Dashboard</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton href="/admin/orders" isActive={isActive('/admin/orders')} tooltip="Orders">
              <ShoppingCart />
              <span>Orders</span>
              <Badge className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full">6</Badge>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton href="/admin/products" isActive={isActive('/admin/products')} tooltip="Products">
              <Package />
              <span>Products</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton href="/admin/users" isActive={isActive('/admin/users')} tooltip="Customers">
              <Users />
              <span>Customers</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton href="/admin/analytics" isActive={isActive('/admin/analytics')} tooltip="Analytics">
              <LineChart />
              <span>Analytics</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
      <Separator />
      <SidebarFooter>
        <div className="p-4 text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} FeedSport
        </div>
      </SidebarFooter>
    </>
  );
}
