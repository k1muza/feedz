import Footer from "@/components/common/Footer";
import NavBar from "@/components/common/NavBar";
import { getProductCategories } from "../actions";

export default async function BlogLayout({
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
    </>
  );
}
