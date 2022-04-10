import React, { Suspense, useMemo, useRef, VFC } from 'react';
import * as THREE from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader';
import { MeshReflectorMaterial, OrbitControls, useTexture } from '@react-three/drei';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { BloomPass } from './postprocessing/BloomPass';
import { Effects } from './postprocessing/Effects';
import { FlowmapPass } from './postprocessing/FlowmapPass';
import { FXAAPass } from './postprocessing/FXAAPass';

export const TCanvas: VFC = () => {
	return (
		<Canvas
			camera={{
				position: [0, 0, 10],
				fov: 50,
				aspect: window.innerWidth / window.innerHeight,
				near: 0.1,
				far: 2000
			}}
			dpr={window.devicePixelRatio}
			shadows>
			{/* scene */}
			<color attach="background" args={['#000']} />
			<OrbitControls
				target={[0, 1.5, 0]}
				enablePan={false}
				enableZoom={false}
				minPolarAngle={Math.PI / 4}
				maxPolarAngle={Math.PI / 2}
			/>
			<ambientLight />
			<Suspense fallback={null}>
				<SVGMesh />
				<Floor />
				<Effects>
					<FXAAPass />
					<BloomPass />
					<FlowmapPass />
				</Effects>
			</Suspense>
			{/* helper */}
			{/* <Stats /> */}
			{/* <axesHelper /> */}
		</Canvas>
	)
}

const SVGMesh: VFC = () => {
	const ref = useRef<THREE.Group>(null)
	const {
		paths: [path]
	} = useLoader(SVGLoader, process.env.PUBLIC_URL + '/assets/svg/threejs.svg')

	const geometries = useMemo(() => {
		const geometries: THREE.BufferGeometry[] = []
		const bX = [Number.MAX_VALUE, Number.MIN_VALUE]
		const bY = [Number.MAX_VALUE, Number.MIN_VALUE]
		const bZ = [Number.MAX_VALUE, Number.MIN_VALUE]
		path.subPaths.forEach(p => {
			const geometry = SVGLoader.pointsToStroke(p.getPoints(), path.userData!.style)
			geometry.computeBoundingBox()
			const { min, max } = geometry.boundingBox!
			bX[0] = Math.min(bX[0], min.x)
			bY[0] = Math.min(bY[0], min.y)
			bZ[0] = Math.min(bZ[0], min.z)
			bX[1] = Math.max(bX[1], max.x)
			bY[1] = Math.max(bY[1], max.y)
			bZ[1] = Math.max(bZ[1], max.z)
			geometries.push(geometry)
		})

		const [offsetX, offsetY, offsetZ] = [(bX[1] + bX[0]) / 2, (bY[1] + bY[0]) / 2, (bZ[1] + bZ[0]) / 2]
		geometries.forEach(geometry => {
			geometry.applyMatrix4(new THREE.Matrix4().makeTranslation(-offsetX, -offsetY, -offsetZ))
			geometry.applyMatrix4(new THREE.Matrix4().makeRotationY(Math.PI))
			geometry.applyMatrix4(new THREE.Matrix4().makeRotationZ(Math.PI))
		})

		return geometries
	}, [path])

	useFrame(({ clock }) => {
		ref.current!.position.y = 0.7 * Math.sin(clock.getElapsedTime() * 0.3) + 1.0
	})

	return (
		<group ref={ref} scale={0.008}>
			{geometries.map((geometry, i) => (
				<mesh key={i} geometry={geometry}>
					<meshBasicMaterial color="#fff" toneMapped={false} side={THREE.DoubleSide} />
				</mesh>
			))}
		</group>
	)
}

const Floor: VFC = () => {
	const filePath = (name: string) => process.env.PUBLIC_URL + `/assets/textures/SurfaceImperfections003_1K_${name}.jpg`
	const [roughness] = useTexture([filePath('var1')])

	return (
		<mesh position-y={-0.5} rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
			<planeGeometry args={[20, 20, 100, 100]} />
			<MeshReflectorMaterial
				resolution={2048}
				mirror={1}
				blur={[500, 100]}
				mixBlur={30}
				mixStrength={1.5}
				metalness={0}
				roughnessMap={roughness}
				// distortionMap={normal}
				// distortion={0.15}
				// normalMap={normal}
				// normalScale={new THREE.Vector2(2, 2)}
				color="#f0f0f0"
				alphaWrite={undefined}
				refractionRatio={undefined}
			/>
		</mesh>
	)
}
