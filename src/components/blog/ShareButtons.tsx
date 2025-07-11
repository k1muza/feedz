'use client';

import { FaFacebook, FaTwitter, FaLinkedin, FaWhatsapp, FaShareAlt } from 'react-icons/fa';

interface ShareButtonsProps {
    title: string;
    slug: string;
}

export function ShareButtons({ title, slug }: ShareButtonsProps) {
    const url = typeof window !== 'undefined' ? `${window.location.origin}/blog/${slug}` : '';

    const shareLinks = [
        {
            name: 'Facebook',
            icon: <FaFacebook />,
            url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
            color: 'text-blue-600 hover:bg-blue-100',
        },
        {
            name: 'Twitter',
            icon: <FaTwitter />,
            url: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
            color: 'text-sky-500 hover:bg-sky-100',
        },
        {
            name: 'LinkedIn',
            icon: <FaLinkedin />,
            url: `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`,
            color: 'text-blue-700 hover:bg-blue-100',
        },
        {
            name: 'WhatsApp',
            icon: <FaWhatsapp />,
            url: `https://api.whatsapp.com/send?text=${encodeURIComponent(title)}%20${encodeURIComponent(url)}`,
            color: 'text-green-500 hover:bg-green-100',
        },
    ];

    return (
        <div className="mt-12 pt-8 border-t border-gray-200">
            <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <FaShareAlt className="mr-3 text-gray-500"/>
                Share this post
            </h4>
            <div className="flex space-x-2">
                {shareLinks.map(link => (
                    <a
                        key={link.name}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Share on ${link.name}`}
                        className={`p-3 rounded-full transition-colors ${link.color}`}
                    >
                        {link.icon}
                    </a>
                ))}
            </div>
        </div>
    );
}
