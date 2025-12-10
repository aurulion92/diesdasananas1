import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Phone, Mail, Send, CheckCircle2 } from 'lucide-react';

interface ContactFormProps {
  reason: 'limited-tariff' | 'not-connected';
  address?: {
    street: string;
    houseNumber: string;
    city: string;
  };
}

export function ContactForm({ reason, address }: ContactFormProps) {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: reason === 'limited-tariff' 
      ? `Ich interessiere mich für einen anderen Tarif als FiberBasic 100 für meine Adresse: ${address?.street} ${address?.houseNumber}, ${address?.city}`
      : `Ich möchte gerne wissen, ob meine Adresse (${address?.street} ${address?.houseNumber}, ${address?.city}) in Zukunft ausgebaut wird.`
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Hier würde normalerweise ein API-Call erfolgen
    console.log('Contact form submitted:', formData);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="bg-success/10 border border-success/20 rounded-2xl p-6 text-center animate-scale-in">
        <CheckCircle2 className="w-12 h-12 text-success mx-auto mb-4" />
        <h3 className="text-xl font-bold text-success mb-2">Vielen Dank!</h3>
        <p className="text-muted-foreground">
          Wir haben Ihre Anfrage erhalten und werden uns schnellstmöglich bei Ihnen melden.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl shadow-card p-6">
      <h3 className="text-lg font-bold text-primary mb-4">Kontaktformular</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="name">Name *</Label>
          <Input
            id="name"
            required
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Max Mustermann"
            className="mt-1"
          />
        </div>
        
        <div>
          <Label htmlFor="email">E-Mail *</Label>
          <Input
            id="email"
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            placeholder="max@beispiel.de"
            className="mt-1"
          />
        </div>
        
        <div>
          <Label htmlFor="phone">Telefon</Label>
          <Input
            id="phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
            placeholder="+49 841 123456"
            className="mt-1"
          />
        </div>
        
        <div>
          <Label htmlFor="message">Nachricht</Label>
          <Textarea
            id="message"
            value={formData.message}
            onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
            rows={4}
            className="mt-1"
          />
        </div>
        
        <Button type="submit" variant="orange" className="w-full">
          <Send className="w-4 h-4" />
          Anfrage senden
        </Button>
      </form>
      
      <div className="mt-6 pt-6 border-t border-border">
        <p className="text-sm text-muted-foreground mb-3">Oder kontaktieren Sie uns direkt:</p>
        <div className="flex flex-col sm:flex-row gap-4">
          <a 
            href="tel:+49841885110" 
            className="flex items-center gap-2 text-primary font-semibold hover:underline"
          >
            <Phone className="w-4 h-4" />
            +49 841 88511-0
          </a>
          <a 
            href="mailto:info@comin.de" 
            className="flex items-center gap-2 text-primary font-semibold hover:underline"
          >
            <Mail className="w-4 h-4" />
            info@comin.de
          </a>
        </div>
      </div>
    </div>
  );
}
