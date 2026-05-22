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
	canvas.width = 4096
	canvas.height = 2048

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
	const softbox = (x, y, width, height, color, blur = 140) => {
		ctx.save()
		ctx.shadowColor = color
		ctx.shadowBlur = blur
		ctx.fillStyle = color
		ctx.fillRect(x, y, width, height)
		ctx.restore()
	}

	glow(2160, 460, 1600, 'rgba(255, 255, 255, 0.9)', 'rgba(252, 254, 255, 0.35)')
	glow(1120, 1600, 1300, 'rgba(255, 255, 255, 0.72)', 'rgba(248, 251, 255, 0.28)')
	glow(3320, 1480, 980, 'rgba(210, 226, 255, 0.66)', 'rgba(145, 176, 255, 0.22)')
	glow(520, 680, 940, 'rgba(255, 236, 210, 0.58)', 'rgba(255, 190, 120, 0.16)')

	softbox(2550, 155, 820, 96, 'rgba(255, 255, 255, 1)', 80)
	softbox(450, 1020, 980, 130, 'rgba(255, 255, 255, 0.95)', 120)
	softbox(3150, 1180, 420, 620, 'rgba(205, 224, 255, 0.82)', 110)
	softbox(1130, 250, 220, 1040, 'rgba(255, 238, 214, 0.52)', 150)

	const band = ctx.createLinearGradient(0, 0, canvas.width, 0)
	band.addColorStop(0.22, 'rgba(0, 0, 0, 0)')
	band.addColorStop(0.34, 'rgba(0, 0, 0, 0.3)')
	band.addColorStop(0.48, 'rgba(0, 0, 0, 0.02)')
	band.addColorStop(0.62, 'rgba(255, 255, 255, 0.62)')
	band.addColorStop(0.78, 'rgba(0, 0, 0, 0.24)')
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
