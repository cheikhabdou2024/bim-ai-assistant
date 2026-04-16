import { Suspense, useEffect, useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { IFCLoader } from 'web-ifc-three/IFCLoader';
import { Spinner } from '../../../shared/components/ui/Spinner';

// ── Public types ──────────────────────────────────────────────────────────────

export interface IfcNode {
  expressID: number;
  type: string;
  Name?: { value: string };
  LongName?: { value: string };
  children: IfcNode[];
}

export interface SelectedObject {
  expressID: number;
  name: string;
  type: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  properties: Record<string, any>;
}

// ── Highlight material (singleton) ────────────────────────────────────────────

const HIGHLIGHT_MAT = new THREE.MeshLambertMaterial({
  color: 0x4a90e2,
  transparent: true,
  opacity: 0.65,
  depthTest: false,
});

// ── Camera fit ───────────────────────────────────────────────────────────────

function fitCamera(
  obj: THREE.Object3D,
  camera: THREE.Camera,
  controls: unknown,
) {
  const box = new THREE.Box3().setFromObject(obj);
  if (box.isEmpty()) return;
  const size   = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  const cam    = camera as THREE.PerspectiveCamera;
  const fov    = cam.fov * (Math.PI / 180);
  const dist   = (maxDim / 2) / Math.tan(fov / 2) * 2.0;

  cam.position.set(
    center.x + dist * 0.8,
    center.y + dist * 0.6,
    center.z + dist * 0.8,
  );
  cam.lookAt(center);
  cam.near = dist / 100;
  cam.far  = dist * 10;
  cam.updateProjectionMatrix();

  if (controls) {
    (controls as { target: THREE.Vector3; update(): void }).target.copy(center);
    (controls as { target: THREE.Vector3; update(): void }).update();
  }
}

// ── Inner scene component (inside Canvas) ────────────────────────────────────

interface IFCSceneProps {
  url: string;
  onLoad?: () => void;
  onError?: (msg: string) => void;
  onStructureReady?: (tree: IfcNode) => void;
  onObjectSelect?: (obj: SelectedObject | null) => void;
}

function IFCScene({ url, onLoad, onError, onStructureReady, onObjectSelect }: IFCSceneProps) {
  const { camera, controls, gl, scene } = useThree();
  const loaderRef  = useRef<IFCLoader | null>(null);
  const modelRef   = useRef<THREE.Object3D | null>(null);
  const [model, setModel] = useState<THREE.Object3D | null>(null);

  // Keep a stable ref to the latest controls so fitCamera always gets the
  // current OrbitControls instance even when called from an async callback.
  const controlsRef = useRef(controls);
  useEffect(() => { controlsRef.current = controls; }, [controls]);

  // Load IFC ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const loader = new IFCLoader();
    loaderRef.current = loader;
    loader.ifcManager.setWasmPath('/');

    loader.load(
      url,
      async (ifcModel) => {
        modelRef.current = ifcModel;
        setModel(ifcModel);   // triggers the fitCamera effect below

        try {
          const structure = await loader.ifcManager.getSpatialStructure(0, true);
          onStructureReady?.(structure as IfcNode);
        } catch (e) {
          console.warn('getSpatialStructure failed', e);
        }

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

  // Fit camera once model is in React state (OrbitControls is mounted by then) ─
  useEffect(() => {
    if (!model) return;
    // One animation frame is enough for OrbitControls to register with makeDefault
    const id = requestAnimationFrame(() => {
      fitCamera(model, camera, controlsRef.current);
    });
    return () => cancelAnimationFrame(id);
  }, [model, camera]);

  // Click → select IFC element ────────────────────────────────────────────────
  useEffect(() => {
    const canvas = gl.domElement;

    let startX = 0;
    let startY = 0;

    const onMouseDown = (e: MouseEvent) => {
      startX = e.clientX;
      startY = e.clientY;
    };

    const onClick = async (event: MouseEvent) => {
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      if (Math.sqrt(dx * dx + dy * dy) > 5) return;

      if (!loaderRef.current || !modelRef.current) return;

      const rect   = canvas.getBoundingClientRect();
      const mouse  = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width)  *  2 - 1,
        -((event.clientY - rect.top)  / rect.height) *  2 + 1,
      );

      const raycaster = new THREE.Raycaster();
      (raycaster as unknown as { firstHitOnly: boolean }).firstHitOnly = true;
      raycaster.setFromCamera(mouse, camera);

      const intersects = raycaster.intersectObjects(
        modelRef.current.children as THREE.Object3D[],
        true,
      );

      if (!intersects.length) {
        try { loaderRef.current.ifcManager.removeSubset(0, HIGHLIGHT_MAT); } catch (_) { /* ignore */ }
        onObjectSelect?.(null);
        return;
      }

      const { object, faceIndex } = intersects[0];
      if (faceIndex === undefined) return;

      const mesh      = object as THREE.Mesh;
      const expressID = loaderRef.current.ifcManager.getExpressId(mesh.geometry, faceIndex);

      try {
        loaderRef.current.ifcManager.createSubset({
          modelID: 0,
          ids: [expressID],
          material: HIGHLIGHT_MAT,
          scene,
          removePrevious: true,
        });
      } catch (e) {
        console.warn('createSubset error', e);
      }

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const props: any = await loaderRef.current.ifcManager.getItemProperties(0, expressID, true);
        const name = props?.Name?.value ?? props?.LongName?.value ?? `Élément ${expressID}`;
        onObjectSelect?.({ expressID, name, type: props?.type ?? 'Inconnu', properties: props ?? {} });
      } catch (_) {
        onObjectSelect?.({ expressID, name: `Élément ${expressID}`, type: 'Inconnu', properties: {} });
      }
    };

    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('click', onClick);
    return () => {
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('click', onClick);
    };
  }, [gl, camera, scene, onObjectSelect]);

  if (!model) return null;
  return <primitive object={model} />;
}

// ── Public IFCViewer component ───────────────────────────────────────────────

interface IFCViewerProps {
  url: string;
  onStructureReady?: (tree: IfcNode) => void;
  onObjectSelect?: (obj: SelectedObject | null) => void;
}

export function IFCViewer({ url, onStructureReady, onObjectSelect }: IFCViewerProps) {
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [loadError, setLoadError]           = useState<string | null>(null);

  return (
    /*
     * absolute inset-0 — fills the nearest `relative` parent (main in ViewerModal)
     * with pixel-accurate dimensions. R3F Canvas then gets a concrete size from
     * ResizeObserver and never overflows its container.
     */
    <div className="absolute inset-0 overflow-hidden bg-slate-100">
      {isModelLoading && !loadError && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 text-gray-500">
          <Spinner className="h-8 w-8 text-blue-500" />
          <span className="text-sm font-medium">Chargement du modèle IFC…</span>
        </div>
      )}

      {loadError && (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <div className="max-w-sm rounded-xl border border-red-200 bg-red-50 px-6 py-5 text-center">
            <p className="font-medium text-red-700">{loadError}</p>
            <p className="mt-1 text-xs text-red-400">Vérifiez que le fichier est valide</p>
          </div>
        </div>
      )}

      {/*
       * Canvas gets explicit width/height 100% so R3F never computes 0px
       * dimensions in a flex/absolute stacking context.
       */}
      <Canvas
        camera={{ position: [30, 20, 30], fov: 50, near: 0.1, far: 2000 }}
        shadows
        gl={{ antialias: true }}
        style={{ width: '100%', height: '100%', background: '#f1f5f9' }}
      >
        <ambientLight intensity={0.85} />
        <directionalLight position={[10, 20, 10]} intensity={1.0} castShadow />
        <directionalLight position={[-10, 10, -10]} intensity={0.3} />

        <Suspense fallback={null}>
          <IFCScene
            url={url}
            onLoad={() => setIsModelLoading(false)}
            onError={(msg) => { setIsModelLoading(false); setLoadError(msg); }}
            onStructureReady={onStructureReady}
            onObjectSelect={onObjectSelect}
          />
        </Suspense>

        <Grid
          args={[100, 100]}
          cellSize={1}
          cellThickness={0.4}
          sectionSize={5}
          sectionThickness={0.8}
          fadeDistance={60}
          position={[0, -0.01, 0]}
          cellColor="#CBD5E1"
          sectionColor="#94A3B8"
        />

        <OrbitControls
          enablePan
          enableZoom
          enableRotate
          minDistance={0.5}
          maxDistance={1000}
          makeDefault
        />
      </Canvas>

      {!isModelLoading && !loadError && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-gray-200 bg-white/80 px-3 py-1 text-xs text-gray-500 shadow-sm backdrop-blur-sm">
          Clic gauche: rotation &nbsp;·&nbsp; Clic droit: déplacement &nbsp;·&nbsp; Molette: zoom
        </div>
      )}
    </div>
  );
}
