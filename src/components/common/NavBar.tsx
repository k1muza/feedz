
'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { FaBars, FaCommentDots, FaPhoneAlt, FaSearch, FaTimes } from 'react-icons/fa'
import { FaWheatAwn } from 'react-icons/fa6'
import { motion, AnimatePresence } from 'framer-motion'
import { search } from '@/app/actions'
import { Product, BlogPost } from '@/types'
import { Loader2, Package, FileText } from 'lucide-react'
import Image from 'next/image'

const links = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/products', label: 'Products' },
  { href: '/formulations', label: 'Formulations' },
  { href: '/blog', label: 'Blog' },
  { href: '/contact', label: 'Contact' },
]

type SearchResults = {
  products: Product[];
  blogPosts: BlogPost[];
}

// Debounce hook
function useDebounce(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}


export default function NavBar() {
  const pathname = usePathname()
  const router = useRouter()
  const [searchOpen, setSearchOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [scrolled, setScrolled] = useState(false)
  const [suggestions, setSuggestions] = useState<SearchResults | null>(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const navRef = useRef<HTMLElement>(null)
  
  const debouncedQuery = useDebounce(query, 300);


  // Close search on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])
  
  // Fetch suggestions when debounced query changes
  useEffect(() => {
    if (debouncedQuery.length > 1) {
      const fetchSuggestions = async () => {
        setLoadingSuggestions(true);
        const results = await search(debouncedQuery);
        setSuggestions({
            products: results.products.slice(0, 5),
            blogPosts: results.blogPosts.slice(0, 5),
        });
        setLoadingSuggestions(false);
      };
      fetchSuggestions();
    } else {
      setSuggestions(null);
    }
  }, [debouncedQuery]);


  // Focus on search open
  useEffect(() => {
    if (searchOpen) inputRef.current?.focus()
  }, [searchOpen])

  // Sticky header effect
  useEffect(() => {
    const onScroll = () => {
      const isScrolled = window.scrollY > 10
      setScrolled(isScrolled)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query)}`);
      setSearchOpen(false);
      setQuery('');
    }
  };
  
  const handleSuggestionClick = () => {
      setSearchOpen(false);
      setQuery('');
  }

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <nav
      ref={navRef}
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled
          ? 'bg-green-950 backdrop-blur-sm border-b border-gray-800'
          : 'bg-transparent'
        }`}
    >
      <div className="mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center space-x-2 group"
          aria-label="Home"
        >
          <motion.div
            whileHover={{ rotate: 15 }}
            transition={{ type: 'spring', stiffness: 400 }}
          >
            <FaWheatAwn className="text-green-400 text-2xl" />
          </motion.div>
          <motion.span
            className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-green-600"
            whileHover={{ scale: 1.05 }}
            transition={{ type: 'spring', stiffness: 400 }}
          >
            FeedSport
          </motion.span>
        </Link>

        {/* Desktop links */}
        <div className="hidden lg:flex space-x-1">
          {links.map(link => (
            <motion.div key={link.href} className="relative" whileHover={{ y: -2 }}>
              <Link
                href={link.href}
                className={`font-medium px-4 py-2 transition-colors ${isActive(link.href)
                    ? 'text-green-400'
                    : 'text-gray-300 hover:text-green-400'
                  }`}
              >
                {link.label}
                {isActive(link.href) && (
                  <motion.div
                    layoutId="underline"
                    className="absolute bottom-0 left-4 right-4 h-0.5 bg-green-400 rounded-full"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          {/* Search */}
          <div ref={searchRef} className="relative">
            <motion.button
              onClick={() => setSearchOpen(o => !o)}
              className="p-2 rounded-full hover:bg-gray-800 transition-colors"
              aria-label="Search"
              whileTap={{ scale: 0.9 }}
            >
              {searchOpen ? (
                <FaTimes className="text-gray-300 hover:text-green-400" />
              ) : (
                <FaSearch className="text-gray-300 hover:text-green-400" />
              )}
            </motion.button>

            <AnimatePresence>
              {searchOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className="absolute right-0 mt-2 w-80 md:w-96 bg-gray-800 rounded-lg shadow-xl border border-gray-700"
                >
                  <form onSubmit={handleSearchSubmit}>
                    <div className="relative">
                      <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Search products, resources..."
                        className="w-full px-4 py-3 pr-10 text-gray-200 bg-gray-700 focus:outline-none placeholder-gray-400 rounded-t-lg"
                      />
                       <button
                        type="submit"
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-green-400"
                      >
                         {loadingSuggestions ? <Loader2 className="animate-spin w-4 h-4"/> : <FaSearch />}
                      </button>
                    </div>
                  </form>
                  {suggestions && (
                    <div className="p-2 max-h-96 overflow-y-auto">
                        {suggestions.products.length > 0 && (
                            <div className="mb-2">
                                <h4 className="px-2 py-1 text-xs font-semibold text-gray-400 uppercase">Products</h4>
                                {suggestions.products.map(p => (
                                    <Link key={p.id} href={`/products/${p.id}`} onClick={handleSuggestionClick} className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-700">
                                        <Image src={p.images[0]} alt={p.ingredient?.name || ''} width={32} height={32} className="rounded object-cover bg-gray-600"/>
                                        <span className="text-sm text-gray-200">{p.ingredient?.name}</span>
                                    </Link>
                                ))}
                            </div>
                        )}
                        {suggestions.blogPosts.length > 0 && (
                             <div>
                                <h4 className="px-2 py-1 text-xs font-semibold text-gray-400 uppercase">Blog</h4>
                                {suggestions.blogPosts.map(b => (
                                    <Link key={b.id} href={`/blog/${b.slug}`} onClick={handleSuggestionClick} className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-700">
                                        <FileText className="w-6 h-6 text-gray-500 flex-shrink-0"/>
                                        <span className="text-sm text-gray-200">{b.title}</span>
                                    </Link>
                                ))}
                            </div>
                        )}
                        {(suggestions.products.length > 0 || suggestions.blogPosts.length > 0) && (
                            <Link href={`/search?q=${encodeURIComponent(query)}`} onClick={handleSuggestionClick} className="block text-center p-2 mt-2 text-sm text-green-400 hover:bg-gray-700 rounded-md">
                                View all results for "{query}"
                            </Link>
                        )}
                        {(suggestions.products.length === 0 && suggestions.blogPosts.length === 0) && (
                             <p className="p-4 text-center text-sm text-gray-400">No suggestions found.</p>
                        )}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Contact */}
          <motion.div
            className="flex items-center space-x-2"
            whileHover={{ scale: 1.02 }}
          >
            <a
              href="https://wa.me/263774684534"
              target="_blank"
              className="relative p-3 bg-gray-800 rounded-full hover:bg-gray-700 transition-colors group"
              aria-label="Contact"
            >
              <FaPhoneAlt className="text-green-400 text-xl group-hover:rotate-12 transition-transform" />
              <motion.span
                className="absolute -top-1 -right-1 text-green-400"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                <FaCommentDots size={14} />
              </motion.span>
            </a>
            <div className="hidden lg:block text-left">
              <p className="text-xs text-gray-400">Expert Support</p>
              <Link
                href="tel:+263774684534"
                className="font-medium text-gray-300 hover:text-green-400 text-sm transition-colors"
              >
                +263 77 468 4534
              </Link>
            </div>
          </motion.div>

          {/* CTA */}
          <motion.div
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <Link
              href="https://wa.me/263774684534"
              target="_blank"
              className="hidden sm:inline-flex items-center px-5 py-2.5 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all"
            >
              Get Quote
            </Link>
          </motion.div>

          {/* Mobile toggle */}
          <motion.button
            onClick={() => setMobileOpen(o => !o)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-800 transition-colors"
            aria-label="Menu"
            whileTap={{ scale: 0.9 }}
          >
            {mobileOpen ? (
              <FaTimes className="text-gray-300 hover:text-green-400 text-xl" />
            ) : (
              <FaBars className="text-gray-300 hover:text-green-400 text-xl" />
            )}
          </motion.button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', bounce: 0.1 }}
            className="lg:hidden bg-gray-900 overflow-hidden shadow-inner"
          >
            <div className="px-4 py-3 space-y-2">
              {links.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`block px-4 py-3 rounded-lg font-medium transition-colors ${isActive(link.href)
                      ? 'bg-gray-800 text-green-400'
                      : 'text-gray-300 hover:bg-gray-800'
                    }`}
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="https://wa.me/263774684534"
                target="_blank"
                className="block mt-2 px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg text-center shadow-md hover:shadow-lg transition-all"
                onClick={() => setMobileOpen(false)}
              >
                Get Quote
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}
