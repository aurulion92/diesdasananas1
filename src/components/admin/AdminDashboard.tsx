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
  FileText,
  Cog,
  Phone,
  ScrollText,
  LayoutDashboard,
  Database,
  Megaphone,
  Wrench,
  GitBranch
} from 'lucide-react';
import { BuildingsManager } from './BuildingsManager';
import { ProductsManager } from './ProductsManager';
import { OptionsManager } from './OptionsManager';
import { PromotionsManager } from './PromotionsManager';
import { CustomersManager } from './CustomersManager';
import { OrdersManager } from './OrdersManager';
import { DocumentTemplatesManager } from './DocumentTemplatesManager';
import { SettingsManager } from './SettingsManager';
import { PortingProvidersManager } from './PortingProvidersManager';
import AuditLogsManager from './AuditLogsManager';
import { DecisionTreeManager } from './DecisionTreeManager';
import { AdminUsersManager } from './AdminUsersManager';

interface AdminDashboardProps {
  user: User;
  onLogout: () => void;
}

type MainCategory = 'operativ' | 'stammdaten' | 'marketing' | 'konfiguration' | 'system';

export const AdminDashboard = ({ user, onLogout }: AdminDashboardProps) => {
  const [mainCategory, setMainCategory] = useState<MainCategory>('operativ');
  const [subTab, setSubTab] = useState<string>('orders');

  // Handle main category change and set default sub-tab
  const handleMainCategoryChange = (category: MainCategory) => {
    setMainCategory(category);
    const defaults: Record<MainCategory, string> = {
      operativ: 'orders',
      stammdaten: 'buildings',
      marketing: 'promotions',
      konfiguration: 'decision-tree',
      system: 'logs'
    };
    setSubTab(defaults[category]);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-primary-foreground shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8" />
              <div>
                <h1 className="text-xl font-bold">Admin-Panel</h1>
                <p className="text-sm opacity-80">Verwaltungsoberfläche</p>
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
      <main className="container mx-auto px-4 py-6 space-y-4">
        {/* Main Category Tabs */}
        <Tabs value={mainCategory} onValueChange={(v) => handleMainCategoryChange(v as MainCategory)}>
          <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
            <TabsTrigger value="operativ" className="flex items-center gap-2">
              <LayoutDashboard className="w-4 h-4" />
              <span className="hidden sm:inline">Operativ</span>
            </TabsTrigger>
            <TabsTrigger value="stammdaten" className="flex items-center gap-2">
              <Database className="w-4 h-4" />
              <span className="hidden sm:inline">Stammdaten</span>
            </TabsTrigger>
            <TabsTrigger value="marketing" className="flex items-center gap-2">
              <Megaphone className="w-4 h-4" />
              <span className="hidden sm:inline">Marketing</span>
            </TabsTrigger>
            <TabsTrigger value="konfiguration" className="flex items-center gap-2">
              <Wrench className="w-4 h-4" />
              <span className="hidden sm:inline">Konfiguration</span>
            </TabsTrigger>
            <TabsTrigger value="system" className="flex items-center gap-2">
              <Cog className="w-4 h-4" />
              <span className="hidden sm:inline">System</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Sub-Tabs based on Main Category */}
        {mainCategory === 'operativ' && (
          <Tabs value={subTab} onValueChange={setSubTab} className="space-y-4">
            <TabsList>
              <TabsTrigger value="orders" className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" />
                Bestellungen
              </TabsTrigger>
              <TabsTrigger value="customers" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Kunden
              </TabsTrigger>
            </TabsList>
            <TabsContent value="orders"><OrdersManager /></TabsContent>
            <TabsContent value="customers"><CustomersManager /></TabsContent>
          </Tabs>
        )}

        {mainCategory === 'stammdaten' && (
          <Tabs value={subTab} onValueChange={setSubTab} className="space-y-4">
            <TabsList>
              <TabsTrigger value="buildings" className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Gebäude
              </TabsTrigger>
              <TabsTrigger value="products" className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                Produkte
              </TabsTrigger>
              <TabsTrigger value="options" className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Optionen
              </TabsTrigger>
              <TabsTrigger value="porting" className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Portierung
              </TabsTrigger>
            </TabsList>
            <TabsContent value="buildings"><BuildingsManager /></TabsContent>
            <TabsContent value="products"><ProductsManager /></TabsContent>
            <TabsContent value="options"><OptionsManager /></TabsContent>
            <TabsContent value="porting"><PortingProvidersManager /></TabsContent>
          </Tabs>
        )}

        {mainCategory === 'marketing' && (
          <Tabs value={subTab} onValueChange={setSubTab} className="space-y-4">
            <TabsList>
              <TabsTrigger value="promotions" className="flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Aktionen
              </TabsTrigger>
            </TabsList>
            <TabsContent value="promotions"><PromotionsManager /></TabsContent>
          </Tabs>
        )}

        {mainCategory === 'konfiguration' && (
          <Tabs value={subTab} onValueChange={setSubTab} className="space-y-4">
            <TabsList>
              <TabsTrigger value="decision-tree" className="flex items-center gap-2">
                <GitBranch className="w-4 h-4" />
                Entscheidungsbaum
              </TabsTrigger>
              <TabsTrigger value="templates" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Vorlagen
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <Cog className="w-4 h-4" />
                Einstellungen
              </TabsTrigger>
            </TabsList>
            <TabsContent value="decision-tree"><DecisionTreeManager /></TabsContent>
            <TabsContent value="templates"><DocumentTemplatesManager /></TabsContent>
            <TabsContent value="settings"><SettingsManager /></TabsContent>
          </Tabs>
        )}

        {mainCategory === 'system' && (
          <Tabs value={subTab} onValueChange={setSubTab} className="space-y-4">
            <TabsList>
              <TabsTrigger value="logs" className="flex items-center gap-2">
                <ScrollText className="w-4 h-4" />
                Audit-Logs
              </TabsTrigger>
              <TabsTrigger value="users" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Benutzer
              </TabsTrigger>
            </TabsList>
            <TabsContent value="logs"><AuditLogsManager /></TabsContent>
            <TabsContent value="users"><AdminUsersManager /></TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
};
