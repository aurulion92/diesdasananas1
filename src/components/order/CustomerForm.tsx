import { useState } from 'react';
import { useOrder } from '@/context/OrderContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, ArrowRight, ArrowLeft } from 'lucide-react';

export function CustomerForm() {
  const { setCustomerData, setStep } = useOrder();
  const [formData, setFormData] = useState({
    salutation: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    birthDate: '',
  });

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const isValid = formData.salutation && formData.firstName && formData.lastName && 
                  formData.email && formData.phone && formData.birthDate;

  const handleContinue = () => {
    if (isValid) {
      setCustomerData(formData);
      setStep(4);
    }
  };

  return (
    <div className="max-w-xl mx-auto animate-slide-up">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full gradient-hero flex items-center justify-center">
          <User className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Ihre persönlichen Daten</h2>
          <p className="text-sm text-muted-foreground">
            Für Ihren Vertrag benötigen wir folgende Angaben
          </p>
        </div>
      </div>

      <div className="bg-card rounded-xl shadow-card p-6 space-y-6">
        <div>
          <Label htmlFor="salutation">Anrede</Label>
          <Select onValueChange={(value) => handleChange('salutation', value)}>
            <SelectTrigger className="mt-1.5">
              <SelectValue placeholder="Bitte wählen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="herr">Herr</SelectItem>
              <SelectItem value="frau">Frau</SelectItem>
              <SelectItem value="divers">Divers</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="firstName">Vorname</Label>
            <Input
              id="firstName"
              placeholder="Max"
              value={formData.firstName}
              onChange={(e) => handleChange('firstName', e.target.value)}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="lastName">Nachname</Label>
            <Input
              id="lastName"
              placeholder="Mustermann"
              value={formData.lastName}
              onChange={(e) => handleChange('lastName', e.target.value)}
              className="mt-1.5"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="birthDate">Geburtsdatum</Label>
          <Input
            id="birthDate"
            type="date"
            value={formData.birthDate}
            onChange={(e) => handleChange('birthDate', e.target.value)}
            className="mt-1.5"
          />
        </div>

        <div>
          <Label htmlFor="email">E-Mail-Adresse</Label>
          <Input
            id="email"
            type="email"
            placeholder="max.mustermann@email.de"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            className="mt-1.5"
          />
        </div>

        <div>
          <Label htmlFor="phone">Telefonnummer</Label>
          <Input
            id="phone"
            type="tel"
            placeholder="+49 123 456789"
            value={formData.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            className="mt-1.5"
          />
        </div>

        <div className="flex gap-3 pt-4">
          <Button 
            variant="outline" 
            onClick={() => setStep(2)}
            className="flex-1"
          >
            <ArrowLeft className="w-4 h-4" />
            Zurück
          </Button>
          <Button 
            onClick={handleContinue}
            disabled={!isValid}
            className="flex-1"
            variant="hero"
          >
            Weiter zur Übersicht
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
