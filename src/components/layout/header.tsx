'use client';

import Link from 'next/link';
import { FeedzLogo } from '@/components/icons';
import { Button } from '@/components/ui/button';

export function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur-sm">
      <div className="container mx-auto flex h-16 items-center space-x-4 px-4 sm:justify-between sm:space-x-0">
        <div className="flex gap-2 items-center">
          <Link href="/" className="flex items-center space-x-2">
            <FeedzLogo className="h-8 w-8 text-primary" />
            <span className="font-bold text-xl font-headline tracking-tighter text-primary-foreground/90">
              Feedz
            </span>
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-4">
          <nav className="flex items-center space-x-1">
            <Button variant="ghost" asChild>
              <Link href="#">Ingredients</Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link href="#">About</Link>
            </Button>
            <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
              Get Started
            </Button>
          </nav>
        </div>
      </div>
    </header>
  );
}
