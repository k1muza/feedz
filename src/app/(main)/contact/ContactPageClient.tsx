

'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { FiSend, FiUser, FiMail, FiMessageSquare, FiCheckCircle, FiAlertCircle, FiPhone } from 'react-icons/fi';
import SecondaryHero from '@/components/common/SecondaryHero';
import { saveContactInquiry } from '@/app/actions';


export default function ContactPageClient() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
    phone: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState<'success' | 'error' | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ): void => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmissionStatus(null);
    
    const result = await saveContactInquiry(formData);

    setIsSubmitting(false);

    if (result.success) {
      setSubmissionStatus('success');
      setFormData({ name: '', email: '', message: '', phone: '' });
    } else {
      setSubmissionStatus('error');
    }
  };

  return (
    <>
      <SecondaryHero
        title="Let's Connect"
        subtitle="Our team is ready to help with your livestock nutrition needs. Reach out and we'll respond within 24 hours."
      />
      <main className="bg-gradient-to-b from-green-50 to-white py-16 px-4">
        <div className="container mx-auto max-w-6xl">

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.form
              onSubmit={handleSubmit}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-white rounded-2xl shadow-xl p-8 lg:p-10"
            >
              <div className="space-y-6">
                <div className="space-y-1">
                  <label htmlFor="name" className="text-sm font-medium text-gray-700 flex items-center">
                    <FiUser className="mr-2 text-green-600" />
                    Your Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    autoComplete="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                    placeholder="John Dube"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="email" className="text-sm font-medium text-gray-700 flex items-center">
                    <FiMail className="mr-2 text-green-600" />
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    autoComplete="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                    placeholder="john@farm.co.zw"
                    required
                  />
                </div>
                 <div className="space-y-1">
                  <label htmlFor="phone" className="text-sm font-medium text-gray-700 flex items-center">
                    <FiPhone className="mr-2 text-green-600" />
                    Phone Number (Optional)
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    autoComplete="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                    placeholder="+263 77 123 4567"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="message" className="text-sm font-medium text-gray-700 flex items-center">
                    <FiMessageSquare className="mr-2 text-green-600" />
                    Your Message
                  </label>
                  <textarea
                    id="message"
                    value={formData.message}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all min-h-[150px]"
                    placeholder="How can we help you today?"
                    required
                  />
                </div>

                {submissionStatus === 'success' && (
                  <div className="flex items-center gap-3 p-3 bg-green-50 text-green-700 border border-green-200 rounded-lg">
                    <FiCheckCircle className="w-5 h-5" />
                    <p>Thank you for your message! We'll be in touch soon.</p>
                  </div>
                )}
                 {submissionStatus === 'error' && (
                  <div className="flex items-center gap-3 p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg">
                    <FiAlertCircle className="w-5 h-5" />
                    <p>Something went wrong. Please try again later.</p>
                  </div>
                )}

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white font-medium py-3 px-6 rounded-lg flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FiSend />
                  <span>{isSubmitting ? 'Sending...' : 'Send Message'}</span>
                </motion.button>
              </div>
            </motion.form>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="space-y-8"
            >
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-8 border border-gray-100">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Other Ways to Reach Us</h2>

                <div className="space-y-4">
                  <div className="flex items-start">
                    <div className="bg-green-100 p-3 rounded-full mr-4">
                      <FiMail className="text-green-600 text-xl" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-700">Email</h3>
                      <a href="mailto:support@feedsport.co.zw" className="text-green-600 hover:underline">
                        support@feedsport.co.zw
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <div className="bg-green-100 p-3 rounded-full mr-4">
                      <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20 22.621l-3.521-6.795c-.008.004-1.974.97-2.064 1.011-2.24 1.086-6.799-7.82-4.609-8.994l2.083-1.026-3.493-6.817-2.106 1.039c-7.202 3.755 4.233 25.982 11.6 22.615.121-.055 2.102-1.029 2.11-1.033z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-700">Phone</h3>
                      <a href="tel:+263774684534" className="text-green-600 hover:underline">
                        +263 77 468 4534
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <div className="bg-green-100 p-3 rounded-full mr-4">
                      <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-700">Location</h3>
                      <address className="not-italic text-gray-600">2 Off William Pollet Drive, Borrowdale, Harare, Zimbabwe</address>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-8 border border-gray-100">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Business Hours</h2>
                <ul className="space-y-2">
                  <li className="flex justify-between">
                    <span className="text-gray-600">Monday - Friday</span>
                    <span className="font-medium">8:00 AM - 5:00 PM</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-gray-600">Saturday</span>
                    <span className="font-medium">9:00 AM - 1:00 PM</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-gray-600">Sunday</span>
                    <span className="font-medium">Closed</span>
                  </li>
                </ul>
              </div>
            </motion.div>
          </div>
        </div>
      </main>
    </>
  );
}
