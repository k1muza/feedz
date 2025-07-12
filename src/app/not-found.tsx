
'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import Player from '@/components/common/Player';
import { Button } from '@/components/ui/button';
import Footer from '@/components/common/Footer';
import NavBar from '@/components/common/NavBar';
import { useEffect, useState } from 'react';
import { getProductCategories } from './actions';
import { ProductCategory } from '@/types';

export default function NotFound() {
  const [categories, setCategories] = useState<ProductCategory[]>([]);

  useEffect(() => {
    async function fetchCategories() {
      const productCategories = await getProductCategories();
      setCategories(productCategories);
    }
    fetchCategories();
  }, []);

  return (
    <>
      <NavBar />
      <main className="relative flex min-h-[80vh] items-center justify-center overflow-hidden bg-gray-50 py-16 text-center">
        <div className="absolute inset-0 z-0 opacity-10">
          <div className="absolute inset-0 bg-[radial-gradient(#d4d4d8_1px,transparent_1px)] [background-size:32px_32px]"></div>
        </div>
        
        <div className="relative z-10 mx-auto flex max-w-lg flex-col items-center px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: 'backOut' }}
          >
            <Player
              src="/lottie/404-animation.json"
              loop
              autoplay
              style={{ height: '300px', width: '300px' }}
            />
          </motion.div>
          
          <motion.h1
            className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            Oops! Page Not Found
          </motion.h1>
          
          <motion.p
            className="mt-4 text-lg text-gray-600"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            The page you're looking for doesn't exist or has been moved. Let's get you back on track.
          </motion.p>
          
          <motion.div
            className="mt-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <Button asChild size="lg" className="bg-green-600 hover:bg-green-700">
              <Link href="/">
                <ArrowLeft className="mr-2 h-5 w-5" />
                Return to Homepage
              </Link>
            </Button>
          </motion.div>
        </div>
      </main>
      <Footer productCategories={categories}/>
    </>
  );
}
