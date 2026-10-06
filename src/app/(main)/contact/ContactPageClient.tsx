'use client';

import { useState } from 'react';
import {
  AlertCircle,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Send,
} from 'lucide-react';

import { saveContactInquiry } from '@/app/actions';
import SecondaryHero from '@/components/common/SecondaryHero';

const contactMethods = [
  {
    label: 'WhatsApp',
    value: '+263 77 468 4534',
    href: 'https://wa.me/263774684534',
    icon: MessageCircle,
    external: true,
  },
  {
    label: 'Call',
    value: '+263 77 468 4534',
    href: 'tel:+263774684534',
    icon: Phone,
    external: false,
  },
  {
    label: 'Email',
    value: 'sales@feedsport.co.zw',
    href: 'mailto:sales@feedsport.co.zw',
    icon: Mail,
    external: false,
  },
] as const;

const fieldClassName =
  'min-h-[50px] w-full rounded-[4px] border border-[#bdb7a9] bg-[#fbfaf6] px-3.5 text-[15px] text-[#191b18] outline-none transition-colors placeholder:text-[#7a7b72] hover:border-[#8f8b80] focus:border-[#1d3a2a] focus:ring-1 focus:ring-[#1d3a2a]';

export default function ContactPageClient() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
    phone: '',
    company: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState<'success' | 'error' | null>(null);
  const [whatsappUrl, setWhatsappUrl] = useState('');

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ): void => {
    const { id, value } = event.target;
    setFormData((current) => ({ ...current, [id]: value }));
  };

  const getWhatsAppFallback = () => {
    const message = [
      'FeedSport website enquiry',
      `Name: ${formData.name}`,
      `Email: ${formData.email}`,
      formData.phone ? `Phone: ${formData.phone}` : '',
      '',
      formData.message,
    ]
      .filter(Boolean)
      .join('\n');

    return `https://wa.me/263774684534?text=${encodeURIComponent(message)}`;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setSubmissionStatus(null);

    try {
      const result = await saveContactInquiry(formData);

      if (result.success) {
        setSubmissionStatus('success');
        setFormData({ name: '', email: '', message: '', phone: '', company: '' });
      } else {
        setWhatsappUrl(getWhatsAppFallback());
        setSubmissionStatus('error');
      }
    } catch {
      setWhatsappUrl(getWhatsAppFallback());
      setSubmissionStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <SecondaryHero
        badge="Contact FeedSport"
        title="Let’s talk feed."
        subtitle="Ask about an ingredient, check availability or tell us what you are feeding. You’ll speak to a team that understands both supply and animal nutrition."
      />

      <main className="bg-[#f3f0e8] text-[#191b18] [container-type:inline-size]">
        <div className="mx-auto grid w-full max-w-[1320px] gap-10 px-[clamp(20px,4cqi,40px)] py-[clamp(48px,6cqi,80px)] lg:grid-cols-[minmax(0,.82fr)_minmax(480px,1.18fr)] lg:gap-[clamp(56px,7cqi,96px)]">
          <section aria-labelledby="contact-details-heading" className="min-w-0">
            <p className="fs-label mb-2.5 mt-0 text-[#4f524b]">Direct contact</p>
            <h2 id="contact-details-heading" className="m-0 max-w-[480px] text-[clamp(28px,3.2cqi,44px)] font-bold leading-[1.04] tracking-[-.025em]">
              Start with the channel that works for you.
            </h2>
            <p className="mb-8 mt-4 max-w-[520px] text-[16px] leading-[1.6] text-[#4f524b]">
              For the quickest stock and price response, send the ingredient and quantity you need on WhatsApp.
            </p>

            <div className="border-t-2 border-[#191b18]">
              {contactMethods.map(({ label, value, href, icon: Icon, external }) => (
                <a
                  key={label}
                  href={href}
                  target={external ? '_blank' : undefined}
                  rel={external ? 'noopener noreferrer' : undefined}
                  className="group grid min-h-[78px] grid-cols-[44px_minmax(0,1fr)_24px] items-center gap-3 border-b border-[#d9d4c7] text-[#191b18] no-underline"
                >
                  <span className="grid h-10 w-10 place-items-center rounded-[4px] bg-[#e3eadf] text-[#1d3a2a]">
                    <Icon aria-hidden className="h-[19px] w-[19px]" strokeWidth={1.8} />
                  </span>
                  <span className="min-w-0">
                    <span className="fs-label block text-[#4f524b]">{label}</span>
                    <span className="mt-0.5 block truncate text-[16px] font-semibold">{value}</span>
                  </span>
                  <ArrowUpRight aria-hidden className="h-[18px] w-[18px] text-[#7a7b72] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#1d3a2a]" />
                </a>
              ))}
            </div>

            <div className="mt-9 grid gap-6 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <div>
                <div className="mb-2 flex items-center gap-2 text-[#1d3a2a]">
                  <MapPin aria-hidden className="h-[18px] w-[18px]" strokeWidth={1.8} />
                  <h3 className="fs-label m-0">Visit us</h3>
                </div>
                <address className="m-0 max-w-[260px] text-[15px] not-italic leading-[1.55] text-[#3d403a]">
                  2 William Pollet Road<br />Borrowdale, Harare<br />Zimbabwe
                </address>
              </div>

              <div>
                <div className="mb-2 flex items-center gap-2 text-[#1d3a2a]">
                  <Clock3 aria-hidden className="h-[18px] w-[18px]" strokeWidth={1.8} />
                  <h3 className="fs-label m-0">Business hours</h3>
                </div>
                <dl className="m-0 grid max-w-[280px] grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-[15px] leading-[1.55] text-[#3d403a]">
                  <dt>Mon–Fri</dt><dd className="m-0 font-semibold">08:00–17:00</dd>
                  <dt>Saturday</dt><dd className="m-0 font-semibold">09:00–13:00</dd>
                  <dt>Sunday</dt><dd className="m-0 font-semibold">Closed</dd>
                </dl>
              </div>
            </div>
          </section>

          <section aria-labelledby="enquiry-form-heading" className="self-start rounded-[6px] border border-[#d9d4c7] bg-[#fbfaf6] p-[clamp(22px,3cqi,38px)] shadow-[0_12px_34px_rgba(25,27,24,.06)]">
            <div className="mb-7 border-b border-[#d9d4c7] pb-6">
              <p className="fs-label mb-2 mt-0 text-[#1d3a2a]">Send an enquiry</p>
              <h2 id="enquiry-form-heading" className="m-0 text-[clamp(28px,3cqi,40px)] font-bold leading-[1.05] tracking-[-.025em]">
                How can we help?
              </h2>
              <p className="mb-0 mt-3 text-[15px] leading-[1.55] text-[#4f524b]">
                Share a few details and we’ll reply within one working day.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="relative grid gap-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <label htmlFor="name" className="grid gap-1.5 text-[13px] font-semibold">
                  <span>Name <span className="sr-only">(required)</span></span>
                  <input
                    type="text"
                    id="name"
                    autoComplete="name"
                    value={formData.name}
                    onChange={handleChange}
                    className={fieldClassName}
                    placeholder="Your name"
                    required
                  />
                </label>

                <label htmlFor="phone" className="grid gap-1.5 text-[13px] font-semibold">
                  <span>Phone <span className="font-normal text-[#7a7b72]">Optional</span></span>
                  <input
                    type="tel"
                    id="phone"
                    autoComplete="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    className={fieldClassName}
                    placeholder="+263 77 123 4567"
                  />
                </label>
              </div>

              <label htmlFor="email" className="grid gap-1.5 text-[13px] font-semibold">
                <span>Email address <span className="sr-only">(required)</span></span>
                <input
                  type="email"
                  id="email"
                  autoComplete="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={fieldClassName}
                  placeholder="you@farm.co.zw"
                  required
                />
              </label>

              <label htmlFor="message" className="grid gap-1.5 text-[13px] font-semibold">
                <span>What do you need? <span className="sr-only">(required)</span></span>
                <textarea
                  id="message"
                  value={formData.message}
                  onChange={handleChange}
                  className={`${fieldClassName} min-h-[158px] resize-y py-3.5 leading-[1.5]`}
                  placeholder="Tell us the ingredient, quantity, animal or nutrition question."
                  required
                />
              </label>

              <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
                <label htmlFor="company">Company</label>
                <input type="text" id="company" tabIndex={-1} autoComplete="off" value={formData.company} onChange={handleChange} />
              </div>

              {submissionStatus === 'success' && (
                <div role="status" aria-live="polite" className="flex items-start gap-3 rounded-[4px] border border-[#aac1ad] bg-[#e3eadf] p-3.5 text-[14px] leading-[1.5] text-[#1d3a2a]">
                  <CheckCircle2 aria-hidden className="mt-0.5 h-5 w-5 shrink-0" />
                  <p className="m-0">Thanks — your message is with our team. We’ll be in touch within one working day.</p>
                </div>
              )}

              {submissionStatus === 'error' && (
                <div role="alert" className="flex items-start gap-3 rounded-[4px] border border-[#d7bcae] bg-[#f6e9e2] p-3.5 text-[14px] leading-[1.5] text-[#713725]">
                  <AlertCircle aria-hidden className="mt-0.5 h-5 w-5 shrink-0" />
                  <p className="m-0">
                    We couldn’t send this from the website.{' '}
                    <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="font-bold text-[#713725] underline">
                      Continue on WhatsApp
                    </a>.
                  </p>
                </div>
              )}

              <div className="flex flex-col-reverse items-start gap-3 border-t border-[#d9d4c7] pt-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="fs-mono m-0 max-w-[260px] text-[11px] leading-[1.5] text-[#6b6d65]">
                  Your details are only used to respond to this enquiry.
                </p>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex h-[52px] w-full items-center justify-center gap-2.5 rounded-[4px] border-0 bg-[#1d3a2a] px-5 text-[15px] font-semibold text-white transition-colors hover:bg-[#2e5a40] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  <Send aria-hidden className="h-[17px] w-[17px]" />
                  {isSubmitting ? 'Sending…' : 'Send enquiry'}
                </button>
              </div>
            </form>
          </section>
        </div>
      </main>
    </>
  );
}
