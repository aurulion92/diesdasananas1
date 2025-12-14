import { useState } from 'react';
import { Building2, Server, ArrowRight, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBranding } from '@/hooks/useBranding';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

interface BusinessTypeSelectionProps {
  onSelectEasyBusiness: () => void;
  onBack: () => void;
}

export const BusinessTypeSelection = ({ 
  onSelectEasyBusiness, 
  onBack 
}: BusinessTypeSelectionProps) => {
  const { branding } = useBranding();
  const { toast } = useToast();
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactForm, setContactForm] = useState({
    company: '',
    name: '',
    email: '',
    phone: '',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    // Simulate sending contact request
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    toast({
      title: 'Anfrage gesendet',
      description: 'Wir werden uns zeitnah bei Ihnen melden.',
    });
    
    setShowContactForm(false);
    setContactForm({ company: '', name: '', email: '', phone: '', message: '' });
    setSubmitting(false);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl md:text-3xl font-bold text-primary mb-2">
          {branding.business_selection_title || 'Geschäftskunden-Lösungen'}
        </h2>
        <p className="text-muted-foreground text-base md:text-lg">
          {branding.business_selection_subtitle || 'Wählen Sie die passende Lösung für Ihr Unternehmen'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* EasyBusiness Option */}
        <div className="bg-card rounded-2xl shadow-card p-6 md:p-8 border-2 border-transparent hover:border-accent/30 transition-all">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-accent" />
            </div>
            <h3 className="text-xl font-bold text-primary">
              {branding.easy_business_title || 'Business-Internet (EasyBusiness)'}
            </h3>
          </div>
          
          <p className="text-muted-foreground mb-4 font-medium">
            {branding.easy_business_subtitle || 'Klassischer Internetanschluss für Unternehmen'}
          </p>
          
          <ul className="space-y-2 mb-6 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-accent mt-0.5">•</span>
              <span>{branding.easy_business_feature_1 || 'Asymmetrische Bandbreiten (hoher Download, angepasster Upload – ideal für Büro- & Cloud-Anwendungen)'}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent mt-0.5">•</span>
              <span>{branding.easy_business_feature_2 || 'Bessere Service-Level als bei Privatkunden'}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent mt-0.5">•</span>
              <span>{branding.easy_business_feature_3 || 'Erweiterte Telefonie-Optionen'}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent mt-0.5">•</span>
              <span>{branding.easy_business_feature_4 || 'Direkt online bestellbar'}</span>
            </li>
          </ul>

          <p className="text-xs text-muted-foreground italic mb-4">
            {branding.easy_business_ideal || '➡️ Ideal für Büros, Praxen, Handel und kleine Unternehmen mit normalem Internetbedarf'}
          </p>

          <Button 
            onClick={onSelectEasyBusiness}
            className="w-full"
            size="lg"
          >
            Jetzt online bestellen
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>

        {/* Individual Solutions Option */}
        <div className="bg-card rounded-2xl shadow-card p-6 md:p-8 border-2 border-primary/20">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Server className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-bold text-primary">
              {branding.individual_solutions_title || 'Individuelle Unternehmenslösungen'}
            </h3>
          </div>
          
          <p className="text-muted-foreground mb-4 font-medium">
            {branding.individual_solutions_subtitle || '(D-Dienste & Dark Fiber)'}
          </p>
          
          <ul className="space-y-2 mb-6 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>{branding.individual_feature_1 || 'Garantierte und symmetrische Bandbreiten'}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>{branding.individual_feature_2 || 'Feste Bandbreiten von 10 Mbit/s bis 100 Gbit/s'}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>{branding.individual_feature_3 || 'Standortvernetzung & Rechenzentrumsanbindung'}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>{branding.individual_feature_4 || 'Redundante Zuführung möglich'}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>{branding.individual_feature_5 || 'Professionelle Service-Level-Agreements'}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>{branding.individual_feature_6 || '19″ Router (z. B. Cisco, Juniper) inklusive'}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>{branding.individual_feature_7 || 'Feste, öffentliche IP-Adressen'}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>{branding.individual_feature_8 || 'Kurzfristig upgradebar'}</span>
            </li>
          </ul>

          <Button 
            onClick={() => setShowContactForm(true)}
            variant="outline"
            className="w-full border-primary text-primary hover:bg-primary hover:text-primary-foreground"
            size="lg"
          >
            <Phone className="w-4 h-4 mr-2" />
            Jetzt beraten lassen
          </Button>
          
          <p className="text-xs text-muted-foreground text-center mt-3">
            (keine Online-Bestellung, individuelle Planung)
          </p>
        </div>
      </div>

      <button 
        onClick={onBack}
        className="mt-8 mx-auto block text-muted-foreground hover:text-primary transition-colors text-sm"
      >
        ← Zurück zur Kundenauswahl
      </button>

      {/* Contact Form Dialog */}
      <Dialog open={showContactForm} onOpenChange={setShowContactForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Beratungsanfrage</DialogTitle>
            <DialogDescription>
              Wir beraten Sie gerne zu unseren individuellen Unternehmenslösungen.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleContactSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="company">Unternehmen *</Label>
              <Input
                id="company"
                value={contactForm.company}
                onChange={(e) => setContactForm({ ...contactForm, company: e.target.value })}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="name">Ansprechpartner *</Label>
              <Input
                id="name"
                value={contactForm.name}
                onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                required
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-Mail *</Label>
                <Input
                  id="email"
                  type="email"
                  value={contactForm.email}
                  onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefon *</Label>
                <Input
                  id="phone"
                  value={contactForm.phone}
                  onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="message">Ihre Anfrage</Label>
              <Textarea
                id="message"
                value={contactForm.message}
                onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                rows={4}
                placeholder="Beschreiben Sie Ihre Anforderungen..."
              />
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Wird gesendet...' : 'Anfrage senden'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
