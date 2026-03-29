import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// --- LIGHTING ---
const light = new THREE.SpotLight(0xffffff, 10, 20, 0.4, 0.5);
camera.add(light);
camera.add(light.target);
light.target.position.set(0, 0, -1);
scene.add(camera);

// --- ASSET ---
const loader = new GLTFLoader();
let ghost, isDead = false, inputMethod = null;

loader.load('./assets/cloth_ghost.glb', (gltf) => {
    ghost = gltf.scene;
    ghost.position.set(0, 0, -5); // Direkt vor dir!
    scene.add(ghost);
});

// Boden zur Orientierung
const grid = new THREE.GridHelper(100, 100, 0x111111, 0x111111);
grid.position.y = -1.5;
scene.add(grid);

// --- INPUT LOGIC ---
const controls = new PointerLockControls(camera, document.body);
let move = { fwd: 0, side: 0 };
let look = { x: 0, y: 0 };

window.startGame = (type) => {
    inputMethod = type;
    document.getElementById('menu').style.display = 'none';
    if (type === 'pc') controls.lock();
    if (type === 'touch') document.getElementById('touch-controls').style.display = 'flex';
};

// Keyboard
window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyW') move.fwd = 1;
    if (e.code === 'KeyS') move.fwd = -1;
    if (e.code === 'KeyA') move.side = -1;
    if (e.code === 'KeyD') move.side = 1;
});
window.addEventListener('keyup', () => move = { fwd: 0, side: 0 });

// Simple Touch Joystick Logik (Emuliert WASD)
const setupJoystick = (id, callback) => {
    const el = document.getElementById(id);
    el.addEventListener('touchmove', (e) => {
        const touch = e.touches[0];
        const rect = el.getBoundingClientRect();
        const x = (touch.clientX - rect.left - 60) / 60;
        const y = (touch.clientY - rect.top - 60) / 60;
        callback(x, y);
    });
    el.addEventListener('touchend', () => callback(0, 0));
};

setupJoystick('move-joy', (x, y) => { move.side = x; move.fwd = -y; });
setupJoystick('look-joy', (x, y) => { look.x = x; look.y = y; });

function animate() {
    requestAnimationFrame(animate);
    if (isDead || !inputMethod) return;

    const delta = 0.1;

    // 1. Controller Update
    const gp = navigator.getGamepads()[0];
    if (gp) {
        camera.translateX(gp.axes[0] * delta);
        camera.translateZ(gp.axes[1] * delta);
        camera.rotation.y -= gp.axes[2] * 0.05;
    }

    // 2. PC / Keyboard Update
    if (controls.isLocked || inputMethod === 'touch') {
        camera.translateX(move.side * delta);
        camera.translateZ(-move.fwd * delta);
        if (inputMethod === 'touch') camera.rotation.y -= look.x * 0.05;
    }

    // 3. Ghost KI (Verfolgung)
    if (ghost) {
        ghost.lookAt(camera.position);
        ghost.translateZ(0.02); // Geist kommt langsam näher
        ghost.position.y = Math.sin(Date.now() * 0.002) * 0.2;

        if (camera.position.distanceTo(ghost.position) < 1.5) {
            isDead = true;
            document.getElementById('jumpscare').style.display = 'flex';
            setTimeout(() => location.reload(), 3000);
        }
    }

    renderer.render(scene, camera);
}
animate();
