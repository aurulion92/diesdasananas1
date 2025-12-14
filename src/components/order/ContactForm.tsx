import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Phone, Mail, Send, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ContactFormProps {
  reason: 'limited-tariff' | 'not-connected' | 'general';
  address?: {
    street: string;
    houseNumber: string;
    city: string;
  };
}

type ContactTopic = 'tariff-request' | 'availability' | 'product-info' | 'other';

const topicLabels: Record<ContactTopic, string> = {
  'tariff-request': 'Anderer Tarif gewünscht',
  'availability': 'Verfügbarkeitsanfrage',
  'product-info': 'Produktinformationen',
  'other': 'Sonstiges'
};

export function ContactForm({ reason, address }: ContactFormProps) {
  const [submitted, setSubmitted] = useState(false);
  
  const getDefaultTopic = (): ContactTopic => {
    if (reason === 'limited-tariff') return 'tariff-request';
    if (reason === 'not-connected') return 'availability';
    return 'other';
  };

  const getDefaultMessage = (): string => {
    if (reason === 'limited-tariff' && address) {
      return `Ich interessiere mich für einen anderen Tarif als FiberBasic 100 für meine Adresse.`;
    }
    if (reason === 'not-connected' && address) {
      return `Ich möchte gerne wissen, ob meine Adresse in Zukunft ausgebaut wird.`;
    }
    return '';
  };

  const [formData, setFormData] = useState({
    topic: getDefaultTopic(),
    desiredProduct: '',
    street: address?.street || '',
    houseNumber: address?.houseNumber || '',
    city: address?.city || '',
    name: '',
    email: '',
    phone: '',
    message: getDefaultMessage()
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
        {/* Topic Selection */}
        <div>
          <Label htmlFor="topic">Worum geht es? *</Label>
          <Select 
            value={formData.topic} 
            onValueChange={(value: ContactTopic) => setFormData(prev => ({ ...prev, topic: value }))}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Bitte wählen..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tariff-request">Anderer Tarif gewünscht</SelectItem>
              <SelectItem value="availability">Verfügbarkeitsanfrage</SelectItem>
              <SelectItem value="product-info">Produktinformationen</SelectItem>
              <SelectItem value="other">Sonstiges</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Desired Product */}
        <div>
          <Label htmlFor="desiredProduct">Wunschprodukt</Label>
          <Select 
            value={formData.desiredProduct} 
            onValueChange={(value) => setFormData(prev => ({ ...prev, desiredProduct: value }))}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Bitte wählen (optional)..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="einfach-150">einfach 150</SelectItem>
              <SelectItem value="einfach-300">einfach 300</SelectItem>
              <SelectItem value="einfach-600">einfach 600</SelectItem>
              <SelectItem value="einfach-1000">einfach 1000</SelectItem>
              <SelectItem value="fiber-basic">FiberBasic 100</SelectItem>
              <SelectItem value="tv">TV-Optionen</SelectItem>
              <SelectItem value="phone">Telefonie</SelectItem>
              <SelectItem value="other">Sonstiges</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Address Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <Label htmlFor="street">Straße</Label>
            <Input
              id="street"
              value={formData.street}
              onChange={(e) => setFormData(prev => ({ ...prev, street: e.target.value }))}
              placeholder="Musterstraße"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="houseNumber">Hausnr.</Label>
            <Input
              id="houseNumber"
              value={formData.houseNumber}
              onChange={(e) => setFormData(prev => ({ ...prev, houseNumber: e.target.value }))}
              placeholder="12"
              className="mt-1"
            />
          </div>
        </div>
        
        <div>
          <Label htmlFor="city">Ort</Label>
          <Input
            id="city"
            value={formData.city}
            onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
            placeholder="Ingolstadt"
            className="mt-1"
          />
        </div>

        {/* Personal Data */}
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
          <Label htmlFor="phone">Telefon *</Label>
          <Input
            id="phone"
            type="tel"
            required
            value={formData.phone}
            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
            placeholder="0841/123456"
            className={cn(
              "mt-1",
              formData.phone && !(formData.phone.startsWith('0') && formData.phone.includes('/')) && "border-destructive"
            )}
          />
          {formData.phone && !(formData.phone.startsWith('0') && formData.phone.includes('/')) && (
            <p className="text-sm text-destructive mt-1">Telefonnummer muss mit 0 beginnen und / enthalten</p>
          )}
        </div>
        
        <div>
          <Label htmlFor="message">Ihre Nachricht</Label>
          <Textarea
            id="message"
            value={formData.message}
            onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
            rows={4}
            placeholder="Beschreiben Sie Ihr Anliegen..."
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
            href="mailto:kontakt@comin-glasfaser.de" 
            className="flex items-center gap-2 text-primary font-semibold hover:underline"
          >
            <Mail className="w-4 h-4" />
            kontakt@comin-glasfaser.de
          </a>
        </div>
      </div>
    </div>
  );
}
