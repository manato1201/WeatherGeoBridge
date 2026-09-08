"use client";

// 「気象衛星」の代替可視化。ひまわり衛星の実画像は使わず、雲量%(自前データ)を
// 実際の3D球体(WebGL)として可視化する。
//
// 以前のCSS版は「平面の円」をrotateX/rotateYで回転させていたため、真横向きの
// 瞬間に厚みゼロの線として潰れて見えるバグがあった。本物の球体ジオメトリなら
// どの角度から見ても常に円形のシルエットを保つため、この問題は構造的に
// 発生しない。

import { Canvas, useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Mesh } from "three";

function Orb({
  cloudCoverPercent,
  isDay,
  reducedMotion,
}: {
  cloudCoverPercent: number;
  isDay: boolean;
  reducedMotion: boolean;
}) {
  const cloudLayerRef = useRef<Mesh>(null);
  const cloudOpacity = 0.15 + (cloudCoverPercent / 100) * 0.75;

  useFrame((_, delta) => {
    if (reducedMotion || !cloudLayerRef.current) return;
    cloudLayerRef.current.rotation.y += delta * 0.25;
  });

  return (
    <group>
      {/* 惑星本体。雲が無いほど暗く(地表が見えるイメージ)、多いほど明るくする。 */}
      <mesh castShadow receiveShadow>
        <sphereGeometry args={[1.6, 64, 64]} />
        <meshPhysicalMaterial
          color={isDay ? "#8a8a82" : "#3c3c38"}
          roughness={0.55}
          clearcoat={0.3}
        />
      </mesh>
      {/* 雲層。半透明の一回り大きい球を重ね、雲量%に応じて不透明度を変える。 */}
      <mesh ref={cloudLayerRef}>
        <sphereGeometry args={[1.68, 48, 48]} />
        <meshPhysicalMaterial
          color="#f5f2ee"
          roughness={0.4}
          clearcoat={0.5}
          transparent
          opacity={cloudOpacity}
        />
      </mesh>
    </group>
  );
}

export function CloudCoverOrbScene({
  cloudCoverPercent,
  isDay,
  reducedMotion,
}: {
  cloudCoverPercent: number;
  isDay: boolean;
  reducedMotion: boolean;
}) {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{ alpha: true, antialias: true }}
      camera={{ position: [2.6, 1.4, 3.2], fov: 32 }}
    >
      <ambientLight intensity={isDay ? 0.55 : 0.3} />
      <directionalLight
        position={[3, 2, 2]}
        intensity={isDay ? 1.3 : 0.5}
        color={isDay ? "#f5f2ee" : "#8a8a82"}
        castShadow
      />
      <pointLight position={[-2, -1, -2]} intensity={0.5} color="#f5c2c8" />
      <Orb
        cloudCoverPercent={cloudCoverPercent}
        isDay={isDay}
        reducedMotion={reducedMotion}
      />
    </Canvas>
  );
}
