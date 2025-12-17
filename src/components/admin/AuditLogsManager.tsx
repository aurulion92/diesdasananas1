import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, Search, Shield, AlertTriangle, Info, ShoppingCart, Mail, UserX, Lock } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { toast } from "sonner";

interface AuditLog {
  id: string;
  action_type: string;
  action_details: any;
  resource_type: string | null;
  resource_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  user_email: string | null;
  user_id: string | null;
  created_at: string;
}

const ACTION_TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  'rate_limit_blocked': { label: 'Rate-Limit Blockierung', icon: <Lock className="h-4 w-4" />, color: 'destructive' },
  'order_created': { label: 'Bestellung erstellt', icon: <ShoppingCart className="h-4 w-4" />, color: 'default' },
  'contact_form_submitted': { label: 'Kontaktformular', icon: <Mail className="h-4 w-4" />, color: 'secondary' },
  'bot_detected': { label: 'Bot erkannt', icon: <AlertTriangle className="h-4 w-4" />, color: 'destructive' },
  'login_failed': { label: 'Login fehlgeschlagen', icon: <UserX className="h-4 w-4" />, color: 'outline' },
  'login_success': { label: 'Login erfolgreich', icon: <Shield className="h-4 w-4" />, color: 'default' },
};

export default function AuditLogsManager() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [page, setPage] = useState(0);
  const pageSize = 50;

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (filterType !== "all") {
        query = query.eq("action_type", filterType);
      }

      if (searchTerm) {
        query = query.or(`ip_address.ilike.%${searchTerm}%,user_email.ilike.%${searchTerm}%,resource_id.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      toast.error("Fehler beim Laden der Logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, filterType]);

  const handleSearch = () => {
    setPage(0);
    fetchLogs();
  };

  const getActionConfig = (actionType: string) => {
    return ACTION_TYPE_CONFIG[actionType] || { 
      label: actionType, 
      icon: <Info className="h-4 w-4" />, 
      color: 'outline' 
    };
  };

  const formatDetails = (details: Record<string, any> | null): string => {
    if (!details) return "-";
    
    const parts: string[] = [];
    
    if (details.action_attempted) parts.push(`Aktion: ${details.action_attempted}`);
    if (details.reason) parts.push(`Grund: ${details.reason}`);
    if (details.customer_email) parts.push(`Kunde: ${details.customer_email}`);
    if (details.product_name) parts.push(`Produkt: ${details.product_name}`);
    if (details.topic) parts.push(`Thema: ${details.topic}`);
    if (details.blocked_until) parts.push(`Blockiert bis: ${new Date(details.blocked_until).toLocaleString('de-DE')}`);
    
    return parts.length > 0 ? parts.join(" | ") : JSON.stringify(details).substring(0, 100);
  };

  const uniqueActionTypes = [...new Set(logs.map(l => l.action_type))];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Sicherheits- & Audit-Logs
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex-1 min-w-[200px]">
            <div className="flex gap-2">
              <Input
                placeholder="IP, E-Mail oder ID suchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button variant="outline" onClick={handleSearch}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <Select value={filterType} onValueChange={(value) => { setFilterType(value); setPage(0); }}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Alle Ereignisse" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Ereignisse</SelectItem>
              <SelectItem value="rate_limit_blocked">Rate-Limit Blockierungen</SelectItem>
              <SelectItem value="order_created">Bestellungen</SelectItem>
              <SelectItem value="contact_form_submitted">Kontaktformulare</SelectItem>
              <SelectItem value="bot_detected">Bot-Erkennung</SelectItem>
              <SelectItem value="login_failed">Login fehlgeschlagen</SelectItem>
              <SelectItem value="login_success">Login erfolgreich</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={fetchLogs} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Aktualisieren
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-3">
            <div className="text-sm text-muted-foreground">Gesamt</div>
            <div className="text-2xl font-bold">{logs.length}</div>
          </Card>
          <Card className="p-3 border-destructive/50">
            <div className="text-sm text-muted-foreground">Blockierungen</div>
            <div className="text-2xl font-bold text-destructive">
              {logs.filter(l => l.action_type === 'rate_limit_blocked').length}
            </div>
          </Card>
          <Card className="p-3">
            <div className="text-sm text-muted-foreground">Bestellungen</div>
            <div className="text-2xl font-bold">
              {logs.filter(l => l.action_type === 'order_created').length}
            </div>
          </Card>
          <Card className="p-3 border-orange-500/50">
            <div className="text-sm text-muted-foreground">Bot-Versuche</div>
            <div className="text-2xl font-bold text-orange-500">
              {logs.filter(l => l.action_type === 'bot_detected').length}
            </div>
          </Card>
        </div>

        {/* Table */}
        {logs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">Keine Logs vorhanden</p>
            <p className="text-sm">Sicherheitsereignisse werden hier protokolliert</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Zeitpunkt</TableHead>
                  <TableHead className="w-[180px]">Ereignis</TableHead>
                  <TableHead className="w-[140px]">IP-Adresse</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => {
                  const config = getActionConfig(log.action_type);
                  return (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-sm">
                        {format(new Date(log.created_at), "dd.MM.yyyy HH:mm:ss", { locale: de })}
                      </TableCell>
                      <TableCell>
                        <Badge variant={config.color as any} className="flex items-center gap-1 w-fit">
                          {config.icon}
                          {config.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {log.ip_address || "-"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[400px] truncate">
                        {formatDetails(log.action_details)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination */}
        <div className="flex justify-between items-center mt-4">
          <Button 
            variant="outline" 
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            Zurück
          </Button>
          <span className="text-sm text-muted-foreground">Seite {page + 1}</span>
          <Button 
            variant="outline" 
            onClick={() => setPage(p => p + 1)}
            disabled={logs.length < pageSize}
          >
            Weiter
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
