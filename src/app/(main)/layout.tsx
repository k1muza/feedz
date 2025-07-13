import Footer from "@/components/common/Footer";
import NavBar from "@/components/common/NavBar";
import { ChatWidget } from "@/components/chat/ChatWidget";
import { getProductCategories, getAppSettings } from "../actions";

export default async function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [productCategories, settings] = await Promise.all([
    getProductCategories(),
    getAppSettings()
  ]);

  return (
    <>
      <NavBar />
      {children}
      <Footer productCategories={productCategories}/>
      {settings.chatWidgetEnabled && <ChatWidget />}
    </>
  );
}
