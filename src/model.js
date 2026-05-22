import * as THREE from 'three/webgpu'
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js'

function createGlassMaterial(params) {
	return new THREE.MeshPhysicalMaterial({
		color: params.isDark ? 0x1a1d24 : 0xffffff,
		metalness: 0,
		roughness: params.roughness,
		transmission: params.transmission,
		ior: params.ior,
		dispersion: params.dispersion,
		thickness: params.thickness,
		attenuationColor: params.isDark ? 0x11151d : 0xffffff,
		attenuationDistance: params.isDark ? 3.5 : params.attenuationDistance,
		clearcoat: 0.01,
		clearcoatRoughness: 0.15,
		specularIntensity: 0.4,
		specularColor: 0xffffff,
		envMapIntensity: 2.5,
		iridescence: params.iridescence,
		iridescenceIOR: 1.3,
		iridescenceThicknessRange: [90, 520],
		side: THREE.DoubleSide
	})
}

export function createModelController({ scene, params, services }) {
	const group = new THREE.Group()
	const loader = new SVGLoader()
	const cache = new Map()

	let requestId = 0
	let fitScale = 1
	let material = createGlassMaterial(params)

	scene.add(group)

	const getSvg = name =>
		cache.get(name) ?? cache.set(name, loader.loadAsync(services[name])).get(name)

	const updateScale = () => {
		group.scale.setScalar(fitScale * params.scale)
	}

	const clear = () => {
		for (const child of group.children) {
			child.geometry?.dispose()
			if (child.material && child.material !== material) child.material.dispose()
		}
		group.clear()
	}

	const setGlassMaterial = () => {
		const next = createGlassMaterial(params)
		for (const child of group.children) child.material = next
		material.dispose()
		material = next
	}

	const loadModel = async () => {
		const id = ++requestId
		const svg = await getSvg(params.model).catch(() => null)
		if (!svg || id !== requestId) return false

		const bounds = new THREE.Box3()
		const extrude = {
			depth: params.depth,
			bevelEnabled: true,
			bevelSize: params.bevel,
			bevelThickness: params.bevel,
			bevelSegments: 16,
			curveSegments: 96
		}

		const meshes = []
		for (const path of svg.paths) {
			for (const shape of SVGLoader.createShapes(path)) {
				const geometry = new THREE.ExtrudeGeometry(shape, extrude)
				geometry.computeVertexNormals()
				geometry.computeBoundingBox()
				bounds.union(geometry.boundingBox)
				meshes.push(new THREE.Mesh(geometry, material))
			}
		}

		if (bounds.isEmpty()) return false

		const center = bounds.getCenter(new THREE.Vector3())
		for (const mesh of meshes) mesh.geometry.translate(-center.x, -center.y, -center.z)

		clear()
		group.add(...meshes)

		const size = bounds.getSize(new THREE.Vector3())
		fitScale = 4.5 / Math.max(size.x, size.y, size.z)
		updateScale()
		return true
	}

	return { group, loadModel, setGlassMaterial, updateScale }
}
