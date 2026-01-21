import { PasswordGate } from '@/components/PasswordGate';

const Index = () => {
  return (
    <PasswordGate 
      lazyComponent={() => import('@/components/order/MainOrderFlow')}
    />
  );
};

export default Index;
