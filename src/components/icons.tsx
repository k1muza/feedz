import type { SVGProps } from 'react';

export function FeedzLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
      <path d="M12 22C17.52 22 22 17.52 22 12" />
      <path d="M12 2c-1.5 3-2.5 6.5-2.5 10" />
      <path d="M12 2c1.5 3 2.5 6.5 2.5 10" />
    </svg>
  );
}
