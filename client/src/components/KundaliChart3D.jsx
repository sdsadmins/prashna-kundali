import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Html } from '@react-three/drei';
import { useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { useI18n } from '../i18n/useI18n';

/*
  North Indian Square Kundali Layout:

  Outer square with inner diamond (rotated square) creating 12 triangular houses.

     ┌──────────┬──────────┐
     │╲   12   ╱│╲    2   ╱│
     │  ╲    ╱  │  ╲    ╱  │
     │ 11 ╲╱   1   ╲╱  3  │
     │    ╱╲        ╱╲     │
     │  ╱    ╲    ╱    ╲   │
     │╱   10  ╲╱╱   4    ╲│
     │╲       ╱╲╲        ╱│
     │  ╲   ╱    ╲╲    ╱  │
     │ 9  ╲╱   7   ╲╱  5  │
     │    ╱╲        ╱╲     │
     │  ╱    ╲    ╱    ╲   │
     │╱   8   ╲│╱    6   ╲│
     └──────────┴──────────┘

  House 1 = Ascendant (top center)
*/

// House center positions for planet placement (normalized -3 to 3)
const HOUSE_CENTERS = [
  { x: 0, y: 1.5 },      // House 1 - top center (ascendant)
  { x: 1.5, y: 2.2 },    // House 2 - top right triangle
  { x: 2.2, y: 0.8 },    // House 3 - right upper
  { x: 1.5, y: -0.2 },   // House 4 - right center
  { x: 2.2, y: -1.3 },   // House 5 - right lower
  { x: 1.5, y: -2.2 },   // House 6 - bottom right
  { x: 0, y: -1.5 },     // House 7 - bottom center
  { x: -1.5, y: -2.2 },  // House 8 - bottom left
  { x: -2.2, y: -1.3 },  // House 9 - left lower
  { x: -1.5, y: -0.2 },  // House 10 - left center
  { x: -2.2, y: 0.8 },   // House 11 - left upper
  { x: -1.5, y: 2.2 },   // House 12 - top left triangle
];

// House number label positions (slightly different from planet centers for clarity)
const HOUSE_NUM_POSITIONS = [
  { x: 0, y: 2.1 },      // 1
  { x: 1.9, y: 2.6 },    // 2
  { x: 2.6, y: 0.5 },    // 3
  { x: 1.9, y: -0.5 },   // 4
  { x: 2.6, y: -1.8 },   // 5
  { x: 1.9, y: -2.6 },   // 6
  { x: 0, y: -2.1 },     // 7
  { x: -1.9, y: -2.6 },  // 8
  { x: -2.6, y: -1.8 },  // 9
  { x: -1.9, y: -0.5 },  // 10
  { x: -2.6, y: 0.5 },   // 11
  { x: -1.9, y: 2.6 },   // 12
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

// North Indian Square Chart with visible house divisions
function SquareChart({ ascSignIndex, lang }) {
  const S = 3; // half-size of the square
  const signNames = lang === 'mr' ? SIGN_NAMES_MR : SIGN_NAMES_EN;

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

  // Inner diamond (rotated square touching midpoints)
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

  // Cross lines inside the diamond (vertical and horizontal through center)
  const crossLines = useMemo(() => {
    return [
      // Vertical line through center
      [new THREE.Vector3(0, S, 0), new THREE.Vector3(0, -S, 0)],
      // Horizontal line through center
      [new THREE.Vector3(-S, 0, 0), new THREE.Vector3(S, 0, 0)],
    ].map(([a, b]) => new THREE.BufferGeometry().setFromPoints([a, b]));
  }, []);

  // Corner-to-midpoint diagonals (connecting each corner to adjacent midpoints)
  // These create the triangular house divisions in the corners
  const cornerLines = useMemo(() => {
    return [
      // Top-left corner to top-mid and left-mid (already covered by diamond edges)
      // We need the lines from each corner to the OPPOSITE midpoints to create inner divisions
      // Actually, the North Indian chart is: outer square + inner diamond + vertical/horizontal center lines
      // That creates 12 sections:
      // Top: 2 triangles (12, 2) + rectangle (1)
      // Right: 2 triangles (3, 5) + rectangle (4)
      // Bottom: 2 triangles (6, 8) + rectangle (7)
      // Left: 2 triangles (9, 11) + rectangle (10)
    ];
  }, []);

  return (
    <group>
      {/* Background fill */}
      <mesh position={[0, 0, -0.05]}>
        <planeGeometry args={[S * 2.02, S * 2.02]} />
        <meshBasicMaterial color="#060e1a" opacity={0.95} transparent />
      </mesh>

      {/* Outer square - bright golden */}
      <line geometry={outerSquare}>
        <lineBasicMaterial color="#d4a017" linewidth={2} />
      </line>

      {/* Inner diamond - visible golden */}
      <line geometry={innerDiamond}>
        <lineBasicMaterial color="#d4a017" opacity={0.7} transparent />
      </line>

      {/* Center cross lines */}
      {crossLines.map((geo, i) => (
        <line key={`cross-${i}`} geometry={geo}>
          <lineBasicMaterial color="#d4a017" opacity={0.4} transparent />
        </line>
      ))}

      {/* House numbers */}
      {HOUSE_NUM_POSITIONS.map((pos, i) => (
        <Text
          key={`hnum-${i}`}
          position={[pos.x, pos.y, 0.05]}
          fontSize={0.22}
          color="rgba(212, 160, 23, 0.25)"
          anchorX="center"
          anchorY="middle"
        >
          {i + 1}
        </Text>
      ))}

      {/* Sign names in each house */}
      {HOUSE_CENTERS.map((pos, i) => {
        const signIdx = (ascSignIndex + i) % 12;
        return (
          <Text
            key={`sign-${i}`}
            position={[pos.x, pos.y + 0.5, 0.05]}
            fontSize={0.2}
            color="rgba(212, 160, 23, 0.2)"
            anchorX="center"
            anchorY="middle"
          >
            {signNames[signIdx]}
          </Text>
        );
      })}

      {/* Subtle inner glow */}
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
          <ringGeometry args={[0.25, 0.34, 6]} />
          <meshBasicMaterial color={color} opacity={0.4} transparent />
        </mesh>
      )}
      {/* Planet circle */}
      <mesh
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <circleGeometry args={[isRulingPlanet ? 0.22 : 0.16, 32]} />
        <meshBasicMaterial color={hovered ? '#ffffff' : color} />
      </mesh>
      {/* Planet symbol - bigger font */}
      <Text
        position={[0, -0.42, 0]}
        fontSize={0.28}
        color={color}
        anchorX="center"
        anchorY="top"
        fontWeight="bold"
      >
        {symbol}
      </Text>
      {/* Hover tooltip */}
      {hovered && (
        <Html position={[0, 0.6, 0]} center>
          <div className="bg-black/90 text-white text-xs px-2 py-1 rounded whitespace-nowrap border border-gold/30">
            {lang === 'mr' ? PLANET_SYMBOLS_MR[planetKey] : planetKey.charAt(0).toUpperCase() + planetKey.slice(1)}
            {isRulingPlanet && <span className="text-gold ml-1">★ Ruling</span>}
          </div>
        </Html>
      )}
    </group>
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
        <SquareChart ascSignIndex={ascSignIndex} lang={lang} />

        {/* Planets in their houses */}
        {Object.entries(planetsInHouses).map(([house, planets]) => {
          const houseIdx = parseInt(house) - 1;
          const basePos = HOUSE_CENTERS[houseIdx] || { x: 0, y: 0 };

          return planets.map((planetKey, pIdx) => {
            const offset = (pIdx - (planets.length - 1) / 2) * 0.4;
            const pos = {
              x: basePos.x + offset * 0.6,
              y: basePos.y - 0.2,
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
          fontSize={0.3}
          color="#d4a017"
          anchorX="center"
          fontWeight="bold"
        >
          {lang === 'mr' ? '॥ लग्न ॥' : '॥ ASC ॥'}
        </Text>
      </group>

      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={5}
        maxDistance={16}
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
    <div className="card-glass overflow-hidden w-full h-full relative" style={{ minHeight: '400px' }}>
      <Canvas
        camera={{ position: [0, 0, 9], fov: 50 }}
        style={{ background: 'transparent' }}
      >
        <Scene chartData={chartData} rulingPlanetKeys={rulingPlanetKeys} lang={lang} />
      </Canvas>
      {/* Zoom hint */}
      <div className="absolute bottom-2 left-0 right-0 text-center text-white/15 text-xs pointer-events-none">
        {lang === 'mr' ? 'स्क्रोल करा = झूम | ड्रॅग = फिरवा' : 'Scroll = Zoom | Drag = Rotate'}
      </div>
    </div>
  );
}
