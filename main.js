import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

// --- INITIALISIERUNG ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
scene.fog = new THREE.FogExp2(0x000000, 0.15);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// --- LICHT ---
const flashlight = new THREE.SpotLight(0xffffff, 5, 25, 0.4, 0.5);
camera.add(flashlight);
camera.add(flashlight.target);
flashlight.target.position.set(0, 0, -1);
scene.add(camera);

const ambient = new THREE.AmbientLight(0xffffff, 0.05);
scene.add(ambient);

// --- ASSETS & WELT ---
const loader = new GLTFLoader();
let ghost, isPlaying = false, inputMode = null;

loader.load('./assets/cloth_ghost.glb', (gltf) => {
    ghost = gltf.scene;
    ghost.position.set(0, -1, -5); 
    scene.add(ghost);
    document.getElementById('loading-screen').innerText = "Bereit zum Gruseln.";
}, undefined, (err) => {
    document.getElementById('loading-screen').innerText = "FEHLER: cloth_ghost.glb nicht gefunden!";
});

// Boden & Raster
const grid = new THREE.GridHelper(200, 100, 0x111111, 0x111111);
grid.position.y = -1.6;
scene.add(grid);

// --- STEUERUNGSLOGIK ---
const controls = new PointerLockControls(camera, document.body);
let move = { fwd: 0, side: 0 };
let lookX = 0;

// Button-Fix: Event Listener statt onclick
document.getElementById('btn-pc').addEventListener('click', () => start('pc'));
document.getElementById('btn-touch').addEventListener('click', () => start('touch'));
document.getElementById('btn-pad').addEventListener('click', () => start('pad'));

function start(type) {
    if (!ghost) return;
    inputMode = type;
    document.getElementById('menu').style.display = 'none';
    isPlaying = true;
    
    if (type === 'pc') controls.lock();
    if (type === 'touch') document.getElementById('touch-controls').style.display = 'flex';
}

// Keyboard Listeners
window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyW') move.fwd = 1;
    if (e.code === 'KeyS') move.fwd = -1;
    if (e.code === 'KeyA') move.side = -1;
    if (e.code === 'KeyD') move.side = 1;
});
window.addEventListener('keyup', (e) => {
    if (['KeyW', 'KeyS'].includes(e.code)) move.fwd = 0;
    if (['KeyA', 'KeyD'].includes(e.code)) move.side = 0;
});

// Mobile Joystick Logic
const handleJoystick = (id, cb) => {
    const el = document.getElementById(id);
    el.addEventListener('touchmove', (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.touches[0].clientX - r.left - 50) / 50;
        const y = (e.touches[0].clientY - r.top - 50) / 50;
        cb(x, y);
    });
    el.addEventListener('touchend', () => cb(0, 0));
};

handleJoystick('move-joy', (x, y) => { move.side = x; move.fwd = -y; });
handleJoystick('look-joy', (x) => { lookX = x; });

// --- GAME LOOP ---
function animate() {
    requestAnimationFrame(animate);
    if (!isPlaying) return;

    const delta = 0.08;

    // 1. Controller Update
    const gp = navigator.getGamepads()[0];
    if (gp && inputMode === 'pad') {
        camera.translateX(gp.axes[0] * delta);
        camera.translateZ(gp.axes[1] * delta);
        camera.rotation.y -= gp.axes[2] * 0.05;
    }

    // 2. PC / Touch Update
    if (controls.isLocked || inputMode === 'touch') {
        camera.translateX(move.side * delta);
        camera.translateZ(-move.fwd * delta);
        if (inputMode === 'touch') camera.rotation.y -= lookX * 0.05;
    }

    // 3. Ghost KI & Flackern
    if (ghost) {
        ghost.lookAt(camera.position.x, -1, camera.position.z);
        ghost.translateZ(0.03); // Verfolgung
        ghost.position.y = Math.sin(Date.now() * 0.002) * 0.2 - 0.5;

        const dist = camera.position.distanceTo(ghost.position);
        
        // Taschenlampen-Effekt
        flashlight.intensity = dist < 6 ? Math.random() * 10 : 5;

        if (dist < 1.5) {
            isPlaying = false;
            document.getElementById('jumpscare').style.display = 'flex';
            setTimeout(() => location.reload(), 3000);
        }
    }

    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
