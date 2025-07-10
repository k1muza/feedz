'use client'

import Link from 'next/link'
import { ReactNode } from 'react'
import { FaArrowRight } from 'react-icons/fa'
import { motion } from 'framer-motion'

interface SecondaryHeroProps {
  title: string | ReactNode
  subtitle?: string | ReactNode
  badge?: string
  ctaText?: string
  ctaLink?: string
  minimal?: boolean
}

export default function SecondaryHero({
  title,
  subtitle,
  badge,
  ctaText,
  ctaLink,
  minimal = false
}: SecondaryHeroProps) {
  return (
    <section className="relative bg-gradient-to-br from-green-900 to-green-700 text-white overflow-hidden">
      {/* Subtle grid background */}
      <div className="absolute inset-0 overflow-hidden opacity-20">
        <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(to_right,#4ade8055_1px,transparent_1px),linear-gradient(to_bottom,#4ade8055_1px,transparent_1px)] bg-[size:40px_40px]"></div>
        <div className="absolute -bottom-20 -right-20 w-64 h-32 bg-emerald-500 rounded-full mix-blend-screen opacity-10 blur-3xl"></div>
      </div>

      {/* Floating elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -bottom-20 -right-20 w-64 h-32 bg-yellow-400/10 rounded-full blur-3xl" />
        <div className="absolute -top-20 -left-20 w-96 h-96 bg-green-500/10 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 py-16 md:pt-24 md:pb-12">
        <motion.div 
          className="max-w-3xl mx-auto text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {badge && (
            <motion.span
              className="inline-block bg-gradient-to-r from-emerald-500/20 to-teal-600/20 backdrop-blur-sm text-emerald-300 px-4 py-2 rounded-full text-sm font-semibold mb-6 tracking-wider border border-emerald-500/30"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              {badge}
            </motion.span>
          )}

          <motion.h1
            className={`font-bold leading-tight mb-5 ${
              minimal ? 'text-2xl md:text-3xl' : 'text-3xl md:text-4xl'
            }`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {title}
          </motion.h1>

          {subtitle && (
            <motion.p
              className={`text-green-100/90 max-w-2xl mx-auto ${
                minimal ? 'text-sm' : 'text-base md:text-lg'
              }`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              {subtitle}
            </motion.p>
          )}

          {ctaText && ctaLink && (
            <motion.div
              className="mt-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <Link
                href={ctaLink}
                className="group inline-flex items-center justify-center bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white font-medium px-6 py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5"
              >
                <span>{ctaText}</span>
                <FaArrowRight className="ml-2 transition-transform duration-200 group-hover:translate-x-1" />
              </Link>
            </motion.div>
          )}
        </motion.div>
      </div>
    </section>
  )
}
