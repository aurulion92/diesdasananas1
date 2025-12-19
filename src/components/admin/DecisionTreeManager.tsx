import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Settings, Trash2, GitBranch, Play, Edit2 } from 'lucide-react';
import { useDecisionTrees, DecisionTree } from '@/hooks/useDecisionTree';
import { DecisionTreeEditor } from './DecisionTreeEditor';

export function DecisionTreeManager() {
  const { trees, loading, createTree, updateTree, deleteTree } = useDecisionTrees();
  const [selectedTreeId, setSelectedTreeId] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingTree, setEditingTree] = useState<DecisionTree | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    customer_type: 'pk',
    is_active: true,
  });

  const resetForm = () => {
    setFormData({ name: '', description: '', customer_type: 'pk', is_active: true });
  };

  const handleCreate = async () => {
    try {
      const newTree = await createTree(formData);
      toast.success('Entscheidungsbaum erstellt');
      setShowCreateDialog(false);
      resetForm();
      setSelectedTreeId(newTree.id);
    } catch (error) {
      toast.error('Fehler beim Erstellen');
    }
  };

  const handleUpdate = async () => {
    if (!editingTree) return;
    try {
      await updateTree(editingTree.id, formData);
      toast.success('Entscheidungsbaum aktualisiert');
      setEditingTree(null);
      resetForm();
    } catch (error) {
      toast.error('Fehler beim Aktualisieren');
    }
  };

  const handleDelete = async (tree: DecisionTree) => {
    if (!confirm(`"${tree.name}" wirklich löschen? Alle Knoten und Verbindungen werden gelöscht.`)) return;
    try {
      await deleteTree(tree.id);
      toast.success('Entscheidungsbaum gelöscht');
      if (selectedTreeId === tree.id) {
        setSelectedTreeId(null);
      }
    } catch (error) {
      toast.error('Fehler beim Löschen');
    }
  };

  const startEdit = (tree: DecisionTree) => {
    setEditingTree(tree);
    setFormData({
      name: tree.name,
      description: tree.description || '',
      customer_type: tree.customer_type,
      is_active: tree.is_active,
    });
  };

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Lade Entscheidungsbäume...</div>;
  }

  // Show editor if tree selected
  if (selectedTreeId) {
    const tree = trees.find(t => t.id === selectedTreeId);
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => setSelectedTreeId(null)}>
              ← Zurück
            </Button>
            <div>
              <h2 className="text-lg font-semibold">{tree?.name}</h2>
              <p className="text-sm text-muted-foreground">
                {tree?.customer_type === 'pk' ? 'Privatkunden' : 'Geschäftskunden'}
              </p>
            </div>
          </div>
          <Badge variant={tree?.is_active ? 'default' : 'secondary'}>
            {tree?.is_active ? 'Aktiv' : 'Inaktiv'}
          </Badge>
        </div>
        <DecisionTreeEditor treeId={selectedTreeId} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <GitBranch className="h-6 w-6" />
            Entscheidungsbäume
          </h2>
          <p className="text-muted-foreground">
            Konfigurieren Sie die Logik der Bestellstrecke visuell
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Neuer Baum
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Neuen Entscheidungsbaum erstellen</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="z.B. Hauptstrecke PK"
                />
              </div>
              <div className="space-y-2">
                <Label>Beschreibung</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional: Beschreibung des Baums"
                />
              </div>
              <div className="space-y-2">
                <Label>Kundentyp</Label>
                <Select
                  value={formData.customer_type}
                  onValueChange={(value) => setFormData({ ...formData, customer_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pk">Privatkunden (PK)</SelectItem>
                    <SelectItem value="kmu">Geschäftskunden (KMU)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <Label>Aktiv</Label>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>
              <Button onClick={handleCreate} className="w-full" disabled={!formData.name}>
                Erstellen
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tree List */}
      {trees.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <GitBranch className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">Keine Entscheidungsbäume</h3>
            <p className="text-muted-foreground mb-4">
              Erstellen Sie Ihren ersten Entscheidungsbaum, um die Bestellstrecke zu konfigurieren.
            </p>
            <Button onClick={() => { resetForm(); setShowCreateDialog(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Ersten Baum erstellen
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {trees.map((tree) => (
            <Card key={tree.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{tree.name}</CardTitle>
                    <CardDescription>
                      {tree.customer_type === 'pk' ? 'Privatkunden' : 'Geschäftskunden'}
                    </CardDescription>
                  </div>
                  <Badge variant={tree.is_active ? 'default' : 'secondary'}>
                    {tree.is_active ? 'Aktiv' : 'Inaktiv'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {tree.description && (
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {tree.description}
                  </p>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    className="flex-1"
                    onClick={() => setSelectedTreeId(tree.id)}
                  >
                    <Play className="h-4 w-4 mr-1" />
                    Bearbeiten
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => startEdit(tree)}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(tree)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingTree} onOpenChange={(open) => !open && setEditingTree(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Entscheidungsbaum bearbeiten</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Beschreibung</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Kundentyp</Label>
              <Select
                value={formData.customer_type}
                onValueChange={(value) => setFormData({ ...formData, customer_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pk">Privatkunden (PK)</SelectItem>
                  <SelectItem value="kmu">Geschäftskunden (KMU)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label>Aktiv</Label>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
            <Button onClick={handleUpdate} className="w-full" disabled={!formData.name}>
              Speichern
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
