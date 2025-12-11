import { useState } from 'react';
import { OrderProvider, useOrder } from '@/context/OrderContext';
import { Header } from '@/components/layout/Header';
import { ProgressSteps } from '@/components/order/ProgressSteps';
import { CartSidebar } from '@/components/order/CartSidebar';
import { AddressCheck } from '@/components/order/AddressCheck';
import { TariffSelection } from '@/components/order/TariffSelection';
import { CustomerForm } from '@/components/order/CustomerForm';
import { OrderSummary } from '@/components/order/OrderSummary';
import { ExistingCustomerPortal } from '@/components/order/ExistingCustomerPortal';
import { GustavChatbot } from '@/components/chat/GustavChatbot';
import { Button } from '@/components/ui/button';
import { User, Rocket } from 'lucide-react';

const steps = ['Adresse', 'Tarif', 'Daten', 'Abschluss'];

const LandingChoice = ({ onNewCustomer, onExistingCustomer, onLogoClick }: { onNewCustomer: () => void; onExistingCustomer: () => void; onLogoClick: () => void }) => {
  return (
    <div className="min-h-screen bg-background">
      <Header onLogoClick={onLogoClick} />
      <main className="container mx-auto px-4 py-6 pb-28">
        <div className="max-w-2xl mx-auto text-center">
          <div className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-4 md:mb-6 flex items-center justify-center">
            <Rocket className="w-12 h-12 md:w-16 md:h-16 text-primary" strokeWidth={1.5} />
          </div>
          <h1 className="text-2xl md:text-4xl font-bold text-primary mb-2 md:mb-3">
            Willkommen bei COM-IN
          </h1>
          <p className="text-muted-foreground text-base md:text-lg mb-6 md:mb-10">
            Glasfaser-Internet für Ingolstadt
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <button
              onClick={onNewCustomer}
              className="bg-card rounded-2xl shadow-card p-6 md:p-8 hover:shadow-lg transition-all border-2 border-transparent hover:border-accent/30 active:scale-[0.98] text-left group"
            >
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-accent/10 flex items-center justify-center mb-3 md:mb-4 group-hover:bg-accent/20 transition-colors">
                <Rocket className="w-6 h-6 md:w-7 md:h-7 text-accent" />
              </div>
              <h2 className="text-lg md:text-xl font-bold text-primary mb-1.5 md:mb-2">Neukunde</h2>
              <p className="text-sm md:text-base text-muted-foreground">
                Jetzt Verfügbarkeit prüfen und einen neuen Anschluss bestellen
              </p>
            </button>

            <button
              onClick={onExistingCustomer}
              className="bg-card rounded-2xl shadow-card p-6 md:p-8 hover:shadow-lg transition-all border-2 border-transparent hover:border-primary/30 active:scale-[0.98] text-left group"
            >
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-primary/10 flex items-center justify-center mb-3 md:mb-4 group-hover:bg-primary/20 transition-colors">
                <User className="w-6 h-6 md:w-7 md:h-7 text-primary" />
              </div>
              <h2 className="text-lg md:text-xl font-bold text-primary mb-1.5 md:mb-2">Bestandskunde?</h2>
              <p className="text-sm md:text-base text-muted-foreground">
                Vertragsänderung, Umzug, Daten ändern oder Tarif-Upgrade
              </p>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

interface OrderFlowProps {
  onBackToStart: () => void;
}

const OrderFlow = ({ onBackToStart }: OrderFlowProps) => {
  const { step, connectionType } = useOrder();

  return (
    <div className="min-h-screen bg-background">
      <Header onLogoClick={onBackToStart} />
      
      <main className="container mx-auto px-4 py-8">
        <ProgressSteps currentStep={step} steps={steps} />
        
        <div className="mt-8 grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {step === 1 && <AddressCheck />}
            {step === 2 && connectionType && connectionType !== 'not-connected' && <TariffSelection />}
            {step === 3 && <CustomerForm />}
            {step === 4 && <OrderSummary />}
          </div>
          
          <div className="hidden lg:block">
            <CartSidebar />
          </div>
        </div>
      </main>
    </div>
  );
};

const Index = () => {
  const [showExistingCustomer, setShowExistingCustomer] = useState(false);
  const [showNewCustomer, setShowNewCustomer] = useState(false);

  const handleBackToStart = () => {
    setShowNewCustomer(false);
    setShowExistingCustomer(false);
  };

  return (
    <>
      {!showNewCustomer && !showExistingCustomer && (
        <LandingChoice 
          onNewCustomer={() => setShowNewCustomer(true)} 
          onExistingCustomer={() => setShowExistingCustomer(true)}
          onLogoClick={handleBackToStart}
        />
      )}
      {showExistingCustomer && (
        <div className="min-h-screen bg-background">
          <Header onLogoClick={handleBackToStart} />
          <main className="container mx-auto px-4 py-8">
            <ExistingCustomerPortal onClose={handleBackToStart} />
          </main>
        </div>
      )}
      {showNewCustomer && (
        <OrderProvider>
          <OrderFlow onBackToStart={handleBackToStart} />
        </OrderProvider>
      )}
      <GustavChatbot />
    </>
  );
};

export default Index;
