import { useState } from 'react';
import { IfcNode } from './IFCViewer';

// ── IFC type display metadata ─────────────────────────────────────────────────

const TYPE_LABEL: Record<string, string> = {
  IFCPROJECT:            'Projet',
  IFCSITE:               'Site',
  IFCBUILDING:           'Bâtiment',
  IFCBUILDINGSTOREY:     'Niveau',
  IFCWALLSTANDARDCASE:   'Mur',
  IFCWALL:               'Mur',
  IFCSLAB:               'Dalle',
  IFCSPACE:              'Espace',
  IFCCOLUMN:             'Colonne',
  IFCBEAM:               'Poutre',
  IFCDOOR:               'Porte',
  IFCWINDOW:             'Fenêtre',
  IFCROOF:               'Toiture',
  IFCSTAIRFLIGHT:        'Escalier',
  IFCFURNISHINGELEMENT:  'Mobilier',
};

const TYPE_COLOR: Record<string, string> = {
  IFCWALLSTANDARDCASE:  'bg-blue-100 text-blue-700',
  IFCWALL:              'bg-blue-100 text-blue-700',
  IFCSLAB:              'bg-amber-100 text-amber-700',
  IFCSPACE:             'bg-green-100 text-green-700',
  IFCBUILDINGSTOREY:    'bg-purple-100 text-purple-700',
  IFCBUILDING:          'bg-indigo-100 text-indigo-700',
  IFCCOLUMN:            'bg-cyan-100 text-cyan-700',
  IFCBEAM:              'bg-teal-100 text-teal-700',
  IFCDOOR:              'bg-rose-100 text-rose-700',
  IFCWINDOW:            'bg-sky-100 text-sky-700',
};

function typeLabel(type: string) {
  return TYPE_LABEL[type] ?? type.replace(/^IFC/, '');
}

function typeBadgeColor(type: string) {
  return TYPE_COLOR[type] ?? 'bg-gray-100 text-gray-600';
}

// ── Group children by IFC type ────────────────────────────────────────────────

interface TypeGroup {
  type: string;
  nodes: IfcNode[];
}

function groupByType(nodes: IfcNode[]): TypeGroup[] {
  const map = new Map<string, IfcNode[]>();
  for (const node of nodes) {
    const existing = map.get(node.type);
    if (existing) {
      existing.push(node);
    } else {
      map.set(node.type, [node]);
    }
  }
  return Array.from(map.entries()).map(([type, items]) => ({ type, nodes: items }));
}

// ── Spatial types expand by default ──────────────────────────────────────────

const SPATIAL_TYPES = new Set([
  'IFCPROJECT', 'IFCSITE', 'IFCBUILDING', 'IFCBUILDINGSTOREY',
]);

// ── Chevron icon ──────────────────────────────────────────────────────────────

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-3 w-3 shrink-0 text-gray-400 transition-transform ${open ? 'rotate-90' : ''}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
    </svg>
  );
}

// ── Single tree node ──────────────────────────────────────────────────────────

interface TreeNodeProps {
  node: IfcNode;
  depth: number;
  selectedId: number | null;
  onSelect: (id: number) => void;
}

function TreeNode({ node, depth, selectedId, onSelect }: TreeNodeProps) {
  const isSpatial  = SPATIAL_TYPES.has(node.type);
  const [open, setOpen] = useState(isSpatial);

  const hasChildren = node.children.length > 0;
  const isSelected  = node.expressID === selectedId;
  const name        = node.Name?.value ?? node.LongName?.value ?? typeLabel(node.type);

  // If spatial type with children → render grouped children
  const childGroups = isSpatial ? groupByType(node.children) : [];

  const isLeaf = !hasChildren || !isSpatial;

  const handleClick = () => {
    if (hasChildren) setOpen((v) => !v);
    onSelect(node.expressID);
  };

  return (
    <div>
      {/* Row */}
      <button
        onClick={handleClick}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        className={`flex w-full items-center gap-1.5 rounded-md py-1.5 pr-2 text-left text-xs transition-colors
          ${isSelected
            ? 'bg-blue-50 text-blue-700 font-medium'
            : 'text-gray-700 hover:bg-gray-100'
          }`}
      >
        {hasChildren
          ? <Chevron open={open} />
          : <span className="h-3 w-3 shrink-0" />
        }
        <span className="truncate flex-1">{name}</span>
        {isLeaf && (
          <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium leading-none ${typeBadgeColor(node.type)}`}>
            {typeLabel(node.type)}
          </span>
        )}
      </button>

      {/* Children */}
      {open && hasChildren && (
        <div>
          {isSpatial
            ? childGroups.map((group) => (
                <TypeGroupNode
                  key={group.type}
                  group={group}
                  depth={depth + 1}
                  selectedId={selectedId}
                  onSelect={onSelect}
                />
              ))
            : node.children.map((child) => (
                <TreeNode
                  key={child.expressID}
                  node={child}
                  depth={depth + 1}
                  selectedId={selectedId}
                  onSelect={onSelect}
                />
              ))
          }
        </div>
      )}
    </div>
  );
}

// ── Category group inside a storey ────────────────────────────────────────────

interface TypeGroupNodeProps {
  group: TypeGroup;
  depth: number;
  selectedId: number | null;
  onSelect: (id: number) => void;
}

function TypeGroupNode({ group, depth, selectedId, onSelect }: TypeGroupNodeProps) {
  const [open, setOpen] = useState(false);
  const label = typeLabel(group.type);

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        className="flex w-full items-center gap-1.5 rounded-md py-1.5 pr-2 text-left text-xs text-gray-500 hover:bg-gray-100 transition-colors"
      >
        <Chevron open={open} />
        <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium leading-none ${typeBadgeColor(group.type)}`}>
          {label}
        </span>
        <span className="text-gray-400">({group.nodes.length})</span>
      </button>

      {open && group.nodes.map((node) => (
        <TreeNode
          key={node.expressID}
          node={node}
          depth={depth + 1}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

// ── Public ModelTree component ────────────────────────────────────────────────

interface ModelTreeProps {
  structure: IfcNode | null;
  selectedId: number | null;
  onSelect: (id: number) => void;
}

export function ModelTree({ structure, selectedId, onSelect }: ModelTreeProps) {
  if (!structure) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center text-gray-400">
        <svg className="mb-2 h-8 w-8 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
        <p className="text-xs">Structure en cours de chargement…</p>
      </div>
    );
  }

  return (
    <div className="select-none">
      <TreeNode
        node={structure}
        depth={0}
        selectedId={selectedId}
        onSelect={onSelect}
      />
    </div>
  );
}
