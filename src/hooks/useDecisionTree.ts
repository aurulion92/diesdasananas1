import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

export type NodeType = 'condition' | 'action';
export type ActionType = 'show_products' | 'show_contact_form' | 'show_message' | 'redirect' | 'show_gnv_form' | 'filter_buildings_dropdown' | 'set_connection_type';
export type OperatorType = 'equals' | 'not_equals' | 'is_null' | 'is_not_null' | 'in_list' | 'not_in_list' | 'greater_than' | 'less_than' | 'contains' | 'not_contains' | 'starts_with' | 'greater_or_equal' | 'less_or_equal';

export interface DecisionTree {
  id: string;
  name: string;
  description: string | null;
  customer_type: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DecisionTreeNode {
  id: string;
  tree_id: string;
  name: string;
  node_type: NodeType;
  is_root: boolean;
  position_x: number;
  position_y: number;
  created_at: string;
  updated_at: string;
  // Loaded relations
  conditions?: DecisionTreeCondition[];
  action?: DecisionTreeAction;
}

export interface DecisionTreeEdge {
  id: string;
  tree_id: string;
  source_node_id: string;
  target_node_id: string;
  label: string | null;
  sort_order: number;
  created_at: string;
}

export interface DecisionTreeCondition {
  id: string;
  node_id: string;
  field_name: string;
  operator: OperatorType;
  compare_value: string | null;
  sort_order: number;
  created_at: string;
}

export interface DecisionTreeAction {
  id: string;
  node_id: string;
  action_type: ActionType;
  config: Record<string, unknown>;
  created_at: string;
}

// Available fields for conditions
export const CONDITION_FIELDS = [
  // Adress-/Gebäude-Existenz
  { value: 'address_found', label: 'Adresse gefunden', type: 'boolean', description: 'Ob die Adresse in der Datenbank existiert' },
  { value: 'building_id', label: 'Gebäude-ID', type: 'text', description: 'Spezifische Gebäude-ID' },
  { value: 'building_in_list', label: 'Gebäude in Liste', type: 'building_list', description: 'Gebäude ist in einer bestimmten Gruppe' },
  
  // Ausbau
  { value: 'ausbau_art', label: 'Ausbauart', type: 'enum', options: ['ftth', 'fttb', 'ftth_limited'] },
  { value: 'ausbau_status', label: 'Ausbau Status', type: 'enum', options: ['abgeschlossen', 'im_ausbau', 'geplant'] },
  
  // Standort
  { value: 'street', label: 'Straße', type: 'text', description: 'Straßenname enthält oder ist gleich' },
  { value: 'postal_code', label: 'PLZ', type: 'text', description: 'Postleitzahl' },
  { value: 'city', label: 'Stadt', type: 'text' },
  { value: 'cluster', label: 'Cluster', type: 'text', description: 'Bau-Cluster (interne Gebietsunterteilung)' },
  
  // Gebäudeeigenschaften
  { value: 'building_type', label: 'Gebäudetyp', type: 'enum', options: ['efh', 'mfh', 'wowi'] },
  { value: 'residential_units', label: 'Wohneinheiten', type: 'number' },
  { value: 'kabel_tv_available', label: 'Kabel-TV verfügbar', type: 'boolean' },
  { value: 'gnv_vorhanden', label: 'GNV vorhanden', type: 'boolean' },
  
  // Tarifverfügbarkeit
  { value: 'pk_tariffs_available', label: 'PK Tarife verfügbar', type: 'boolean' },
  { value: 'kmu_tariffs_available', label: 'KMU Tarife verfügbar', type: 'boolean' },
  { value: 'is_sondertarif_building', label: 'Sondertarif-Gebäude', type: 'boolean', description: 'Gebäude mit Sondertarifen' },
  
  // Manuelle Überschreibungen
  { value: 'has_manual_override', label: 'Manuelle Überschreibung', type: 'boolean' },
  { value: 'manual_override_active', label: 'Überschreibung aktiv', type: 'boolean' },
  { value: 'protected_fields', label: 'Geschützte Felder', type: 'text_list', description: 'Welche Felder sind geschützt' },
  
  // Kundentyp (aus Bestellstrecke)
  { value: 'customer_type', label: 'Kundentyp', type: 'enum', options: ['pk', 'kmu'] },
  { value: 'business_type', label: 'Geschäftstyp', type: 'enum', options: ['neukunde', 'bestandskunde', 'umzug'] },
];

export const OPERATORS = [
  { value: 'equals', label: 'ist gleich' },
  { value: 'not_equals', label: 'ist nicht gleich' },
  { value: 'is_null', label: 'ist leer' },
  { value: 'is_not_null', label: 'ist nicht leer' },
  { value: 'in_list', label: 'ist in Liste' },
  { value: 'not_in_list', label: 'ist nicht in Liste' },
  { value: 'contains', label: 'enthält' },
  { value: 'not_contains', label: 'enthält nicht' },
  { value: 'starts_with', label: 'beginnt mit' },
  { value: 'greater_than', label: 'größer als' },
  { value: 'less_than', label: 'kleiner als' },
  { value: 'greater_or_equal', label: 'größer oder gleich' },
  { value: 'less_or_equal', label: 'kleiner oder gleich' },
];

export const ACTION_TYPES = [
  { 
    value: 'show_products', 
    label: 'Produkte anzeigen', 
    description: 'Zeigt Produktauswahl - mit Filtern und spezifischen Produkten'
  },
  { 
    value: 'show_contact_form', 
    label: 'Kontaktformular', 
    description: 'Zeigt das Kontaktformular für manuelle Bearbeitung'
  },
  { 
    value: 'show_message', 
    label: 'Nachricht anzeigen', 
    description: 'Zeigt eine benutzerdefinierte Nachricht (z.B. "Nicht verfügbar")'
  },
  { 
    value: 'redirect', 
    label: 'Weiterleitung', 
    description: 'Leitet zu einer externen URL weiter'
  },
  { 
    value: 'show_gnv_form', 
    label: 'GNV Formular', 
    description: 'Zeigt das GNV-Prüfungsformular'
  },
  {
    value: 'filter_buildings_dropdown',
    label: 'Gebäude-Dropdown filtern',
    description: 'Bestimmt welche Gebäude im Dropdown angezeigt werden'
  },
  {
    value: 'set_connection_type',
    label: 'Anschlusstyp setzen',
    description: 'Setzt den connectionType für die Bestellstrecke'
  },
];

export function useDecisionTrees() {
  const [trees, setTrees] = useState<DecisionTree[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrees = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('decision_trees')
        .select('*')
        .order('customer_type', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      setTrees(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrees();
  }, [fetchTrees]);

  const createTree = async (tree: Partial<DecisionTree>) => {
    const { data, error } = await supabase
      .from('decision_trees')
      .insert({
        name: tree.name || 'Neuer Baum',
        description: tree.description,
        customer_type: tree.customer_type || 'pk',
        is_active: tree.is_active ?? true,
      })
      .select()
      .single();

    if (error) throw error;
    await fetchTrees();
    return data;
  };

  const updateTree = async (id: string, updates: Partial<DecisionTree>) => {
    const { error } = await supabase
      .from('decision_trees')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
    await fetchTrees();
  };

  const deleteTree = async (id: string) => {
    const { error } = await supabase
      .from('decision_trees')
      .delete()
      .eq('id', id);

    if (error) throw error;
    await fetchTrees();
  };

  return { trees, loading, error, fetchTrees, createTree, updateTree, deleteTree };
}

export function useDecisionTreeEditor(treeId: string | null) {
  const [nodes, setNodes] = useState<DecisionTreeNode[]>([]);
  const [edges, setEdges] = useState<DecisionTreeEdge[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTree = useCallback(async () => {
    if (!treeId) {
      setNodes([]);
      setEdges([]);
      return;
    }

    setLoading(true);
    try {
      // Fetch nodes with conditions and actions
      const { data: nodesData, error: nodesError } = await supabase
        .from('decision_tree_nodes')
        .select('*')
        .eq('tree_id', treeId)
        .order('position_y', { ascending: true });

      if (nodesError) throw nodesError;

      // Fetch conditions for all nodes
      const nodeIds = (nodesData || []).map(n => n.id);
      const { data: conditionsData } = await supabase
        .from('decision_tree_conditions')
        .select('*')
        .in('node_id', nodeIds.length > 0 ? nodeIds : ['none'])
        .order('sort_order', { ascending: true });

      // Fetch actions for all nodes
      const { data: actionsData } = await supabase
        .from('decision_tree_actions')
        .select('*')
        .in('node_id', nodeIds.length > 0 ? nodeIds : ['none']);

      // Merge data
      const nodesWithRelations: DecisionTreeNode[] = (nodesData || []).map(node => {
        const nodeAction = (actionsData || []).find(a => a.node_id === node.id);
        return {
          ...node,
          node_type: node.node_type as NodeType,
          conditions: (conditionsData || [])
            .filter(c => c.node_id === node.id)
            .map(c => ({ ...c, operator: c.operator as OperatorType })),
          action: nodeAction
            ? {
                ...nodeAction,
                action_type: nodeAction.action_type as ActionType,
                config: (typeof nodeAction.config === 'object' && nodeAction.config !== null && !Array.isArray(nodeAction.config))
                  ? nodeAction.config as Record<string, unknown>
                  : {},
              }
            : undefined,
        };
      });

      setNodes(nodesWithRelations);

      // Fetch edges
      const { data: edgesData, error: edgesError } = await supabase
        .from('decision_tree_edges')
        .select('*')
        .eq('tree_id', treeId)
        .order('sort_order', { ascending: true });

      if (edgesError) throw edgesError;
      setEdges(edgesData || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  }, [treeId]);

  useEffect(() => {
    fetchTree();
  }, [fetchTree]);

  // Node operations
  const createNode = async (node: Partial<DecisionTreeNode>) => {
    const { data, error } = await supabase
      .from('decision_tree_nodes')
      .insert({
        tree_id: treeId!,
        name: node.name || 'Neuer Knoten',
        node_type: node.node_type || 'condition',
        is_root: node.is_root ?? false,
        position_x: node.position_x ?? 0,
        position_y: node.position_y ?? 0,
      })
      .select()
      .single();

    if (error) throw error;
    await fetchTree();
    return data;
  };

  const updateNode = async (id: string, updates: Partial<DecisionTreeNode>) => {
    const { error } = await supabase
      .from('decision_tree_nodes')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
    await fetchTree();
  };

  const deleteNode = async (id: string) => {
    const { error } = await supabase
      .from('decision_tree_nodes')
      .delete()
      .eq('id', id);

    if (error) throw error;
    await fetchTree();
  };

  // Edge operations
  const createEdge = async (edge: Partial<DecisionTreeEdge>) => {
    const { data, error } = await supabase
      .from('decision_tree_edges')
      .insert({
        tree_id: treeId!,
        source_node_id: edge.source_node_id!,
        target_node_id: edge.target_node_id!,
        label: edge.label,
        sort_order: edge.sort_order ?? 0,
      })
      .select()
      .single();

    if (error) throw error;
    await fetchTree();
    return data;
  };

  const updateEdge = async (id: string, updates: Partial<DecisionTreeEdge>) => {
    const { error } = await supabase
      .from('decision_tree_edges')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
    await fetchTree();
  };

  const deleteEdge = async (id: string) => {
    const { error } = await supabase
      .from('decision_tree_edges')
      .delete()
      .eq('id', id);

    if (error) throw error;
    await fetchTree();
  };

  // Condition operations
  const createCondition = async (condition: Partial<DecisionTreeCondition>) => {
    const { data, error } = await supabase
      .from('decision_tree_conditions')
      .insert({
        node_id: condition.node_id!,
        field_name: condition.field_name || 'ausbau_art',
        operator: condition.operator as any || 'equals',
        compare_value: condition.compare_value,
        sort_order: condition.sort_order ?? 0,
      })
      .select()
      .single();

    if (error) throw error;
    await fetchTree();
    return data;
  };

  const updateCondition = async (id: string, updates: Partial<DecisionTreeCondition>) => {
    const { error } = await supabase
      .from('decision_tree_conditions')
      .update({
        ...updates,
        operator: updates.operator as any,
      })
      .eq('id', id);

    if (error) throw error;
    await fetchTree();
  };

  const deleteCondition = async (id: string) => {
    const { error } = await supabase
      .from('decision_tree_conditions')
      .delete()
      .eq('id', id);

    if (error) throw error;
    await fetchTree();
  };

  // Action operations
  const saveAction = async (nodeId: string, action: Partial<DecisionTreeAction>) => {
    // Check if action exists
    const existing = nodes.find(n => n.id === nodeId)?.action;

    if (existing) {
      const { error } = await supabase
        .from('decision_tree_actions')
        .update({
          action_type: action.action_type as any,
          config: action.config as Json,
        })
        .eq('id', existing.id);

      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('decision_tree_actions')
        .insert([{
          node_id: nodeId,
          action_type: (action.action_type || 'show_products') as any,
          config: (action.config || {}) as Json,
        }])
        .select()
        .single();

      if (error) throw error;
    }
    await fetchTree();
  };

  const deleteAction = async (id: string) => {
    const { error } = await supabase
      .from('decision_tree_actions')
      .delete()
      .eq('id', id);

    if (error) throw error;
    await fetchTree();
  };

  return {
    nodes,
    edges,
    loading,
    error,
    fetchTree,
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
    deleteAction,
  };
}
