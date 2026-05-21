import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js'
import { Pane } from 'tweakpane'

const SERVICES = {
    'Audio Production': '/services/audio-production.svg',
    'Design': '/services/design.svg',
    'Merch': '/services/merch.svg',
    'Post Production': '/services/post-production.svg',
    'Visual Production': '/services/visual-production.svg'
}

const params = {
    model: 'Design',
    rotationAxis: 'Y',
    speed: 0.42,
    extrusion: 12.8,
    bevel: 0.24,
    bevelSegments: 3,
    scale: 1.04,
    roughness: 0.012,
    transmission: 1,
    opacity: 1,
    thickness: 1.15,
    attenuationDistance: 5.2,
    ior: 1.56,
    dispersion: 0.072,
    iridescence: 0.03,
    clearcoat: 1,
    rim: 0.08,
    innerFaces: 0.46,
    internalDispersion: 0.42,
    exposure: 1.16,
    environment: 2.65,
    lightCards: false,
    cardIntensity: 0.52,
    autoRotate: true,
    showReference: false,
    background: '#9597A7'
}

const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance'
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = params.exposure;
renderer.transmissionResolutionScale = 1;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(params.background);

const camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.01, 120);
camera.position.set(0, 0.4, 9.2);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.055;
controls.enableRotate = false;
controls.enablePan = false;
controls.minDistance = 4.5;
controls.maxDistance = 18;
controls.target.set(0, 0, 0);

const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = makeStudioEnvironment(pmrem);

const fillLight = new THREE.DirectionalLight(0xffffff, 2.2);
fillLight.position.set(3, 5, 6);
scene.add(fillLight);

const cyanLight = new THREE.PointLight(0x00fff0, 11, 11, 1.6);
cyanLight.position.set(-3.4, -1.6, 2.4);
scene.add(cyanLight);

const redLight = new THREE.PointLight(0xff2200, 8, 12, 1.9);
redLight.position.set(2.9, -2.0, 3.1);
scene.add(redLight);

const blueLight = new THREE.PointLight(0x2344ff, 7, 10, 1.8);
blueLight.position.set(-3.8, 2.5, 2.7);
scene.add(blueLight);

const modelRoot = new THREE.Group();
scene.add(modelRoot);

const referencePlane = createReferencePlane();
referencePlane.visible = false;
scene.add(referencePlane);

const lightCardRig = createLightCardRig();
scene.add(lightCardRig);

const svgLoader = new SVGLoader();
const serviceCache = new Map();
const reusable = {
    box: new THREE.Box3(),
    center: new THREE.Vector3(),
    size: new THREE.Vector3()
}

const glassMaterial = makeGlassMaterial();
const innerFaceMaterial = makeInnerFaceMaterial();
const rimMaterial = makeRimMaterial();
const dispersionMaterial = makeDispersionMaterial();

let currentMeshes = [];
let spin = 0;
let dragStartSpin = 0;
let rebuildRequestId = 0;
let pane;

const baseRotation = {
    x: -0.18,
    y: -0.08
}

const drag = {
    active: false,
    x: 0,
    y: 0
}

rebuildModel();
setupPane();
window.addEventListener('resize', onResize, {passive: true});
renderer.domElement.addEventListener('pointerdown', onPointerDown);
renderer.domElement.addEventListener('pointermove', onPointerMove);
renderer.domElement.addEventListener('pointerup', onPointerUp);
renderer.domElement.addEventListener('pointercancel', onPointerUp);
renderer.domElement.addEventListener('contextmenu', (event) => event.preventDefault());
renderer.setAnimationLoop(render);

function makeGlassMaterial() {
    const material = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(0xffffff),
        metalness: 0,
        roughness: params.roughness,
        transmission: params.transmission,
        transparent: true,
        opacity: params.opacity,
        thickness: params.thickness,
        ior: params.ior,
        attenuationColor: new THREE.Color(0xf4ffff),
        attenuationDistance: params.attenuationDistance,
        specularIntensity: 1,
        specularColor: new THREE.Color(0xffffff),
        envMapIntensity: params.environment,
        clearcoat: params.clearcoat,
        clearcoatRoughness: 0.02,
        iridescence: params.iridescence,
        iridescenceIOR: 1.55,
        iridescenceThicknessRange: [120, 720],
        side: THREE.DoubleSide,
        depthWrite: false
    });
    if ('dispersion' in material) material.dispersion = params.dispersion;
    return material;
}

function makeInnerFaceMaterial() {
    return new THREE.ShaderMaterial({
        uniforms: {
            uStrength: {value: params.innerFaces},
            uDispersion: {value: params.dispersion}
        },
        vertexShader: `
      varying vec3 vNormal;
      varying vec3 vWorldPosition;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
        fragmentShader: `
      uniform float uStrength;
      uniform float uDispersion;
      varying vec3 vNormal;
      varying vec3 vWorldPosition;

      vec3 spectral(float t) {
        return .55 + .45 * cos(6.28318 * (vec3(.00, .34, .68) + t));
      }

      void main() {
        vec3 viewDir = normalize(cameraPosition - vWorldPosition);
        float facing = abs(dot(normalize(vNormal), viewDir));
        float grazing = pow(1.0 - facing, 1.55);
        float slab = smoothstep(.18, .95, sin(vWorldPosition.z * .82 + vWorldPosition.x * .08 - vWorldPosition.y * .05) * .5 + .5);
        float prismLine = smoothstep(.93, .995, sin(vWorldPosition.y * .36 + vWorldPosition.z * .72 - vWorldPosition.x * .13) * .5 + .5);
        vec3 smokedWall = mix(vec3(.08, .09, .095), vec3(.86, .88, .86), slab * .68);
        vec3 prism = spectral(vWorldPosition.x * .025 + vWorldPosition.y * .045 + grazing * .35);
        vec3 color = mix(smokedWall, prism, prismLine * (.28 + uDispersion * 2.2));
        float alpha = uStrength * (0.08 + slab * .20 + grazing * .12 + prismLine * .16);
        gl_FragColor = vec4(color, alpha);
      }
    `,
        transparent: true,
        depthWrite: false,
        side: THREE.BackSide
    });
}

function makeRimMaterial() {
    const material = new THREE.ShaderMaterial({
        uniforms: {
            uStrength: {value: params.rim},
            uDiffraction: {value: params.dispersion},
            uTime: {value: 0}
        },
        vertexShader: `
      varying vec3 vNormal;
      varying vec3 vWorldPosition;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
        fragmentShader: `
      uniform float uStrength;
      uniform float uDiffraction;
      uniform float uTime;
      varying vec3 vNormal;
      varying vec3 vWorldPosition;

      vec3 spectral(float t) {
        return .55 + .45 * cos(6.28318 * (vec3(.02, .34, .68) + t));
      }

      void main() {
        vec3 viewDir = normalize(cameraPosition - vWorldPosition);
        float facing = abs(dot(normalize(vNormal), viewDir));
        float fresnel = pow(1.0 - facing, 4.2);
        float prism = smoothstep(.58, 1.0, fresnel) * uDiffraction;
        vec3 base = vec3(.74, 1.0, .98);
        vec3 rainbow = spectral(vWorldPosition.x * .025 - vWorldPosition.y * .018 + fresnel * .42 + uTime * .015);
        vec3 color = mix(base, rainbow * 1.15, prism);
        float alpha = fresnel * (.05 + .16 * uDiffraction) * uStrength;
        gl_FragColor = vec4(color, alpha);
      }
    `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
    });
    return material;
}

function makeDispersionMaterial() {
    return new THREE.ShaderMaterial({
        uniforms: {
            uStrength: {value: params.internalDispersion},
            uDispersion: {value: params.dispersion},
            uTime: {value: 0}
        },
        vertexShader: `
      varying vec3 vNormal;
      varying vec3 vWorldPosition;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
        fragmentShader: `
      uniform float uStrength;
      uniform float uDispersion;
      uniform float uTime;
      varying vec3 vNormal;
      varying vec3 vWorldPosition;

      vec3 spectral(float t) {
        return .55 + .45 * cos(6.28318 * (vec3(.98, .32, .62) + t));
      }

      void main() {
        vec3 viewDir = normalize(cameraPosition - vWorldPosition);
        float fresnel = pow(1.0 - abs(dot(normalize(vNormal), viewDir)), 2.8);
        float bandA = smoothstep(.955, .998, sin(vWorldPosition.x * 1.08 - vWorldPosition.y * .62 + vWorldPosition.z * .36 + uTime * .01));
        float bandB = smoothstep(.965, .999, sin(vWorldPosition.x * -.72 + vWorldPosition.y * 1.15 + vWorldPosition.z * .42 - 1.7));
        float veil = smoothstep(.2, 1.0, bandA + bandB * .7) * (0.22 + fresnel * .78);
        vec3 whitePrism = mix(vec3(1.0), spectral(vWorldPosition.x * .055 + vWorldPosition.y * .035 + fresnel * .35), .48 + uDispersion * 2.4);
        float alpha = veil * uStrength * (.08 + uDispersion * .42);
        gl_FragColor = vec4(whitePrism, alpha);
      }
    `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
    });
}

function loadServiceSvg(name) {
    let promise = serviceCache.get(name);
    if (!promise) {
        promise = svgLoader.loadAsync(SERVICES[name]);
        serviceCache.set(name, promise);
    }
    return promise;
}

async function rebuildModel() {
    const requestId = ++rebuildRequestId;
    disposeModel();
    modelRoot.position.set(0, 0, 0);
    modelRoot.rotation.set(0, 0, 0);
    modelRoot.scale.set(1, 1, 1);

    let data;
    try {
        data = await loadServiceSvg(params.model);
    } catch (error) {
        console.error(`Failed to load ${params.model} SVG`, error);
        return;
    }
    if (requestId !== rebuildRequestId) return;
    const extrudeOptions = {
        depth: params.extrusion,
        bevelEnabled: true,
        bevelThickness: params.bevel,
        bevelSize: params.bevel,
        bevelSegments: Math.max(1, Math.round(params.bevelSegments)),
        curveSegments: 72,
        steps: 2
    }

    const pendingObjects = [];
    const combinedBox = new THREE.Box3();

    for (const path of data.paths) {
        const shapes = SVGLoader.createShapes(path);
        for (const shape of shapes) {
            const geometry = new THREE.ExtrudeGeometry(shape, extrudeOptions);
            geometry.computeVertexNormals();
            geometry.computeBoundingBox();
            combinedBox.union(geometry.boundingBox);

            const innerFaces = new THREE.Mesh(geometry, innerFaceMaterial);
            innerFaces.renderOrder = 0;

            const glass = new THREE.Mesh(geometry, glassMaterial);
            glass.renderOrder = 1;

            const dispersion = new THREE.Mesh(geometry, dispersionMaterial);
            dispersion.scale.setScalar(1.001);
            dispersion.renderOrder = 2;

            const rim = new THREE.Mesh(geometry, rimMaterial);
            rim.scale.setScalar(1.002);
            rim.renderOrder = 3;

            pendingObjects.push(innerFaces, glass, dispersion, rim);
        }
    }

    combinedBox.getCenter(reusable.center);
    const translatedGeometries = new Set();
    for (const object of pendingObjects) {
        if (!translatedGeometries.has(object.geometry)) {
            object.geometry.translate(-reusable.center.x, -reusable.center.y, -reusable.center.z);
            object.geometry.computeBoundingBox();
            object.geometry.computeBoundingSphere();
            translatedGeometries.add(object.geometry);
        }
        modelRoot.add(object);
        currentMeshes.push(object);
    }

    reusable.box.setFromObject(modelRoot);
    reusable.box.getCenter(reusable.center);
    reusable.box.getSize(reusable.size);

    const maxDimension = Math.max(reusable.size.x, reusable.size.y, reusable.size.z) || 1;
    const s = 4.5 / maxDimension * params.scale;
    modelRoot.scale.set(s, -s, s);
    spin = 0;
    applyModelRotation();
}

function disposeModel() {
    const disposedGeometries = new Set();
    for (const object of currentMeshes) {
        modelRoot.remove(object);
        if (object.geometry && !disposedGeometries.has(object.geometry)) {
            object.geometry.dispose();
            disposedGeometries.add(object.geometry);
        }
    }
    currentMeshes = [];
}

function updateMaterials() {
    glassMaterial.roughness = params.roughness;
    glassMaterial.transmission = params.transmission;
    glassMaterial.opacity = params.opacity;
    glassMaterial.thickness = params.thickness;
    glassMaterial.attenuationDistance = params.attenuationDistance;
    glassMaterial.ior = params.ior;
    glassMaterial.envMapIntensity = params.environment;
    glassMaterial.clearcoat = params.clearcoat;
    glassMaterial.iridescence = params.iridescence;
    if ('dispersion' in glassMaterial) glassMaterial.dispersion = params.dispersion;
    glassMaterial.needsUpdate = true;

    innerFaceMaterial.uniforms.uStrength.value = params.innerFaces;
    innerFaceMaterial.uniforms.uDispersion.value = params.dispersion;
    rimMaterial.uniforms.uStrength.value = params.rim;
    rimMaterial.uniforms.uDiffraction.value = params.dispersion;
    dispersionMaterial.uniforms.uStrength.value = params.internalDispersion;
    dispersionMaterial.uniforms.uDispersion.value = params.dispersion;
    renderer.toneMappingExposure = params.exposure;
    scene.background.set(params.background);
    referencePlane.visible = params.showReference;
    updateLightCards();
}


function setupPane() {
    pane = new Pane({title: 'Glass controls'});

    pane.addBinding(params, 'model', {options: Object.fromEntries(Object.keys(SERVICES).map((name) => [name, name]))})
    .on('change', rebuildModel);
    pane.addBinding(params, 'rotationAxis', {label: 'axis lock', options: {X: 'X', Y: 'Y'}}).on('change', () => {
        spin = 0;
        applyModelRotation();
    });
    pane.addBinding(params, 'autoRotate');
    pane.addBinding(params, 'speed', {min: -1.2, max: 1.2, step: 0.01});
    pane.addBinding(params, 'scale', {min: 0.65, max: 1.45, step: 0.01}).on('change', rebuildModel);

    const geometry = pane.addFolder({title: 'Geometry'});
    geometry.addBinding(params, 'extrusion', {label: 'glass depth', min: 5, max: 20, step: 0.1}).on('change', rebuildModel);
    geometry.addBinding(params, 'bevel', {label: 'edge bevel', min: 0.02, max: 0.9, step: 0.01}).on('change', rebuildModel);

    const material = pane.addFolder({title: 'Glass material'});
    material.addBinding(params, 'attenuationDistance', {label: 'absorption', min: 0.2, max: 6, step: 0.01}).on('change', updateMaterials);
    material.addBinding(params, 'thickness', {min: 0.4, max: 8, step: 0.01}).on('change', updateMaterials);
    material.addBinding(params, 'ior', {min: 1.2, max: 2.1, step: 0.001}).on('change', updateMaterials);
    material.addBinding(params, 'dispersion', {min: 0, max: 0.18, step: 0.001}).on('change', updateMaterials);
    material.addBinding(params, 'innerFaces', {label: 'rear refraction', min: 0, max: 1, step: 0.01}).on('change', updateMaterials);
    material.addBinding(params, 'internalDispersion', {label: 'inner prism', min: 0, max: 1, step: 0.01}).on('change', updateMaterials);
    material.addBinding(params, 'roughness', {min: 0, max: 0.18, step: 0.001}).on('change', updateMaterials);
    material.addBinding(params, 'rim', {label: 'edge glint', min: 0, max: 0.7, step: 0.01}).on('change', updateMaterials);

    const renderFolder = pane.addFolder({title: 'Render'});
    renderFolder.addBinding(params, 'environment', {label: 'reflections', min: 0, max: 5, step: 0.01}).on('change', updateMaterials);
    renderFolder.addBinding(params, 'exposure', {min: 0.2, max: 2.6, step: 0.01}).on('change', updateMaterials);
    renderFolder.addBinding(params, 'background').on('change', updateMaterials);
    renderFolder.addBinding(params, 'showReference').on('change', updateMaterials);
    renderFolder.addButton({title: 'Reset view'}).on('click', () => {
        camera.position.set(0, 0.4, 9.2);
        controls.target.set(0, 0, 0);
        spin = 0;
        applyModelRotation();
        controls.update();
    });
}

function makeStudioEnvironment(generator) {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    const grd = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    grd.addColorStop(0.00, '#070b12');
    grd.addColorStop(0.24, '#101727');
    grd.addColorStop(0.50, '#020305');
    grd.addColorStop(0.78, '#07130e');
    grd.addColorStop(1.00, '#050506');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    paintSoftBox(ctx, 72, 70, 155, 360, ['#080909', '#d7fff8', '#ffffff']);
    paintSoftBox(ctx, 812, 48, 118, 420, ['#050607', '#bafff5', '#ffffff']);
    paintSoftBox(ctx, 332, 88, 420, 38, ['#fff6cf', '#ffffff', '#efffff']);
    paintSoftBox(ctx, 338, 354, 430, 44, ['#12140d', '#fff6b8', '#ffffff']);
    paintSoftBox(ctx, 150, 452, 230, 30, ['#101010', '#f9ffff', '#ffffff']);
    paintSoftBox(ctx, 468, 184, 280, 24, ['#ff2400', '#fff000', '#16ff8a', '#10eaff', '#182dff']);
    paintSoftBox(ctx, 452, 285, 320, 22, ['#151515', '#ff2d76', '#ffe66c', '#50fff2', '#ffffff']);

    const texture = new THREE.CanvasTexture(canvas);
    texture.mapping = THREE.EquirectangularReflectionMapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    const envMap = generator.fromEquirectangular(texture).texture;
    texture.dispose();
    return envMap;
}

function paintSoftBox(ctx, x, y, width, height, colors) {
    const g = ctx.createLinearGradient(x, y, x + width, y + height);
    const last = colors.length - 1;
    colors.forEach((color, index) => g.addColorStop(index / last, color));
    ctx.save();
    ctx.shadowBlur = Math.max(width, height) * .18;
    ctx.shadowColor = colors[Math.floor(colors.length / 2)];
    ctx.fillStyle = g;
    ctx.fillRect(x, y, width, height);
    ctx.restore();
}

function paintSoftSpot(ctx, x, y, radius, color, alpha) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
    g.addColorStop(0, color);
    g.addColorStop(.28, color);
    g.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = g;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    ctx.restore();
}

function createReferencePlane() {
    const texture = new THREE.TextureLoader().load('/Logo-LEtude-3D.png');
    texture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: 0.18,
        depthWrite: false
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(5.8, 5.8), material);
    mesh.position.set(0, 0, -2.4);
    return mesh;
}

function createLightCardRig() {
    const rig = new THREE.Group();
    const geometry = new THREE.PlaneGeometry(1, 1);
    const cards = [
        {color: 0x00fff0, opacity: .82, scale: [0.34, 2.55, 1], position: [-2.48, .18, -1.18], rotation: [0, .18, 0]},
        {color: 0x13ff62, opacity: .62, scale: [0.22, 2.25, 1], position: [2.55, .06, -1.28], rotation: [0, -.14, 0]},
        {color: 0x1438ff, opacity: .58, scale: [0.36, 1.75, 1], position: [-1.96, -1.88, -1.36], rotation: [.02, .2, 0]},
        {color: 0xff2600, opacity: .54, scale: [2.45, .075, 1], position: [.38, -1.08, -1.12], rotation: [.04, 0, -.02]},
        {color: 0xfff1a8, opacity: .74, scale: [2.9, .06, 1], position: [.28, 1.62, -1.06], rotation: [.03, 0, .01]},
        {color: 0xffffff, opacity: .42, scale: [2.15, .18, 1], position: [.18, .04, -1.55], rotation: [0, 0, -.04]}
    ];

    for (const card of cards) {
        const material = new THREE.MeshBasicMaterial({
            color: card.color,
            transparent: true,
            opacity: card.opacity,
            depthWrite: false,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
            toneMapped: false
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.scale.set(...card.scale);
        mesh.position.set(...card.position);
        mesh.rotation.set(...card.rotation);
        mesh.renderOrder = -2;
        mesh.userData.baseColor = new THREE.Color(card.color);
        mesh.userData.baseOpacity = card.opacity;
        rig.add(mesh);
    }

    updateLightCards(rig);
    return rig;
}

function updateLightCards(rig = lightCardRig) {
    if (!rig) return;
    rig.visible = params.lightCards;
    for (const card of rig.children) {
        card.material.color.copy(card.userData.baseColor).multiplyScalar(params.cardIntensity);
        card.material.opacity = Math.min(1, card.userData.baseOpacity * Math.max(params.cardIntensity, .15));
    }
}

function applyModelRotation() {
    modelRoot.rotation.set(0, 0, 0);

    if (params.rotationAxis === 'X') {
        modelRoot.rotation.x = baseRotation.x + spin;
        return;
    }

    modelRoot.rotation.y = baseRotation.y + spin;
}

function onPointerDown(event) {
    if (event.button !== 0) return;
    drag.active = true;
    drag.x = event.clientX;
    drag.y = event.clientY;
    dragStartSpin = spin;
    params.autoRotate = false;
    pane?.refresh();
    renderer.domElement.setPointerCapture(event.pointerId);
}

function onPointerMove(event) {
    if (!drag.active) return;

    const delta = params.rotationAxis === 'X'
        ? event.clientY - drag.y
        : event.clientX - drag.x;

    spin = dragStartSpin + delta * 0.008;
    applyModelRotation();
}

function onPointerUp(event) {
    if (!drag.active) return;
    drag.active = false;
    if (renderer.domElement.hasPointerCapture(event.pointerId)) {
        renderer.domElement.releasePointerCapture(event.pointerId);
    }
}

function render(time) {
    const seconds = time * 0.001;
    controls.update();

    if (params.autoRotate) {
        rimMaterial.uniforms.uTime.value = seconds;
        spin += params.speed * 0.0125;
        applyModelRotation();
    }

    renderer.render(scene, camera);
}

function onResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
}
