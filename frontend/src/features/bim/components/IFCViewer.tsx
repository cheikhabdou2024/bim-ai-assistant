import { Suspense, useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Environment, Center } from '@react-three/drei';
import * as THREE from 'three';
import { IFCLoader } from 'web-ifc-three/IFCLoader';
import { Spinner } from '../../../shared/components/ui/Spinner';

interface IFCModelProps {
  url: string
  onLoad?: () => void
  onError?: (msg: string) => void
}

function IFCModel({ url, onLoad, onError }: IFCModelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [model, setModel] = useState<THREE.Object3D | null>(null);

  useEffect(() => {
    const loader = new IFCLoader();
    // WASM is copied to /public by postinstall script
    loader.ifcManager.setWasmPath('/');

    loader.load(
      url,
      (ifcModel) => {
        setModel(ifcModel);
        onLoad?.();
      },
      undefined,
      (err) => {
        console.error('IFC load error', err);
        onError?.('Erreur lors du chargement du fichier IFC');
      },
    );

    return () => {
      loader.ifcManager.dispose();
    };
  }, [url, onLoad, onError]);

  if (!model) return null;

  return (
    <Center>
      <group ref={groupRef}>
        <primitive object={model} />
      </group>
    </Center>
  );
}

interface IFCViewerProps {
  url: string
}

export function IFCViewer({ url }: IFCViewerProps) {
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  return (
    <div className="relative h-full w-full bg-gray-900 rounded-lg overflow-hidden">
      {isModelLoading && !loadError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 text-white gap-3">
          <Spinner className="h-8 w-8" />
          <span className="text-sm">Chargement du modèle IFC…</span>
        </div>
      )}

      {loadError && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="rounded-lg bg-red-900/80 px-6 py-4 text-center text-red-200">
            <p className="font-medium">{loadError}</p>
            <p className="mt-1 text-xs opacity-70">Vérifiez que le fichier est valide</p>
          </div>
        </div>
      )}

      <Canvas
        camera={{ position: [20, 20, 20], fov: 45 }}
        shadows
        gl={{ antialias: true }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 20, 10]} intensity={1.2} castShadow />
        <directionalLight position={[-10, 10, -10]} intensity={0.4} />

        <Suspense fallback={null}>
          <IFCModel
            url={url}
            onLoad={() => setIsModelLoading(false)}
            onError={(msg) => {
              setIsModelLoading(false);
              setLoadError(msg);
            }}
          />
        </Suspense>

        <Grid
          args={[50, 50]}
          cellSize={1}
          cellThickness={0.5}
          sectionSize={5}
          sectionThickness={1}
          fadeDistance={40}
          position={[0, -0.01, 0]}
          cellColor="#4B5563"
          sectionColor="#6B7280"
        />

        <Environment preset="city" />
        <OrbitControls
          enablePan
          enableZoom
          enableRotate
          minDistance={2}
          maxDistance={200}
          makeDefault
        />
      </Canvas>

      {/* Controls hint */}
      {!isModelLoading && !loadError && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-xs text-gray-300">
          Clic gauche: rotation · Clic droit: déplacement · Molette: zoom
        </div>
      )}
    </div>
  );
}
