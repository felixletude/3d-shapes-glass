import * as THREE from 'three/webgpu'
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js'

function createSideDispersionTexture(params) {
	const size = 512
	const canvas = document.createElement('canvas')
	canvas.width = size
	canvas.height = size

	const ctx = canvas.getContext('2d')
	const saturation = THREE.MathUtils.clamp(params.sideSaturation, 0, 2)
	const edgeGlow = THREE.MathUtils.clamp(params.sideEdgeGlow, 0, 3)
	const bandCount = Math.max(1, params.sideBands)

	ctx.fillStyle = '#000000'
	ctx.fillRect(0, 0, size, size)

	const fillGradient = (x0, y0, x1, y1, stops, alpha = 1) => {
		const gradient = ctx.createLinearGradient(x0, y0, x1, y1)
		for (const [at, color] of stops) gradient.addColorStop(at, color)
		ctx.save()
		ctx.globalAlpha = alpha * saturation
		ctx.fillStyle = gradient
		ctx.fillRect(0, 0, size, size)
		ctx.restore()
	}

	fillGradient(0, 0, size, size * 0.72, [
		[0, '#05070d'],
		[0.28, '#0a1628'],
		[0.5, '#00d8ff'],
		[0.72, '#f5f2d0'],
		[1, '#080808']
	], 0.18)
	fillGradient(size, size * 0.08, 0, size * 0.55, [
		[0, '#000000'],
		[0.36, '#0018ff'],
		[0.58, '#00fff0'],
		[0.78, '#fff8c8'],
		[1, '#000000']
	], 0.24)

	for (let i = 0; i < bandCount; i++) {
		const y = (i + 0.5) * size / bandCount
		const height = size * 0.09
		const gradient = ctx.createLinearGradient(0, y - height, size, y + height)
		gradient.addColorStop(0, 'rgba(0, 0, 0, 0)')
		gradient.addColorStop(0.22, 'rgba(0, 216, 255, 0.35)')
		gradient.addColorStop(0.48, 'rgba(255, 255, 210, 0.55)')
		gradient.addColorStop(0.7, 'rgba(255, 38, 18, 0.32)')
		gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
		ctx.save()
		ctx.globalAlpha = 0.22 * saturation
		ctx.translate(size * 0.5, y)
		ctx.rotate(-0.28)
		ctx.fillStyle = gradient
		ctx.fillRect(-size * 0.7, -height * 0.5, size * 1.4, height)
		ctx.restore()
	}

	const blockGradient = ctx.createLinearGradient(size * 0.78, 0, size, 0)
	blockGradient.addColorStop(0, '#000000')
	blockGradient.addColorStop(0.48, '#0710ff')
	blockGradient.addColorStop(1, '#00f3ff')
	ctx.globalAlpha = 0.42 * saturation
	ctx.fillStyle = blockGradient
	ctx.fillRect(size * 0.78, 0, size * 0.2, size * 0.22)
	ctx.fillRect(size * 0.82, size * 0.68, size * 0.16, size * 0.22)
	ctx.globalAlpha = 1

	const topEdge = ctx.createLinearGradient(0, 0, size, 0)
	topEdge.addColorStop(0, 'rgba(0, 220, 255, 0.65)')
	topEdge.addColorStop(0.5, 'rgba(255, 240, 180, 0.95)')
	topEdge.addColorStop(1, 'rgba(255, 72, 18, 0.65)')
	ctx.globalAlpha = 0.28 * edgeGlow
	ctx.fillStyle = topEdge
	ctx.fillRect(0, 0, size, 12)
	ctx.fillRect(0, size - 12, size, 12)
	ctx.globalAlpha = 1

	const texture = new THREE.CanvasTexture(canvas)
	texture.colorSpace = THREE.SRGBColorSpace
	texture.minFilter = THREE.LinearFilter
	texture.magFilter = THREE.LinearFilter
	texture.needsUpdate = true
	return texture
}

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
		clearcoat: 1,
		clearcoatRoughness: 0,
		specularIntensity: 1,
		specularColor: 0xffffff,
		envMapIntensity: params.environmentIntensity,
		iridescence: params.iridescence,
		iridescenceIOR: 1.3,
		iridescenceThicknessRange: [90, 520],
		side: THREE.DoubleSide
	})
}

function createSidePrismMaterial(params) {
	const texture = createSideDispersionTexture(params)

	return new THREE.MeshPhysicalMaterial({
		color: params.isDark ? 0x26282c : 0x74736c,
		metalness: 0,
		roughness: 0.025,
		transmission: Math.max(0.72, params.transmission),
		ior: params.ior,
		dispersion: params.dispersion,
		thickness: params.thickness,
		attenuationColor: params.isDark ? 0x161922 : 0xffffff,
		attenuationDistance: params.isDark ? 2.8 : params.attenuationDistance,
		clearcoat: 1,
		clearcoatRoughness: 0,
		specularIntensity: 1,
		specularColor: 0xffffff,
		envMapIntensity: params.environmentIntensity,
		emissive: 0xffffff,
		emissiveMap: texture,
		emissiveIntensity: params.sideDispersion,
		side: THREE.DoubleSide
	})
}

function disposeMaterial(material) {
	material.emissiveMap?.dispose()
	material.map?.dispose()
	material.dispose()
}

export function createModelController({ scene, params, services }) {
	const group = new THREE.Group()
	const loader = new SVGLoader()
	const cache = new Map()

	let requestId = 0
	let fitScale = 1
	let material = createGlassMaterial(params)
	let sideMaterial = createSidePrismMaterial(params)
	let meshMaterials = [material, sideMaterial]

	scene.add(group)

	const getSvg = name =>
		cache.get(name) ?? cache.set(name, loader.loadAsync(services[name])).get(name)

	const updateScale = () => {
		group.scale.setScalar(fitScale * params.scale)
	}

	const clear = () => {
		for (const child of group.children) {
			child.geometry?.dispose()
		}
		group.clear()
	}

	const setGlassMaterial = () => {
		const next = createGlassMaterial(params)
		const nextSide = createSidePrismMaterial(params)
		meshMaterials = [next, nextSide]
		for (const child of group.children) child.material = meshMaterials
		disposeMaterial(material)
		disposeMaterial(sideMaterial)
		material = next
		sideMaterial = nextSide
	}

	const updateEnvironmentIntensity = () => {
		material.envMapIntensity = params.environmentIntensity
		sideMaterial.envMapIntensity = params.environmentIntensity
		material.needsUpdate = true
		sideMaterial.needsUpdate = true
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
				meshes.push(new THREE.Mesh(geometry, meshMaterials))
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

	return { group, loadModel, setGlassMaterial, updateEnvironmentIntensity, updateScale }
}
