export async function exportPngSequence({ params, renderer, camera, renderFrame, setFrameTime }) {
	const dir = await window.showDirectoryPicker({ mode: 'readwrite' })
	const fps = params.exportFps
	const totalFrames = Math.ceil(fps * params.duration * params.exportLoops)
	const width = renderer.domElement.width
	const height = renderer.domElement.height

	renderer.setSize(params.exportWidth, params.exportHeight)
	camera.aspect = params.exportWidth / params.exportHeight
	camera.updateProjectionMatrix()
	await renderer.init()

	try {
		params.autoRotate = true

		for (let i = 0; i < totalFrames; i++) {
			setFrameTime((i / fps) % params.duration)
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
		renderer.setSize(width, height)
		camera.aspect = width / height
		camera.updateProjectionMatrix()
		await renderer.init()
	}
}
