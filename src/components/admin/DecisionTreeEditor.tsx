import { useState, useCallback, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Plus, Trash2, ArrowRight, CircleDot, Square, Link2, X, GripVertical, ChevronDown, ChevronUp } from 'lucide-react';
import {
  useDecisionTreeEditor,
  DecisionTreeNode,
  DecisionTreeEdge,
  CONDITION_FIELDS,
  OPERATORS,
  ACTION_TYPES,
  NodeType,
  ActionType,
  OperatorType,
} from '@/hooks/useDecisionTree';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface DecisionTreeEditorProps {
  treeId: string;
}

export function DecisionTreeEditor({ treeId }: DecisionTreeEditorProps) {
  const {
    nodes,
    edges,
    loading,
    error,
    createNode,
    updateNode,
    deleteNode,
    createEdge,
    updateEdge,
    deleteEdge,
    createCondition,
    updateCondition,
    deleteCondition,
    saveAction,
  } = useDecisionTreeEditor(treeId);

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [showAddNodeDialog, setShowAddNodeDialog] = useState(false);
  const [newNodeType, setNewNodeType] = useState<NodeType>('condition');
  const [newNodeName, setNewNodeName] = useState('');

  // Find root node
  const rootNode = nodes.find(n => n.is_root);
  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  // Build tree structure for visualization
  const getChildNodes = useCallback((nodeId: string): string[] => {
    return edges
      .filter(e => e.source_node_id === nodeId)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(e => e.target_node_id);
  }, [edges]);

  const getParentNode = useCallback((nodeId: string): string | null => {
    const edge = edges.find(e => e.target_node_id === nodeId);
    return edge?.source_node_id || null;
  }, [edges]);

  const getEdgeToNode = useCallback((nodeId: string): DecisionTreeEdge | null => {
    return edges.find(e => e.target_node_id === nodeId) || null;
  }, [edges]);

  // Orphan nodes (not connected to tree)
  const orphanNodes = useMemo(() => {
    // Protect against cycles: track visited nodes while traversing.
    const visited = new Set<string>();
    const collectConnected = (nodeId: string) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);
      const children = getChildNodes(nodeId);
      children.forEach(childId => collectConnected(childId));
    };

    if (rootNode) collectConnected(rootNode.id);

    return nodes.filter(n => !visited.has(n.id) && !n.is_root);
  }, [nodes, rootNode, getChildNodes]);

  const handleAddNode = async () => {
    try {
      // Calculate position
      const maxY = Math.max(0, ...nodes.map(n => n.position_y));
      await createNode({
        name: newNodeName || (newNodeType === 'condition' ? 'Neue Bedingung' : 'Neue Aktion'),
        node_type: newNodeType,
        is_root: nodes.length === 0,
        position_x: 0,
        position_y: maxY + 100,
      });
      toast.success('Knoten erstellt');
      setShowAddNodeDialog(false);
      setNewNodeName('');
    } catch (error) {
      toast.error('Fehler beim Erstellen');
    }
  };

  const handleDeleteNode = async (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    if (node.is_root && nodes.length > 1) {
      toast.error('Wurzelknoten kann nicht gelöscht werden wenn andere Knoten existieren');
      return;
    }
    if (!confirm(`"${node.name}" wirklich löschen?`)) return;
    try {
      await deleteNode(nodeId);
      toast.success('Knoten gelöscht');
      if (selectedNodeId === nodeId) setSelectedNodeId(null);
    } catch (error) {
      toast.error('Fehler beim Löschen');
    }
  };

  const handleConnect = async (targetId: string) => {
    if (!connectingFrom || connectingFrom === targetId) {
      setConnectingFrom(null);
      return;
    }
    // Check if connection already exists
    const exists = edges.some(e => e.source_node_id === connectingFrom && e.target_node_id === targetId);
    if (exists) {
      toast.error('Verbindung existiert bereits');
      setConnectingFrom(null);
      return;
    }
    try {
      const sourceNode = nodes.find(n => n.id === connectingFrom);
      await createEdge({
        source_node_id: connectingFrom,
        target_node_id: targetId,
        label: sourceNode?.node_type === 'condition' ? 'Ja' : null,
        sort_order: edges.filter(e => e.source_node_id === connectingFrom).length,
      });
      toast.success('Verbindung erstellt');
    } catch (error) {
      toast.error('Fehler beim Verbinden');
    }
    setConnectingFrom(null);
  };

  const handleDeleteEdge = async (edgeId: string) => {
    try {
      await deleteEdge(edgeId);
      toast.success('Verbindung gelöscht');
    } catch (error) {
      toast.error('Fehler beim Löschen');
    }
  };

  const handleSetRoot = async (nodeId: string) => {
    // Remove root from current root
    if (rootNode) {
      await updateNode(rootNode.id, { is_root: false });
    }
    await updateNode(nodeId, { is_root: true });
    toast.success('Neuer Startknoten gesetzt');
  };

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Lade Baum...</div>;
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
          <div className="font-medium">Fehler beim Laden des Entscheidungsbaums</div>
          <div className="mt-1 text-muted-foreground">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Tree Visualization */}
      <div className="lg:col-span-2 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Baumstruktur</h3>
          <div className="flex gap-2">
            {connectingFrom && (
              <Button variant="outline" size="sm" onClick={() => setConnectingFrom(null)}>
                <X className="h-4 w-4 mr-1" />
                Abbrechen
              </Button>
            )}
            <Button size="sm" onClick={() => setShowAddNodeDialog(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Knoten
            </Button>
          </div>
        </div>

        {/* Tree */}
        <Card>
          <CardContent className="p-4 min-h-[400px]">
            {nodes.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <CircleDot className="h-12 w-12 mb-4" />
                <p>Keine Knoten vorhanden</p>
                <Button variant="outline" className="mt-4" onClick={() => setShowAddNodeDialog(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Ersten Knoten erstellen
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Root and connected nodes */}
                {rootNode && (
                  <TreeNode
                    node={rootNode}
                    nodes={nodes}
                    edges={edges}
                    selectedNodeId={selectedNodeId}
                    connectingFrom={connectingFrom}
                    onSelect={setSelectedNodeId}
                    onConnect={handleConnect}
                    onStartConnect={setConnectingFrom}
                    onDelete={handleDeleteNode}
                    onDeleteEdge={handleDeleteEdge}
                    getChildNodes={getChildNodes}
                    getEdgeToNode={getEdgeToNode}
                    depth={0}
                    ancestorIds={[]}
                  />
                )}

                {/* Orphan nodes */}
                {orphanNodes.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-dashed">
                    <p className="text-sm text-muted-foreground mb-3">Nicht verbundene Knoten:</p>
                    <div className="flex flex-wrap gap-2">
                      {orphanNodes.map(node => (
                        <NodeCard
                          key={node.id}
                          node={node}
                          isSelected={selectedNodeId === node.id}
                          isConnecting={connectingFrom === node.id}
                          isTarget={!!connectingFrom && connectingFrom !== node.id}
                          onSelect={() => setSelectedNodeId(node.id)}
                          onConnect={() => handleConnect(node.id)}
                          onStartConnect={() => setConnectingFrom(node.id)}
                          onDelete={() => handleDeleteNode(node.id)}
                          onSetRoot={() => handleSetRoot(node.id)}
                          showSetRoot={!rootNode}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Node Editor */}
      <div>
        {selectedNode ? (
          <NodeEditor
            node={selectedNode}
            onUpdate={updateNode}
            onClose={() => setSelectedNodeId(null)}
            createCondition={createCondition}
            updateCondition={updateCondition}
            deleteCondition={deleteCondition}
            saveAction={saveAction}
          />
        ) : (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Square className="h-8 w-8 mx-auto mb-3 opacity-50" />
              <p>Wählen Sie einen Knoten aus, um ihn zu bearbeiten</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add Node Dialog */}
      <Dialog open={showAddNodeDialog} onOpenChange={setShowAddNodeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Neuen Knoten erstellen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Typ</Label>
              <Select value={newNodeType} onValueChange={(v) => setNewNodeType(v as NodeType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="condition">Bedingung (Verzweigung)</SelectItem>
                  <SelectItem value="action">Aktion (Endpunkt)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={newNodeName}
                onChange={(e) => setNewNodeName(e.target.value)}
                placeholder={newNodeType === 'condition' ? 'z.B. Ausbauart prüfen' : 'z.B. FTTH Produkte zeigen'}
              />
            </div>
            <Button onClick={handleAddNode} className="w-full">
              Erstellen
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Recursive tree node component
interface TreeNodeProps {
  node: DecisionTreeNode;
  nodes: DecisionTreeNode[];
  edges: DecisionTreeEdge[];
  selectedNodeId: string | null;
  connectingFrom: string | null;
  onSelect: (id: string) => void;
  onConnect: (id: string) => void;
  onStartConnect: (id: string) => void;
  onDelete: (id: string) => void;
  onDeleteEdge: (id: string) => void;
  getChildNodes: (id: string) => string[];
  getEdgeToNode: (id: string) => DecisionTreeEdge | null;
  depth: number;
  edgeLabel?: string | null;
  edgeId?: string;
  ancestorIds: string[];
}

function TreeNode({
  node,
  nodes,
  edges,
  selectedNodeId,
  connectingFrom,
  onSelect,
  onConnect,
  onStartConnect,
  onDelete,
  onDeleteEdge,
  getChildNodes,
  getEdgeToNode,
  depth,
  edgeLabel,
  edgeId,
  ancestorIds,
}: TreeNodeProps) {
  const [collapsed, setCollapsed] = useState(false);
  const childIds = getChildNodes(node.id);
  const hasChildren = childIds.length > 0;

  return (
    <div className={cn("relative", depth > 0 && "ml-8 mt-2")}>
      {/* Edge label */}
      {edgeLabel && (
        <div className="absolute -left-6 top-3 flex items-center gap-1">
          <div className="w-4 h-px bg-border" />
          <Badge variant="outline" className="text-xs py-0 px-1.5 group">
            {edgeLabel}
            {edgeId && (
              <button
                onClick={(e) => { e.stopPropagation(); onDeleteEdge(edgeId); }}
                className="ml-1 opacity-0 group-hover:opacity-100 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </Badge>
        </div>
      )}

      <div className="flex items-start gap-2">
        {/* Collapse button */}
        {hasChildren && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="mt-2.5 p-0.5 hover:bg-muted rounded"
          >
            {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
        )}

        {/* Node card */}
        <div className="flex-1">
          <NodeCard
            node={node}
            isSelected={selectedNodeId === node.id}
            isConnecting={connectingFrom === node.id}
            isTarget={!!connectingFrom && connectingFrom !== node.id}
            onSelect={() => onSelect(node.id)}
            onConnect={() => onConnect(node.id)}
            onStartConnect={() => onStartConnect(node.id)}
            onDelete={() => onDelete(node.id)}
          />
        </div>
      </div>

      {/* Children */}
      {!collapsed && hasChildren && (
        <div className="border-l-2 border-border ml-4 mt-1">
          {childIds.map(childId => {
            const childNode = nodes.find(n => n.id === childId);
            const edge = edges.find(e => e.source_node_id === node.id && e.target_node_id === childId);
            if (!childNode) return null;

            // Cycle protection: if we see a node again in the current path, render a small warning instead of recursing forever.
            const nextAncestors = [...ancestorIds, node.id];
            if (nextAncestors.includes(childId)) {
              return (
                <div key={`${node.id}->${childId}`} className="ml-8 mt-2">
                  <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="font-medium">Zyklus erkannt</div>
                        <div className="text-muted-foreground text-xs mt-0.5">
                          {node.name} → {childNode.name}
                        </div>
                      </div>
                      {edge?.id && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onDeleteEdge(edge.id)}
                        >
                          Verbindung entfernen
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <TreeNode
                key={childId}
                node={childNode}
                nodes={nodes}
                edges={edges}
                selectedNodeId={selectedNodeId}
                connectingFrom={connectingFrom}
                onSelect={onSelect}
                onConnect={onConnect}
                onStartConnect={onStartConnect}
                onDelete={onDelete}
                onDeleteEdge={onDeleteEdge}
                getChildNodes={getChildNodes}
                getEdgeToNode={getEdgeToNode}
                depth={depth + 1}
                edgeLabel={edge?.label}
                edgeId={edge?.id}
                ancestorIds={nextAncestors}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// Individual node card
interface NodeCardProps {
  node: DecisionTreeNode;
  isSelected: boolean;
  isConnecting: boolean;
  isTarget: boolean;
  onSelect: () => void;
  onConnect: () => void;
  onStartConnect: () => void;
  onDelete: () => void;
  onSetRoot?: () => void;
  showSetRoot?: boolean;
}

function NodeCard({
  node,
  isSelected,
  isConnecting,
  isTarget,
  onSelect,
  onConnect,
  onStartConnect,
  onDelete,
  onSetRoot,
  showSetRoot,
}: NodeCardProps) {
  const isCondition = node.node_type === 'condition';

  return (
    <div
      onClick={isTarget ? onConnect : onSelect}
      className={cn(
        "p-3 rounded-lg border-2 cursor-pointer transition-all",
        isCondition ? "bg-blue-50 dark:bg-blue-950/30" : "bg-green-50 dark:bg-green-950/30",
        isSelected && "ring-2 ring-primary",
        isConnecting && "border-primary border-dashed",
        isTarget && "border-primary hover:bg-primary/10",
        !isSelected && !isConnecting && !isTarget && "border-transparent hover:border-muted-foreground/30"
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isCondition ? (
            <CircleDot className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          ) : (
            <Square className="h-4 w-4 text-green-600 dark:text-green-400" />
          )}
          <span className="font-medium text-sm">{node.name}</span>
          {node.is_root && (
            <Badge variant="secondary" className="text-xs">Start</Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          {showSetRoot && onSetRoot && (
            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onSetRoot(); }}>
              Als Start
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => { e.stopPropagation(); onStartConnect(); }}
            title="Verbinden"
          >
            <Link2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
          >
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </div>
      </div>

      {/* Show conditions preview */}
      {node.conditions && node.conditions.length > 0 && (
        <div className="mt-2 text-xs text-muted-foreground">
          {node.conditions.map((c, i) => (
            <div key={c.id}>
              {i > 0 && <span className="text-muted-foreground/50">UND </span>}
              {CONDITION_FIELDS.find(f => f.value === c.field_name)?.label || c.field_name}{' '}
              {OPERATORS.find(o => o.value === c.operator)?.label}{' '}
              {c.compare_value || ''}
            </div>
          ))}
        </div>
      )}

      {/* Show action preview */}
      {node.action && (
        <div className="mt-2 text-xs text-muted-foreground">
          → {ACTION_TYPES.find(a => a.value === node.action?.action_type)?.label}
        </div>
      )}
    </div>
  );
}

// Node editor panel
interface NodeEditorProps {
  node: DecisionTreeNode;
  onUpdate: (id: string, updates: Partial<DecisionTreeNode>) => Promise<void>;
  onClose: () => void;
  createCondition: (condition: any) => Promise<any>;
  updateCondition: (id: string, updates: any) => Promise<void>;
  deleteCondition: (id: string) => Promise<void>;
  saveAction: (nodeId: string, action: any) => Promise<void>;
}

function NodeEditor({
  node,
  onUpdate,
  onClose,
  createCondition,
  updateCondition,
  deleteCondition,
  saveAction,
}: NodeEditorProps) {
  const [name, setName] = useState(node.name);
  const isCondition = node.node_type === 'condition';

  // Action form state
  const [actionType, setActionType] = useState<ActionType>(node.action?.action_type || 'show_products');
  const [actionConfig, setActionConfig] = useState<Record<string, any>>(node.action?.config || {});

  const handleSaveName = async () => {
    if (name !== node.name) {
      await onUpdate(node.id, { name });
      toast.success('Name gespeichert');
    }
  };

  const handleAddCondition = async () => {
    try {
      await createCondition({
        node_id: node.id,
        field_name: 'ausbau_art',
        operator: 'equals' as OperatorType,
        compare_value: 'ftth',
        sort_order: node.conditions?.length || 0,
      });
      toast.success('Bedingung hinzugefügt');
    } catch (error) {
      toast.error('Fehler beim Hinzufügen');
    }
  };

  const handleSaveAction = async () => {
    try {
      await saveAction(node.id, {
        action_type: actionType,
        config: actionConfig,
      });
      toast.success('Aktion gespeichert');
    } catch (error) {
      toast.error('Fehler beim Speichern');
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Knoten bearbeiten</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Basic info */}
        <div className="space-y-2">
          <Label>Name</Label>
          <div className="flex gap-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={handleSaveName}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={isCondition ? 'default' : 'secondary'}>
            {isCondition ? 'Bedingung' : 'Aktion'}
          </Badge>
          {node.is_root && <Badge variant="outline">Startknoten</Badge>}
        </div>

        {/* Conditions (for condition nodes) */}
        {isCondition && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Bedingungen (UND-verknüpft)</Label>
              <Button variant="outline" size="sm" onClick={handleAddCondition}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                Hinzufügen
              </Button>
            </div>
            {node.conditions && node.conditions.length > 0 ? (
              <div className="space-y-2">
                {node.conditions.map((condition) => (
                  <ConditionRow
                    key={condition.id}
                    condition={condition}
                    onUpdate={updateCondition}
                    onDelete={deleteCondition}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Keine Bedingungen definiert. Fügen Sie Bedingungen hinzu, um zu bestimmen, wann dieser Pfad gewählt wird.
              </p>
            )}
          </div>
        )}

        {/* Action config (for action nodes) */}
        {!isCondition && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Aktionstyp</Label>
              <Select value={actionType} onValueChange={(v) => setActionType(v as ActionType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACTION_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      <div>
                        <div>{type.label}</div>
                        <div className="text-xs text-muted-foreground">{type.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Action-specific config */}
            <ActionConfigEditor 
              actionType={actionType}
              config={actionConfig}
              onChange={setActionConfig}
            />

            <Button onClick={handleSaveAction} className="w-full">
              Aktion speichern
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Condition row component
interface ConditionRowProps {
  condition: any;
  onUpdate: (id: string, updates: any) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

function ConditionRow({ condition, onUpdate, onDelete }: ConditionRowProps) {
  const field = CONDITION_FIELDS.find(f => f.value === condition.field_name);

  return (
    <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md flex-wrap">
      <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
      
      <Select
        value={condition.field_name}
        onValueChange={(v) => onUpdate(condition.id, { field_name: v })}
      >
        <SelectTrigger className="w-[160px] h-8">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {CONDITION_FIELDS.map(f => (
            <SelectItem key={f.value} value={f.value}>
              <div>
                <div>{f.label}</div>
                {f.description && <div className="text-xs text-muted-foreground">{f.description}</div>}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={condition.operator}
        onValueChange={(v) => onUpdate(condition.id, { operator: v })}
      >
        <SelectTrigger className="w-[140px] h-8">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {OPERATORS.map(o => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {!['is_null', 'is_not_null'].includes(condition.operator) && (
        <>
          {field?.type === 'enum' && field.options ? (
            <Select
              value={condition.compare_value || ''}
              onValueChange={(v) => onUpdate(condition.id, { compare_value: v })}
            >
              <SelectTrigger className="w-[120px] h-8">
                <SelectValue placeholder="Wert..." />
              </SelectTrigger>
              <SelectContent>
                {field.options.map(opt => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : field?.type === 'boolean' ? (
            <Select
              value={condition.compare_value || 'true'}
              onValueChange={(v) => onUpdate(condition.id, { compare_value: v })}
            >
              <SelectTrigger className="w-[80px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Ja</SelectItem>
                <SelectItem value="false">Nein</SelectItem>
              </SelectContent>
            </Select>
          ) : field?.type === 'building_list' ? (
            <Input
              value={condition.compare_value || ''}
              onChange={(e) => onUpdate(condition.id, { compare_value: e.target.value })}
              placeholder="Gebäude-IDs (kommasepariert)"
              className="w-[200px] h-8"
            />
          ) : (
            <Input
              value={condition.compare_value || ''}
              onChange={(e) => onUpdate(condition.id, { compare_value: e.target.value })}
              placeholder="Wert..."
              className="w-[120px] h-8"
            />
          )}
        </>
      )}

      <Button
        variant="ghost"
        size="sm"
        onClick={() => onDelete(condition.id)}
        className="ml-auto"
      >
        <Trash2 className="h-3.5 w-3.5 text-destructive" />
      </Button>
    </div>
  );
}

// Action Config Editor - handles all action type configurations
interface ActionConfigEditorProps {
  actionType: ActionType;
  config: Record<string, any>;
  onChange: (config: Record<string, any>) => void;
}

function ActionConfigEditor({ actionType, config, onChange }: ActionConfigEditorProps) {
  const [products, setProducts] = useState<Array<{ id: string; name: string; slug: string }>>([]);
  
  useEffect(() => {
    // Fetch products for selection
    const fetchProducts = async () => {
      const { data } = await supabase
        .from('products')
        .select('id, name, slug')
        .eq('is_active', true)
        .order('display_order');
      if (data) setProducts(data);
    };
    if (actionType === 'show_products') {
      fetchProducts();
    }
  }, [actionType]);

  if (actionType === 'show_products') {
    return (
      <div className="space-y-4">
        <div className="space-y-3">
          <Label className="font-semibold">Technologie-Filter</Label>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Switch
                checked={config.filter_is_ftth || false}
                onCheckedChange={(v) => onChange({ ...config, filter_is_ftth: v })}
              />
              <span className="text-sm">Nur FTTH Produkte</span>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={config.filter_is_fttb || false}
                onCheckedChange={(v) => onChange({ ...config, filter_is_fttb: v })}
              />
              <span className="text-sm">Nur FTTB Produkte</span>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={config.filter_is_ftth_limited || false}
                onCheckedChange={(v) => onChange({ ...config, filter_is_ftth_limited: v })}
              />
              <span className="text-sm">Nur FTTH Limited Produkte</span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <Label className="font-semibold">Sondertarife</Label>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Switch
                checked={config.show_sondertarife || false}
                onCheckedChange={(v) => onChange({ ...config, show_sondertarife: v })}
              />
              <span className="text-sm">Sondertarife anzeigen</span>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={config.only_sondertarife || false}
                onCheckedChange={(v) => onChange({ ...config, only_sondertarife: v })}
              />
              <span className="text-sm">NUR Sondertarife (keine Standardtarife)</span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <Label className="font-semibold">Spezifische Produkte (optional)</Label>
          <p className="text-xs text-muted-foreground">
            Wenn aktiviert, werden nur die ausgewählten Produkte angezeigt
          </p>
          <div className="flex items-center gap-2">
            <Switch
              checked={config.use_specific_products || false}
              onCheckedChange={(v) => onChange({ ...config, use_specific_products: v, specific_product_ids: v ? (config.specific_product_ids || []) : [] })}
            />
            <span className="text-sm">Nur bestimmte Produkte zeigen</span>
          </div>
          
          {config.use_specific_products && (
            <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-2">
              {products.map(product => (
                <div key={product.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`product-${product.id}`}
                    checked={(config.specific_product_ids || []).includes(product.id)}
                    onChange={(e) => {
                      const ids = config.specific_product_ids || [];
                      if (e.target.checked) {
                        onChange({ ...config, specific_product_ids: [...ids, product.id] });
                      } else {
                        onChange({ ...config, specific_product_ids: ids.filter((id: string) => id !== product.id) });
                      }
                    }}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor={`product-${product.id}`} className="text-sm">
                    {product.name} <span className="text-muted-foreground">({product.slug})</span>
                  </label>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label className="font-semibold">Gebäude-basierte Filterung</Label>
          <div className="flex items-center gap-2">
            <Switch
              checked={config.filter_by_building || false}
              onCheckedChange={(v) => onChange({ ...config, filter_by_building: v })}
            />
            <span className="text-sm">Produkte nach Gebäude-Zuweisung filtern</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Zeigt nur Produkte die dem aktuellen Gebäude zugewiesen sind
          </p>
        </div>
      </div>
    );
  }

  if (actionType === 'show_message') {
    return (
      <div className="space-y-3">
        <div className="space-y-2">
          <Label>Nachricht</Label>
          <Textarea
            value={config.message || ''}
            onChange={(e) => onChange({ ...config, message: e.target.value })}
            placeholder="Nachricht an den Benutzer..."
            rows={3}
          />
        </div>
        <div className="space-y-2">
          <Label>Nachrichtentyp</Label>
          <Select
            value={config.message_type || 'info'}
            onValueChange={(v) => onChange({ ...config, message_type: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="warning">Warnung</SelectItem>
              <SelectItem value="error">Fehler</SelectItem>
              <SelectItem value="success">Erfolg</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={config.show_contact_button || false}
            onCheckedChange={(v) => onChange({ ...config, show_contact_button: v })}
          />
          <span className="text-sm">Kontakt-Button anzeigen</span>
        </div>
      </div>
    );
  }

  if (actionType === 'redirect') {
    return (
      <div className="space-y-2">
        <Label>Weiterleitungs-URL</Label>
        <Input
          value={config.url || ''}
          onChange={(e) => onChange({ ...config, url: e.target.value })}
          placeholder="https://..."
        />
        <div className="flex items-center gap-2 mt-2">
          <Switch
            checked={config.open_in_new_tab || false}
            onCheckedChange={(v) => onChange({ ...config, open_in_new_tab: v })}
          />
          <span className="text-sm">In neuem Tab öffnen</span>
        </div>
      </div>
    );
  }

  if (actionType === 'show_contact_form') {
    return (
      <div className="space-y-3">
        <div className="space-y-2">
          <Label>Betreff (optional)</Label>
          <Input
            value={config.subject || ''}
            onChange={(e) => onChange({ ...config, subject: e.target.value })}
            placeholder="Vorbelegter Betreff..."
          />
        </div>
        <div className="space-y-2">
          <Label>Hinweistext (optional)</Label>
          <Textarea
            value={config.hint_text || ''}
            onChange={(e) => onChange({ ...config, hint_text: e.target.value })}
            placeholder="Zusätzlicher Hinweis für den Benutzer..."
            rows={2}
          />
        </div>
      </div>
    );
  }

  if (actionType === 'show_gnv_form') {
    return (
      <div className="space-y-2">
        <Label>Hinweistext (optional)</Label>
        <Textarea
          value={config.hint_text || ''}
          onChange={(e) => onChange({ ...config, hint_text: e.target.value })}
          placeholder="Zusätzlicher Hinweis zur GNV..."
          rows={2}
        />
      </div>
    );
  }

  if (actionType === 'set_connection_type') {
    return (
      <div className="space-y-2">
        <Label>Anschlusstyp</Label>
        <Select
          value={config.connection_type || 'ftth'}
          onValueChange={(v) => onChange({ ...config, connection_type: v })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ftth">FTTH</SelectItem>
            <SelectItem value="fttb">FTTB</SelectItem>
            <SelectItem value="ftth_limited">FTTH Limited</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Setzt den connectionType für die Produktfilterung in der Bestellstrecke
        </p>
      </div>
    );
  }

  if (actionType === 'filter_buildings_dropdown') {
    return (
      <div className="space-y-3">
        <div className="space-y-2">
          <Label>Filter-Kriterien für Gebäude-Dropdown</Label>
          <p className="text-xs text-muted-foreground">
            Bestimmt welche Gebäude in der Adresssuche angezeigt werden
          </p>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Switch
              checked={config.only_completed || false}
              onCheckedChange={(v) => onChange({ ...config, only_completed: v })}
            />
            <span className="text-sm">Nur abgeschlossene Ausbauten</span>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={config.include_planned || false}
              onCheckedChange={(v) => onChange({ ...config, include_planned: v })}
            />
            <span className="text-sm">Geplante Ausbauten einschließen</span>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={config.only_with_products || false}
              onCheckedChange={(v) => onChange({ ...config, only_with_products: v })}
            />
            <span className="text-sm">Nur Gebäude mit zugewiesenen Produkten</span>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
