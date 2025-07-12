import Footer from "@/components/common/Footer";
import NavBar from "@/components/common/NavBar";
import { ChatWidget } from "@/components/chat/ChatWidget";

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <NavBar />
      {children}
      <Footer />
      <ChatWidget />
    </>
  );
}
