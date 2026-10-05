import Footer from "@/components/common/Footer";
import NavBar from "@/components/common/NavBar";
import { ChatWidget } from "@/components/chat/ChatWidget";
import { productCategories } from "@/data/feedProducts";

export default function BlogLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <NavBar />
      {children}
      <Footer productCategories={productCategories}/>
      <ChatWidget />
    </>
  );
}
