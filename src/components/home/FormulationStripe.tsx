'use client'

import { motion, useScroll, useTransform } from 'framer-motion'
import Link from 'next/link'
import React, { useEffect, useRef, useState } from 'react'
import { FaChartLine, FaDna, FaEgg, FaFire, FaLeaf, FaPiggyBank, FaShieldAlt } from 'react-icons/fa'
import { FaCow } from 'react-icons/fa6'

interface Formulation {
  id: number
  name: string
  tagline: string
  icon: React.ReactNode
  color: string
  status: 'active' | 'low' | 'out'
  animals: string[]
}

const formulations: Formulation[] = [
  { id: 1, name: 'Broiler Boost', tagline: '27% faster weight gain', icon: <FaFire className="text-amber-400" />, color: 'amber', status: 'active', animals: ['Broilers', 'Layers'] },
  { id: 2, name: 'Cattle Fattener', tagline: '35% fiber conversion', icon: <FaLeaf className="text-emerald-400" />, color: 'emerald', status: 'low', animals: ['Cattle', 'Sheep'] },
  { id: 3, name: 'Layers Shield', tagline: '45% disease resistance', icon: <FaShieldAlt className="text-blue-400" />, color: 'blue', status: 'active', animals: ['Poultry', 'Swine'] },
  { id: 4, name: 'Pig Grower', tagline: '1.2:1 FCR', icon: <FaChartLine className="text-teal-400" />, color: 'teal', status: 'active', animals: ['Goats', 'Cattle'] },
  { id: 5, name: 'Pig Sow Boost ', tagline: 'AI-optimized', icon: <FaDna className="text-purple-400" />, color: 'purple', status: 'out', animals: ['Poultry', 'Cattle', 'Swine'] },
  { id: 6, name: 'Lactating Pig', tagline: 'Strong shell formation', icon: <FaEgg className="text-yellow-400" />, color: 'yellow', status: 'active', animals: ['Layers'] },
  { id: 7, name: 'Lactating Cow', tagline: 'Milk yield +20%', icon: <FaCow className="text-cyan-400" />, color: 'cyan', status: 'low', animals: ['Cattle'] },
  { id: 8, name: 'Swine Gain', tagline: 'Lean muscle gain', icon: <FaPiggyBank className="text-pink-400" />, color: 'pink', status: 'active', animals: ['Swine'] }
]

export default function BetterFeedFormulationStrip() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const { scrollXProgress } = useScroll({ container: scrollRef, axis: 'x' })
  const progressWidth = useTransform(scrollXProgress, [0, 1], ['0%', '100%'])

  const [particles, setParticles] = useState<{ top: number; left: number; size: number; delay: number }[]>([])
  useEffect(() => {
    const data = Array.from({ length: 12 }).map(() => ({
      top: Math.random() * 100,
      left: Math.random() * 100,
      size: Math.random() * 6 + 4,
      delay: Math.random() * 5
    }))
    setParticles(data)
  }, [])

  return (
    <section className="relative bg-gradient-to-b from-green-900 to-black py-16">
      <div className="absolute inset-0 pointer-events-none">
        {particles.map((p, i) => (
          <div
            key={i}
            className="absolute bg-yellow-400/30 rounded-full blur-lg animate-blob"
            style={{
              top: `${p.top}%`,
              left: `${p.left}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              animationDelay: `${p.delay}s`
            }}
          />
        ))}
      </div>

      <div className="container mx-auto px-6 mb-8 text-center lg:text-left relative z-10">
        <h3 className="text-2xl font-semibold text-emerald-300 text-center">Featured Formulations</h3>
        <p className="mt-1 text-sm text-emerald-200/80 text-center">Swipe or scroll to explore performance solutions</p>
      </div>

      <div
        ref={scrollRef}
        className="flex space-x-6 overflow-x-auto px-6 scrollbar-none snap-x snap-mandatory pb-6 relative z-10"
        style={{ scrollPaddingLeft: '24px', scrollPaddingRight: '24px' }}
      >
        {formulations.map(f => {
          const gradient = f.status === 'active'
            ? `bg-gradient-to-br from-${f.color}-600/30 to-${f.color}-800/50`
            : f.status === 'low'
              ? `bg-gradient-to-br from-${f.color}-600/20 to-${f.color}-800/30`
              : 'bg-gradient-to-br from-gray-700/20 to-gray-900/30'

          const border = f.status === 'out'
            ? 'border-gray-600/20'
            : `border-${f.color}-500/30`

          return (
            <motion.div
              key={f.id}
              className={`snap-start flex-shrink-0 w-64 ${gradient} border ${border} rounded-2xl p-6 backdrop-blur-md flex flex-col justify-between hover:scale-105 transition-transform`}
              whileHover={{ y: -6 }}
            >
              <Link href={`/recipe/`}>
                <div className="flex justify-between items-start">
                  <div className="text-3xl mb-2">{f.icon}</div>
                  {f.status !== 'out' ? (
                    <span className={`h-2 w-2 rounded-full bg-${f.color}-400 animate-ping`} />
                  ) : (
                    <span className="px-2 py-0.5 text-xs bg-black/50 text-gray-300 rounded-full">Restocking</span>
                  )}
                </div>

                <div>
                  <h4 className="text-white text-lg font-bold">{f.name}</h4>
                  <p className="text-white/80 text-sm mb-3">{f.tagline}</p>
                </div>
              </Link>
            </motion.div>
          )
        })}
      </div>

      <div className="container mx-auto px-6 mt-2 relative z-10">
        <div className="h-1 bg-emerald-900/50 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-emerald-400 origin-left"
            style={{ width: progressWidth }}
          />
        </div>
      </div>

      <style jsx>{`
        .scrollbar-none { 
          -ms-overflow-style: none; 
          scrollbar-width: none; 
        }
        .scrollbar-none::-webkit-scrollbar { 
          display: none; 
        }
        .animate-blob { 
          animation: blob 8s infinite; 
        }
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
      `}</style>
    </section>
  )
}
