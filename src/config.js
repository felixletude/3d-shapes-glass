import { Easing } from 'three/addons/libs/tween.module.js'

export const SERVICES = {
	'Audio Production': '/services/audio-production.svg',
	Design: '/services/design.svg',
	Merch: '/services/merch.svg',
	'Post Production': '/services/post-production.svg',
	'Visual Production': '/services/visual-production.svg'
}

export const params = {
	model: 'Design',
	axis: 'Y',
	autoRotate: true,
	duration: 4,
	scale: 0.85,
	depth: 9,
	bevel: 0.3,
	isDark: false,
	transmission: 1,
	roughness: 0,
	ior: 1.52,
	dispersion: 5,
	thickness: 20,
	attenuationDistance: 500,
	environmentIntensity: 5,
	iridescence: 0.5,
	sideDispersion: 0.45,
	sideBands: 2,
	sideSaturation: 1,
	sideEdgeGlow: 0.55,
	bloomStrength: 0.07,
	bloomRadius: 0.18,
	bloomThreshold: 1.12,
	chromaticAberration: 0.15,
	exportFps: 60,
	exportLoops: 1,
	exportWidth: 2000,
	exportHeight: 2000
}

export const TAU = Math.PI * 2
export const DEFAULT_SPIN = 0
export const ease = Easing.Quartic.InOut
