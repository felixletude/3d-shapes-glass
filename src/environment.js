import * as THREE from 'three/webgpu'

export function setupStudioLights(scene) {
	scene.add(new THREE.HemisphereLight(0xffffff, 0x08090d, 0.08))

	const key = new THREE.DirectionalLight(0xffffff, 0.16)
	key.position.set(3, 5, 6)
	scene.add(key)

	const rim = new THREE.DirectionalLight(0xd9ecff, 0.16)
	rim.position.set(-4, -1, 4)
	scene.add(rim)
}

export function createStudioTexture() {
	const canvas = document.createElement('canvas')
	canvas.width = 2048
	canvas.height = 1024

	const ctx = canvas.getContext('2d')
	ctx.fillStyle = '#060607'
	ctx.fillRect(0, 0, canvas.width, canvas.height)

	const glow = (x, y, radius, inner, outer) => {
		const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius)
		gradient.addColorStop(0, inner)
		gradient.addColorStop(0.55, outer)
		gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
		ctx.fillStyle = gradient
		ctx.fillRect(0, 0, canvas.width, canvas.height)
	}

	glow(1080, 230, 1350, 'rgba(255, 255, 255, 1)', 'rgba(252, 254, 255, 0.95)')
	glow(560, 800, 1180, 'rgba(255, 255, 255, 1)', 'rgba(248, 251, 255, 0.82)')
	glow(1660, 740, 900, 'rgba(255, 255, 255, 0.92)', 'rgba(230, 236, 245, 0.46)')
	glow(260, 340, 880, 'rgba(255, 255, 255, 0.9)', 'rgba(238, 242, 248, 0.5)')

	const band = ctx.createLinearGradient(0, 0, canvas.width, 0)
	band.addColorStop(0.22, 'rgba(0, 0, 0, 0)')
	band.addColorStop(0.34, 'rgba(0, 0, 0, 0.12)')
	band.addColorStop(0.48, 'rgba(0, 0, 0, 0.02)')
	band.addColorStop(0.62, 'rgba(255, 255, 255, 0.42)')
	band.addColorStop(0.78, 'rgba(0, 0, 0, 0.1)')
	band.addColorStop(1, 'rgba(0, 0, 0, 0)')
	ctx.fillStyle = band
	ctx.fillRect(0, 0, canvas.width, canvas.height)

	const texture = new THREE.CanvasTexture(canvas)
	texture.mapping = THREE.EquirectangularReflectionMapping
	texture.colorSpace = THREE.SRGBColorSpace
	texture.needsUpdate = true
	return texture
}

export function updateEnvironment(scene, params) {
	scene.environmentIntensity = params.environmentIntensity
}

export async function loadStudioEnvironment(renderer, scene, params) {
	const studio = createStudioTexture()
	const pmrem = new THREE.PMREMGenerator(renderer)
	const env = pmrem.fromEquirectangular(studio).texture
	env.name = 'procedural_softbox.pmrem'

	scene.environment = env
	updateEnvironment(scene, params)

	studio.dispose()
	pmrem.dispose()
}
