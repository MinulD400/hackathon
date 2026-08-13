"use client";

import { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, OrbitControls, useGLTF, Center, ContactShadows } from "@react-three/drei";
import * as THREE from "three";

/**
 * Loads ALTURA's 3D logo model (`/logo_3d.glb`) scaled down perfectly (`scale={0.95}`)
 * with camera pulled back (`position: [0, 0, 6.5]`) so it never clips or dominates the viewport.
 */
function AlturaLogo3DModel() {
  const { scene } = useGLTF("/logo_3d.glb");
  const modelGroupRef = useRef<THREE.Group>(null);

  // Traverse materials for balanced metallic sheen
  scene.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      if (mesh.material) {
        const mat = mesh.material as THREE.MeshStandardMaterial;
        mat.metalness = 0.8;
        mat.roughness = 0.25;
        mat.envMapIntensity = 1.8;
      }
    }
  });

  useFrame((state, delta) => {
    if (modelGroupRef.current) {
      modelGroupRef.current.rotation.y += delta * 0.4;
      modelGroupRef.current.rotation.x = Math.sin(state.clock.getElapsedTime() * 0.5) * 0.05;
    }
  });

  return (
    <group ref={modelGroupRef}>
      <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.3}>
        <Center>
          <primitive object={scene} scale={0.95} />
        </Center>
      </Float>

      {/* Floating Accent Sparkles */}
      {[...Array(4)].map((_, i) => (
        <Float key={i} speed={2 + i} floatIntensity={0.5}>
          <mesh position={[(i % 2 === 0 ? 1 : -1) * 1.8, Math.sin(i) * 1.1, (i > 1 ? 1 : -1) * 0.6]}>
            <octahedronGeometry args={[0.06, 0]} />
            <meshStandardMaterial color="#38bdf8" emissive="#0284c7" emissiveIntensity={1.2} metalness={0.8} />
          </mesh>
        </Float>
      ))}

      {/* Ground Contact Shadow */}
      <ContactShadows position={[0, -1.4, 0]} opacity={0.6} scale={6} blur={2} far={3.5} color="#000000" />
    </group>
  );
}

// Preload the GLB model asset
useGLTF.preload("/logo_3d.glb");

export function LandingHero3D() {
  return (
    <div className="relative h-full w-full">
      <Canvas camera={{ position: [0, 0, 6.5], fov: 40 }}>
        <color attach="background" args={["#030712"]} />
        
        {/* Studio Lighting */}
        <ambientLight intensity={0.9} />
        <directionalLight position={[10, 12, 10]} intensity={2.2} color="#ffffff" />
        <directionalLight position={[-10, -8, -10]} intensity={1.8} color="#0284c7" />
        <pointLight position={[0, 4, 3]} intensity={1.8} color="#38bdf8" />

        <Suspense fallback={null}>
          <AlturaLogo3DModel />
        </Suspense>

        <OrbitControls
          enableZoom={false}
          enablePan={false}
          autoRotate
          autoRotateSpeed={1.2}
          maxPolarAngle={Math.PI / 1.7}
          minPolarAngle={Math.PI / 3}
        />
      </Canvas>
    </div>
  );
}
