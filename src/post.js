import * as THREE from 'three/webgpu'
import { pass, mrt, output, uniform, velocity, vec2, vec4 } from 'three/tsl'
import { bloom } from 'three/examples/jsm/tsl/display/BloomNode.js'
import { chromaticAberration } from 'three/examples/jsm/tsl/display/ChromaticAberrationNode.js'
import { traa } from 'three/examples/jsm/tsl/display/TRAANode.js'

export function createPostPipeline({ renderer, scene, camera, params }) {
	const scenePass = pass(scene, camera)
	scenePass.setMRT(mrt({ output, velocity }))

	const sceneColor = scenePass.getTextureNode('output')
	const taaColor = traa(sceneColor, scenePass.getTextureNode('depth'), scenePass.getTextureNode('velocity'), camera)
	const chromaStrength = uniform(params.chromaticAberration)
	const chromaColor = chromaticAberration(taaColor, chromaStrength, vec2(0.5, 0.5), 1.08)
	const bloomPass = bloom(chromaColor, params.bloomStrength, params.bloomRadius, params.bloomThreshold)
	const pipeline = new THREE.RenderPipeline(renderer)
	const finalColor = chromaColor.rgb.add(bloomPass.rgb)

	pipeline.outputNode = vec4(finalColor, 1)
	pipeline._quadMesh.material.depthWrite = false

	const update = () => {
		bloomPass.strength.value = params.bloomStrength
		bloomPass.radius.value = params.bloomRadius
		bloomPass.threshold.value = params.bloomThreshold
		chromaStrength.value = params.chromaticAberration
	}

	return {
		render: () => pipeline.render(),
		update
	}
}
