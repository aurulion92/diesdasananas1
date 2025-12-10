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
      <div className="text-center mb-8">
        <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-accent/10 flex items-center justify-center">
          <User className="w-7 h-7 text-accent" />
        </div>
        <h2 className="text-2xl font-bold text-primary">Ihre persönlichen Daten</h2>
        <p className="text-muted-foreground mt-1">
          Für Ihren Vertrag benötigen wir folgende Angaben
        </p>
      </div>

      <div className="bg-card rounded-2xl shadow-card p-6 md:p-8 space-y-5">
        <div>
          <Label htmlFor="salutation" className="text-foreground font-medium">Anrede</Label>
          <Select onValueChange={(value) => handleChange('salutation', value)}>
            <SelectTrigger className="mt-1.5 h-12 rounded-xl">
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
            <Label htmlFor="firstName" className="text-foreground font-medium">Vorname</Label>
            <Input
              id="firstName"
              placeholder="Max"
              value={formData.firstName}
              onChange={(e) => handleChange('firstName', e.target.value)}
              className="mt-1.5 h-12 rounded-xl"
            />
          </div>
          <div>
            <Label htmlFor="lastName" className="text-foreground font-medium">Nachname</Label>
            <Input
              id="lastName"
              placeholder="Mustermann"
              value={formData.lastName}
              onChange={(e) => handleChange('lastName', e.target.value)}
              className="mt-1.5 h-12 rounded-xl"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="birthDate" className="text-foreground font-medium">Geburtsdatum</Label>
          <Input
            id="birthDate"
            type="date"
            value={formData.birthDate}
            onChange={(e) => handleChange('birthDate', e.target.value)}
            className="mt-1.5 h-12 rounded-xl"
          />
        </div>

        <div>
          <Label htmlFor="email" className="text-foreground font-medium">E-Mail-Adresse</Label>
          <Input
            id="email"
            type="email"
            placeholder="max.mustermann@email.de"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            className="mt-1.5 h-12 rounded-xl"
          />
        </div>

        <div>
          <Label htmlFor="phone" className="text-foreground font-medium">Telefonnummer</Label>
          <Input
            id="phone"
            type="tel"
            placeholder="+49 841 12345"
            value={formData.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            className="mt-1.5 h-12 rounded-xl"
          />
        </div>

        <div className="flex gap-4 pt-4">
          <Button 
            variant="outline" 
            onClick={() => setStep(2)}
            className="flex-1 h-12 rounded-full"
          >
            <ArrowLeft className="w-4 h-4" />
            Zurück
          </Button>
          <Button 
            onClick={handleContinue}
            disabled={!isValid}
            className="flex-1 h-12"
            variant="orange"
          >
            Weiter zur Übersicht
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
