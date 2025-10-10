import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial, Sphere } from '@react-three/drei';
import * as THREE from 'three';

// Starfield Component
function Starfield() {
  const pointsRef = useRef<THREE.Points>(null);
  
  const [positions, colors] = useMemo(() => {
    const positions = new Float32Array(800 * 3);
    const colors = new Float32Array(800 * 3);
    
    for (let i = 0; i < 800; i++) {
      // Spread stars across the scene
      positions[i * 3] = (Math.random() - 0.5) * 50;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 50;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 25;
      
      // Random colors: white, blue, pink
      const colorType = Math.random();
      if (colorType < 0.6) {
        // White stars
        colors[i * 3] = 1;
        colors[i * 3 + 1] = 1;
        colors[i * 3 + 2] = 1;
      } else if (colorType < 0.8) {
        // Blue stars
        colors[i * 3] = 0.72;
        colors[i * 3 + 1] = 0.83;
        colors[i * 3 + 2] = 1;
      } else {
        // Pink stars
        colors[i * 3] = 1;
        colors[i * 3 + 1] = 0.8;
        colors[i * 3 + 2] = 0.91;
      }
    }
    
    return [positions, colors];
  }, []);
  
  useFrame((state) => {
    if (pointsRef.current) {
      // Slow rotation and drift
      pointsRef.current.rotation.y = state.clock.elapsedTime * 0.02;
      pointsRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.01) * 0.1;
    }
  });
  
  return (
    <Points ref={pointsRef} positions={positions}>
      <PointMaterial
        transparent
        vertexColors
        size={0.15}
        sizeAttenuation={true}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
      <bufferAttribute
        attach="geometry-attributes-color"
        args={[colors, 3]}
      />
    </Points>
  );
}

// Nebula Clouds Component
function NebulaClouds() {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.z = state.clock.elapsedTime * 0.01;
      groupRef.current.position.x = Math.sin(state.clock.elapsedTime * 0.05) * 2;
      groupRef.current.position.y = Math.cos(state.clock.elapsedTime * 0.03) * 1;
    }
  });
  
  return (
    <group ref={groupRef}>
      {/* Purple-blue nebula clouds */}
      <Sphere args={[8, 32, 32]} position={[-10, 5, -15]}>
        <meshBasicMaterial
          color="#4a5fc1"
          transparent
          opacity={0.15}
          blending={THREE.AdditiveBlending}
        />
      </Sphere>
      <Sphere args={[6, 32, 32]} position={[8, -3, -12]}>
        <meshBasicMaterial
          color="#764ba2"
          transparent
          opacity={0.12}
          blending={THREE.AdditiveBlending}
        />
      </Sphere>
      <Sphere args={[10, 32, 32]} position={[0, 0, -20]}>
        <meshBasicMaterial
          color="#1a1f4d"
          transparent
          opacity={0.2}
          blending={THREE.AdditiveBlending}
        />
      </Sphere>
    </group>
  );
}

// Glowing Ring Component
function GlowingRing() {
  const ringRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (ringRef.current) {
      // Pulse animation
      const pulse = Math.sin(state.clock.elapsedTime * 0.5) * 0.05 + 1;
      ringRef.current.scale.setScalar(pulse);
      
      // Slow rotation
      ringRef.current.rotation.z = state.clock.elapsedTime * 0.1;
      ringRef.current.rotation.y = state.clock.elapsedTime * 0.05;
    }
  });
  
  return (
    <mesh ref={ringRef} position={[0, 0, -5]}>
      <torusGeometry args={[3, 0.6, 16, 100]} />
      <meshStandardMaterial
        color="#ff8c42"
        emissive="#ff8c42"
        emissiveIntensity={0.8}
        transparent
        opacity={0.7}
      />
    </mesh>
  );
}

// Pink Foreground Clouds
function ForegroundClouds() {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.position.x = Math.sin(state.clock.elapsedTime * 0.08) * 3;
      groupRef.current.position.y = Math.cos(state.clock.elapsedTime * 0.06) * 2;
    }
  });
  
  return (
    <group ref={groupRef}>
      <Sphere args={[4, 32, 32]} position={[-8, 3, 0]}>
        <meshBasicMaterial
          color="#ff6b9d"
          transparent
          opacity={0.25}
          blending={THREE.AdditiveBlending}
        />
      </Sphere>
      <Sphere args={[5, 32, 32]} position={[10, -2, 2]}>
        <meshBasicMaterial
          color="#ffb88c"
          transparent
          opacity={0.2}
          blending={THREE.AdditiveBlending}
        />
      </Sphere>
      <Sphere args={[3, 32, 32]} position={[0, 5, 1]}>
        <meshBasicMaterial
          color="#ffd1dc"
          transparent
          opacity={0.18}
          blending={THREE.AdditiveBlending}
        />
      </Sphere>
    </group>
  );
}

// Main Scene
function DreamScene() {
  return (
    <>
      <color attach="background" args={['#0a0e27']} />
      <ambientLight intensity={0.5} />
      
      {/* All layers */}
      <Starfield />
      <NebulaClouds />
      <GlowingRing />
      <ForegroundClouds />
    </>
  );
}

// Main Component
export function DreamyBackground() {
  return (
    <div className="fixed inset-0 -z-10">
      <Canvas
        camera={{ position: [0, 0, 10], fov: 75 }}
        gl={{ 
          antialias: true,
          alpha: true,
          powerPreference: "high-performance"
        }}
      >
        <DreamScene />
      </Canvas>
    </div>
  );
}
