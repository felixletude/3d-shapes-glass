import * as THREE from 'three'
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js'
import { Pane } from 'tweakpane'

const SERVICES = {
	'Audio Production': '/services/audio-production.svg',
	Design: '/services/design.svg',
	Merch: '/services/merch.svg',
	'Post Production': '/services/post-production.svg',
	'Visual Production': '/services/visual-production.svg'
}

const params = {
	model: 'Design',
	axis: 'Y',
	autoRotate: true,
	duration: 4,
	scale: 0.85,
	depth: 8,
	bevel: 0.15,
	color: '#f0f0f0',
	background: '#9597A7'
}

// --- renderer, scene, camera ---

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.append(renderer.domElement)

const scene = new THREE.Scene()
scene.background = new THREE.Color(params.background)

const camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.01, 100)
camera.position.set(0, 0, 9.2)

// --- lights ---

scene.add(new THREE.HemisphereLight(0xffffff, 0x6f7280, 2.2))

const key = new THREE.DirectionalLight(0xffffff, 2.4)
key.position.set(3, 5, 6)
scene.add(key)

// --- model group ---

const model = new THREE.Group()
scene.add(model)

const loader = new SVGLoader()
const cache = new Map()
const mat = new THREE.MeshStandardMaterial({ color: params.color, roughness: 0.5, side: THREE.DoubleSide })

const TAU = Math.PI * 2
const drag = { active: false, x: 0, y: 0, origin: 0 }

let requestId = 0
let spin = 0
let spinTarget = 0
let fitScale = 1
let seqT = 0
let prevT = 0
let pane

// --- easing ---

const qInOut = t =>
	t < 0.5 ? 8 * t ** 4 : 1 - (-2 * t + 2) ** 4 / 2

const invQ = y => {
	if (y <= 0 || y >= 1) return y <= 0 ? 0 : 1
	let lo = 0, hi = 1
	for (let i = 12; i--;) {
		const m = (lo + hi) / 2
		if ((m < 0.5 ? 8 * m ** 4 : 1 - (-2 * m + 2) ** 4 / 2) < y) lo = m; else hi = m
	}
	return (lo + hi) / 2
}

const syncSeq = () => { seqT = invQ(((spin % TAU) / TAU + 1) % 1) * params.duration }

// --- model loading ---

const getSvg = name =>
	cache.get(name) ?? cache.set(name, loader.loadAsync(SERVICES[name])).get(name)

const applyRot = () => {
	model.rotation.set(0, 0, 0)
	model.rotation[params.axis.toLowerCase()] = spin
}

const updMat = () => {
	mat.color.set(params.color)
	scene.background.set(params.background)
}

const updScale = () => { model.scale.setScalar(fitScale * params.scale) }

const clearModel = () => {
	for (const c of model.children) {
		if (c.geometry) c.geometry.dispose()
		if (c.material && c.material !== mat) c.material.dispose()
	}
	model.clear()
}

async function loadModel(reset) {
	const id = ++requestId
	const svg = await getSvg(params.model).catch(() => null)
	if (!svg || id !== requestId) return

	const bounds = new THREE.Box3()
	const extrude = {
		depth: params.depth,
		bevelEnabled: params.bevel > 0,
		bevelSize: params.bevel,
		bevelThickness: params.bevel,
		bevelSegments: 4,
		curveSegments: 64
	}

	const meshes = []
	for (const path of svg.paths) {
		for (const shape of SVGLoader.createShapes(path)) {
			const g = new THREE.ExtrudeGeometry(shape, extrude)
			g.computeVertexNormals()
			g.computeBoundingBox()
			bounds.union(g.boundingBox)
			meshes.push(new THREE.Mesh(g, mat))
		}
	}

	if (bounds.isEmpty()) return

	const c = bounds.getCenter(new THREE.Vector3())
	for (const m of meshes) m.geometry.translate(-c.x, -c.y, -c.z)

	clearModel()
	model.add(...meshes)

	const s = bounds.getSize(new THREE.Vector3())
	fitScale = 4.5 / Math.max(s.x, s.y, s.z)
	updScale()
	if (reset) spin = 0
	applyRot()
}

// --- ui ---

function setupPane() {
	pane = new Pane({ title: 'Shape' })
	const mk = {}
	for (const k in SERVICES) mk[k] = k
	pane.addBinding(params, 'model', { options: mk }).on('change', () => loadModel(true))
	pane.addBinding(params, 'axis', { options: { X: 'X', Y: 'Y' } }).on('change', () => { spin = 0; applyRot() })
	pane.addBinding(params, 'autoRotate').on('change', () => params.autoRotate && syncSeq())
	pane.addBinding(params, 'duration', { label: 'seq (s)', min: 1, max: 10, step: 0.1 })
	pane.addBinding(params, 'scale', { min: 0.4, max: 1.6, step: 0.01 }).on('change', updScale)
	pane.addBinding(params, 'depth', { min: 1, max: 20, step: 0.1 }).on('change', () => loadModel(false))
	pane.addBinding(params, 'bevel', { min: 0, max: 0.8, step: 0.01 }).on('change', () => loadModel(false))
	pane.addBinding(params, 'color').on('change', updMat)
	pane.addBinding(params, 'background').on('change', updMat)
}

// --- pointer ---

const onDown = e => {
	if (e.button !== 0) return
	drag.active = true
	drag.x = e.clientX; drag.y = e.clientY
	drag.origin = spin
	spinTarget = spin
	syncSeq()
	params.autoRotate = false
	pane.refresh()
	e.target.setPointerCapture(e.pointerId)
}

const onMove = e => {
	if (!drag.active) return
	const d = params.axis === 'X' ? e.clientY - drag.y : e.clientX - drag.x
	spinTarget = drag.origin + d * 0.008
}

const onUp = e => {
	drag.active = false
	if (e.target.hasPointerCapture(e.pointerId)) e.target.releasePointerCapture(e.pointerId)
}

// --- lifecycle ---

const onResize = () => {
	camera.aspect = window.innerWidth / window.innerHeight
	camera.updateProjectionMatrix()
	renderer.setSize(window.innerWidth, window.innerHeight)
}

const onFrame = time => {
	const dt = (time - prevT) / 1000
	prevT = time

	if (params.autoRotate) {
		seqT = (seqT + dt) % params.duration
		spin = qInOut(seqT / params.duration) * TAU
	} else {
		if (!drag.active) spinTarget += (spin - spinTarget) * 0.04
		spin += (spinTarget - spin) * 0.2
	}

	applyRot()
	renderer.render(scene, camera)
}

setupPane()
loadModel(true)

addEventListener('resize', onResize)
renderer.domElement.addEventListener('pointerdown', onDown)
renderer.domElement.addEventListener('pointermove', onMove)
renderer.domElement.addEventListener('pointerup', onUp)
renderer.domElement.addEventListener('pointercancel', onUp)
renderer.domElement.addEventListener('contextmenu', e => e.preventDefault())
renderer.setAnimationLoop(onFrame)
