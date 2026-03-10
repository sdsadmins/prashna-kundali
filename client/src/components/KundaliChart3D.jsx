import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Html } from '@react-three/drei';
import { useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { useI18n } from '../i18n/useI18n';

/*
  Kalapurusha Kundali — North Indian Diamond Layout

  Structure: Outer square + inner diamond + two X diagonals = 12 cells.

  Lines:
  1. Outer square: TL-TR-BR-BL
  2. Diamond connecting midpoints: T-R-B-L-T
  3. Diagonal: TL → BR (passes through center)
  4. Diagonal: TR → BL (passes through center)

  These create 12 cells:
  - 4 corner areas, each bisected into 2 triangles by a diagonal = 8 triangles
  - Center diamond divided into 4 quadrilaterals by the two diagonals = 4 quads

  Sign positions (counter-clockwise from Aries at right-upper):

  Sign   Cell                    Center (x, y)
  ──────────────────────────────────────────────
  0 Ari  TR lower triangle       ( 2.5,  1.5)
  1 Tau  TR upper triangle       ( 1.5,  2.5)
  2 Gem  Center top quad         ( 0,    1.5)
  3 Can  TL upper triangle       (-1.5,  2.5)
  4 Leo  TL lower triangle       (-2.5,  1.5)
  5 Vir  Center left quad        (-1.5,  0)
  6 Lib  BL upper triangle       (-2.5, -1.5)
  7 Sco  BL lower triangle       (-1.5, -2.5)
  8 Sag  Center bottom quad      ( 0,   -1.5)
  9 Cap  BR lower triangle       ( 1.5, -2.5)
  10 Aqu BR upper triangle       ( 2.5, -1.5)
  11 Pis Center right quad       ( 1.5,  0)
*/

const S = 3; // half-size of the square

// 12 sign positions — index = sign index (0=Aries ... 11=Pisces)
const SIGN_CENTERS = [
  { x: 2.5, y: 1.5 },    // 0 Aries - TR lower triangle
  { x: 1.5, y: 2.5 },    // 1 Taurus - TR upper triangle
  { x: 0, y: 1.5 },      // 2 Gemini - center top
  { x: -1.5, y: 2.5 },   // 3 Cancer - TL upper triangle
  { x: -2.5, y: 1.5 },   // 4 Leo - TL lower triangle
  { x: -1.5, y: 0 },     // 5 Virgo - center left
  { x: -2.5, y: -1.5 },  // 6 Libra - BL upper triangle
  { x: -1.5, y: -2.5 },  // 7 Scorpio - BL lower triangle
  { x: 0, y: -1.5 },     // 8 Sagittarius - center bottom
  { x: 1.5, y: -2.5 },   // 9 Capricorn - BR lower triangle
  { x: 2.5, y: -1.5 },   // 10 Aquarius - BR upper triangle
  { x: 1.5, y: 0 },      // 11 Pisces - center right
];

// House number label positions (near cell edges/corners for each sign slot)
const HOUSE_LABEL_POS = [
  { x: 2.6, y: 0.6 },    // 0 Aries
  { x: 1.8, y: 2.7 },    // 1 Taurus
  { x: 0.3, y: 1.0 },    // 2 Gemini
  { x: -1.8, y: 2.7 },   // 3 Cancer
  { x: -2.6, y: 0.6 },   // 4 Leo
  { x: -0.3, y: -0.4 },  // 5 Virgo
  { x: -2.6, y: -0.6 },  // 6 Libra
  { x: -1.8, y: -2.7 },  // 7 Scorpio
  { x: -0.3, y: -1.0 },  // 8 Sagittarius
  { x: 1.8, y: -2.7 },   // 9 Capricorn
  { x: 2.6, y: -0.6 },   // 10 Aquarius
  { x: 0.3, y: 0.4 },    // 11 Pisces
];

// Sign name label positions (small, unobtrusive)
const SIGN_NAME_POS = [
  { x: 2.5, y: 0.9 },    // 0 Aries
  { x: 1.0, y: 2.7 },    // 1 Taurus
  { x: -0.5, y: 1.9 },   // 2 Gemini
  { x: -1.0, y: 2.7 },   // 3 Cancer
  { x: -2.5, y: 0.9 },   // 4 Leo
  { x: -1.9, y: 0.5 },   // 5 Virgo
  { x: -2.5, y: -0.9 },  // 6 Libra
  { x: -1.0, y: -2.7 },  // 7 Scorpio
  { x: 0.5, y: -1.9 },   // 8 Sagittarius
  { x: 1.0, y: -2.7 },   // 9 Capricorn
  { x: 2.5, y: -0.9 },   // 10 Aquarius
  { x: 1.9, y: -0.5 },   // 11 Pisces
];

const SIGN_NAMES_EN = ['Ari', 'Tau', 'Gem', 'Can', 'Leo', 'Vir', 'Lib', 'Sco', 'Sag', 'Cap', 'Aqu', 'Pis'];
const SIGN_NAMES_MR = ['मेष', 'वृष', 'मिथ', 'कर्क', 'सिंह', 'कन्या', 'तूळ', 'वृश्चि', 'धनु', 'मकर', 'कुंभ', 'मीन'];

const PLANET_COLORS = {
  sun: '#FFD700', moon: '#C0C0C0', mars: '#FF4444', mercury: '#44FF44',
  jupiter: '#FFB347', venus: '#FF69B4', saturn: '#8888FF', rahu: '#888888', ketu: '#AA6633',
};

const PLANET_SYMBOLS = {
  sun: 'Su', moon: 'Mo', mars: 'Ma', mercury: 'Me',
  jupiter: 'Ju', venus: 'Ve', saturn: 'Sa', rahu: 'Ra', ketu: 'Ke',
};

const PLANET_SYMBOLS_MR = {
  sun: 'र', moon: 'चं', mars: 'मं', mercury: 'बु',
  jupiter: 'गु', venus: 'शु', saturn: 'श', rahu: 'रा', ketu: 'के',
};

// Grid layout for multiple planets in one cell
function getPlanetPositions(count) {
  if (count === 1) return [{ dx: 0, dy: 0 }];
  if (count === 2) return [{ dx: -0.28, dy: 0 }, { dx: 0.28, dy: 0 }];
  if (count === 3) return [{ dx: -0.28, dy: 0.18 }, { dx: 0.28, dy: 0.18 }, { dx: 0, dy: -0.22 }];
  if (count === 4) return [
    { dx: -0.22, dy: 0.18 }, { dx: 0.22, dy: 0.18 },
    { dx: -0.22, dy: -0.22 }, { dx: 0.22, dy: -0.22 },
  ];
  const positions = [];
  const topCount = Math.ceil(count / 2);
  const botCount = count - topCount;
  for (let i = 0; i < topCount; i++) {
    positions.push({ dx: (i - (topCount - 1) / 2) * 0.3, dy: 0.18 });
  }
  for (let i = 0; i < botCount; i++) {
    positions.push({ dx: (i - (botCount - 1) / 2) * 0.3, dy: -0.22 });
  }
  return positions;
}

// Creates a thick line using a mesh (tube-like) since WebGL linewidth is limited to 1px
function ThickLine({ points, width = 0.03, color = '#d4a017', opacity = 1 }) {
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(0, -width / 2);
    s.lineTo(0, width / 2);
    return s;
  }, [width]);

  const path = useMemo(() => {
    const curve = new THREE.LineCurve3(points[0], points[1]);
    return new THREE.ExtrudeGeometry(shape, {
      steps: 1, bevelEnabled: false, extrudePath: curve,
    });
  }, [points, shape]);

  return (
    <mesh geometry={path}>
      <meshBasicMaterial color={color} opacity={opacity} transparent={opacity < 1} />
    </mesh>
  );
}

// Chart grid lines
function ChartGrid({ ascSignIndex, lang }) {
  const signNames = lang === 'mr' ? SIGN_NAMES_MR : SIGN_NAMES_EN;

  // Define all line segments as point pairs
  const outerSquareSegments = useMemo(() => [
    [new THREE.Vector3(-S, S, 0), new THREE.Vector3(S, S, 0)],
    [new THREE.Vector3(S, S, 0), new THREE.Vector3(S, -S, 0)],
    [new THREE.Vector3(S, -S, 0), new THREE.Vector3(-S, -S, 0)],
    [new THREE.Vector3(-S, -S, 0), new THREE.Vector3(-S, S, 0)],
  ], []);

  const diamondSegments = useMemo(() => [
    [new THREE.Vector3(0, S, 0), new THREE.Vector3(S, 0, 0)],
    [new THREE.Vector3(S, 0, 0), new THREE.Vector3(0, -S, 0)],
    [new THREE.Vector3(0, -S, 0), new THREE.Vector3(-S, 0, 0)],
    [new THREE.Vector3(-S, 0, 0), new THREE.Vector3(0, S, 0)],
  ], []);

  const diag1Points = useMemo(() => [
    new THREE.Vector3(-S, S, 0), new THREE.Vector3(S, -S, 0),
  ], []);

  const diag2Points = useMemo(() => [
    new THREE.Vector3(S, S, 0), new THREE.Vector3(-S, -S, 0),
  ], []);

  return (
    <group>
      {/* Background fill */}
      <mesh position={[0, 0, -0.05]}>
        <planeGeometry args={[S * 2.02, S * 2.02]} />
        <meshBasicMaterial color="#060e1a" opacity={0.95} transparent />
      </mesh>

      {/* Outer square — thickest */}
      {outerSquareSegments.map((pts, i) => (
        <ThickLine key={`sq-${i}`} points={pts} width={0.06} color="#d4a017" />
      ))}

      {/* Inner diamond */}
      {diamondSegments.map((pts, i) => (
        <ThickLine key={`dm-${i}`} points={pts} width={0.04} color="#d4a017" opacity={0.85} />
      ))}

      {/* Diagonal 1: TL → BR */}
      <ThickLine points={diag1Points} width={0.04} color="#d4a017" opacity={0.85} />

      {/* Diagonal 2: TR → BL */}
      <ThickLine points={diag2Points} width={0.04} color="#d4a017" opacity={0.85} />

      {/* Sign name labels (fixed — sign i always at position i) */}
      {SIGN_NAME_POS.map((pos, signIdx) => (
        <Text
          key={`sign-${signIdx}`}
          position={[pos.x, pos.y, 0.05]}
          fontSize={0.17}
          color="rgba(212, 160, 23, 0.22)"
          anchorX="center"
          anchorY="middle"
        >
          {signNames[signIdx]}
        </Text>
      ))}

      {/* House number labels (rotate based on ascendant) */}
      {HOUSE_LABEL_POS.map((pos, signIdx) => {
        const houseNum = ((signIdx - ascSignIndex + 12) % 12) + 1;
        const isAsc = houseNum === 1;
        return (
          <Text
            key={`hnum-${signIdx}`}
            position={[pos.x, pos.y, 0.05]}
            fontSize={isAsc ? 0.25 : 0.2}
            color={isAsc ? 'rgba(212, 160, 23, 0.6)' : 'rgba(212, 160, 23, 0.25)'}
            anchorX="center"
            anchorY="middle"
            fontWeight={isAsc ? 'bold' : 'normal'}
          >
            {houseNum}
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

// Planet glyph
function PlanetGlyph({ planetKey, position, isRulingPlanet, lang, scale = 1 }) {
  const [hovered, setHovered] = useState(false);
  const glowRef = useRef();
  const color = PLANET_COLORS[planetKey] || '#ffffff';
  const symbol = lang === 'mr' ? PLANET_SYMBOLS_MR[planetKey] : PLANET_SYMBOLS[planetKey];
  const circleSize = (isRulingPlanet ? 0.15 : 0.11) * scale;
  const fontSize = 0.2 * scale;
  const ringInner = 0.18 * scale;
  const ringOuter = 0.23 * scale;

  useFrame((_, delta) => {
    if (glowRef.current && isRulingPlanet) glowRef.current.rotation.z += delta * 0.8;
  });

  return (
    <group position={[position.x, position.y, 0.1]}>
      {isRulingPlanet && (
        <mesh ref={glowRef}>
          <ringGeometry args={[ringInner, ringOuter, 6]} />
          <meshBasicMaterial color={color} opacity={0.35} transparent />
        </mesh>
      )}
      <mesh onPointerOver={() => setHovered(true)} onPointerOut={() => setHovered(false)}>
        <circleGeometry args={[circleSize, 32]} />
        <meshBasicMaterial color={hovered ? '#ffffff' : color} />
      </mesh>
      <Text
        position={[0, -(circleSize + 0.06), 0]}
        fontSize={fontSize}
        color={color}
        anchorX="center"
        anchorY="top"
        fontWeight="bold"
      >
        {symbol}
      </Text>
      {hovered && (
        <Html position={[0, 0.5, 0]} center>
          <div className="bg-black/90 text-white text-xs px-2 py-1 rounded whitespace-nowrap border border-gold/30">
            {lang === 'mr' ? PLANET_SYMBOLS_MR[planetKey] : planetKey.charAt(0).toUpperCase() + planetKey.slice(1)}
            {isRulingPlanet && <span className="text-gold ml-1">&#9733;</span>}
          </div>
        </Html>
      )}
    </group>
  );
}

// Star field
function StarField() {
  const ref = useRef();
  const particles = useMemo(() => {
    const p = new Float32Array(400 * 3);
    for (let i = 0; i < 400; i++) {
      p[i * 3] = (Math.random() - 0.5) * 25;
      p[i * 3 + 1] = (Math.random() - 0.5) * 25;
      p[i * 3 + 2] = (Math.random() - 0.5) * 5 - 3;
    }
    return p;
  }, []);
  useFrame((_, delta) => { if (ref.current) ref.current.rotation.z += delta * 0.015; });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" array={particles} count={400} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.03} color="#d4a017" transparent opacity={0.3} />
    </points>
  );
}

// Main scene
function Scene({ chartData, rulingPlanetKeys, lang }) {
  const groupRef = useRef();
  useFrame(() => {
    if (groupRef.current) groupRef.current.rotation.z = Math.sin(Date.now() * 0.0002) * 0.01;
  });

  const ascSignIndex = chartData?.chart?.ascendantSignIndex || 0;
  const planetPositions = chartData?.chart?.planetPositions || {};

  // Group planets by sign index (Kalapurusha — signs at fixed positions)
  const planetsInSigns = {};
  Object.entries(planetPositions).forEach(([key, info]) => {
    const si = info.signIndex;
    if (!planetsInSigns[si]) planetsInSigns[si] = [];
    planetsInSigns[si].push(key);
  });

  return (
    <>
      <StarField />
      <ambientLight intensity={0.4} />
      <pointLight position={[0, 0, 5]} intensity={0.8} color="#d4a017" />
      <group ref={groupRef}>
        <ChartGrid ascSignIndex={ascSignIndex} lang={lang} />

        {/* Planets at their sign's fixed position */}
        {Object.entries(planetsInSigns).map(([signIdx, planets]) => {
          const idx = parseInt(signIdx);
          const base = SIGN_CENTERS[idx] || { x: 0, y: 0 };
          const grid = getPlanetPositions(planets.length);
          const scale = planets.length >= 5 ? 0.65 : planets.length >= 3 ? 0.8 : 1;
          return planets.map((pKey, pIdx) => {
            const g = grid[pIdx];
            return (
              <PlanetGlyph
                key={pKey}
                planetKey={pKey}
                position={{ x: base.x + g.dx, y: base.y + g.dy }}
                isRulingPlanet={rulingPlanetKeys.includes(pKey)}
                lang={lang}
                scale={scale}
              />
            );
          });
        })}

        {/* Lagna marker */}
        <Text position={[0, 3.4, 0.1]} fontSize={0.3} color="#d4a017" anchorX="center" fontWeight="bold">
          {lang === 'mr' ? '॥ लग्न ॥' : '॥ ASC ॥'}
        </Text>
      </group>
      <OrbitControls enablePan enableZoom enableRotate minDistance={5} maxDistance={16} autoRotate={false} />
    </>
  );
}

export default function KundaliChart3D({ chartData }) {
  const { lang } = useI18n();
  const rulingPlanetKeys = useMemo(() => {
    if (!chartData?.rulingPlanets) return [];
    return chartData.rulingPlanets.filter((rp) => !rp.skipped).map((rp) => rp.planetKey);
  }, [chartData]);

  if (!chartData) return null;
  return (
    <div className="card-glass overflow-hidden w-full h-full relative" style={{ minHeight: '400px' }}>
      <Canvas camera={{ position: [0, 0, 9], fov: 50 }} style={{ background: 'transparent' }}>
        <Scene chartData={chartData} rulingPlanetKeys={rulingPlanetKeys} lang={lang} />
      </Canvas>
      <div className="absolute bottom-2 left-0 right-0 text-center text-white/15 text-xs pointer-events-none">
        {lang === 'mr' ? 'स्क्रोल करा = झूम | ड्रॅग = फिरवा' : 'Scroll = Zoom | Drag = Rotate'}
      </div>
    </div>
  );
}
