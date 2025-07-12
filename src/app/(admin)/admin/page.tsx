
import { DashboardClient } from '@/components/admin/DashboardClient';
import { getAllProducts, getAllBlogPosts, getAllUsers } from '@/app/actions';
import type { Product, BlogPost, User } from '@/types';


export default async function Dashboard() {
  const [products, blogPosts, users] = await Promise.all([
    getAllProducts(),
    getAllBlogPosts(),
    getAllUsers(),
  ]);

  return (
    <>
      <DashboardClient products={products} blogPosts={blogPosts} users={users} />
    </>
  );
}
