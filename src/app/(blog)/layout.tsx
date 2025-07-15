import Footer from "@/components/common/Footer";
import NavBar from "@/components/common/NavBar";
import { getAllProducts } from "../actions";

export default async function BlogLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const allProducts = await getAllProducts();

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
    </>
  );
}
