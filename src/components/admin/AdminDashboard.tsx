import { useState } from 'react';
import { User } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Building2, 
  Package, 
  Settings, 
  Tag, 
  Users, 
  LogOut,
  Shield,
  ShoppingCart,
  FileText
} from 'lucide-react';
import { BuildingsManager } from './BuildingsManager';
import { ProductsManager } from './ProductsManager';
import { OptionsManager } from './OptionsManager';
import { PromotionsManager } from './PromotionsManager';
import { CustomersManager } from './CustomersManager';
import { OrdersManager } from './OrdersManager';
import { DocumentTemplatesManager } from './DocumentTemplatesManager';

interface AdminDashboardProps {
  user: User;
  onLogout: () => void;
}

export const AdminDashboard = ({ user, onLogout }: AdminDashboardProps) => {
  const [activeTab, setActiveTab] = useState('orders');

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-primary-foreground shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8" />
              <div>
                <h1 className="text-xl font-bold">COM-IN DevConfig</h1>
                <p className="text-sm opacity-80">Administrations-Panel</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm opacity-80 hidden sm:block">
                {user.email}
              </span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onLogout}
                className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Abmelden
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 md:grid-cols-7 lg:w-auto lg:inline-grid gap-1">
            <TabsTrigger value="orders" className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" />
              <span className="hidden sm:inline">Bestellungen</span>
            </TabsTrigger>
            <TabsTrigger value="buildings" className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              <span className="hidden sm:inline">Gebäude</span>
            </TabsTrigger>
            <TabsTrigger value="products" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              <span className="hidden sm:inline">Produkte</span>
            </TabsTrigger>
            <TabsTrigger value="options" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Optionen</span>
            </TabsTrigger>
            <TabsTrigger value="promotions" className="flex items-center gap-2">
              <Tag className="w-4 h-4" />
              <span className="hidden sm:inline">Aktionen</span>
            </TabsTrigger>
            <TabsTrigger value="customers" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Kunden</span>
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Vorlagen</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="orders">
            <OrdersManager />
          </TabsContent>

          <TabsContent value="buildings">
            <BuildingsManager />
          </TabsContent>

          <TabsContent value="products">
            <ProductsManager />
          </TabsContent>

          <TabsContent value="options">
            <OptionsManager />
          </TabsContent>

          <TabsContent value="promotions">
            <PromotionsManager />
          </TabsContent>

          <TabsContent value="customers">
            <CustomersManager />
          </TabsContent>

          <TabsContent value="documents">
            <DocumentTemplatesManager />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};
