// components/layout/Footer.tsx
import Link from 'next/link';
import {
    FaEnvelope,
    FaFacebookF,
    FaInstagram,
    FaLinkedinIn,
    FaRegClock,
    FaXTwitter,
    FaWhatsapp
} from 'react-icons/fa6';
import { FaMapMarkerAlt, FaPhoneAlt } from 'react-icons/fa';
import { FaShieldHalved, FaWheatAwn } from 'react-icons/fa6';
import { ProductCategory } from '@/types';

export default function Footer({ productCategories }: { productCategories: ProductCategory[] }) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-white">
      {/* Main Footer Content */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <div className="flex items-center mb-6">
              <FaWheatAwn className="text-green-500 text-3xl mr-3" />
              <span className="text-2xl font-bold">FeedSport</span>
            </div>
            <p className="text-gray-400 mb-6">
              Pioneering animal nutrition solutions through science and innovation. 
              Empowering farmers with premium feed ingredients since 2010.
            </p>
            
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-300 mb-3">CERTIFICATIONS</h4>
              <div className="flex items-center gap-3">
                <FaShieldHalved className="text-green-500 text-xl" />
                <span className="text-sm text-gray-400">ISO 9001:2015 Certified</span>
              </div>
            </div>

            <div className="flex space-x-4">
              {[
                { icon: FaFacebookF, url: "#" },
                { icon: FaXTwitter, url: "#" },
                { icon: FaInstagram, url: "#" },
                { icon: FaLinkedinIn, url: "#" }
              ].map((social, index) => (
                <Link
                  key={index}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-green-500 transition-colors duration-300"
                  aria-label={`Follow us on ${social.icon.name.replace('Fa', '')}`}
                >
                  <social.icon className="text-xl" />
                </Link>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-bold mb-6 text-white">Quick Links</h4>
            <ul className="space-y-3">
              {[
                { name: "Home", href: "/" },
                { name: "About Us", href: "/about" },
                { name: "Products", href: "/products" },
                { name: "Formulations", href: "/formulations" },
                { name: "Blog", href: "/blog" },
                { name: "Contact", href: "/contact" }
              ].map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-gray-400 hover:text-green-500 transition-colors duration-300"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Products */}
          <div>
            <h4 className="text-lg font-bold mb-6 text-white">Product Categories</h4>
            <ul className="space-y-3">
              {productCategories.slice(0, 5).map((category) => (
                <li key={category.id}>
                  <Link
                    href={`/products/categories/${category.slug}`}
                    className="text-gray-400 hover:text-green-500 transition-colors duration-300 capitalize"
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="text-lg font-bold mb-6 text-white">Contact Us</h4>
            <ul className="space-y-4">
              <li className="flex items-start">
                <FaMapMarkerAlt className="text-green-500 mt-1 mr-3 flex-shrink-0" />
                <span className="text-gray-400">2 William Pollet Rd, Borrowdale, Harare, Zimbabwe</span>
              </li>
              <li className="flex items-center">
                <FaPhoneAlt className="text-green-500 mr-3 flex-shrink-0" />
                <div>
                  <a 
                    href="tel:+263774684534" 
                    className="text-gray-400 hover:text-green-500 transition-colors duration-300 block"
                  >
                    +263 77 468 4534
                  </a>
                  <a 
                    href="https://wa.me/263774684534" 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-green-500 flex items-center mt-1"
                  >
                    <FaWhatsapp className="mr-1" /> Chat on WhatsApp
                  </a>
                </div>
              </li>
              <li className="flex items-center">
                <FaEnvelope className="text-green-500 mr-3 flex-shrink-0" />
                <a 
                  href="mailto:sales@feedsport.co.zw" 
                  className="text-gray-400 hover:text-green-500 transition-colors duration-300"
                >
                  sales@feedsport.co.zw
                </a>
              </li>
              <li className="flex items-center">
                <FaRegClock className="text-green-500 mr-3 flex-shrink-0" />
                <span className="text-gray-400">Mon-Fri: 8AM - 5PM</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Footer Bottom */}
      <div className="border-t border-gray-800 py-6">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-500 text-sm mb-4 md:mb-0">
              &copy; {currentYear} FeedSport International. All rights reserved.
            </p>
            <div className="flex flex-wrap justify-center gap-4 md:gap-6">
              <Link
                href="/policies"
                className="text-gray-500 hover:text-green-500 text-sm transition-colors duration-300"
              >
                Company Policies
              </Link>
              <Link
                href="/terms-of-service"
                className="text-gray-500 hover:text-green-500 text-sm transition-colors duration-300"
              >
                Terms of Service
              </Link>
              <Link
                href="/sitemap.xml"
                className="text-gray-500 hover:text-green-500 text-sm transition-colors duration-300"
              >
                Sitemap
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
