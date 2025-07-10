'use client';

import Link from 'next/link';
import { FaEnvelope, FaFacebookF, FaGlobeAmericas, FaInstagram, FaMapMarkerAlt, FaTwitter } from 'react-icons/fa';

export default function TopBar() {
  return (
    <div className="bg-gray-100 py-2 hidden lg:block">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center">
          <div className="flex space-x-4">
            <div className="border-r border-green-600 pr-3">
              <Link href="/locations" className="flex text-gray-600 text-sm hover:text-green-600">
                <FaMapMarkerAlt className="text-green-600 mr-2" />
                Find A Distributor
              </Link>
            </div>
            <div className="pl-3">
              <Link href="mailto:sales@feedsport.com" className="flex text-gray-600 text-sm hover:text-green-600">
                <FaEnvelope className="text-green-600 mr-2" />
                sales@feedsport.co.zw
              </Link>
            </div>
          </div>
          <div className="flex items-center">
            <div className="flex space-x-3 border-r border-green-600 pr-3">
              <Link href="https://www.facebook.com/share/16PXsk9S5S/" className="text-green-600 hover:text-green-800">
                <FaFacebookF />
              </Link>
              <Link href="#" className="text-green-600 hover:text-green-800">
                <FaTwitter />
              </Link>
              <Link href="#" className="text-green-600 hover:text-green-800">
                <FaInstagram />
              </Link>
            </div>
            <div className="dropdown ml-3">
              <button className="flex items-center text-gray-700 text-sm">
                <FaGlobeAmericas className="text-green-600 mr-2" /> English
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}