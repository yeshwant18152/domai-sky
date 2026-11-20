import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

function cloudTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const grd = g.createRadialGradient(64, 64, 4, 64, 64, 64);
  grd.addColorStop(0, "rgba(255,255,255,0.9)");
  grd.addColorStop(0.5, "rgba(220,235,255,0.35)");
  grd.addColorStop(1, "rgba(220,235,255,0)");
  g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function Airliner() {
  const ref = useRef<THREE.Group>(null);
  const body = useMemo(() => new THREE.MeshStandardMaterial({ color: "#fffaf0", metalness: 0.2, roughness: 0.45 }), []);
  const accent = useMemo(() => new THREE.MeshStandardMaterial({ color: "#d94841", emissive: "#8f2727", emissiveIntensity: 0.12, roughness: 0.45 }), []);
  const dark = useMemo(() => new THREE.MeshStandardMaterial({ color: "#2457d6", metalness: 0.35, roughness: 0.35 }), []);
  const wingShape = useMemo(() => {
    const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(-1.4, 4.2); s.lineTo(-2.1, 4.2); s.lineTo(-1.6, 0); s.closePath();
    return new THREE.ExtrudeGeometry(s, { depth: 0.08, bevelEnabled: false });
  }, []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (!ref.current) return;
    ref.current.position.y = Math.sin(t * 0.6) * 0.25;
    ref.current.rotation.z = Math.sin(t * 0.4) * 0.06;
    ref.current.rotation.x = Math.sin(t * 0.5) * 0.03;
  });
  return (
    <group ref={ref} position={[3.6, 1.2, 0]} rotation={[0.12, -0.75, 0.05]} scale={0.6}>
      <group rotation={[0, 0, Math.PI / 2]}>
        <mesh material={body}><capsuleGeometry args={[0.55, 6, 12, 24]} /></mesh>
        <mesh material={dark} position={[0, 3.45, 0.18]} rotation={[0.5, 0, 0]}><sphereGeometry args={[0.3, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>
      </group>
      {/* wings */}
      <mesh material={body} geometry={wingShape} position={[0.6, -0.15, 0.3]} rotation={[-Math.PI / 2, 0, 0]} />
      <mesh material={body} geometry={wingShape} position={[0.6, -0.07, -0.3]} rotation={[Math.PI / 2, 0, 0]} />
      {/* engines */}
      {[1.6, -1.6].map((z) => (
        <mesh key={z} material={dark} position={[0.1, -0.45, z]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.28, 0.24, 1.1, 20]} /></mesh>
      ))}
      {/* tail */}
      <mesh material={accent} position={[-3.1, 0.9, 0]} rotation={[0, 0, -0.5]}><boxGeometry args={[1.4, 1.5, 0.08]} /></mesh>
      {[0.9, -0.9].map((z) => (
        <mesh key={z} material={body} position={[-3.2, 0.15, z]}><boxGeometry args={[0.8, 0.06, 1.4]} /></mesh>
      ))}
      <mesh material={accent} position={[0.2, 0.05, 0]}><boxGeometry args={[5.5, 0.08, 1.12]} /></mesh>
    </group>
  );
}

function Clouds({ reduced }: { reduced: boolean }) {
  const tex = useMemo(cloudTexture, []);
  const group = useRef<THREE.Group>(null);
  const puffs = useMemo(() => {
    let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    return Array.from({ length: 70 }, () => ({ x: rnd() * 60 - 30, y: rnd() * 10 - 6, z: rnd() * -24 - 1, s: 5 + rnd() * 9, o: 0.25 + rnd() * 0.45 }));
  }, []);
  useFrame((_, dt) => {
    if (reduced || !group.current) return;
    for (const c of group.current.children) {
      c.position.x += Math.min(dt, 0.05) * 6;
      if (c.position.x > 32) c.position.x = -32;
    }
  });
  return (
    <group ref={group}>
      {puffs.map((p, i) => (
        <sprite key={i} position={[p.x, p.y, p.z]} scale={[p.s * 1.6, p.s, 1]}>
          <spriteMaterial map={tex} transparent opacity={p.o} depthWrite={false} color="#ffffff" />
        </sprite>
      ))}
    </group>
  );
}

export default function Hero3D({ reduced }: { reduced: boolean }) {
  return (
    <Canvas camera={{ position: [0, 1, 12], fov: 45 }} dpr={[1, 1.75]} frameloop={reduced ? "demand" : "always"}
      onCreated={({ gl }) => { gl.domElement.parentElement?.parentElement?.setAttribute("data-scene-ready", "true"); }}>
      <color attach="background" args={["#fff8e7"]} />
      <fog attach="fog" args={["#fff8e7", 10, 40]} />
      <ambientLight intensity={0.9} color="#fff4df" />
      <directionalLight position={[5, 8, 6]} intensity={2.4} color="#ffffff" />
      <directionalLight position={[-6, -2, -4]} intensity={0.65} color="#8fb2ff" />
      <hemisphereLight args={["#eaf0ff", "#eadcc4", 0.8]} />
      <Clouds reduced={reduced} />
      <Airliner />
    </Canvas>
  );
}
