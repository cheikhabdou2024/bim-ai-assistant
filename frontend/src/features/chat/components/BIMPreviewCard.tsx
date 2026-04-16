import { useEffect, useRef, useState } from 'react';
import { AxiosError } from 'axios';
import { BIMData } from '../types/chat.types';
import { useBIMGenerate, BIMValidationError } from '../hooks/useBIMGenerate';

// ── Error classification ──────────────────────────────────────────────────────

interface ErrorInfo {
  title: string;
  detail: string | null;   // raw server message — shown as code-style hint
  hint: string;
  canRetry: boolean;
}

function classifyError(error: unknown): ErrorInfo {
  // ── 1. Validation errors (bim-service schema check) ──────────────────────
  if (error instanceof BIMValidationError) {
    return {
      title:    'Données BIM invalides',
      detail:   error.errors.join(' · '),
      hint:     'L\'IA a généré des paramètres hors limites. Reformulez votre demande (ex: réduisez la hauteur par étage ou le nombre d\'étages).',
      canRetry: false,
    };
  }

  const axiosErr   = error as AxiosError<{ message?: string }>;
  const status     = axiosErr?.response?.status;
  const serverMsg  = (axiosErr?.response?.data?.message ?? '').toLowerCase();
  const serverRaw  = axiosErr?.response?.data?.message ?? null;

  // ── 2. Rate limit ────────────────────────────────────────────────────────
  if (status === 429) {
    return {
      title:    'Limite de génération atteinte',
      detail:   null,
      hint:     '5 modèles maximum par minute. Attendez 60 secondes puis réessayez.',
      canRetry: false,
    };
  }

  // ── 3. bim-service returned a timeout ────────────────────────────────────
  if (serverMsg.includes('timeout')) {
    return {
      title:    'Génération trop longue',
      detail:   null,
      hint:     'Essayez un bâtiment plus simple : moins d\'étages ou des dimensions réduites.',
      canRetry: true,
    };
  }

  // ── 4. S3 / stockage ─────────────────────────────────────────────────────
  if (serverMsg.includes('s3') || serverMsg.includes('bucket') || serverMsg.includes('upload')) {
    return {
      title:    'Erreur de stockage (S3)',
      detail:   serverRaw,
      hint:     'Le service de stockage est mal configuré. Vérifiez AWS_S3_BUCKET dans Secrets Manager.',
      canRetry: false,
    };
  }

  // ── 5. Service 502 / 503 ─────────────────────────────────────────────────
  if (status === 502 || status === 503) {
    return {
      title:    'Service BIM indisponible',
      detail:   serverRaw,                      // show actual Python/backend error
      hint:     'Le service est en démarrage ou a planté. Réessayez dans quelques secondes.',
      canRetry: true,
    };
  }

  // ── 6. No network response ───────────────────────────────────────────────
  if (!status) {
    return {
      title:    'Erreur de connexion',
      detail:   null,
      hint:     'Vérifiez votre connexion internet et réessayez.',
      canRetry: true,
    };
  }

  // ── 7. Fallback ──────────────────────────────────────────────────────────
  return {
    title:    'Erreur lors de la génération',
    detail:   serverRaw,
    hint:     'Une erreur inattendue s\'est produite.',
    canRetry: true,
  };
}

// ── Progress simulation (cubic ease-out, 90% at ~30s) ────────────────────────

function useGenerationProgress(isActive: boolean) {
  const [pct,  setPct]  = useState(0);
  const [secs, setSecs] = useState(0);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isActive) {
      if (ref.current) clearInterval(ref.current);
      setPct(0); setSecs(0);
      return;
    }
    const startAt   = Date.now();
    const TARGET_MS = 30_000;
    ref.current = setInterval(() => {
      const elapsed = Date.now() - startAt;
      setSecs(Math.floor(elapsed / 1000));
      const t     = Math.min(elapsed / TARGET_MS, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setPct(Math.round(eased * 90));
    }, 400);
    return () => { if (ref.current) clearInterval(ref.current); };
  }, [isActive]);

  return { pct, secs };
}

// ── BIMPreviewCard ────────────────────────────────────────────────────────────

interface BIMPreviewCardProps {
  bimData: BIMData;
}

export function BIMPreviewCard({ bimData }: BIMPreviewCardProps) {
  const { mutate: generate, isPending, isSuccess, isError, data, error } = useBIMGenerate();
  const { pct, secs } = useGenerationProgress(isPending);

  const isIdle  = !isPending && !isSuccess && !isError;
  const errInfo = isError ? classifyError(error) : null;

  return (
    <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50 p-4">

      {/* ── Header ── */}
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-blue-600 text-white">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        </div>
        <span className="text-sm font-semibold text-blue-800">Modèle BIM détecté</span>
      </div>

      {/* ── Specs grid ── */}
      <div className="mb-3 grid grid-cols-2 gap-1.5 text-xs text-blue-700">
        <div><span className="font-medium">Nom :</span> {bimData.name}</div>
        <div><span className="font-medium">Étages :</span> {bimData.floors}</div>
        <div><span className="font-medium">Largeur :</span> {bimData.width} m</div>
        <div><span className="font-medium">Longueur :</span> {bimData.length} m</div>
        <div><span className="font-medium">H. étage :</span> {bimData.height} m</div>
        {bimData.rooms && (
          <div><span className="font-medium">Pièces :</span> {bimData.rooms.length}</div>
        )}
      </div>

      {/* ── IDLE — generate button ── */}
      {isIdle && (
        <button
          onClick={() => generate(bimData)}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-blue-700 active:scale-[0.98]"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
          </svg>
          Générer le fichier IFC
        </button>
      )}

      {/* ── LOADING — progress bar + step label ── */}
      {isPending && (
        <div className="rounded-lg border border-blue-100 bg-white px-3 py-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="text-xs font-medium text-blue-700">
                {secs < 3 ? 'Validation des paramètres…' : 'Génération du modèle 3D…'}
              </span>
            </div>
            <span className="text-[11px] text-gray-400 tabular-nums">{secs}s</span>
          </div>

          <div className="h-1.5 w-full overflow-hidden rounded-full bg-blue-100">
            <div
              className="h-full rounded-full bg-blue-500 transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>

          <p className="mt-1.5 text-[11px] text-gray-400">
            {secs < 3
              ? 'Vérification des données BIM…'
              : 'Génération IFC + upload S3 (jusqu\'à 35 secondes)'}
          </p>
        </div>
      )}

      {/* ── ERROR ── */}
      {isError && errInfo && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-3">
          {/* Icon + title + hint */}
          <div className="flex gap-2.5">
            <svg className="mt-0.5 h-4 w-4 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-red-700">{errInfo.title}</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-red-500">{errInfo.hint}</p>
            </div>
          </div>

          {/* Raw server detail — helps diagnose infra issues */}
          {errInfo.detail && (
            <p className="mt-2 rounded bg-red-100 px-2 py-1 font-mono text-[10px] leading-relaxed text-red-600 break-all">
              {errInfo.detail}
            </p>
          )}

          {/* Action */}
          {errInfo.canRetry ? (
            <button
              onClick={() => generate(bimData)}
              className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-50"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Réessayer la génération
            </button>
          ) : (
            <p className="mt-2 text-center text-[11px] text-red-400">
              {error instanceof BIMValidationError
                ? 'Demandez à l\'IA de corriger les paramètres puis régénérez.'
                : 'Réessayez dans 60 secondes.'}
            </p>
          )}
        </div>
      )}

      {/* ── SUCCESS ── */}
      {isSuccess && data && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-3">
          <div className="mb-2.5 flex items-center gap-2">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-white">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="text-xs font-semibold text-green-700">
              Fichier IFC généré — {data.floors} étage{data.floors > 1 ? 's' : ''}
            </span>
          </div>

          <a
            href={data.downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-green-700"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Télécharger le fichier IFC
          </a>

          {data.fileName && (
            <p className="mt-1.5 truncate text-center text-[11px] text-green-600 opacity-60">
              {data.fileName}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
