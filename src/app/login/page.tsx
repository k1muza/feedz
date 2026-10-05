import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Admin login',
  robots: { index: false, follow: false, nocache: true },
};

export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#191b18] p-5 text-[#f3f0e8]">
      <section className="w-full max-w-[520px] rounded-[8px] border border-[#45473f] bg-[#2b2d29] p-8">
        <p className="fs-label mb-3 text-[#b9b6ab]">Static site mode</p>
        <h1 className="m-0 text-[36px] font-bold tracking-[-.03em]">Admin login is offline</h1>
        <p className="my-5 text-[16px] leading-[1.55] text-[#d0cdc3]">Firebase has been removed. Product and website content are currently maintained in the hardcoded site data.</p>
        <Link href="/" className="inline-flex h-[48px] items-center rounded-[4px] bg-[#d99a2b] px-5 font-semibold text-[#191b18] no-underline">Return to FeedSport</Link>
      </section>
    </main>
  );
}
