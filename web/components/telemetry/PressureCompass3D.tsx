"use client";

import { Canvas } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { Group } from "three";
import { useFrame } from "@react-three/fiber";

const RING_COUNT = 3;
const RADIUS = 2.1;

function Rings({ normalized }: { normalized: number }) {
  return (
    <>
      {Array.from({ length: RING_COUNT }).map((_, i) => {
        const ratio = (i + 1) / RING_COUNT;
        const active = normalized >= ratio - 1 / RING_COUNT / 2;
        return (
          <mesh key={i} rotation={[-Math.PI / 2, 0, 0]}>
            <torusGeometry
              args={[RADIUS * ratio, active ? 0.035 : 0.02, 16, 64]}
            />
            <meshStandardMaterial
              color={active ? "#f5c2c8" : "#8a8a82"}
              emissive={active ? "#f5c2c8" : "#000000"}
              emissiveIntensity={active ? 0.6 : 0}
              roughness={0.4}
            />
          </mesh>
        );
      })}
    </>
  );
}

function Needle({ directionDeg }: { directionDeg: number }) {
  const groupRef = useRef<Group>(null);
  const targetRad = useMemo(
    () => (directionDeg * Math.PI) / 180,
    [directionDeg],
  );

  // 風向が変わった際、角度をパッと切り替えずスムーズに回転させる
  // (CSS版のtransition: transformに相当)。
  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;
    let diff = targetRad - group.rotation.y;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    group.rotation.y += diff * 0.12;
  });

  return (
    <group ref={groupRef}>
      <mesh position={[0, 0.05, -0.7]} castShadow>
        <coneGeometry args={[0.22, 0.9, 4]} />
        <meshPhysicalMaterial
          color="#f5f2ee"
          emissive="#f5c2c8"
          emissiveIntensity={0.35}
          roughness={0.2}
          clearcoat={0.8}
        />
      </mesh>
      <mesh position={[0, 0.02, 0.35]} castShadow>
        <boxGeometry args={[0.12, 0.12, 1.3]} />
        <meshPhysicalMaterial color="#e4dfda" roughness={0.3} clearcoat={0.5} />
      </mesh>
      <mesh position={[0, 0.08, 0]}>
        <sphereGeometry args={[0.16, 24, 24]} />
        <meshPhysicalMaterial
          color="#f5f2ee"
          roughness={0.15}
          clearcoat={0.9}
        />
      </mesh>
    </group>
  );
}

export function PressureCompassScene({
  normalized,
  windDirectionDeg,
}: {
  normalized: number;
  windDirectionDeg: number;
}) {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{ alpha: true, antialias: true }}
      camera={{ position: [0, 5.2, 4.2], fov: 34 }}
    >
      <ambientLight intensity={0.75} />
      <directionalLight position={[3, 5, 2]} intensity={1.1} castShadow />
      <pointLight position={[-2, 1.5, -2]} intensity={0.6} color="#f5c2c8" />

      {/* ベースプレート */}
      <mesh position={[0, -0.08, 0]} receiveShadow>
        <cylinderGeometry args={[RADIUS + 0.3, RADIUS + 0.3, 0.16, 64]} />
        <meshPhysicalMaterial
          color="#1a1b16"
          roughness={0.35}
          clearcoat={0.4}
        />
      </mesh>

      <Rings normalized={normalized} />
      <Needle directionDeg={windDirectionDeg} />
    </Canvas>
  );
}
