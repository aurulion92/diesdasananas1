import { User, Briefcase } from 'lucide-react';
import { useBranding } from '@/hooks/useBranding';

interface CustomerTypeSelectionProps {
  onSelectPrivate: () => void;
  onSelectBusiness: () => void;
  onBack: () => void;
}

export const CustomerTypeSelection = ({ 
  onSelectPrivate, 
  onSelectBusiness, 
  onBack 
}: CustomerTypeSelectionProps) => {
  const { branding } = useBranding();

  return (
    <div className="max-w-2xl mx-auto text-center">
      <h2 className="text-2xl md:text-3xl font-bold text-primary mb-2">
        {branding.customer_type_title || 'Für wen bestellen Sie?'}
      </h2>
      <p className="text-muted-foreground text-base md:text-lg mb-8">
        {branding.customer_type_subtitle || 'Wählen Sie Ihre Kundenart'}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <button
          onClick={onSelectPrivate}
          className="bg-card rounded-2xl shadow-card p-6 md:p-8 hover:shadow-lg transition-all border-2 border-transparent hover:border-accent/30 active:scale-[0.98] text-left group"
        >
          <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-accent/10 flex items-center justify-center mb-3 md:mb-4 group-hover:bg-accent/20 transition-colors">
            <User className="w-6 h-6 md:w-7 md:h-7 text-accent" />
          </div>
          <h3 className="text-lg md:text-xl font-bold text-primary mb-1.5 md:mb-2">
            {branding.private_customer_title || 'Privatkunde'}
          </h3>
          <p className="text-sm md:text-base text-muted-foreground">
            {branding.private_customer_description || 'Internet für Ihr Zuhause'}
          </p>
        </button>

        <button
          onClick={onSelectBusiness}
          className="bg-card rounded-2xl shadow-card p-6 md:p-8 hover:shadow-lg transition-all border-2 border-transparent hover:border-primary/30 active:scale-[0.98] text-left group"
        >
          <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-primary/10 flex items-center justify-center mb-3 md:mb-4 group-hover:bg-primary/20 transition-colors">
            <Briefcase className="w-6 h-6 md:w-7 md:h-7 text-primary" />
          </div>
          <h3 className="text-lg md:text-xl font-bold text-primary mb-1.5 md:mb-2">
            {branding.business_customer_title || 'Geschäftskunde'}
          </h3>
          <p className="text-sm md:text-base text-muted-foreground">
            {branding.business_customer_description || 'Internet für Ihr Unternehmen'}
          </p>
        </button>
      </div>

      <button 
        onClick={onBack}
        className="mt-6 text-muted-foreground hover:text-primary transition-colors text-sm"
      >
        ← Zurück
      </button>
    </div>
  );
};
