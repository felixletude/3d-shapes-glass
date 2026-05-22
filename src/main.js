import * as THREE from 'three/webgpu'
import { DEFAULT_SPIN, SERVICES, TAU, ease, params } from './config.js'
import { loadStudioEnvironment, setupStudioLights, updateEnvironment } from './environment.js'
import { exportPngSequence } from './export.js'
import { createModelController } from './model.js'
import { createPostPipeline } from './post.js'
import { setupPane } from './ui.js'
import './styles.css'

const renderer = new THREE.WebGPURenderer({ antialias: false })
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setClearColor(0x000000, 1)
renderer.toneMapping = THREE.AgXToneMapping
renderer.toneMappingExposure = 1.55
document.body.append(renderer.domElement)

await renderer.init()

const scene = new THREE.Scene()
scene.background = null
scene.environmentIntensity = params.environmentIntensity
setupStudioLights(scene)

const camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.01, 100)
camera.position.set(0, 0, 9.2)

const logo = createModelController({ scene, params, services: SERVICES })
const post = createPostPipeline({ renderer, scene, camera, params })
const drag = { active: false, x: 0, y: 0, origin: 0, target: 0 }

let spin = DEFAULT_SPIN
let time = 0
let prevT = 0
let exporting = false
let pane

function applyRotation() {
	logo.group.rotation.set(0, 0, 0)
	logo.group.rotation[params.axis.toLowerCase()] = spin
}

function setFrameTime(nextTime) {
	time = nextTime
	spin = ease(time / params.duration) * TAU
	applyRotation()
}

async function reloadModel(resetSpin = false) {
	await logo.loadModel()
	if (resetSpin) spin = DEFAULT_SPIN
	applyRotation()
}

async function handleExport() {
	if (exporting) return
	exporting = true

	try {
		await exportPngSequence({
			params,
			renderer,
			camera,
			renderFrame: post.render,
			setFrameTime
		})
	} finally {
		exporting = false
	}
}

function onPointerDown(event) {
	if (event.button !== 0) return
	drag.active = true
	drag.x = event.clientX
	drag.y = event.clientY
	drag.origin = spin
	drag.target = spin
	params.autoRotate = false
	pane.refresh()
	event.target.setPointerCapture(event.pointerId)
}

function onPointerMove(event) {
	if (!drag.active) return
	const delta = params.axis === 'X' ? event.clientY - drag.y : event.clientX - drag.x
	drag.target = drag.origin + delta * 0.008
}

function onPointerUp(event) {
	drag.active = false
	if (event.target.hasPointerCapture(event.pointerId)) event.target.releasePointerCapture(event.pointerId)
}

function onResize() {
	camera.aspect = window.innerWidth / window.innerHeight
	camera.updateProjectionMatrix()
	renderer.setSize(window.innerWidth, window.innerHeight)
}

function onFrame(timestamp) {
	const dt = (timestamp - prevT) / 1000
	prevT = timestamp

	if (params.autoRotate) {
		time = (time + dt) % params.duration
		spin = ease(time / params.duration) * TAU
	} else {
		spin += (drag.target - spin) * 0.2
	}

	applyRotation()
	post.render()
}

pane = setupPane({
	params,
	services: SERVICES,
	onModelChange: () => reloadModel(true),
	onAxisChange: () => {
		spin = DEFAULT_SPIN
		applyRotation()
	},
	onScaleChange: logo.updateScale,
	onGeometryChange: () => reloadModel(false),
	onGlassChange: logo.setGlassMaterial,
	onPostChange: post.update,
	onEnvironmentChange: () => updateEnvironment(scene, params),
	onExport: handleExport
})

await loadStudioEnvironment(renderer, scene, params)
await reloadModel(true)

addEventListener('resize', onResize)
renderer.domElement.addEventListener('pointerdown', onPointerDown)
renderer.domElement.addEventListener('pointermove', onPointerMove)
renderer.domElement.addEventListener('pointerup', onPointerUp)
renderer.domElement.addEventListener('pointercancel', onPointerUp)
renderer.domElement.addEventListener('contextmenu', event => event.preventDefault())
renderer.setAnimationLoop(onFrame)
