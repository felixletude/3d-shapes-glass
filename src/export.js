import * as THREE from 'three/webgpu'

export async function exportPngSequence({ params, renderer, camera, renderFrame, setFrameTime }) {
	const dir = await window.showDirectoryPicker({ mode: 'readwrite' })
	const fps = params.exportFps
	const framesPerLoop = Math.round(fps * params.duration)
	const totalFrames = framesPerLoop * params.exportLoops
	const size = renderer.getSize(new THREE.Vector2())
	const clearColor = renderer.getClearColor(new THREE.Color())
	const clearAlpha = renderer.getClearAlpha()
	const autoRotate = params.autoRotate

	renderer.setSize(params.exportWidth, params.exportHeight)
	renderer.setClearColor(0x000000, 1)
	camera.aspect = params.exportWidth / params.exportHeight
	camera.updateProjectionMatrix()
	await renderer.init()

	try {
		params.autoRotate = true

		for (let i = 0; i < totalFrames; i++) {
			setFrameTime((i % framesPerLoop) / fps)
			renderFrame()

			const blob = await new Promise(resolve => renderer.domElement.toBlob(resolve, 'image/png'))
			const file = await dir.getFileHandle(`frame_${String(i).padStart(4, '0')}.png`, { create: true })
			const writer = await file.createWritable()
			await writer.write(blob)
			await writer.close()

			if (i % 10 === 0) console.log(`Frame ${i + 1}/${totalFrames}`)
		}

		console.log(`${totalFrames} frames saved`)
	} finally {
		params.autoRotate = autoRotate
		renderer.setClearColor(clearColor, clearAlpha)
		renderer.setSize(size.x, size.y)
		camera.aspect = size.x / size.y
		camera.updateProjectionMatrix()
		await renderer.init()
	}
}
