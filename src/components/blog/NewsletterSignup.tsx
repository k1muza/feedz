
'use client';

import { useState } from 'react';
import { FiMail } from 'react-icons/fi';
import { saveNewsletterSubscription } from '@/app/actions';

export default function NewsletterSignup() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setIsSuccess(false);
    setError(null);

    const result = await saveNewsletterSubscription(email);
    
    setIsSubmitting(false);

    if (result.success) {
      setIsSuccess(true);
      setEmail('');
      setTimeout(() => setIsSuccess(false), 5000);
    } else {
      setError(result.error || 'An unexpected error occurred.');
      setTimeout(() => setError(null), 5000);
    }
  };

  return (
    <div className="bg-green-50 border border-green-100 rounded-xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-green-100 p-2 rounded-full">
          <FiMail className="text-green-600 text-xl" />
        </div>
        <h3 className="font-bold text-lg">Stay Updated</h3>
      </div>
      
      <p className="text-gray-600 mb-4">
        Get the latest articles and industry insights delivered to your inbox
      </p>
      
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label htmlFor="newsletter-email" className="sr-only">Email address</label>
          <input
            type="email"
            id="newsletter-email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="Your email address"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>
        
        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
            isSubmitting
              ? 'bg-green-300 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700 text-white'
          }`}
        >
          {isSubmitting ? 'Subscribing...' : 'Subscribe'}
        </button>
        
        {isSuccess && (
          <div className="p-3 bg-green-100 text-green-700 rounded-lg text-sm">
            Thank you for subscribing!
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}
      </form>
      
      <p className="text-xs text-gray-500 mt-3">
        We respect your privacy. Unsubscribe at any time.
      </p>
    </div>
  );
}
