import { OrderProvider, useOrder } from '@/context/OrderContext';
import { Header } from '@/components/layout/Header';
import { ProgressSteps } from '@/components/order/ProgressSteps';
import { CartSidebar } from '@/components/order/CartSidebar';
import { AddressCheck } from '@/components/order/AddressCheck';
import { TariffSelection } from '@/components/order/TariffSelection';
import { CustomerForm } from '@/components/order/CustomerForm';
import { OrderSummary } from '@/components/order/OrderSummary';

const steps = ['Adresse', 'Tarif', 'Daten', 'Abschluss'];

const OrderFlow = () => {
  const { step, connectionType } = useOrder();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
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
  return (
    <OrderProvider>
      <OrderFlow />
    </OrderProvider>
  );
};

export default Index;
