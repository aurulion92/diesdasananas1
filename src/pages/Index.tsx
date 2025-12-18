import { useState } from 'react';
import { OrderProvider, useOrder, CustomerType } from '@/context/OrderContext';
import { Header } from '@/components/layout/Header';
import { ProgressSteps } from '@/components/order/ProgressSteps';
import { CartSidebar } from '@/components/order/CartSidebar';
import { AddressCheck } from '@/components/order/AddressCheck';
import { TariffSelection } from '@/components/order/TariffSelection';
import { CustomerForm } from '@/components/order/CustomerForm';
import { OrderSummary } from '@/components/order/OrderSummary';
import { ExistingCustomerPortal } from '@/components/order/ExistingCustomerPortal';
import { GustavChatbot } from '@/components/chat/GustavChatbot';
import { CustomerTypeSelection } from '@/components/order/CustomerTypeSelection';
import { BusinessTypeSelection } from '@/components/order/BusinessTypeSelection';
import { PasswordGate } from '@/components/PasswordGate';
import { User, Rocket } from 'lucide-react';
import { useBranding } from '@/hooks/useBranding';

const steps = ['Adresse', 'Tarif', 'Daten', 'Abschluss'];

type ViewState = 'landing' | 'customer-type' | 'business-type' | 'order-flow' | 'existing-customer';

const LandingChoice = ({ onNewCustomer, onExistingCustomer, onLogoClick }: { onNewCustomer: () => void; onExistingCustomer: () => void; onLogoClick: () => void }) => {
  const { branding } = useBranding();

  return (
    <div className="min-h-screen bg-background">
      <Header onLogoClick={onLogoClick} />
      <main className="container mx-auto px-4 py-6 pb-28">
        <div className="max-w-2xl mx-auto text-center">
          <div className="w-20 h-20 md:w-28 md:h-28 mx-auto mb-4 md:mb-6 flex items-center justify-center">
            <Rocket className="w-16 h-16 md:w-20 md:h-20 text-primary" strokeWidth={1.5} />
          </div>
          <h1 className="text-2xl md:text-4xl font-bold text-primary mb-2 md:mb-3">
            {branding.welcome_title}
          </h1>
          <p className="text-muted-foreground text-base md:text-lg mb-6 md:mb-10">
            {branding.welcome_subtitle}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <button
              onClick={onNewCustomer}
              className="bg-card rounded-2xl shadow-card p-6 md:p-8 hover:shadow-lg transition-all border-2 border-transparent hover:border-accent/30 active:scale-[0.98] text-left group"
            >
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-accent/10 flex items-center justify-center mb-3 md:mb-4 group-hover:bg-accent/20 transition-colors">
                <Rocket className="w-6 h-6 md:w-7 md:h-7 text-accent" />
              </div>
              <h2 className="text-lg md:text-xl font-bold text-primary mb-1.5 md:mb-2">{branding.new_customer_title}</h2>
              <p className="text-sm md:text-base text-muted-foreground">
                {branding.new_customer_description}
              </p>
            </button>

            <button
              onClick={onExistingCustomer}
              className="bg-card rounded-2xl shadow-card p-6 md:p-8 hover:shadow-lg transition-all border-2 border-transparent hover:border-primary/30 active:scale-[0.98] text-left group"
            >
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-primary/10 flex items-center justify-center mb-3 md:mb-4 group-hover:bg-primary/20 transition-colors">
                <User className="w-6 h-6 md:w-7 md:h-7 text-primary" />
              </div>
              <h2 className="text-lg md:text-xl font-bold text-primary mb-1.5 md:mb-2">{branding.existing_customer_title}</h2>
              <p className="text-sm md:text-base text-muted-foreground">
                {branding.existing_customer_description}
              </p>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

interface OrderFlowInnerProps {
  onBackToStart: () => void;
  customerType: CustomerType;
  onSwitchToKmu?: () => void;
}

const OrderFlowInner = ({ onBackToStart, customerType, onSwitchToKmu }: OrderFlowInnerProps) => {
  const { step, connectionType } = useOrder();

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Header onLogoClick={onBackToStart} />
      
      <main className="container mx-auto px-4 py-8 overflow-x-hidden">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <ProgressSteps currentStep={step} steps={steps} />

            <div className="mt-8">
              {step === 1 && <AddressCheck customerType={customerType} onSwitchToKmu={onSwitchToKmu} />}
              {step === 2 && connectionType && connectionType !== 'not-connected' && <TariffSelection customerType={customerType} />}
              {step === 3 && <CustomerForm />}
              {step === 4 && <OrderSummary />}
            </div>
          </div>
          
          <div className="hidden lg:block">
            <CartSidebar customerType={customerType} />
          </div>
        </div>
      </main>
    </div>
  );
};

interface OrderFlowProps {
  onBackToStart: () => void;
  customerType: CustomerType;
  onSwitchToKmu?: () => void;
}

const OrderFlow = ({ onBackToStart, customerType, onSwitchToKmu }: OrderFlowProps) => {
  return (
    <OrderProvider initialCustomerType={customerType}>
      <OrderFlowInner onBackToStart={onBackToStart} customerType={customerType} onSwitchToKmu={onSwitchToKmu} />
    </OrderProvider>
  );
};

const Index = () => {
  const [viewState, setViewState] = useState<ViewState>('landing');
  const [customerType, setCustomerType] = useState<CustomerType>('pk');

  const handleBackToStart = () => {
    setViewState('landing');
    setCustomerType('pk');
  };

  const handleNewCustomer = () => {
    setViewState('customer-type');
  };

  const handleSelectPrivate = () => {
    setCustomerType('pk');
    setViewState('order-flow');
  };

  const handleSelectBusiness = () => {
    setViewState('business-type');
  };

  const handleSelectEasyBusiness = () => {
    setCustomerType('kmu');
    setViewState('order-flow');
  };

  // Handler for switching from PK to KMU flow within address check
  const handleSwitchToKmuFromPk = () => {
    setCustomerType('kmu');
    // Force re-render by briefly changing state
    setViewState('landing');
    setTimeout(() => setViewState('order-flow'), 0);
  };

  return (
    <PasswordGate>
      {viewState === 'landing' && (
        <LandingChoice 
          onNewCustomer={handleNewCustomer} 
          onExistingCustomer={() => setViewState('existing-customer')}
          onLogoClick={handleBackToStart}
        />
      )}
      
      {viewState === 'customer-type' && (
        <div className="min-h-screen bg-background">
          <Header onLogoClick={handleBackToStart} />
          <main className="container mx-auto px-4 py-6 pb-28">
            <CustomerTypeSelection
              onSelectPrivate={handleSelectPrivate}
              onSelectBusiness={handleSelectBusiness}
              onBack={handleBackToStart}
            />
          </main>
        </div>
      )}

      {viewState === 'business-type' && (
        <div className="min-h-screen bg-background">
          <Header onLogoClick={handleBackToStart} />
          <main className="container mx-auto px-4 py-6 pb-28">
            <BusinessTypeSelection
              onSelectEasyBusiness={handleSelectEasyBusiness}
              onBack={() => setViewState('customer-type')}
            />
          </main>
        </div>
      )}

      {viewState === 'existing-customer' && (
        <div className="min-h-screen bg-background">
          <Header onLogoClick={handleBackToStart} />
          <main className="container mx-auto px-4 py-8">
            <ExistingCustomerPortal onClose={handleBackToStart} />
          </main>
        </div>
      )}
      
      {viewState === 'order-flow' && (
        <OrderFlow 
          onBackToStart={handleBackToStart} 
          customerType={customerType} 
          onSwitchToKmu={handleSwitchToKmuFromPk}
        />
      )}
      
      <GustavChatbot />
    </PasswordGate>
  );
};

export default Index;
