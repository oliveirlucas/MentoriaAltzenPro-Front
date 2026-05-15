import React, { Suspense, useMemo, useRef } from 'react'
import { Canvas, useFrame, useLoader } from '@react-three/fiber'
import { Center, Float, OrbitControls, Stars, Torus } from '@react-three/drei'
import * as THREE from 'three'
// SVGLoader fica em três.js examples — não tem export direto a partir de 'three'.
import { SVGLoader, type SVGResult } from 'three/examples/jsm/loaders/SVGLoader.js'

const LOGO_SVG_URL = '/altzen-logo.svg'

/**
 * Logo 3D extrudada a partir do SVG.
 *
 * Pipeline:
 * 1. `SVGLoader` lê os paths do SVG.
 * 2. `SVGLoader.createShapes` converte cada path em `THREE.Shape` (já tratando holes via fill-rule).
 * 3. `extrudeGeometry` gera volume real em Z, com bevel para acabamento premium.
 * 4. `meshStandardMaterial` com cor azul + emissive aplica brilho neon nas pointLights.
 *
 * O SVG vem em coordenadas Y↓ — espelhamos via `<group rotation={[Math.PI, 0, 0]}>` e usamos
 * `<Center>` do drei para centralizar automaticamente em (0,0,0).
 */
function ExtrudedLogo() {
  const data = useLoader(SVGLoader, LOGO_SVG_URL) as SVGResult

  const shapes = useMemo(() => {
    return data.paths.flatMap((path) => SVGLoader.createShapes(path))
  }, [data])

  const extrudeSettings = useMemo<THREE.ExtrudeGeometryOptions>(
    () => ({
      depth: 30,
      bevelEnabled: true,
      bevelSegments: 8,
      bevelSize: 3.5,
      bevelThickness: 4,
      curveSegments: 32,
    }),
    [],
  )

  const groupRef = useRef<THREE.Group>(null)

  useFrame((state) => {
    const t = state.clock.getElapsedTime()
    if (groupRef.current) {
      // Rotação contínua no Y para mostrar a profundidade do extrudado;
      // leve oscilação no X para ganhar dimensão sem perder legibilidade.
      groupRef.current.rotation.y = t * 0.45
      groupRef.current.rotation.x = Math.sin(t * 0.6) * 0.18
    }
  })

  return (
    <group ref={groupRef} scale={0.014}>
      <Center>
        {/* SVG está em Y↓ — espelhamos com rotation X = π */}
        <group rotation={[Math.PI, 0, 0]}>
          {shapes.map((shape, i) => (
            <mesh key={i} castShadow receiveShadow>
              <extrudeGeometry args={[shape, extrudeSettings]} />
              <meshStandardMaterial
                color={'#1e40af'}
                emissive={'#3b82f6'}
                emissiveIntensity={0.4}
                metalness={0.75}
                roughness={0.22}
                envMapIntensity={1}
              />
            </mesh>
          ))}
        </group>
      </Center>
    </group>
  )
}

/** Anéis orbitando o conjunto. */
function OrbitRings() {
  const groupRef = useRef<THREE.Group>(null)

  useFrame((state) => {
    const t = state.clock.getElapsedTime()
    if (groupRef.current) {
      groupRef.current.rotation.y = t * 0.18
      groupRef.current.rotation.x = Math.sin(t * 0.3) * 0.18
    }
  })

  return (
    <group ref={groupRef}>
      <Torus args={[3.2, 0.012, 16, 128]} rotation={[Math.PI / 2.4, 0, 0]}>
        <meshBasicMaterial color={'#22d3ee'} transparent opacity={0.55} toneMapped={false} />
      </Torus>
      <Torus args={[3.7, 0.01, 16, 128]} rotation={[Math.PI / 1.8, Math.PI / 6, 0]}>
        <meshBasicMaterial color={'#a78bfa'} transparent opacity={0.42} toneMapped={false} />
      </Torus>
      <Torus args={[4.2, 0.008, 16, 128]} rotation={[Math.PI / 3, -Math.PI / 4, 0]}>
        <meshBasicMaterial color={'#38bdf8'} transparent opacity={0.32} toneMapped={false} />
      </Torus>
    </group>
  )
}

interface CoreSceneProps {
  /** Permite OrbitControls (raramente true em landing). */
  interactive?: boolean
  className?: string
}

/**
 * Cena 3D do hero: logo AltzenPro extrudada (volume real) + anéis + estrelas distantes.
 * Lazy-friendly (carregada com React.lazy a partir do HeroSection/CtaSection).
 */
export default function CoreScene({ interactive = false, className }: CoreSceneProps) {
  return (
    <div className={className ?? 'absolute inset-0'}>
      <Canvas
        camera={{ position: [0, 0, 7.5], fov: 42 }}
        dpr={[1, 1.6]}
        shadows
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      >
        <color attach="background" args={[0, 0, 0]} />
        <fog attach="fog" args={['#050816', 9, 22]} />

        {/* Iluminação 100% local — sem dependência de HDR externo (compatível com CSP estrito). */}
        <ambientLight intensity={0.3} />
        <hemisphereLight args={['#22d3ee', '#1e1b4b', 0.55]} />
        <pointLight position={[5, 5, 5]} intensity={2.4} color={'#22d3ee'} distance={20} />
        <pointLight position={[-5, -3, 4]} intensity={1.6} color={'#a78bfa'} distance={20} />
        <pointLight position={[0, -4, 2]} intensity={1.0} color={'#7c3aed'} distance={15} />
        <directionalLight position={[2, 6, 6]} intensity={1.1} color={'#ffffff'} />

        <Suspense fallback={null}>
          <Float speed={1.0} rotationIntensity={0.18} floatIntensity={0.6}>
            <ExtrudedLogo />
          </Float>
          <OrbitRings />
          <Stars
            radius={50}
            depth={40}
            count={1200}
            factor={4}
            saturation={0.4}
            fade
            speed={0.6}
          />
        </Suspense>

        {interactive ? (
          <OrbitControls enablePan={false} enableZoom={false} autoRotate autoRotateSpeed={0.6} />
        ) : null}
      </Canvas>

      {/* Vinheta radial para fundir com o background da landing */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_50%_50%,transparent_30%,rgba(5,8,22,0.55)_75%,#050816_100%)]"
        aria-hidden
      />
    </div>
  )
}
