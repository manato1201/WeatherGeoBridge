"use client";

// 参考にした画像(Yingerスタイルのポートフォリオヒーロー)の、丸みを帯びた
// グロッシーな3D立方体クラスターに近づけるため、CSSの擬似3D transformでは
// なく実際のWebGL(three.js/@react-three/fiber)でレンダリングする。
// これまで3回、CSS transformだけで立方体クラスターを作ろうとして
// 「錯視で階段状に見える」「面の色が背景と同化する」等の問題が続いていたが、
// 本物の3Dジオメトリ+ライティング+マテリアルを使うことで、角度に依らず
// 正しい奥行き・艶のある質感を安定して得られる。

import { ContactShadows, OrbitControls, RoundedBox } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";

const BAR_SIZE = 0.9;
const GAP = 0.35;
const MIN_HEIGHT = 0.35;
const MAX_HEIGHT = 3.4;

// ダークでは明るい磁器色、ライトでは背景(白いカード)に沈まない濃いグレー系にする。
const PALETTE = {
  dark: {
    base: new THREE.Color("#f5f2ee"), // --color-ink-soft
    accent: new THREE.Color("#f5c2c8"), // --color-accent-glow
    mix: 0.55,
  },
  light: {
    base: new THREE.Color("#55534e"),
    accent: new THREE.Color("#e0707f"),
    mix: 0.7,
  },
} as const;

function Bar({
  index,
  total,
  ratio,
  theme,
}: {
  index: number;
  total: number;
  ratio: number;
  theme: "light" | "dark";
}) {
  const height = MIN_HEIGHT + ratio * (MAX_HEIGHT - MIN_HEIGHT);
  const x = (index - (total - 1) / 2) * (BAR_SIZE + GAP);

  // 確率が高いほどアクセントカラーへ寄せる(高さ+色の二重の手がかり、
  // 旧CSS版から踏襲)。
  const color = useMemo(() => {
    const p = PALETTE[theme];
    return p.base.clone().lerp(p.accent, ratio * p.mix);
  }, [ratio, theme]);

  return (
    <RoundedBox
      args={[BAR_SIZE, height, BAR_SIZE]}
      radius={0.16}
      smoothness={4}
      position={[x, height / 2, 0]}
      castShadow
      receiveShadow
    >
      <meshPhysicalMaterial
        color={color}
        roughness={0.28}
        metalness={0.04}
        clearcoat={0.7}
        clearcoatRoughness={0.2}
      />
    </RoundedBox>
  );
}

export function PrecipitationClusterScene({
  ratios,
  reducedMotion,
  theme,
}: {
  ratios: number[];
  reducedMotion: boolean;
  theme: "light" | "dark";
}) {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{ alpha: true, antialias: true }}
      camera={{ position: [9, 6.6, 10], fov: 30 }}
    >
      <ambientLight intensity={0.7} />
      <directionalLight
        position={[4, 6, 3]}
        intensity={1.2}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      {/* 参考画像のキューブ縁が淡いピンクに発光している質感を、背後からの
          アクセントカラーのポイントライトで再現する。 */}
      <pointLight position={[-3, 1.5, -3]} intensity={0.8} color="#f5c2c8" />

      <group>
        {ratios.map((ratio, i) => (
          <Bar key={i} index={i} total={ratios.length} ratio={ratio} theme={theme} />
        ))}
      </group>

      <ContactShadows
        position={[0, 0, 0]}
        opacity={0.55}
        scale={14}
        blur={2.6}
        far={4}
        color="#000000"
      />

      <OrbitControls
        enablePan={false}
        enableZoom={false}
        autoRotate={!reducedMotion}
        autoRotateSpeed={1.1}
        maxPolarAngle={Math.PI / 2.15}
        minPolarAngle={Math.PI / 4.5}
      />
    </Canvas>
  );
}
