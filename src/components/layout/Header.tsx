import { Zap } from 'lucide-react';

export function Header() {
  return (
    <header className="bg-card border-b border-border sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg gradient-hero flex items-center justify-center shadow-soft">
            <Zap className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">FiberNet</h1>
            <p className="text-xs text-muted-foreground">Glasfaser für alle</p>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-6 text-sm">
          <a href="tel:+4912345678" className="text-muted-foreground hover:text-foreground transition-colors">
            Hotline: +49 123 456 78
          </a>
          <span className="text-muted-foreground">Mo-Fr 8-20 Uhr</span>
        </div>
      </div>
    </header>
  );
}
