import {
  Component,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Canvas, useFrame, useLoader, useThree, type ThreeEvent } from '@react-three/fiber';
import { Html, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { OrbitControls as OrbitControlsImpl } from 'three/examples/jsm/controls/OrbitControls.js';
import type { OrganId } from './types';
import { ORGANS, ORGAN_ORDER, STATUS_COLOR } from './data';

/* -------------------------------------------------------------------------- */
/*  Config                                                                    */
/* -------------------------------------------------------------------------- */

const MODEL_URL = '/models/human.glb';
const MODEL_HEIGHT = 1.8;
const DEFAULT_TARGET_ARR: [number, number, number] = [0, 0.95, 0];
const DEFAULT_CAMERA_ARR: [number, number, number] = [0, 1.15, 3.7];
const DEFAULT_TARGET = new THREE.Vector3(...DEFAULT_TARGET_ARR);
const DEFAULT_CAMERA = new THREE.Vector3(...DEFAULT_CAMERA_ARR);

const ORGAN_COLOR: Record<OrganId, string> = {
  brain: '#a78bfa',
  eyes: '#22d3ee',
  heart: '#f87171',
  lungs: '#60a5fa',
  muscles: '#fb923c',
  bones: '#e5e7eb',
};

/** Mesh-name patterns used to bind meshes inside human.glb to organs. */
const MESH_PATTERNS: Array<[OrganId, RegExp]> = [
  ['brain', /brain|cerebr|cerebell/i],
  ['eyes', /eye|retina|cornea|iris/i],
  ['heart', /heart|cardiac|ventric|atrium|aorta/i],
  ['lungs', /lung|bronch|trachea/i],
  ['muscles', /muscle|biceps|triceps|quad|deltoid|pector|gluteus|gastroc|hamstring/i],
  ['bones', /bone|skelet|femur|spine|vertebra|rib|skull|tibia|humerus|pelvis/i],
];

function matchOrgan(name: string): OrganId | null {
  for (const [id, re] of MESH_PATTERNS) if (re.test(name)) return id;
  return null;
}

interface Anchor {
  pos: [number, number, number];
  scale: [number, number, number];
}

/** Anatomical hotspot volumes in normalised model space (feet at y = 0, facing +z). */
const ANCHORS: Record<OrganId, Anchor[]> = {
  brain: [{ pos: [0, 1.7, -0.01], scale: [0.075, 0.06, 0.085] }],
  eyes: [
    { pos: [-0.04, 1.665, 0.085], scale: [0.022, 0.016, 0.016] },
    { pos: [0.04, 1.665, 0.085], scale: [0.022, 0.016, 0.016] },
  ],
  heart: [{ pos: [0.04, 1.28, 0.06], scale: [0.05, 0.06, 0.045] }],
  lungs: [
    { pos: [-0.095, 1.32, 0.01], scale: [0.06, 0.09, 0.05] },
    { pos: [0.095, 1.32, 0.01], scale: [0.06, 0.09, 0.05] },
  ],
  muscles: [
    { pos: [-0.27, 1.27, 0], scale: [0.05, 0.13, 0.05] },
    { pos: [0.27, 1.27, 0], scale: [0.05, 0.13, 0.05] },
    { pos: [-0.1, 0.62, 0.02], scale: [0.08, 0.2, 0.08] },
    { pos: [0.1, 0.62, 0.02], scale: [0.08, 0.2, 0.08] },
  ],
  bones: [
    { pos: [0, 1.15, -0.07], scale: [0.025, 0.3, 0.025] },
    { pos: [-0.1, 0.45, 0], scale: [0.025, 0.16, 0.025] },
    { pos: [0.1, 0.45, 0], scale: [0.025, 0.16, 0.025] },
  ],
};

/* -------------------------------------------------------------------------- */
/*  Materials                                                                 */
/* -------------------------------------------------------------------------- */

function makeGhostMaterial() {
  return new THREE.MeshStandardMaterial({
    color: '#0b3a4f',
    emissive: '#22d3ee',
    emissiveIntensity: 0.12,
    transparent: true,
    opacity: 0.32,
    roughness: 0.4,
    metalness: 0.2,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

function makeOrganMaterial(organ: OrganId) {
  return new THREE.MeshStandardMaterial({
    color: ORGAN_COLOR[organ],
    emissive: ORGAN_COLOR[organ],
    emissiveIntensity: 0.15,
    roughness: 0.45,
    metalness: 0.1,
    transparent: true,
    opacity: 0.92,
  });
}

/* -------------------------------------------------------------------------- */
/*  GLB human                                                                 */
/* -------------------------------------------------------------------------- */

interface ModelProps {
  hovered: OrganId | null;
  selected: OrganId | null;
  onHover: (id: OrganId | null) => void;
  onSelect: (id: OrganId) => void;
  onLoaded: (matched: OrganId[]) => void;
}

interface MeshEntry {
  organ: OrganId | null;
  material: THREE.MeshStandardMaterial;
}

function GlbHuman({ hovered, selected, onHover, onSelect, onLoaded }: ModelProps) {
  const gltf = useLoader(GLTFLoader, MODEL_URL);

  const { root, entries, matched } = useMemo(() => {
    const cloned = cloneSkinned(gltf.scene) as THREE.Object3D;
    const list: MeshEntry[] = [];
    const found = new Set<OrganId>();

    cloned.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      const organ = matchOrgan(`${mesh.name} ${mesh.parent?.name ?? ''}`);
      const material = organ ? makeOrganMaterial(organ) : makeGhostMaterial();
      mesh.material = material;
      mesh.userData.organ = organ;
      if (organ) found.add(organ);
      else mesh.raycast = () => undefined; // ghost shell never blocks hotspots
      list.push({ organ, material });
    });

    // Normalise: height 1.8, centred on x/z, feet on y = 0.
    const box = new THREE.Box3().setFromObject(cloned);
    const size = box.getSize(new THREE.Vector3());
    const s = size.y > 0 ? MODEL_HEIGHT / size.y : 1;
    cloned.scale.multiplyScalar(s);
    const box2 = new THREE.Box3().setFromObject(cloned);
    const center = box2.getCenter(new THREE.Vector3());
    cloned.position.x -= center.x;
    cloned.position.z -= center.z;
    cloned.position.y -= box2.min.y;

    return { root: cloned, entries: list, matched: Array.from(found) };
  }, [gltf]);

  useEffect(() => {
    onLoaded(matched);
  }, [matched, onLoaded]);

  useEffect(
    () => () => {
      entries.forEach((e) => e.material.dispose());
    },
    [entries],
  );

  useFrame((_, dt) => {
    const k = 1 - Math.exp(-8 * dt);
    entries.forEach(({ organ, material }) => {
      if (!organ) {
        const dim = selected ? 0.07 : 0.12;
        material.emissiveIntensity += (dim - material.emissiveIntensity) * k;
        return;
      }
      const goal = selected === organ ? 1.3 : hovered === organ ? 0.85 : 0.15;
      material.emissiveIntensity += (goal - material.emissiveIntensity) * k;
    });
  });

  const organFromEvent = (e: { object: THREE.Object3D }) =>
    (e.object.userData.organ as OrganId | null | undefined) ?? null;

  return (
    <primitive
      object={root}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => {
        const id = organFromEvent(e);
        if (id) {
          e.stopPropagation();
          onHover(id);
        }
      }}
      onPointerOut={(e: ThreeEvent<PointerEvent>) => {
        if (organFromEvent(e)) onHover(null);
      }}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        const id = organFromEvent(e);
        if (id) {
          e.stopPropagation();
          onSelect(id);
        }
      }}
    />
  );
}

/* -------------------------------------------------------------------------- */
/*  Procedural fallback body (used when /models/human.glb cannot be loaded)   */
/* -------------------------------------------------------------------------- */

function ProceduralBody() {
  const material = useMemo(makeGhostMaterial, []);
  useEffect(() => () => material.dispose(), [material]);

  const parts: Array<{
    key: string;
    pos: [number, number, number];
    rot?: [number, number, number];
    scale?: [number, number, number];
    geo: 'sphere' | 'capsule';
    args: number[];
  }> = [
    { key: 'head', pos: [0, 1.67, 0], geo: 'sphere', args: [0.11] },
    { key: 'neck', pos: [0, 1.53, 0], geo: 'capsule', args: [0.04, 0.06] },
    { key: 'torso', pos: [0, 1.22, 0], scale: [1, 1, 0.62], geo: 'capsule', args: [0.17, 0.46] },
    { key: 'pelvis', pos: [0, 0.88, 0], scale: [1.1, 0.7, 0.7], geo: 'sphere', args: [0.16] },
    { key: 'armL', pos: [-0.27, 1.28, 0], rot: [0, 0, 0.1], geo: 'capsule', args: [0.05, 0.26] },
    { key: 'armR', pos: [0.27, 1.28, 0], rot: [0, 0, -0.1], geo: 'capsule', args: [0.05, 0.26] },
    { key: 'foreL', pos: [-0.31, 0.98, 0], rot: [0, 0, 0.05], geo: 'capsule', args: [0.04, 0.26] },
    { key: 'foreR', pos: [0.31, 0.98, 0], rot: [0, 0, -0.05], geo: 'capsule', args: [0.04, 0.26] },
    { key: 'thighL', pos: [-0.1, 0.62, 0], geo: 'capsule', args: [0.075, 0.36] },
    { key: 'thighR', pos: [0.1, 0.62, 0], geo: 'capsule', args: [0.075, 0.36] },
    { key: 'shinL', pos: [-0.1, 0.24, 0], geo: 'capsule', args: [0.055, 0.34] },
    { key: 'shinR', pos: [0.1, 0.24, 0], geo: 'capsule', args: [0.055, 0.34] },
  ];

  return (
    <group>
      {parts.map((p) => (
        <mesh key={p.key} position={p.pos} rotation={p.rot} scale={p.scale} material={material}>
          {p.geo === 'sphere' ? (
            <sphereGeometry args={[p.args[0], 32, 32]} />
          ) : (
            <capsuleGeometry args={[p.args[0], p.args[1], 8, 20]} />
          )}
        </mesh>
      ))}
      <mesh position={[0, 1.22, 0]} scale={[1, 1, 0.62]}>
        <capsuleGeometry args={[0.172, 0.46, 8, 20]} />
        <meshBasicMaterial color="#22d3ee" wireframe transparent opacity={0.12} />
      </mesh>
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/*  Hotspots                                                                  */
/* -------------------------------------------------------------------------- */

interface HotspotProps {
  organ: OrganId;
  hovered: boolean;
  selected: boolean;
  onHover: (id: OrganId | null) => void;
  onSelect: (id: OrganId) => void;
}

function Hotspot({ organ, hovered, selected, onHover, onSelect }: HotspotProps) {
  const group = useRef<THREE.Group>(null);
  const anchors = ANCHORS[organ];
  const color = ORGAN_COLOR[organ];

  useFrame(({ clock }, dt) => {
    const g = group.current;
    if (!g) return;
    const k = 1 - Math.exp(-8 * dt);
    const pulse = 1 + Math.sin(clock.elapsedTime * 2.6 + organ.length) * 0.05;
    const boost = selected ? 1.35 : hovered ? 1.2 : 1;
    g.children.forEach((child, i) => {
      const mesh = child as THREE.Mesh;
      const a = anchors[i];
      if (!a) return;
      const sc = pulse * boost;
      mesh.scale.x += (a.scale[0] * sc - mesh.scale.x) * k;
      mesh.scale.y += (a.scale[1] * sc - mesh.scale.y) * k;
      mesh.scale.z += (a.scale[2] * sc - mesh.scale.z) * k;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      const goalE = selected ? 1.6 : hovered ? 1.1 : 0.45;
      const goalO = selected ? 0.95 : hovered ? 0.8 : 0.5;
      mat.emissiveIntensity += (goalE - mat.emissiveIntensity) * k;
      mat.opacity += (goalO - mat.opacity) * k;
    });
  });

  const labelPos = anchors[0].pos;
  const showLabel = hovered || selected;

  return (
    <>
      <group ref={group}>
        {anchors.map((a, i) => (
          <mesh
            key={i}
            position={a.pos}
            scale={a.scale}
            onPointerOver={(e) => {
              e.stopPropagation();
              onHover(organ);
            }}
            onPointerOut={() => onHover(null)}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(organ);
            }}
          >
            <sphereGeometry args={[1, 24, 24]} />
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={0.45}
              transparent
              opacity={0.5}
              depthWrite={false}
            />
          </mesh>
        ))}
      </group>
      {showLabel && (
        <Html position={[labelPos[0], labelPos[1] + 0.09, labelPos[2]]} center style={{ pointerEvents: 'none' }}>
          <div
            className="whitespace-nowrap rounded border px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest backdrop-blur"
            style={{
              borderColor: `${color}99`,
              color,
              background: 'rgba(8,16,32,0.78)',
              boxShadow: `0 0 12px ${color}55`,
            }}
          >
            {ORGANS[organ].name}
          </div>
        </Html>
      )}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  Scene helpers                                                             */
/* -------------------------------------------------------------------------- */

function CameraRig({ selected, resetSignal }: { selected: OrganId | null; resetSignal: number }) {
  const controls = useThree((s) => s.controls) as unknown as OrbitControlsImpl | null;
  const camera = useThree((s) => s.camera);
  const goal = useRef(DEFAULT_TARGET.clone());

  useEffect(() => {
    if (selected) {
      const p = ANCHORS[selected][0].pos;
      goal.current.set(p[0] * 0.4, p[1], p[2] * 0.4);
    } else {
      goal.current.copy(DEFAULT_TARGET);
    }
  }, [selected]);

  useEffect(() => {
    if (resetSignal === 0) return;
    camera.position.copy(DEFAULT_CAMERA);
    goal.current.copy(DEFAULT_TARGET);
  }, [resetSignal, camera]);

  useFrame((_, dt) => {
    if (!controls) return;
    controls.target.lerp(goal.current, 1 - Math.exp(-4 * dt));
    controls.update();
  });

  return null;
}

function Platform() {
  const ring = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (ring.current) ring.current.rotation.z += dt * 0.15;
  });
  return (
    <group position={[0, 0, 0]}>
      <gridHelper args={[7, 28, '#0e7490', '#12324a']} position={[0, -0.005, 0]} />
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
        <ringGeometry args={[0.62, 0.66, 96, 1]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.55} side={THREE.DoubleSide} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
        <ringGeometry args={[0.8, 0.805, 96, 1]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.25} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

class ModelBoundary extends Component<
  { fallback: ReactNode; onError: () => void; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function LoaderLabel() {
  return (
    <Html center>
      <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-cyan-300/80">
        Loading anatomy model…
      </div>
    </Html>
  );
}

/* -------------------------------------------------------------------------- */
/*  Public component                                                          */
/* -------------------------------------------------------------------------- */

export interface AnatomyViewerProps {
  selected: OrganId | null;
  onSelect: (id: OrganId | null) => void;
  className?: string;
}

type ModelSource = 'loading' | 'glb' | 'fallback';

export function AnatomyViewer({ selected, onSelect, className = '' }: AnatomyViewerProps) {
  const [hovered, setHovered] = useState<OrganId | null>(null);
  const [source, setSource] = useState<ModelSource>('loading');
  const [matched, setMatched] = useState<OrganId[]>([]);
  const [resetSignal, setResetSignal] = useState(0);

  useEffect(() => {
    document.body.style.cursor = hovered ? 'pointer' : 'auto';
    return () => {
      document.body.style.cursor = 'auto';
    };
  }, [hovered]);

  const handleLoaded = useCallback((found: OrganId[]) => {
    setMatched(found);
    setSource('glb');
  }, []);

  const handleSelect = useCallback(
    (id: OrganId) => onSelect(selected === id ? null : id),
    [onSelect, selected],
  );

  const handleReset = () => {
    onSelect(null);
    setResetSignal((n) => n + 1);
  };

  const hotspotOrgans = ORGAN_ORDER.filter((id) => !matched.includes(id));

  return (
    <section
      aria-label="3D anatomy viewer"
      className={`relative flex min-h-[420px] flex-col overflow-hidden rounded-2xl border border-cyan-400/20 bg-slate-950/60 shadow-[0_0_40px_rgba(34,211,238,0.06)] backdrop-blur ${className}`}
    >
      {/* HUD: header */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between p-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-cyan-300/70">Anatomy Viewer</p>
          <h2 className="mt-0.5 text-lg font-semibold text-white">Crew Anatomical Model</h2>
          <p className="font-mono text-[10px] uppercase tracking-widest text-slate-400">
            Drag to rotate · Scroll to zoom · Click organ
          </p>
        </div>
        <div className="pointer-events-auto flex flex-col items-end gap-2">
          <span
            className={`rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest ${
              source === 'glb'
                ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300'
                : source === 'fallback'
                  ? 'border-amber-400/40 bg-amber-400/10 text-amber-300'
                  : 'border-cyan-400/30 bg-cyan-400/10 text-cyan-200'
            }`}
          >
            {source === 'glb' ? 'Model: human.glb' : source === 'fallback' ? 'Procedural fallback' : 'Loading model'}
          </span>
          <button
            type="button"
            onClick={handleReset}
            className="rounded-lg border border-cyan-400/30 bg-slate-900/70 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-cyan-200 transition hover:border-cyan-300 hover:bg-cyan-400/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
          >
            Reset view
          </button>
        </div>
      </header>

      {/* Canvas */}
      <div className="relative min-h-[420px] flex-1">
        <Canvas
          dpr={[1, 2]}
          camera={{ position: DEFAULT_CAMERA_ARR, fov: 38, near: 0.1, far: 50 }}
          gl={{ antialias: true, alpha: true }}
          onPointerMissed={() => selected && onSelect(null)}
        >
          <color attach="background" args={['#050b18']} />
          <fog attach="fog" args={['#050b18', 6, 14]} />
          <ambientLight intensity={0.55} />
          <directionalLight position={[3, 5, 4]} intensity={1.1} color="#bfefff" />
          <pointLight position={[-3, 1.5, -2]} intensity={0.8} color="#22d3ee" />
          <pointLight position={[2, 0.5, -3]} intensity={0.4} color="#a78bfa" />

          <Platform />

          <ModelBoundary fallback={<ProceduralBody />} onError={() => setSource('fallback')}>
            <Suspense fallback={<LoaderLabel />}>
              <GlbHuman
                hovered={hovered}
                selected={selected}
                onHover={setHovered}
                onSelect={handleSelect}
                onLoaded={handleLoaded}
              />
            </Suspense>
          </ModelBoundary>

          {hotspotOrgans.map((id) => (
            <Hotspot
              key={id}
              organ={id}
              hovered={hovered === id}
              selected={selected === id}
              onHover={setHovered}
              onSelect={handleSelect}
            />
          ))}

          <OrbitControls
            makeDefault
            enablePan={false}
            enableDamping
            dampingFactor={0.08}
            minDistance={1.2}
            maxDistance={6}
            minPolarAngle={Math.PI * 0.18}
            maxPolarAngle={Math.PI * 0.62}
            autoRotate={!selected && !hovered}
            autoRotateSpeed={0.9}
            target={DEFAULT_TARGET_ARR}
          />
          <CameraRig selected={selected} resetSignal={resetSignal} />
        </Canvas>

        {/* Corner brackets */}
        {(['left-3 top-3 border-l border-t', 'right-3 top-3 border-r border-t', 'left-3 bottom-3 border-l border-b', 'right-3 bottom-3 border-r border-b'] as const).map(
          (c) => (
            <span key={c} className={`pointer-events-none absolute h-4 w-4 border-cyan-300/50 ${c}`} />
          ),
        )}
      </div>

      {/* Organ legend (also the accessible / mobile selector) */}
      <nav
        aria-label="Organ selector"
        className="relative z-10 flex flex-wrap gap-2 border-t border-cyan-400/10 bg-slate-950/70 p-3"
      >
        {ORGAN_ORDER.map((id) => {
          const active = selected === id;
          const organ = ORGANS[id];
          return (
            <button
              key={id}
              type="button"
              aria-pressed={active}
              onClick={() => onSelect(active ? null : id)}
              onMouseEnter={() => setHovered(id)}
              onMouseLeave={() => setHovered(null)}
              className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 font-mono text-[11px] uppercase tracking-widest transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${
                active
                  ? 'border-cyan-300 bg-cyan-400/15 text-white shadow-[0_0_14px_rgba(34,211,238,0.35)]'
                  : 'border-slate-700/70 bg-slate-900/60 text-slate-300 hover:border-cyan-400/50'
              }`}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: ORGAN_COLOR[id], boxShadow: `0 0 8px ${ORGAN_COLOR[id]}` }}
              />
              {organ.name}
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: STATUS_COLOR[organ.status] }}
                aria-label={`status ${organ.status}`}
              />
            </button>
          );
        })}
      </nav>
    </section>
  );
}

export default AnatomyViewer;