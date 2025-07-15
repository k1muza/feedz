import Footer from "@/components/common/Footer";
import NavBar from "@/components/common/NavBar";
import { ChatWidget } from "@/components/chat/ChatWidget";
import { getAllProducts, getAppSettings } from "../actions";
import { ProductCategory } from "@/types";

export default async function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [allProducts, settings] = await Promise.all([
    getAllProducts(),
    getAppSettings()
  ]);

  const uniqueCategories = allProducts
    .map(p => p.ingredient?.category)
    .filter((value, index, self) => value && self.indexOf(value) === index)
    .map(categorySlug => ({
        id: categorySlug!,
        name: categorySlug!.replace(/-/g, ' '),
        slug: categorySlug!,
    }));

  return (
    <>
      <NavBar />
      {children}
      <Footer productCategories={uniqueCategories}/>
      {settings.chatWidgetEnabled && <ChatWidget />}
    </>
  );
}
