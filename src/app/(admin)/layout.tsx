import "@/app/globals.css";
import { SidebarProvider, Sidebar, SidebarInset } from "@/components/ui/sidebar";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SidebarProvider>
      <Sidebar>
        <AdminSidebar />
      </Sidebar>
      <SidebarInset>
        <div className="flex flex-col min-h-screen">
          <AdminHeader />
          <main className="flex-1 p-4 md:p-8 pt-6 bg-gray-50/50">
            {children}
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
