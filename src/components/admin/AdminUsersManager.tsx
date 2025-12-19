import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Plus, Trash2, Shield, User, Mail, Key, Settings2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface AdminUser {
  id: string;
  email: string;
  created_at: string;
  role: string;
  permissions: string[];
}

const PERMISSION_GROUPS = [
  {
    name: 'Gebäude',
    permissions: [
      { value: 'buildings_read', label: 'Lesen' },
      { value: 'buildings_write', label: 'Bearbeiten' },
    ]
  },
  {
    name: 'Produkte',
    permissions: [
      { value: 'products_read', label: 'Lesen' },
      { value: 'products_write', label: 'Bearbeiten' },
    ]
  },
  {
    name: 'Optionen',
    permissions: [
      { value: 'options_read', label: 'Lesen' },
      { value: 'options_write', label: 'Bearbeiten' },
    ]
  },
  {
    name: 'Promotions',
    permissions: [
      { value: 'promotions_read', label: 'Lesen' },
      { value: 'promotions_write', label: 'Bearbeiten' },
    ]
  },
  {
    name: 'Bestellungen',
    permissions: [
      { value: 'orders_read', label: 'Lesen' },
      { value: 'orders_write', label: 'Bearbeiten' },
    ]
  },
  {
    name: 'Kunden',
    permissions: [
      { value: 'customers_read', label: 'Lesen' },
      { value: 'customers_write', label: 'Bearbeiten' },
    ]
  },
  {
    name: 'Einstellungen',
    permissions: [
      { value: 'settings_read', label: 'Lesen' },
      { value: 'settings_write', label: 'Bearbeiten' },
    ]
  },
  {
    name: 'Benutzer',
    permissions: [
      { value: 'users_read', label: 'Lesen' },
      { value: 'users_write', label: 'Bearbeiten' },
    ]
  },
  {
    name: 'Entscheidungsbaum',
    permissions: [
      { value: 'decision_tree_read', label: 'Lesen' },
      { value: 'decision_tree_write', label: 'Bearbeiten' },
    ]
  },
  {
    name: 'Dokumente',
    permissions: [
      { value: 'documents_read', label: 'Lesen' },
      { value: 'documents_write', label: 'Bearbeiten' },
    ]
  },
  {
    name: 'Logs',
    permissions: [
      { value: 'logs_read', label: 'Lesen' },
    ]
  },
];

export function AdminUsersManager() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showPermissionsDialog, setShowPermissionsDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Get all users with admin role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('user_id, role, created_at')
        .eq('role', 'admin');

      if (roleError) throw roleError;

      // Get permissions for each user
      const userIds = (roleData || []).map(r => r.user_id);
      
      const { data: permData } = await supabase
        .from('admin_permissions')
        .select('user_id, permission')
        .in('user_id', userIds.length > 0 ? userIds : ['none']);

      // Group permissions by user
      const permissionsByUser: Record<string, string[]> = {};
      (permData || []).forEach(p => {
        if (!permissionsByUser[p.user_id]) {
          permissionsByUser[p.user_id] = [];
        }
        permissionsByUser[p.user_id].push(p.permission);
      });

      // For now, we'll get emails from auth via a workaround
      // In production, you'd use a profiles table or admin API
      const adminUsers: AdminUser[] = (roleData || []).map(r => ({
        id: r.user_id,
        email: `Admin ${r.user_id.slice(0, 8)}...`, // Placeholder
        created_at: r.created_at,
        role: r.role,
        permissions: permissionsByUser[r.user_id] || [],
      }));

      setUsers(adminUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Fehler beim Laden der Benutzer');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateAdmin = async () => {
    if (!newEmail || !newPassword) {
      toast.error('E-Mail und Passwort erforderlich');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Passwort muss mindestens 6 Zeichen haben');
      return;
    }

    setSaving(true);
    try {
      // Create user via Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newEmail,
        password: newPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/admin`
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Benutzer konnte nicht erstellt werden');

      // Add admin role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: authData.user.id,
          role: 'admin'
        });

      if (roleError) throw roleError;

      toast.success('Admin-Benutzer erstellt');
      setShowAddDialog(false);
      setNewEmail('');
      setNewPassword('');
      await fetchUsers();
    } catch (error: any) {
      console.error('Error creating admin:', error);
      if (error.message?.includes('already registered')) {
        toast.error('Diese E-Mail ist bereits registriert');
      } else {
        toast.error('Fehler beim Erstellen des Admins');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveAdmin = async (userId: string) => {
    if (!confirm('Admin-Rechte wirklich entfernen?')) return;

    try {
      // Remove admin role
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', 'admin');

      if (error) throw error;

      // Remove all permissions
      await supabase
        .from('admin_permissions')
        .delete()
        .eq('user_id', userId);

      toast.success('Admin-Rechte entfernt');
      await fetchUsers();
    } catch (error) {
      console.error('Error removing admin:', error);
      toast.error('Fehler beim Entfernen');
    }
  };

  const handlePermissionChange = async (userId: string, permission: string, enabled: boolean) => {
    try {
        if (enabled) {
          const { error } = await supabase
            .from('admin_permissions')
            .insert({
              user_id: userId,
              permission: permission,
            } as any);
          if (error) throw error;
        } else {
        const { error } = await supabase
          .from('admin_permissions')
          .delete()
          .eq('user_id', userId)
          .eq('permission', permission as any);
        if (error) throw error;
      }

      // Update local state
      setUsers(prev => prev.map(u => {
        if (u.id !== userId) return u;
        return {
          ...u,
          permissions: enabled
            ? [...u.permissions, permission]
            : u.permissions.filter(p => p !== permission)
        };
      }));

      if (selectedUser?.id === userId) {
        setSelectedUser(prev => prev ? {
          ...prev,
          permissions: enabled
            ? [...prev.permissions, permission]
            : prev.permissions.filter(p => p !== permission)
        } : null);
      }

      toast.success('Berechtigung aktualisiert');
    } catch (error) {
      console.error('Error updating permission:', error);
      toast.error('Fehler beim Aktualisieren');
    }
  };

  const openPermissions = (user: AdminUser) => {
    setSelectedUser(user);
    setShowPermissionsDialog(true);
  };

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Lade Benutzer...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Admin-Benutzer</h2>
          <p className="text-muted-foreground">Verwalten Sie Administratoren und deren Berechtigungen</p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Admin hinzufügen
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Benutzer</TableHead>
                <TableHead>Rolle</TableHead>
                <TableHead>Berechtigungen</TableHead>
                <TableHead>Erstellt</TableHead>
                <TableHead className="text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Keine Admin-Benutzer vorhanden
                  </TableCell>
                </TableRow>
              ) : (
                users.map(user => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-mono text-sm">{user.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="default">
                        <Shield className="h-3 w-3 mr-1" />
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {user.permissions.length > 0 ? (
                          <Badge variant="outline">{user.permissions.length} Berechtigungen</Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">Volle Rechte (Admin)</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {new Date(user.created_at).toLocaleDateString('de-DE')}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openPermissions(user)}
                        >
                          <Settings2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveAdmin(user.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Admin Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Neuen Admin hinzufügen</DialogTitle>
            <DialogDescription>
              Erstellen Sie einen neuen Administrator-Benutzer mit E-Mail und Passwort
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-Mail</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="admin@example.com"
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Passwort</Label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mindestens 6 Zeichen"
                  className="pl-10"
                />
              </div>
            </div>
            <Button onClick={handleCreateAdmin} className="w-full" disabled={saving}>
              {saving ? 'Erstelle...' : 'Admin erstellen'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Permissions Dialog */}
      <Dialog open={showPermissionsDialog} onOpenChange={setShowPermissionsDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Berechtigungen verwalten</DialogTitle>
            <DialogDescription>
              {selectedUser?.email} - Granulare Zugriffsrechte
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 pt-4">
            <div className="bg-muted/50 p-3 rounded-md">
              <p className="text-sm">
                <strong>Hinweis:</strong> Admins haben standardmäßig volle Rechte. 
                Spezifische Berechtigungen können für eingeschränkte Admins vergeben werden.
              </p>
            </div>
            
            <div className="grid gap-4">
              {PERMISSION_GROUPS.map(group => (
                <Card key={group.name}>
                  <CardHeader className="py-3 px-4">
                    <CardTitle className="text-sm font-medium">{group.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="py-2 px-4">
                    <div className="flex flex-wrap gap-4">
                      {group.permissions.map(perm => (
                        <div key={perm.value} className="flex items-center gap-2">
                          <Switch
                            id={perm.value}
                            checked={selectedUser?.permissions.includes(perm.value) || false}
                            onCheckedChange={(checked) => 
                              selectedUser && handlePermissionChange(selectedUser.id, perm.value, checked)
                            }
                          />
                          <Label htmlFor={perm.value} className="text-sm cursor-pointer">
                            {perm.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}