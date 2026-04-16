import { useEffect, useRef, useState } from 'react';
import { AxiosError } from 'axios';
import { BIMData } from '../types/chat.types';
import { useBIMGenerate } from '../hooks/useBIMGenerate';

// ── Error classification ──────────────────────────────────────────────────────

interface ErrorInfo {
  title: string;
  hint: string;
  canRetry: boolean;
}

function classifyError(error: unknown): ErrorInfo {
  const axiosErr  = error as AxiosError<{ message?: string }>;
  const status    = axiosErr?.response?.status;
  const serverMsg = (axiosErr?.response?.data?.message ?? '').toLowerCase();

  if (status === 429) {
    return {
      title:    'Limite de génération atteinte',
      hint:     '5 modèles maximum par minute. Attendez 60 secondes puis réessayez.',
      canRetry: false,
    };
  }
  if (serverMsg.includes('timeout')) {
    return {
      title:    'Génération trop longue',
      hint:     'Le modèle est complexe (trop d\'étages ?). Réduisez les dimensions et réessayez.',
      canRetry: true,
    };
  }
  if (status === 502 || status === 503) {
    return {
      title:    'Service temporairement indisponible',
      hint:     'Le service BIM est en cours de démarrage. Réessayez dans quelques secondes.',
      canRetry: true,
    };
  }
  if (!status) {
    return {
      title:    'Erreur de connexion',
      hint:     'Vérifiez votre connexion internet et réessayez.',
      canRetry: true,
    };
  }
  return {
    title:    'Erreur lors de la génération',
    hint:     'Une erreur inattendue s\'est produite. Réessayez.',
    canRetry: true,
  };
}

// ── Progress simulation (ease-out over ~30s to 90%) ──────────────────────────

function useGenerationProgress(isActive: boolean) {
  const [pct,  setPct]  = useState(0);
  const [secs, setSecs] = useState(0);
  const rafRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isActive) {
      if (rafRef.current) clearInterval(rafRef.current);
      setPct(0);
      setSecs(0);
      return;
    }

    const startAt   = Date.now();
    const TARGET_MS = 30_000; // ease-out reaches 90% at ~30s

    rafRef.current = setInterval(() => {
      const elapsed = Date.now() - startAt;
      setSecs(Math.floor(elapsed / 1000));
      // Cubic ease-out: fast at start, very slow near 90%
      const t     = Math.min(elapsed / TARGET_MS, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setPct(Math.round(eased * 90));
    }, 400);

    return () => {
      if (rafRef.current) clearInterval(rafRef.current);
    };
  }, [isActive]);

  return { pct, secs };
}

// ── BIMPreviewCard ────────────────────────────────────────────────────────────

interface BIMPreviewCardProps {
  bimData: BIMData;
}

export function BIMPreviewCard({ bimData }: BIMPreviewCardProps) {
  const {
    mutate:   generate,
    isPending,
    isSuccess,
    isError,
    data,
    error,
  } = useBIMGenerate();

  const { pct, secs } = useGenerationProgress(isPending);

  const isIdle   = !isPending && !isSuccess && !isError;
  const errInfo  = isError ? classifyError(error) : null;

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

      {/* ── LOADING — progress bar ── */}
      {isPending && (
        <div className="rounded-lg border border-blue-100 bg-white px-3 py-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Spinner */}
              <svg
                className="h-4 w-4 animate-spin text-blue-500"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="text-xs font-medium text-blue-700">Génération en cours…</span>
            </div>
            <span className="text-[11px] text-gray-400 tabular-nums">{secs}s</span>
          </div>

          {/* Progress bar */}
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-blue-100">
            <div
              className="h-full rounded-full bg-blue-500 transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>

          <p className="mt-1.5 text-[11px] text-gray-400">
            Génération du modèle 3D + upload (peut prendre jusqu'à 35 secondes)
          </p>
        </div>
      )}

      {/* ── ERROR — contextual message + retry ── */}
      {isError && errInfo && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-3">
          {/* Icon + message */}
          <div className="flex gap-2.5">
            <svg className="mt-0.5 h-4 w-4 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-red-700">{errInfo.title}</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-red-500">{errInfo.hint}</p>
            </div>
          </div>

          {/* Retry button */}
          {errInfo.canRetry && (
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
          )}

          {!errInfo.canRetry && (
            <p className="mt-2 text-center text-[11px] text-red-400">
              Réessayez dans 60 secondes
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
