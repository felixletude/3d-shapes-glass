import { Pane } from 'tweakpane'

export function setupPane({ params, services, onModelChange, onAxisChange, onScaleChange, onGeometryChange, onGlassChange, onPostChange, onEnvironmentChange, onExport }) {
	const pane = new Pane({ title: 'L\'Étude' })
	const tab = pane.addTab({ pages: [{ title: 'Effect' }, { title: 'Export' }] })
	const effect = tab.pages[0]
	const exportTab = tab.pages[1]

	const model = effect.addFolder({ title: 'Model' })
	const modelOptions = {}
	for (const key in services) modelOptions[key] = key
	model.addBinding(params, 'model', { options: modelOptions }).on('change', onModelChange)
	model.addBinding(params, 'axis', { options: { X: 'X', Y: 'Y' } }).on('change', onAxisChange)
	model.addBinding(params, 'autoRotate')
	model.addBinding(params, 'duration', { label: 'seq (s)', min: 1, max: 10, step: 0.1 })
	model.addBinding(params, 'scale', { min: 0.4, max: 1.6, step: 0.01 }).on('change', onScaleChange)
	model.addBinding(params, 'depth', { min: 1, max: 20, step: 0.1 }).on('change', onGeometryChange)
	model.addBinding(params, 'bevel', { min: 0.04, max: 0.8, step: 0.01 }).on('change', onGeometryChange)

	const glass = effect.addFolder({ title: 'Glass' })
	glass.addBinding(params, 'isDark', { label: 'smoked' }).on('change', onGlassChange)
	glass.addBinding(params, 'transmission', { min: 0, max: 1, step: 0.01 }).on('change', onGlassChange)
	glass.addBinding(params, 'roughness', { min: 0, max: 0.2, step: 0.001 }).on('change', onGlassChange)
	glass.addBinding(params, 'ior', { min: 1.1, max: 2.33, step: 0.01 }).on('change', onGlassChange)
	glass.addBinding(params, 'dispersion', { min: 0, max: 10, step: 0.1 }).on('change', onGlassChange)
	glass.addBinding(params, 'thickness', { min: 0.1, max: 20, step: 0.1 }).on('change', onGlassChange)
	glass.addBinding(params, 'attenuationDistance', { label: 'attenuation', min: 0.5, max: 500, step: 1 }).on('change', onGlassChange)
	glass.addBinding(params, 'iridescence', { min: 0, max: 1, step: 0.01 }).on('change', onGlassChange)

	const sides = effect.addFolder({ title: 'Side Dispersion' })
	sides.addBinding(params, 'sideDispersion', { label: 'dispersion', min: 0, max: 4, step: 0.05 }).on('change', onGlassChange)
	sides.addBinding(params, 'sideBands', { label: 'bands', min: 1, max: 8, step: 1 }).on('change', onGlassChange)
	sides.addBinding(params, 'sideSaturation', { label: 'saturation', min: 0, max: 2, step: 0.05 }).on('change', onGlassChange)
	sides.addBinding(params, 'sideEdgeGlow', { label: 'edge glow', min: 0, max: 3, step: 0.05 }).on('change', onGlassChange)

	const post = effect.addFolder({ title: 'Post' })
	post.addBinding(params, 'bloomStrength', { label: 'bloom', min: 0, max: 1.2, step: 0.01 }).on('change', onPostChange)
	post.addBinding(params, 'bloomRadius', { label: 'radius', min: 0, max: 1, step: 0.01 }).on('change', onPostChange)
	post.addBinding(params, 'bloomThreshold', { label: 'threshold', min: 0, max: 2, step: 0.01 }).on('change', onPostChange)
	post.addBinding(params, 'chromaticAberration', { label: 'prism edge', min: 0, max: 1.2, step: 0.01 }).on('change', onPostChange)
	post.addBinding(params, 'environmentIntensity', { label: 'env intensity', min: 0, max: 5, step: 0.05 }).on('change', onEnvironmentChange)

	exportTab.addBinding(params, 'exportFps', { label: 'FPS', min: 24, max: 120, step: 1 })
	exportTab.addBinding(params, 'exportLoops', { label: 'loops', min: 1, max: 10, step: 1 })
	exportTab.addBinding(params, 'exportWidth', { label: 'width', min: 640, max: 7680, step: 2 })
	exportTab.addBinding(params, 'exportHeight', { label: 'height', min: 480, max: 4320, step: 2 })
	exportTab.addButton({ title: 'Export PNG Sequence' }).on('click', onExport)

	return pane
}
