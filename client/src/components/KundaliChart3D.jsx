import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Html } from '@react-three/drei';
import { useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { useI18n } from '../i18n/useI18n';

/*
  North Indian Square Kundali Layout (classic):

     ┌─────┬─────┬─────┐
     │ 12  │  1  │  2  │
     ├─────┼─────┼─────┤
     │ 11  │     │  3  │
     ├─────┤  ◇  ├─────┤
     │ 10  │     │  4  │
     ├─────┼─────┼─────┤
     │  9  │  8  │  5  │   (Houses are arranged as triangles
     └─────┴─────┴─────┘    inside a square with diagonal cross)

  Actually, the traditional North Indian chart is a square
  with an inner diamond (rotated square), creating 12 triangular houses.

  Outer square with inner rotated square:
    ┌────────────┐
    │╲  12  ╱ 1 ╲│
    │ 11╲  ╱    2│
    │    ╲╱      │
    │    ╱╲      │
    │ 10╱  ╲    3│
    │╱   9  ╲ 4 ╱│
    └────────────┘
      (with 5,6,7,8 mirrored)
*/

// House center positions for placing planets (normalized -3 to 3)
const HOUSE_CENTERS = [
  { x: 0, y: 2.2 },      // House 1 - top center
  { x: 2.2, y: 2.2 },    // House 2 - top right
  { x: 2.2, y: 0 },      // House 3 - right top
  { x: 2.2, y: -2.2 },   // House 4 - right bottom (bottom right)
  { x: 0, y: -2.2 },     // House 5 - bottom center
  { x: -2.2, y: -2.2 },  // House 6 - bottom left
  { x: -2.2, y: 0 },     // House 7 - left bottom
  { x: -2.2, y: 2.2 },   // House 8 - left top (top left)
  { x: -1.1, y: 1.1 },   // House 9 - inner top-left
  { x: -1.1, y: -1.1 },  // House 10 - inner bottom-left
  { x: 1.1, y: -1.1 },   // House 11 - inner bottom-right
  { x: 1.1, y: 1.1 },    // House 12 - inner top-right
];

const SIGN_NAMES_EN = ['Ari', 'Tau', 'Gem', 'Can', 'Leo', 'Vir', 'Lib', 'Sco', 'Sag', 'Cap', 'Aqu', 'Pis'];
const SIGN_NAMES_MR = ['मेष', 'वृष', 'मिथ', 'कर्क', 'सिंह', 'कन्या', 'तूळ', 'वृश्चि', 'धनु', 'मकर', 'कुंभ', 'मीन'];

const PLANET_COLORS = {
  sun: '#FFD700',
  moon: '#C0C0C0',
  mars: '#FF4444',
  mercury: '#44FF44',
  jupiter: '#FFB347',
  venus: '#FF69B4',
  saturn: '#8888FF',
  rahu: '#888888',
  ketu: '#AA6633',
};

const PLANET_SYMBOLS = {
  sun: 'Su', moon: 'Mo', mars: 'Ma', mercury: 'Me',
  jupiter: 'Ju', venus: 'Ve', saturn: 'Sa', rahu: 'Ra', ketu: 'Ke',
};

const PLANET_SYMBOLS_MR = {
  sun: 'र', moon: 'चं', mars: 'मं', mercury: 'बु',
  jupiter: 'गु', venus: 'शु', saturn: 'श', rahu: 'रा', ketu: 'के',
};

// North Indian Square Chart with inner diamond cross
function SquareChart() {
  const S = 3; // half-size of the square

  // Outer square
  const outerSquare = useMemo(() => {
    const pts = [
      new THREE.Vector3(-S, S, 0),
      new THREE.Vector3(S, S, 0),
      new THREE.Vector3(S, -S, 0),
      new THREE.Vector3(-S, -S, 0),
      new THREE.Vector3(-S, S, 0),
    ];
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, []);

  // Inner diamond (rotated square)
  const innerDiamond = useMemo(() => {
    const pts = [
      new THREE.Vector3(0, S, 0),    // top mid
      new THREE.Vector3(S, 0, 0),    // right mid
      new THREE.Vector3(0, -S, 0),   // bottom mid
      new THREE.Vector3(-S, 0, 0),   // left mid
      new THREE.Vector3(0, S, 0),    // close
    ];
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, []);

  // Diagonal lines from corners to inner diamond
  const diagonals = useMemo(() => {
    return [
      // Top-left corner to center-ish
      [new THREE.Vector3(-S, S, 0), new THREE.Vector3(0, 0, 0)],
      // Top-right corner
      [new THREE.Vector3(S, S, 0), new THREE.Vector3(0, 0, 0)],
      // Bottom-right corner
      [new THREE.Vector3(S, -S, 0), new THREE.Vector3(0, 0, 0)],
      // Bottom-left corner
      [new THREE.Vector3(-S, -S, 0), new THREE.Vector3(0, 0, 0)],
    ].map(([a, b]) => new THREE.BufferGeometry().setFromPoints([a, b]));
  }, []);

  return (
    <group>
      {/* Background fill */}
      <mesh position={[0, 0, -0.05]}>
        <planeGeometry args={[S * 2.02, S * 2.02]} />
        <meshBasicMaterial color="#060e1a" opacity={0.95} transparent />
      </mesh>

      {/* Outer square - golden glow */}
      <line geometry={outerSquare}>
        <lineBasicMaterial color="#d4a017" linewidth={2} />
      </line>

      {/* Inner diamond */}
      <line geometry={innerDiamond}>
        <lineBasicMaterial color="#d4a017" opacity={0.6} transparent />
      </line>

      {/* Diagonal cross lines */}
      {diagonals.map((geo, i) => (
        <line key={`diag-${i}`} geometry={geo}>
          <lineBasicMaterial color="#d4a017" opacity={0.25} transparent />
        </line>
      ))}

      {/* Subtle inner glow square */}
      <mesh position={[0, 0, -0.03]}>
        <planeGeometry args={[S * 1.98, S * 1.98]} />
        <meshBasicMaterial color="#d4a017" opacity={0.02} transparent />
      </mesh>
    </group>
  );
}

// Planet glyph placed in a house
function PlanetGlyph({ planetKey, position, isRulingPlanet, lang }) {
  const [hovered, setHovered] = useState(false);
  const glowRef = useRef();
  const color = PLANET_COLORS[planetKey] || '#ffffff';
  const symbol = lang === 'mr' ? PLANET_SYMBOLS_MR[planetKey] : PLANET_SYMBOLS[planetKey];

  useFrame((_, delta) => {
    if (glowRef.current && isRulingPlanet) {
      glowRef.current.rotation.z += delta * 0.8;
    }
  });

  return (
    <group position={[position.x, position.y, 0.1]}>
      {/* Outer glow ring for ruling planets */}
      {isRulingPlanet && (
        <mesh ref={glowRef}>
          <ringGeometry args={[0.22, 0.3, 6]} />
          <meshBasicMaterial color={color} opacity={0.4} transparent />
        </mesh>
      )}
      {/* Planet circle */}
      <mesh
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <circleGeometry args={[isRulingPlanet ? 0.19 : 0.13, 32]} />
        <meshBasicMaterial color={hovered ? '#ffffff' : color} />
      </mesh>
      {/* Planet symbol */}
      <Text
        position={[0, -0.38, 0]}
        fontSize={0.2}
        color={color}
        anchorX="center"
        anchorY="top"
      >
        {symbol}
      </Text>
      {/* Hover tooltip */}
      {hovered && (
        <Html position={[0, 0.5, 0]} center>
          <div className="bg-black/90 text-white text-xs px-2 py-1 rounded whitespace-nowrap border border-gold/30">
            {lang === 'mr' ? PLANET_SYMBOLS_MR[planetKey] : planetKey.charAt(0).toUpperCase() + planetKey.slice(1)}
            {isRulingPlanet && <span className="text-gold ml-1">★ Ruling</span>}
          </div>
        </Html>
      )}
    </group>
  );
}

// Sign labels in each house
function HouseLabels({ ascSignIndex, lang }) {
  const signNames = lang === 'mr' ? SIGN_NAMES_MR : SIGN_NAMES_EN;

  return (
    <>
      {HOUSE_CENTERS.map((pos, i) => {
        const signIdx = (ascSignIndex + i) % 12;
        return (
          <Text
            key={i}
            position={[pos.x, pos.y + 0.55, 0.05]}
            fontSize={0.22}
            color="rgba(212, 160, 23, 0.3)"
            anchorX="center"
            anchorY="middle"
          >
            {signNames[signIdx]}
          </Text>
        );
      })}
    </>
  );
}

// Slow rotating star field
function StarField() {
  const ref = useRef();
  const particles = useMemo(() => {
    const positions = new Float32Array(400 * 3);
    for (let i = 0; i < 400; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 25;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 25;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 5 - 3;
    }
    return positions;
  }, []);

  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.z += delta * 0.015;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          array={particles}
          count={400}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial size={0.03} color="#d4a017" transparent opacity={0.3} />
    </points>
  );
}

// Main 3D scene
function Scene({ chartData, rulingPlanetKeys, lang }) {
  const groupRef = useRef();

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.z = Math.sin(Date.now() * 0.0002) * 0.01;
    }
  });

  const ascSignIndex = chartData?.chart?.ascendantSignIndex || 0;
  const planetPositions = chartData?.chart?.planetPositions || {};

  // Group planets by house
  const planetsInHouses = {};
  Object.entries(planetPositions).forEach(([key, info]) => {
    const house = info.house;
    if (!planetsInHouses[house]) planetsInHouses[house] = [];
    planetsInHouses[house].push(key);
  });

  return (
    <>
      <StarField />
      <ambientLight intensity={0.4} />
      <pointLight position={[0, 0, 5]} intensity={0.8} color="#d4a017" />

      <group ref={groupRef}>
        <SquareChart />
        <HouseLabels ascSignIndex={ascSignIndex} lang={lang} />

        {/* Planets in their houses */}
        {Object.entries(planetsInHouses).map(([house, planets]) => {
          const houseIdx = parseInt(house) - 1;
          const basePos = HOUSE_CENTERS[houseIdx] || { x: 0, y: 0 };

          return planets.map((planetKey, pIdx) => {
            const offset = (pIdx - (planets.length - 1) / 2) * 0.35;
            const pos = {
              x: basePos.x + offset * 0.6,
              y: basePos.y - 0.25,
            };
            return (
              <PlanetGlyph
                key={planetKey}
                planetKey={planetKey}
                position={pos}
                isRulingPlanet={rulingPlanetKeys.includes(planetKey)}
                lang={lang}
              />
            );
          });
        })}

        {/* Lagna marker */}
        <Text
          position={[0, 3.4, 0.1]}
          fontSize={0.25}
          color="#d4a017"
          anchorX="center"
          fontWeight="bold"
        >
          {lang === 'mr' ? '॥ लग्न ॥' : '॥ ASC ॥'}
        </Text>
      </group>

      <OrbitControls
        enablePan={false}
        minDistance={6}
        maxDistance={14}
        enableRotate={true}
        autoRotate={false}
      />
    </>
  );
}

// Exported component — fills available height
export default function KundaliChart3D({ chartData }) {
  const { lang } = useI18n();

  const rulingPlanetKeys = useMemo(() => {
    if (!chartData?.rulingPlanets) return [];
    return chartData.rulingPlanets
      .filter((rp) => !rp.skipped)
      .map((rp) => rp.planetKey);
  }, [chartData]);

  if (!chartData) return null;

  return (
    <div className="card-glass overflow-hidden w-full h-full" style={{ minHeight: '400px' }}>
      <Canvas
        camera={{ position: [0, 0, 9], fov: 50 }}
        style={{ background: 'transparent' }}
      >
        <Scene chartData={chartData} rulingPlanetKeys={rulingPlanetKeys} lang={lang} />
      </Canvas>
    </div>
  );
}
