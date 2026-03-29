import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020202);
scene.fog = new THREE.FogExp2(0x020202, 0.15);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new PointerLockControls(camera, document.body);
const menu = document.getElementById('menu');
const startBtn = document.getElementById('start-btn');

// Start-Event
startBtn.addEventListener('click', () => {
    controls.lock(); // Das aktiviert die Steuerung!
    menu.style.display = 'none';
});

// Licht (Taschenlampe)
const light = new THREE.SpotLight(0xffffff, 2, 20, Math.PI / 6, 0.5);
camera.add(light);
camera.add(light.target);
light.target.position.set(0, 0, -1);
scene.add(camera);

// Geist laden
const loader = new GLTFLoader();
let gameGhost, menuGhost;

loader.load('./assets/cloth_ghost.glb', (gltf) => {
    // 1. Der Geist im Spiel
    gameGhost = gltf.scene;
    gameGhost.position.set(0, -1, -10);
    scene.add(gameGhost);

    // 2. Der Geist fürs Menü (Klonen)
    menuGhost = gameGhost.clone();
    menuGhost.position.set(2, 0, -3); // Rechts neben dem Text
    menuGhost.scale.set(0.5, 0.5, 0.5);
    scene.add(menuGhost);
});

// Bewegungsvariablen
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
document.addEventListener('keydown', (e) => {
    if(e.code === 'KeyW') moveForward = true;
    if(e.code === 'KeyS') moveBackward = true;
    if(e.code === 'KeyA') moveLeft = true;
    if(e.code === 'KeyD') moveRight = true;
});
document.addEventListener('keyup', (e) => {
    if(e.code === 'KeyW') moveForward = false;
    if(e.code === 'KeyS') moveBackward = false;
    if(e.code === 'KeyA') moveLeft = false;
    if(e.code === 'KeyD') moveRight = false;
});

function animate() {
    requestAnimationFrame(animate);

    // Menü-Geist drehen
    if (menuGhost && menu.style.display !== 'none') {
        menuGhost.rotation.y += 0.01;
    }

    // Spiel-Logik (nur wenn Menü weg ist)
    if (controls.isLocked) {
        if (moveForward) controls.moveForward(0.1);
        if (moveBackward) controls.moveForward(-0.1);
        if (moveLeft) controls.moveRight(-0.1);
        if (moveRight) controls.moveRight(0.1);

        // Controller Support
        const gp = navigator.getGamepads()[0];
        if (gp) {
            controls.moveForward(-gp.axes[1] * 0.1);
            controls.moveRight(gp.axes[0] * 0.1);
            camera.rotation.y -= gp.axes[2] * 0.05;
        }
    }

    // Der echte Geist verfolgt dich langsam
    if (gameGhost && controls.isLocked) {
        gameGhost.lookAt(camera.position.x, -1, camera.position.z);
        gameGhost.position.y = Math.sin(Date.now() * 0.001) * 0.2 - 0.5;
    }

    renderer.render(scene, camera);
}
animate();
