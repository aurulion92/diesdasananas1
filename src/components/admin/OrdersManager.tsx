import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  Search, 
  Loader2,
  ShoppingCart,
  RefreshCw,
  Eye,
  Archive,
  ArchiveRestore,
  FileText,
  Clock,
  TrendingUp,
  Users,
  Calendar
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format, subHours, startOfDay, endOfDay, startOfWeek, startOfMonth, startOfQuarter } from 'date-fns';
import { de } from 'date-fns/locale';
import { renderVZFFromTemplate, VZFRenderData } from '@/utils/renderVZFTemplate';
import { generateVZFContent, VZFData } from '@/utils/generateVZF';
import { openVZFAsPDF } from '@/services/pdfService';

interface Order {
  id: string;
  customer_email: string;
  customer_phone: string | null;
  customer_name: string;
  customer_first_name: string | null;
  customer_last_name: string | null;
  street: string;
  house_number: string;
  city: string;
  product_name: string;
  product_monthly_price: number;
  monthly_total: number;
  setup_fee: number;
  one_time_total: number;
  promo_code: string | null;
  contract_months: number;
  status: string;
  is_archived: boolean;
  connection_type: string | null;
  vzf_data: any;
  vzf_generated_at: string;
  created_at: string;
  selected_options: any[];
  applied_promotions: any[];
}

interface OrderStats {
  total: number;
  today: number;
  lastHour: number;
  week: number;
  month: number;
  quarter: number;
  byProduct: { name: string; count: number }[];
  totalMonthlyRevenue: number;
  totalOneTimeRevenue: number;
}

type TimePeriod = 'all' | 'quarter' | 'month' | 'week' | 'today';

export const OrdersManager = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [stats, setStats] = useState<OrderStats>({ total: 0, today: 0, lastHour: 0, week: 0, month: 0, quarter: 0, byProduct: [], totalMonthlyRevenue: 0, totalOneTimeRevenue: 0 });
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('all');
  const { toast } = useToast();

  useEffect(() => {
    fetchOrders();
    fetchStats();
  }, [showArchived]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('orders')
        .select('*')
        .eq('is_archived', showArchived)
        .order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;
      setOrders((data as Order[]) || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast({
        title: 'Fehler',
        description: 'Bestellungen konnten nicht geladen werden.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const now = new Date();
      const hourAgo = subHours(now, 1);
      const todayStart = startOfDay(now);
      const todayEnd = endOfDay(now);
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const monthStart = startOfMonth(now);
      const quarterStart = startOfQuarter(now);

      // Total orders
      const { count: total } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('is_archived', false);

      // Today's orders
      const { count: today } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('is_archived', false)
        .gte('created_at', todayStart.toISOString())
        .lte('created_at', todayEnd.toISOString());

      // Last hour orders
      const { count: lastHour } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('is_archived', false)
        .gte('created_at', hourAgo.toISOString());

      // Week orders
      const { count: week } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('is_archived', false)
        .gte('created_at', weekStart.toISOString());

      // Month orders
      const { count: month } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('is_archived', false)
        .gte('created_at', monthStart.toISOString());

      // Quarter orders
      const { count: quarter } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('is_archived', false)
        .gte('created_at', quarterStart.toISOString());

      // Orders by product and revenue calculation
      const { data: allOrdersData } = await supabase
        .from('orders')
        .select('product_name, monthly_total, one_time_total, setup_fee')
        .eq('is_archived', false);

      const productCounts: Record<string, number> = {};
      let totalMonthlyRevenue = 0;
      let totalOneTimeRevenue = 0;

      allOrdersData?.forEach(order => {
        productCounts[order.product_name] = (productCounts[order.product_name] || 0) + 1;
        totalMonthlyRevenue += order.monthly_total || 0;
        totalOneTimeRevenue += (order.one_time_total || 0) + (order.setup_fee || 0);
      });

      const byProduct = Object.entries(productCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);

      setStats({
        total: total || 0,
        today: today || 0,
        lastHour: lastHour || 0,
        week: week || 0,
        month: month || 0,
        quarter: quarter || 0,
        byProduct,
        totalMonthlyRevenue,
        totalOneTimeRevenue,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const toggleArchive = async (order: Order) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          is_archived: !order.is_archived,
          archived_at: !order.is_archived ? new Date().toISOString() : null,
        })
        .eq('id', order.id);
      
      if (error) throw error;
      
      toast({ 
        title: 'Erfolg', 
        description: order.is_archived ? 'Bestellung wiederhergestellt.' : 'Bestellung archiviert.' 
      });
      
      fetchOrders();
      fetchStats();
    } catch (error) {
      console.error('Error toggling archive:', error);
      toast({
        title: 'Fehler',
        description: 'Aktion konnte nicht durchgeführt werden.',
        variant: 'destructive',
      });
    }
  };

  const openOrderDetail = (order: Order) => {
    setSelectedOrder(order);
    setIsDetailOpen(true);
  };

  const reconstructVZF = async (order: Order) => {
    toast({
      title: "VZF wird generiert",
      description: "Bitte warten...",
    });

    try {
      // Build render data from order
      const renderData: VZFRenderData = {
        customerName: order.customer_name,
        customerFirstName: order.customer_first_name || '',
        customerLastName: order.customer_last_name || '',
        customerEmail: order.customer_email,
        customerPhone: order.customer_phone || '',
        street: order.street,
        houseNumber: order.house_number,
        city: order.city,
        tariffName: order.product_name,
        tariffPrice: `${order.product_monthly_price.toFixed(2).replace('.', ',')} €`,
        tariffDownload: order.vzf_data?.tariff?.downloadSpeed ? `${order.vzf_data.tariff.downloadSpeed} Mbit/s` : '-',
        tariffUpload: order.vzf_data?.tariff?.uploadSpeed ? `${order.vzf_data.tariff.uploadSpeed} Mbit/s` : '-',
        contractDuration: `${order.contract_months} Monate`,
        routerName: order.vzf_data?.router?.name || 'Kein Router',
        routerPrice: order.vzf_data?.router?.monthlyPrice ? `${order.vzf_data.router.monthlyPrice.toFixed(2).replace('.', ',')} €` : '0,00 €',
        tvName: order.vzf_data?.tvSelection?.type === 'comin' ? 'COM-IN TV' : 
                order.vzf_data?.tvSelection?.package?.name || 'Kein TV',
        tvPrice: '0,00 €',
        monthlyTotal: `${order.monthly_total.toFixed(2).replace('.', ',')} €`,
        oneTimeTotal: `${(order.setup_fee + order.one_time_total).toFixed(2).replace('.', ',')} €`,
        setupFee: `${order.setup_fee.toFixed(2).replace('.', ',')} €`,
        orderNumber: `COM-${order.id.slice(0, 8).toUpperCase()}`,
        vzfTimestamp: format(new Date(order.vzf_generated_at), 'dd.MM.yyyy HH:mm', { locale: de }),
      };

      let content: string;
      
      if (order.vzf_data?.tariff) {
        // We have full VZF data, can use template
        // Extract service addons from selected_options if present
        const serviceAddons = (order.selected_options as any[] || [])
          .filter(opt => opt.type === 'service' || opt.category === 'service' || opt.category === 'installation')
          .map(opt => ({
            id: opt.id || opt.name,
            name: opt.name,
            description: opt.description || '',
            monthlyPrice: opt.monthlyPrice || opt.monthly_price || 0,
            oneTimePrice: opt.oneTimePrice || opt.one_time_price || 0,
            category: opt.category || 'service',
          }));

        const vzfData: VZFData = {
          tariff: order.vzf_data.tariff,
          router: order.vzf_data.router || null,
          tvType: order.vzf_data.tvSelection?.type || 'none',
          tvPackage: order.vzf_data.tvSelection?.package || null,
          tvHdAddon: order.vzf_data.tvSelection?.hdAddon || null,
          tvHardware: order.vzf_data.tvSelection?.hardware || [],
          waipuStick: order.vzf_data.tvSelection?.waipuStick || false,
          phoneEnabled: order.vzf_data.phoneSelection?.enabled || false,
          phoneLines: order.vzf_data.phoneSelection?.lines || 0,
          routerDiscount: order.vzf_data.routerDiscount || 0,
          setupFee: order.vzf_data.setupFee || order.setup_fee,
          setupFeeWaived: order.vzf_data.setupFeeWaived || false,
          contractDuration: order.vzf_data.contractDuration || order.contract_months,
          expressActivation: order.vzf_data.expressActivation || false,
          promoCode: order.vzf_data.promoCode || order.promo_code,
          isFiberBasic: order.vzf_data.isFiberBasic || false,
          referralBonus: order.vzf_data.referralBonus || 0,
          serviceAddons: serviceAddons,
        };
        
        // Also add serviceAddons to renderData for template
        renderData.serviceAddons = serviceAddons;
        
        content = await renderVZFFromTemplate(vzfData, renderData);
      } else {
        // Fallback to simple HTML for old orders without full vzf_data
        content = generateFallbackVZFHTML(order, renderData);
      }

      // Try to generate PDF
      const orderNumber = `COM-${order.id.slice(0, 8).toUpperCase()}`;
      const success = await openVZFAsPDF(content, orderNumber);
      
      if (!success) {
        // Fallback: Open in new window
        const vzfWindow = window.open('', '_blank');
        if (vzfWindow) {
          vzfWindow.document.open();
          vzfWindow.document.write(content);
          vzfWindow.document.close();
        }
      }
      
      toast({
        title: "VZF geöffnet",
        description: "Das Dokument wurde in einem neuen Tab geöffnet.",
      });
    } catch (error) {
      console.error('Error reconstructing VZF:', error);
      toast({
        title: "Fehler",
        description: "VZF konnte nicht generiert werden.",
        variant: "destructive",
      });
    }
  };

  const generateFallbackVZFHTML = (order: Order, renderData: VZFRenderData): string => {
    return `
      <html>
        <head>
          <title>VZF - ${order.customer_name} - ${format(new Date(order.vzf_generated_at), 'dd.MM.yyyy HH:mm', { locale: de })}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
            h1 { color: #003366; border-bottom: 2px solid #003366; padding-bottom: 10px; }
            h2 { color: #003366; margin-top: 30px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
            th { background: #f5f5f5; }
            .total { font-weight: bold; font-size: 1.1em; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 0.9em; color: #666; }
          </style>
        </head>
        <body>
          <h1>Vertragszusammenfassung (VZF)</h1>
          <p><strong>Erstellt am:</strong> ${format(new Date(order.vzf_generated_at), 'dd.MM.yyyy HH:mm', { locale: de })} Uhr</p>
          <h2>Kundendaten</h2>
          <table>
            <tr><th>Name</th><td>${order.customer_name}</td></tr>
            <tr><th>E-Mail</th><td>${order.customer_email}</td></tr>
            <tr><th>Telefon</th><td>${order.customer_phone || '-'}</td></tr>
            <tr><th>Adresse</th><td>${order.street} ${order.house_number}, ${order.city}</td></tr>
          </table>
          <h2>Gewählter Tarif</h2>
          <table>
            <tr><th>Produkt</th><td>${order.product_name}</td></tr>
            <tr><th>Monatspreis</th><td>${order.product_monthly_price.toFixed(2)} €</td></tr>
            <tr><th>Vertragslaufzeit</th><td>${order.contract_months} Monate</td></tr>
          </table>
          <h2>Preisübersicht</h2>
          <table>
            <tr><th>Position</th><th>Betrag</th></tr>
            <tr><td>Monatliche Kosten</td><td>${order.monthly_total.toFixed(2)} €</td></tr>
            <tr><td>Bereitstellungspreis</td><td>${order.setup_fee.toFixed(2)} €</td></tr>
            <tr class="total"><td>Einmalig gesamt</td><td>${(order.setup_fee + order.one_time_total).toFixed(2)} €</td></tr>
          </table>
          <div class="footer">
            <p>Diese Vertragszusammenfassung wurde automatisch generiert.</p>
            <p>COM-IN Telekommunikations GmbH | kontakt@comin-glasfaser.de</p>
          </div>
        </body>
      </html>
    `;
  };

  const filteredOrders = orders.filter(order =>
    order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.customer_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (order.customer_phone && order.customer_phone.includes(searchTerm)) ||
    order.product_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Ausstehend</Badge>;
      case 'processing':
        return <Badge variant="default">In Bearbeitung</Badge>;
      case 'completed':
        return <Badge className="bg-success">Abgeschlossen</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Storniert</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Get order count based on selected time period
  const getOrderCountForPeriod = () => {
    switch (timePeriod) {
      case 'today': return stats.today;
      case 'week': return stats.week;
      case 'month': return stats.month;
      case 'quarter': return stats.quarter;
      default: return stats.total;
    }
  };

  const getPeriodLabel = () => {
    switch (timePeriod) {
      case 'today': return 'Heute';
      case 'week': return 'Diese Woche';
      case 'month': return 'Dieser Monat';
      case 'quarter': return 'Dieses Quartal';
      default: return 'Gesamt';
    }
  };

  return (
    <div className="space-y-6">
      {/* Time Period Filter */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'quarter', 'month', 'week', 'today'] as TimePeriod[]).map((period) => (
          <Button
            key={period}
            variant={timePeriod === period ? "default" : "outline"}
            size="sm"
            onClick={() => setTimePeriod(period)}
          >
            {period === 'all' ? 'Gesamt' : 
             period === 'quarter' ? 'Quartal' : 
             period === 'month' ? 'Monat' : 
             period === 'week' ? 'Woche' : 'Tag'}
          </Button>
        ))}
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" />
              Bestellungen ({getPeriodLabel()})
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{getOrderCountForPeriod()}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Heute
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{stats.today}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Letzte Stunde
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-accent">{stats.lastHour}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Monatl. Umsatz (Gesamt)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {stats.totalMonthlyRevenue.toFixed(2).replace('.', ',')} €
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-accent/5 border-accent/20">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Einmal. Umsatz (Gesamt)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">
              {stats.totalOneTimeRevenue.toFixed(2).replace('.', ',')} €
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Orders by Product Breakdown */}
      {stats.byProduct.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5" />
              Bestellungen nach Tarif
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {stats.byProduct.map(item => (
                <Badge key={item.name} variant="outline" className="text-sm py-1 px-3">
                  {item.name}: <span className="font-bold ml-1">{item.count}</span>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                {showArchived ? 'Archivierte Bestellungen' : 'Bestellungen'}
              </CardTitle>
              <CardDescription>
                Alle eingegangenen Bestellungen mit VZF-Rekonstruktion.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button 
                variant={showArchived ? "default" : "outline"} 
                size="sm" 
                onClick={() => setShowArchived(!showArchived)}
              >
                {showArchived ? <ArchiveRestore className="w-4 h-4 mr-2" /> : <Archive className="w-4 h-4 mr-2" />}
                {showArchived ? 'Aktive anzeigen' : 'Archiv anzeigen'}
              </Button>
              <Button variant="outline" size="sm" onClick={() => { fetchOrders(); fetchStats(); }}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Aktualisieren
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Suchen nach Name, E-Mail, Telefon, Tarif..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bestellnr. / Datum</TableHead>
                    <TableHead>Kunde</TableHead>
                    <TableHead>Kontakt</TableHead>
                    <TableHead>Tarif</TableHead>
                    <TableHead>Monatl.</TableHead>
                    <TableHead>Einmal.</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        {showArchived ? 'Keine archivierten Bestellungen.' : 'Keine Bestellungen gefunden.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell>
                          <div className="text-sm font-mono text-primary">
                            COM-{order.id.slice(0, 8).toUpperCase()}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(order.created_at), 'dd.MM.yyyy HH:mm', { locale: de })}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{order.customer_name}</div>
                          <div className="text-xs text-muted-foreground">
                            {order.street} {order.house_number}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{order.customer_email}</div>
                          {order.customer_phone && (
                            <div className="text-xs text-muted-foreground">{order.customer_phone}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{order.product_name}</Badge>
                          {order.connection_type && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {order.connection_type.toUpperCase()}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{order.monthly_total.toFixed(2)} €</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{(order.one_time_total + order.setup_fee).toFixed(2)} €</div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(order.status)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openOrderDetail(order)}
                              title="Details anzeigen"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => reconstructVZF(order)}
                              title="VZF rekonstruieren"
                            >
                              <FileText className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleArchive(order)}
                              title={order.is_archived ? 'Wiederherstellen' : 'Archivieren'}
                            >
                              {order.is_archived ? (
                                <ArchiveRestore className="w-4 h-4" />
                              ) : (
                                <Archive className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bestelldetails</DialogTitle>
            <DialogDescription>
              Bestellung vom {selectedOrder && format(new Date(selectedOrder.created_at), 'dd.MM.yyyy HH:mm', { locale: de })} Uhr
            </DialogDescription>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Kundendaten</h4>
                  <div className="space-y-1 text-sm">
                    <p><strong>Name:</strong> {selectedOrder.customer_name}</p>
                    <p><strong>E-Mail:</strong> {selectedOrder.customer_email}</p>
                    <p><strong>Telefon:</strong> {selectedOrder.customer_phone || '-'}</p>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Adresse</h4>
                  <div className="space-y-1 text-sm">
                    <p>{selectedOrder.street} {selectedOrder.house_number}</p>
                    <p>{selectedOrder.city}</p>
                    {selectedOrder.connection_type && (
                      <Badge variant="secondary">{selectedOrder.connection_type.toUpperCase()}</Badge>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Tarif & Optionen</h4>
                <div className="border rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="font-medium">{selectedOrder.product_name}</span>
                    <span>{selectedOrder.product_monthly_price.toFixed(2)} €/Monat</span>
                  </div>
                  {selectedOrder.selected_options && (selectedOrder.selected_options as any[]).length > 0 && (
                    <div className="border-t pt-2 mt-2 space-y-1 text-sm">
                      {(selectedOrder.selected_options as any[]).map((opt, idx) => (
                        <div key={idx} className="flex justify-between text-muted-foreground">
                          <span>{typeof opt === 'string' ? opt : opt.name}</span>
                          <span>{typeof opt === 'object' && opt.monthly_price ? `${opt.monthly_price.toFixed(2)} €` : ''}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="border rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold">{selectedOrder.monthly_total.toFixed(2)} €</div>
                  <div className="text-xs text-muted-foreground">Monatlich</div>
                </div>
                <div className="border rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold">{selectedOrder.setup_fee.toFixed(2)} €</div>
                  <div className="text-xs text-muted-foreground">Bereitstellung</div>
                </div>
                <div className="border rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold">{selectedOrder.one_time_total.toFixed(2)} €</div>
                  <div className="text-xs text-muted-foreground">Sonstige Einmalig</div>
                </div>
              </div>

              {selectedOrder.promo_code && (
                <div>
                  <h4 className="font-medium mb-2">Aktionscode</h4>
                  <Badge variant="secondary" className="text-base">{selectedOrder.promo_code}</Badge>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
                  Schließen
                </Button>
                <Button onClick={() => reconstructVZF(selectedOrder)}>
                  <FileText className="w-4 h-4 mr-2" />
                  VZF rekonstruieren
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
