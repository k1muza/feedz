
import { AuthProvider } from "@/context/AuthContext";
import { ReactNode } from "react";

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
      <>
        {children}
      </>
  );
}
