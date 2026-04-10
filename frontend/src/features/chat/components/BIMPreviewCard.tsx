import { BIMData } from '../types/chat.types';
import { useBIMGenerate } from '../hooks/useBIMGenerate';
import { Button } from '../../../shared/components/ui/Button';

interface BIMPreviewCardProps {
  bimData: BIMData;
}

export function BIMPreviewCard({ bimData }: BIMPreviewCardProps) {
  const { mutate: generate, isPending, isSuccess, data, isError } = useBIMGenerate();

  return (
    <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-lg">🏗️</span>
        <span className="text-sm font-semibold text-blue-800">Modèle BIM détecté</span>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2 text-xs text-blue-700">
        <div><span className="font-medium">Nom :</span> {bimData.name}</div>
        <div><span className="font-medium">Étages :</span> {bimData.floors}</div>
        <div><span className="font-medium">Largeur :</span> {bimData.width}m</div>
        <div><span className="font-medium">Longueur :</span> {bimData.length}m</div>
        <div><span className="font-medium">Hauteur/étage :</span> {bimData.height}m</div>
        {bimData.rooms && (
          <div><span className="font-medium">Pièces :</span> {bimData.rooms.length}</div>
        )}
      </div>

      {!isSuccess && (
        <Button
          size="sm"
          variant="primary"
          loading={isPending}
          disabled={isPending}
          onClick={() => generate(bimData)}
          className="w-full"
        >
          {isPending ? 'Génération IFC en cours…' : 'Générer le fichier IFC'}
        </Button>
      )}

      {isSuccess && data && (
        <a
          href={data.downloadUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 transition-colors"
        >
          <span>⬇</span> Télécharger le fichier IFC
        </a>
      )}

      {isError && (
        <div className="mt-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
          Erreur de génération. Veuillez réessayer.
          <button
            className="ml-2 underline"
            onClick={() => generate(bimData)}
          >
            Réessayer
          </button>
        </div>
      )}
    </div>
  );
}
