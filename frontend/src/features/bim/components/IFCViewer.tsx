import { Suspense, useEffect, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Grid, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { IFCLoader } from 'web-ifc-three/IFCLoader';
import { Spinner } from '../../../shared/components/ui/Spinner';

interface IFCModelProps {
  url: string
  onLoad?: () => void
  onError?: (msg: string) => void
}

function IFCModel({ url, onLoad, onError }: IFCModelProps) {
  const { camera, controls } = useThree();
  const [model, setModel] = useState<THREE.Object3D | null>(null);

  // Auto-fit camera to bounding box of loaded model
  const fitCamera = (obj: THREE.Object3D) => {
    const box = new THREE.Box3().setFromObject(obj);
    if (box.isEmpty()) return;

    const size   = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);

    const cam = camera as THREE.PerspectiveCamera;
    const fov = cam.fov * (Math.PI / 180);
    const dist = (maxDim / 2) / Math.tan(fov / 2) * 2.0;

    cam.position.set(
      center.x + dist * 0.8,
      center.y + dist * 0.6,
      center.z + dist * 0.8,
    );
    cam.lookAt(center);
    cam.near = dist / 100;
    cam.far  = dist * 10;
    cam.updateProjectionMatrix();

    // Update OrbitControls target
    if (controls) {
      (controls as unknown as { target: THREE.Vector3; update(): void }).target.copy(center);
      (controls as unknown as { target: THREE.Vector3; update(): void }).update();
    }
  };

  useEffect(() => {
    const loader = new IFCLoader();
    // WASM files are copied to /public by postinstall script
    loader.ifcManager.setWasmPath('/');

    loader.load(
      url,
      (ifcModel) => {
        setModel(ifcModel);
        fitCamera(ifcModel);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  if (!model) return null;

  return (
    <primitive object={model} />
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
        camera={{ position: [30, 20, 30], fov: 50, near: 0.1, far: 2000 }}
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
          minDistance={0.5}
          maxDistance={1000}
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
