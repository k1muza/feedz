
'use client';

// import { Player } from '@lottiefiles/react-lottie-player';
import { motion, useInView } from 'framer-motion';
import Link from 'next/link';
import { useRef } from 'react';
import { FaArrowRight, FaWhatsapp } from 'react-icons/fa';
 import dynamic from 'next/dynamic';

const Player = dynamic(
       () => import('@lottiefiles/react-lottie-player').then((mod) => mod.Player),
       { ssr: false }
   );

export default function HeroSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section 
      ref={ref}
      className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white overflow-hidden"
    >
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden opacity-20">
        <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(to_right,#4ade8055_1px,transparent_1px),linear-gradient(to_bottom,#4ade8055_1px,transparent_1px)] bg-[size:40px_40px]"></div>
        <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-emerald-500 rounded-full mix-blend-screen opacity-10 blur-3xl"></div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20 relative z-10 max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-16">
          {/* Content */}
          <motion.div 
            className="lg:w-1/2 text-center lg:text-left"
            initial={{ opacity: 0, x: -20 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <motion.span 
              className="inline-block bg-gradient-to-r from-emerald-500/20 to-teal-600/20 backdrop-blur-sm text-emerald-300 px-4 py-2 rounded-full text-sm font-semibold mb-6 tracking-wider border border-emerald-500/30"
              initial={{ y: 10, opacity: 0 }}
              animate={isInView ? { y: 0, opacity: 1 } : {}}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              NEXT-GEN LIVESTOCK NUTRITION
            </motion.span>
            
            <motion.h1 
              className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight mb-6"
              initial={{ y: 20, opacity: 0 }}
              animate={isInView ? { y: 0, opacity: 1 } : {}}
              transition={{ delay: 0.4, duration: 0.8 }}
            >
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">AI-Optimized</span> 
              <span className="block">Feed Solutions</span>
            </motion.h1>
            
            <motion.p 
              className="text-lg md:text-xl text-emerald-100/90 max-w-2xl mx-auto lg:mx-0 mb-8 leading-relaxed"
              initial={{ y: 20, opacity: 0 }}
              animate={isInView ? { y: 0, opacity: 1 } : {}}
              transition={{ delay: 0.6, duration: 0.8 }}
            >
              Precision-formulated supplements powered by machine learning to maximize <span className="font-medium text-white">growth efficiency</span> and <span className="font-medium text-white">herd health</span>
            </motion.p>
            
            <motion.div 
              className="flex flex-col sm:flex-row justify-center lg:justify-start gap-4"
              initial={{ y: 20, opacity: 0 }}
              animate={isInView ? { y: 0, opacity: 1 } : {}}
              transition={{ delay: 0.8, duration: 0.8 }}
            >
              <Link 
                href="/products" 
                className="group flex items-center justify-center bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold py-3 px-8 rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
              >
                <span>Explore Formulations</span>
                <FaArrowRight className="ml-2 transition-transform group-hover:translate-x-1" />
              </Link>
              
              <Link 
                href="https://wa.me/263774684534"
                target="_blank"
                rel="noopener noreferrer" 
                className="group flex items-center justify-center bg-transparent border-2 border-emerald-400/30 hover:border-emerald-300 hover:bg-emerald-900/20 backdrop-blur-sm font-bold py-3 px-6 rounded-lg transition-all duration-300"
              >
                <FaWhatsapp className="mr-2 text-lg group-hover:text-emerald-300" />
                <span className="group-hover:text-emerald-300">Instant Consultation</span>
              </Link>
            </motion.div>

            {/* Tech badges */}
            <motion.div 
              className="mt-12 flex flex-wrap justify-center lg:justify-start gap-3 max-w-md"
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : {}}
              transition={{ delay: 1, duration: 0.6 }}
            >
              <span className="bg-emerald-900/40 text-xs text-emerald-300 px-3 py-1.5 rounded-full border border-emerald-800/50">AI-Powered Analytics</span>
              <span className="bg-emerald-900/40 text-xs text-emerald-300 px-3 py-1.5 rounded-full border border-emerald-800/50">Precision Nutrition</span>
              <span className="bg-emerald-900/40 text-xs text-emerald-300 px-3 py-1.5 rounded-full border border-emerald-800/50">IoT Integration</span>
            </motion.div>
          </motion.div>

          {/* Lottie Animation */}
          <motion.div 
            className="lg:w-1/2 relative"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <div className="relative h-[100px] sm:h-[200px] w-full rounded-2xl overflow-hidden">
              <Player
                src="/cow.json" // Animated DNA/tech visualization
                background="transparent"
                loop
                autoplay
                className="absolute inset-0"
              />
              
              {/* Floating tech elements */}
              <div className="absolute inset-0 pointer-events-none">
                {[...Array(8)].map((_, i) => (
                  <div 
                    key={i}
                    className="absolute rounded-full bg-emerald-500/10 backdrop-blur-sm"
                    style={{
                      width: `${Math.random() * 10 + 20}px`,
                      height: `${Math.random() * 10 + 20}px`,
                      top: `${Math.random() * 100}%`,
                      left: `${Math.random() * 100}%`,
                      filter: 'blur(20px)',
                      animation: `pulse ${Math.random() * 8 + 4}s infinite ease-in-out ${Math.random() * 5}s`,
                    }}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
