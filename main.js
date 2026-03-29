import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

// --- SCENE SETUP ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020202);
scene.fog = new THREE.FogExp2(0x020202, 0.15);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// --- LIGHTING ---
const flashlight = new THREE.SpotLight(0xffffff, 2, 15, Math.PI / 6, 0.5);
camera.add(flashlight);
camera.add(flashlight.target);
flashlight.target.position.set(0, 0, -1);
scene.add(camera);

const ambient = new THREE.AmbientLight(0x404040, 0.2); 
scene.add(ambient);

// --- ASSET LOADING ---
const loader = new GLTFLoader();
let ghost;

loader.load('./assets/cloth_ghost.glb', (gltf) => {
    ghost = gltf.scene;
    ghost.position.set(0, 0, -10);
    ghost.scale.set(1, 1, 1);
    scene.add(ghost);
}, undefined, (err) => console.error("Fehler beim Geist-Laden:", err));

// --- GROUND (Damit man Orientierung hat) ---
const grid = new THREE.GridHelper(100, 100, 0x111111, 0x111111);
grid.position.y = -1.6;
scene.add(grid);

// --- CONTROLS LOGIC ---
const controls = new PointerLockControls(camera, document.body);
document.body.addEventListener('click', () => controls.lock());

let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();

// Keyboard Inputs
const onKeyDown = (e) => {
    if (e.code === 'KeyW') moveForward = true;
    if (e.code === 'KeyS') moveBackward = true;
    if (e.code === 'KeyA') moveLeft = true;
    if (e.code === 'KeyD') moveRight = true;
};
const onKeyUp = (e) => {
    if (e.code === 'KeyW') moveForward = false;
    if (e.code === 'KeyS') moveBackward = false;
    if (e.code === 'KeyA') moveLeft = false;
    if (e.code === 'KeyD') moveRight = false;
};
window.addEventListener('keydown', onKeyDown);
window.addEventListener('keyup', onKeyUp);

// --- GAME LOOP ---
function animate() {
    requestAnimationFrame(animate);
    const delta = 0.1;

    // Gamepad Logic
    const gamepads = navigator.getGamepads();
    if (gamepads[0]) {
        const gp = gamepads[0];
        // Linker Stick: Bewegung
        camera.translateX(gp.axes[0] * delta);
        camera.translateZ(gp.axes[1] * delta);
        // Rechter Stick: Sicht (Rotation)
        camera.rotation.y -= gp.axes[2] * 0.05;
    }

    // Keyboard Bewegung
    if (controls.isLocked) {
        direction.z = Number(moveForward) - Number(moveBackward);
        direction.x = Number(moveRight) - Number(moveLeft);
        direction.normalize();
        if (moveForward || moveBackward) velocity.z -= direction.z * 40.0 * delta;
        if (moveLeft || moveRight) velocity.x -= direction.x * 40.0 * delta;
        
        controls.moveRight(-velocity.x * delta);
        controls.moveForward(-velocity.z * delta);
        velocity.multiplyScalar(0.9);
    }

    // Geist Animation (Sanftes Schweben)
    if (ghost) {
        ghost.position.y = Math.sin(Date.now() * 0.001) * 0.5 - 1;
        ghost.lookAt(camera.position.x, -1, camera.position.z);
    }

    renderer.render(scene, camera);
}
animate();

// Resize Handle
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
