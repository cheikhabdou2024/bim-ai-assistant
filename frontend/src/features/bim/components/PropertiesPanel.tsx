import { SelectedObject } from './IFCViewer';

// ── IFC type → French label ───────────────────────────────────────────────────

const TYPE_LABEL: Record<string, string> = {
  IFCWALLSTANDARDCASE:  'Mur (Standard)',
  IFCWALL:              'Mur',
  IFCSLAB:              'Dalle',
  IFCSPACE:             'Espace',
  IFCCOLUMN:            'Colonne',
  IFCBEAM:              'Poutre',
  IFCDOOR:              'Porte',
  IFCWINDOW:            'Fenêtre',
  IFCROOF:              'Toiture',
  IFCSTAIRFLIGHT:       'Escalier',
  IFCFURNISHINGELEMENT: 'Mobilier',
  IFCBUILDINGSTOREY:    'Niveau',
  IFCBUILDING:          'Bâtiment',
  IFCSITE:              'Site',
  IFCPROJECT:           'Projet',
};

function formatType(type: string) {
  return TYPE_LABEL[type] ?? type.replace(/^IFC/, '');
}

// ── Extract displayable properties from IFC props object ─────────────────────

interface PropRow {
  label: string;
  value: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractRows(properties: Record<string, any>): PropRow[] {
  const rows: PropRow[] = [];

  const add = (label: string, raw: unknown) => {
    if (raw === null || raw === undefined) return;
    // IFC values are often wrapped: { value: "..." }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const val = (raw as any)?.value ?? raw;
    if (val === null || val === undefined) return;
    rows.push({ label, value: String(val) });
  };

  add('Nom',            properties.Name);
  add('Nom long',       properties.LongName);
  add('Description',    properties.Description);
  add('Type d\'objet',  properties.ObjectType);
  add('Type prédéfini', properties.PredefinedType);
  add('Tag',            properties.Tag);
  add('ID Express',     properties.expressID ?? properties.id);

  return rows.filter((r) => r.value && r.value !== 'null' && r.value !== 'undefined');
}

// ── Property row ─────────────────────────────────────────────────────────────

function Row({ label, value }: PropRow) {
  return (
    <div className="grid grid-cols-2 gap-2 py-2 border-b border-gray-100 last:border-0">
      <span className="text-xs text-gray-400 font-medium truncate">{label}</span>
      <span className="text-xs text-gray-700 break-words">{value}</span>
    </div>
  );
}

// ── Public PropertiesPanel component ─────────────────────────────────────────

interface PropertiesPanelProps {
  selected: SelectedObject | null;
  onClose: () => void;
}

export function PropertiesPanel({ selected, onClose }: PropertiesPanelProps) {
  if (!selected) return null;

  const rows = extractRows(selected.properties);

  return (
    <div className="flex h-full w-72 flex-col border-l border-gray-200 bg-white">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 border-b border-gray-100 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-gray-900">{selected.name}</p>
          <span className="mt-0.5 inline-block rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-600">
            {formatType(selected.type)}
          </span>
        </div>
        <button
          onClick={onClose}
          className="shrink-0 rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          aria-label="Fermer les propriétés"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Properties */}
      <div className="flex-1 overflow-y-auto px-4 py-2">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
          Propriétés
        </p>

        {rows.length > 0
          ? rows.map((r) => <Row key={r.label} {...r} />)
          : (
            <p className="py-4 text-center text-xs text-gray-400">
              Aucune propriété disponible
            </p>
          )
        }
      </div>
    </div>
  );
}
