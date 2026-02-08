import { useRef, useMemo, useEffect, useState, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Text, Billboard, Html } from '@react-three/drei';
import * as THREE from 'three';
import type { Employee, Winner } from '@/types';

interface SpherePointProps {
  employee: Employee;
  position: THREE.Vector3;
  isWinner: boolean;
  isSelected: boolean;
  opacity: number;
  fontReady: boolean;
  fontUrl: string;
}

// 单个头像/名称组件
function SpherePoint({ employee, position, isWinner, isSelected, opacity, fontReady, fontUrl }: SpherePointProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const textRef = useRef<THREE.Mesh>(null);
  const [textureLoaded, setTextureLoaded] = useState(false);
  const [textureError, setTextureError] = useState(false);
  
  // 加载头像纹理
  const avatarUrl = employee.avatar;
  const hasValidAvatar = avatarUrl && avatarUrl.length > 0;
  
  useFrame((state) => {
    if (meshRef.current) {
      // 选中时脉冲效果
      if (isSelected) {
        const scale = 1.2 + Math.sin(state.clock.elapsedTime * 8) * 0.1;
        meshRef.current.scale.setScalar(scale);
      } else {
        meshRef.current.scale.setScalar(isWinner ? 0.9 : 1);
      }
    }
  });

  // 尝试预加载头像
  useEffect(() => {
    if (hasValidAvatar) {
      const loader = new THREE.TextureLoader();
      loader.load(
        avatarUrl,
        () => setTextureLoaded(true),
        undefined,
        () => setTextureError(true)
      );
    }
  }, [avatarUrl, hasValidAvatar]);
  
  // 如果有头像且加载成功，使用纹理渲染
  const shouldShowAvatar = hasValidAvatar && textureLoaded && !textureError;
  
  return (
    <Billboard position={position}>
      {/* 头像圆形背景 */}
      <mesh ref={meshRef} position={[0, 0, 0.01]}>
        <circleGeometry args={[0.35, 32]} />
        <meshBasicMaterial 
          color={isSelected ? '#ff9d00' : isWinner ? '#f8bc36' : '#2a2a2a'}
          transparent
          opacity={opacity}
        />
      </mesh>
      
      {/* 头像图片或姓名首字母 */}
      {shouldShowAvatar ? (
        // 使用圆形裁剪的平面来显示头像
        <AvatarPlane 
          url={avatarUrl} 
          opacity={opacity}
          isSelected={isSelected}
        />
      ) : (
        fontReady ? (
          <Text
            ref={textRef}
            position={[0, 0, 0.02]}
            fontSize={0.25}
            color={isSelected ? '#000' : isWinner ? '#000' : '#f8bc36'}
            anchorX="center"
            anchorY="middle"
            font={fontUrl}
          >
            {employee.name.charAt(0)}
          </Text>
        ) : (
          <Html center position={[0, 0, 0.02]} distanceFactor={8} style={{ pointerEvents: 'none' }}>
            <div className="sphere-initial" style={{ color: isSelected || isWinner ? '#000' : '#f8bc36' }}>
              {employee.name.charAt(0)}
            </div>
          </Html>
        )
      )}
      
      {/* 姓名标签 */}
      {fontReady ? (
        <Text
          position={[0, -0.5, 0]}
          fontSize={0.15}
          color="#f8bc36"
          anchorX="center"
          anchorY="top"
          font={fontUrl}
        >
          {employee.name}
        </Text>
      ) : (
        <Html center position={[0, -0.5, 0]} distanceFactor={8} style={{ pointerEvents: 'none' }}>
          <div className="sphere-name">{employee.name}</div>
        </Html>
      )}
      
      {/* 选中时的发光环 */}
      {isSelected && (
        <mesh position={[0, 0, 0.03]}>
          <ringGeometry args={[0.4, 0.5, 32]} />
          <meshBasicMaterial 
            color="#f8bc36" 
            transparent 
            opacity={0.8}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </Billboard>
  );
}

// 头像平面组件 - 使用圆形裁剪显示头像
function AvatarPlane({ url, opacity, isSelected }: { url: string; opacity: number; isSelected: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  
  useEffect(() => {
    const loader = new THREE.TextureLoader();
    loader.load(
      url,
      (loadedTexture) => {
        loadedTexture.minFilter = THREE.LinearFilter;
        loadedTexture.magFilter = THREE.LinearFilter;
        setTexture(loadedTexture);
      },
      undefined,
      () => { /* 加载失败静默处理 */ }
    );
    
    return () => {
      if (texture) {
        texture.dispose();
      }
    };
  }, [url]);
  
  // 创建圆形裁剪的材质
  const material = useMemo(() => {
    if (!texture) return null;
    const mat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: opacity,
      side: THREE.DoubleSide,
    });
    return mat;
  }, [texture, opacity]);
  
  if (!material) return null;
  
  return (
    <mesh ref={meshRef} position={[0, 0, 0.02]} scale={isSelected ? 1.1 : 1}>
      <circleGeometry args={[0.3, 32]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

interface SphereGroupProps {
  employees: Employee[];
  winners: Winner[];
  selectedEmployee: Employee | null;
  rotationSpeed: number;
  isSpinning: boolean;
  fontReady: boolean;
  fontUrl: string;
  onStopSelectWinner?: (employee: Employee) => void;
}

// 球体组组件
function SphereGroup({ employees, winners, selectedEmployee, rotationSpeed, isSpinning, fontReady, fontUrl, onStopSelectWinner }: SphereGroupProps) {
  const groupRef = useRef<THREE.Group>(null);
  const winnerIds = useMemo(() => new Set(winners.map(w => w.employee.id)), [winners]);
  const prevSpeedRef = useRef(0);
  const hasTriggeredRef = useRef(false);
  const spinVelocityRef = useRef(new THREE.Vector3(0.4, 0.8, 0.2));
  const targetSpinVelocityRef = useRef(new THREE.Vector3(0.6, 1.0, 0.3));
  const lastSpinChangeRef = useRef(0);
  
  // 斐波那契球面分布算法
  const points = useMemo(() => {
    const count = employees.length;
    const radius = 4;
    const positions: { employee: Employee; position: THREE.Vector3; phi: number; theta: number }[] = [];
    
    if (count <= 0) return positions;

    const phi = Math.PI * (3 - Math.sqrt(5)); // 黄金角度
    
    for (let i = 0; i < count; i++) {
      // 避免 y=±1 的极点，防止顶/底头像停滞
      const y = 1 - ((i + 0.5) / count) * 2;
      const radiusAtY = Math.sqrt(1 - y * y);
      const theta = phi * i;
      
      const x = Math.cos(theta) * radiusAtY;
      const z = Math.sin(theta) * radiusAtY;
      
      positions.push({
        employee: employees[i],
        position: new THREE.Vector3(x * radius, y * radius, z * radius),
        phi: Math.acos(y),
        theta: theta,
      });
    }
    
    return positions;
  }, [employees]);

  // 找到正对摄像机的员工（世界坐标 z 值最大的）
  const findFrontEmployee = useCallback(() => {
    if (!groupRef.current || points.length === 0) return null;

    let maxZ = -Infinity;
    let frontEmployee: Employee | null = null;

    const worldPos = new THREE.Vector3();

    for (const point of points) {
      // 将局部坐标转换为世界坐标
      worldPos.copy(point.position);
      groupRef.current.localToWorld(worldPos);

      if (worldPos.z > maxZ) {
        maxZ = worldPos.z;
        frontEmployee = point.employee;
      }
    }

    return frontEmployee;
  }, [points]);

  // 旋转动画
  useFrame((state, delta) => {
    if (groupRef.current) {
      // 检测速度从 > 0 变为 0 的瞬间（减速结束）
      if (prevSpeedRef.current > 0 && rotationSpeed === 0 && !hasTriggeredRef.current) {
        hasTriggeredRef.current = true;
        // 停止时找到正对摄像机的员工作为中奖者
        const winner = findFrontEmployee();
        if (winner && onStopSelectWinner) {
          onStopSelectWinner(winner);
        }
      }

      // 开始新一轮抽奖时重置触发标记
      if (rotationSpeed > 5 && hasTriggeredRef.current) {
        hasTriggeredRef.current = false;
      }

      prevSpeedRef.current = rotationSpeed;

      if (isSpinning || rotationSpeed > 0) {
        if (isSpinning) {
          const elapsed = state.clock.elapsedTime;
          if (elapsed - lastSpinChangeRef.current > 0.8) {
            lastSpinChangeRef.current = elapsed;
            targetSpinVelocityRef.current.set(
              (Math.random() - 0.5) * 1.6,
              (Math.random() - 0.5) * 1.8,
              (Math.random() - 0.5) * 1.2
            );
          }
          spinVelocityRef.current.lerp(targetSpinVelocityRef.current, delta * 0.6);
        }
        groupRef.current.rotation.x += spinVelocityRef.current.x * rotationSpeed * delta;
        groupRef.current.rotation.y += spinVelocityRef.current.y * rotationSpeed * delta;
        groupRef.current.rotation.z += spinVelocityRef.current.z * rotationSpeed * delta;
      } else {
        // 空闲状态缓慢旋转
        groupRef.current.rotation.y += 0.2 * delta;
        groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3) * 0.05;
      }
    }
  });

  return (
    <group ref={groupRef}>
      {/* 球体连接线（可选，低透明度） */}
      <mesh>
        <sphereGeometry args={[3.9, 32, 32]} />
        <meshBasicMaterial 
          color="#f8bc36" 
          transparent 
          opacity={0.03} 
          wireframe 
        />
      </mesh>
      
      {/* 中心发光球 */}
      <mesh>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial 
          color="#f8bc36"
          transparent
          opacity={0.1}
        />
      </mesh>
      
      {/* 员工点 */}
      {points.map((point) => {
        const isWinner = winnerIds.has(point.employee.id);
        const isSelected = selectedEmployee?.id === point.employee.id;
        
        // 根据Z轴深度计算透明度（近大远小效果）
        const z = point.position.z;
        const normalizedZ = (z + 4) / 8; // 归一化到 0-1
        const opacity = 0.3 + normalizedZ * 0.7;
        
        return (
          <SpherePoint
            key={point.employee.id}
            employee={point.employee}
            position={point.position}
            isWinner={isWinner}
            isSelected={isSelected}
            opacity={opacity}
            fontReady={fontReady}
            fontUrl={fontUrl}
          />
        );
      })}
    </group>
  );
}

// 相机控制器
function CameraController() {
  const { camera } = useThree();
  const targetPosition = useRef(new THREE.Vector3(0, 0, 12));
  
  useFrame((_, delta) => {
    // 平滑相机移动
    camera.position.lerp(targetPosition.current, delta * 2);
    camera.lookAt(0, 0, 0);
  });
  
  return null;
}

// 粒子效果
function ParticleEffect({ isActive }: { isActive: boolean }) {
  const particlesRef = useRef<THREE.Points>(null);
  const particleCount = 100;
  
  const [positions, velocities] = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const vel: THREE.Vector3[] = [];
    
    for (let i = 0; i < particleCount; i++) {
      pos[i * 3] = 0;
      pos[i * 3 + 1] = 0;
      pos[i * 3 + 2] = 0;
      
      vel.push(new THREE.Vector3(
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10
      ));
    }
    
    return [pos, vel];
  }, []);
  
  useFrame((_, delta) => {
    if (particlesRef.current && isActive) {
      const posArray = particlesRef.current.geometry.attributes.position.array as Float32Array;
      
      for (let i = 0; i < particleCount; i++) {
        posArray[i * 3] += velocities[i].x * delta;
        posArray[i * 3 + 1] += velocities[i].y * delta;
        posArray[i * 3 + 2] += velocities[i].z * delta;
        
        // 重置粒子
        if (Math.abs(posArray[i * 3]) > 10) {
          posArray[i * 3] = 0;
          posArray[i * 3 + 1] = 0;
          posArray[i * 3 + 2] = 0;
        }
      }
      
      particlesRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });
  
  if (!isActive) return null;
  
  // 创建bufferAttribute
  const positionAttribute = new THREE.BufferAttribute(positions, 3);
  
  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <primitive object={positionAttribute} attach="attributes-position" />
      </bufferGeometry>
      <pointsMaterial
        size={0.1}
        color="#f8bc36"
        transparent
        opacity={0.8}
        sizeAttenuation
      />
    </points>
  );
}

// 主3D场景组件
interface Scene3DProps {
  employees: Employee[];
  winners: Winner[];
  selectedEmployee: Employee | null;
  rotationSpeed: number;
  isSpinning: boolean;
  showParticles: boolean;
  fontReady: boolean;
  fontUrl: string;
  onStopSelectWinner?: (employee: Employee) => void;
}

function Scene3D({ employees, winners, selectedEmployee, rotationSpeed, isSpinning, showParticles, fontReady, fontUrl, onStopSelectWinner }: Scene3DProps) {
  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} color="#f8bc36" />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#ff9d00" />

      <CameraController />

      <SphereGroup
        employees={employees}
        winners={winners}
        selectedEmployee={selectedEmployee}
        rotationSpeed={rotationSpeed}
        isSpinning={isSpinning}
        fontReady={fontReady}
        fontUrl={fontUrl}
        onStopSelectWinner={onStopSelectWinner}
      />

      <ParticleEffect isActive={showParticles} />
    </>
  );
}

// 主导出组件
interface Sphere3DProps {
  employees: Employee[];
  winners: Winner[];
  selectedEmployee: Employee | null;
  rotationSpeed: number;
  isSpinning: boolean;
  showParticles: boolean;
  onStopSelectWinner?: (employee: Employee) => void;
}

export default function Sphere3D({
  employees,
  winners,
  selectedEmployee,
  rotationSpeed,
  isSpinning,
  showParticles,
  onStopSelectWinner
}: Sphere3DProps) {
  const fontUrl = useMemo(() => {
    const base = import.meta.env.BASE_URL || '/';
    return `${base}fonts/lottery.woff2`;
  }, []);
  const [fontReady, setFontReady] = useState(false);

  useEffect(() => {
    // Tauri WebView 不支持 woff2 字体渲染，强制使用 HTML fallback
    const isTauri = typeof window !== 'undefined' && !!(window as { __TAURI__?: unknown }).__TAURI__;
    if (isTauri) {
      setFontReady(false);
      return;
    }

    let cancelled = false;
    const isValidFont = (buffer: ArrayBuffer) => {
      if (buffer.byteLength < 4) return false;
      const view = new DataView(buffer);
      const sig = String.fromCharCode(
        view.getUint8(0),
        view.getUint8(1),
        view.getUint8(2),
        view.getUint8(3)
      );
      // wOFF / wOF2 / OTTO / 0x00010000
      if (sig === 'wOFF' || sig === 'wOF2' || sig === 'OTTO') return true;
      return view.getUint32(0, false) === 0x00010000;
    };
    const checkFont = async () => {
      try {
        const res = await fetch(fontUrl, { cache: 'force-cache' });
        if (!res.ok) {
          if (!cancelled) setFontReady(false);
          return;
        }
        const buffer = await res.arrayBuffer();
        if (!cancelled) setFontReady(isValidFont(buffer));
      } catch {
        if (!cancelled) setFontReady(false);
      }
    };
    checkFont();
    return () => {
      cancelled = true;
    };
  }, [fontUrl]);

  return (
    <div className="canvas-container">
      <Canvas
        camera={{ position: [0, 0, 12], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <Scene3D
          employees={employees}
          winners={winners}
          selectedEmployee={selectedEmployee}
          rotationSpeed={rotationSpeed}
          isSpinning={isSpinning}
          showParticles={showParticles}
          fontReady={fontReady}
          fontUrl={fontUrl}
          onStopSelectWinner={onStopSelectWinner}
        />
      </Canvas>
    </div>
  );
}
