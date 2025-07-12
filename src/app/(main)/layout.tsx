import Footer from "@/components/common/Footer";
import NavBar from "@/components/common/NavBar";
import { ChatWidget } from "@/components/chat/ChatWidget";
import { getProductCategories } from "../actions";

export default async function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const productCategories = await getProductCategories();
  return (
    <>
      <NavBar />
      {children}
      <Footer productCategories={productCategories}/>
      <ChatWidget />
    </>
  );
}
