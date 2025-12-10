import { Rocket } from 'lucide-react';

export function Header() {
  return (
    <header className="bg-primary sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* COM-IN Logo */}
          <div className="flex items-center">
            <span className="text-primary-foreground font-bold text-2xl tracking-tight">COM</span>
            <span className="bg-accent text-accent-foreground font-bold text-2xl px-1.5 py-0.5 rounded">IN</span>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-6 text-sm text-primary-foreground/90">
          <a href="tel:+49841885110" className="hover:text-primary-foreground transition-colors">
            Hotline: +49 841 88511-0
          </a>
          <span>Mo-Fr 8-18 Uhr</span>
        </div>
      </div>
    </header>
  );
}
