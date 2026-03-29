import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

// --- SYSTEM STATE ---
let isPlaying = false;
const clock = new THREE.Clock();

// --- SCENE & CAMERA ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
scene.fog = new THREE.FogExp2(0x000000, 0.12);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1.6, 5); // Augenhöhe

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// --- LIGHTING (Taschenlampe) ---
const flashlight = new THREE.SpotLight(0xffffff, 4, 18, Math.PI / 7, 0.6);
flashlight.power = 0; // Startet aus
flashlight.castShadow = true;
camera.add(flashlight);
camera.add(flashlight.target);
flashlight.target.position.set(0, 0, -1);
scene.add(camera);

const ambient = new THREE.AmbientLight(0x0a0a0a, 0.1); 
scene.add(ambient);

// --- GRUNDPLATTE ---
const floorGeometry = new THREE.PlaneGeometry(100, 100);
const floorMaterial = new THREE.MeshPhongMaterial({ color: 0x111111, depthWrite: false });
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -0.1;
floor.receiveShadow = true;
scene.add(floor);

const gridHelper = new THREE.GridHelper(100, 100, 0x222222, 0x222222);
scene.add(gridHelper);

// --- ASSET LOADING (Das Herzstück) ---
const loader = new GLTFLoader();
let gameGhost;

// WICHTIG: Korrekter Relativer Pfad
loader.load('./assets/cloth_ghost.glb', (gltf) => {
    gameGhost = gltf.scene;
    gameGhost.traverse((node) => { if (node.isMesh) node.castShadow = true; });
    gameGhost.scale.set(1.5, 1.5, 1.5);
    gameGhost.position.set(0, 0, -15); // Weit weg
    gameGhost.visible = false; // Im Menü unsichtbar
    scene.add(gameGhost);
    console.log("Geist geladen.");
}, undefined, (error) => {
    console.error("KRITISCHER LADEFEHLER:", error);
    alert("Konnte assets/cloth_ghost.glb nicht laden. Ordnerstruktur prüfen!");
});

// --- CONTROLS SETUP ---
const controls = new PointerLockControls(camera, document.body);
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;

// PC Input
document.addEventListener('keydown', (e) => {
    if(!isPlaying) return;
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

// --- UI & START LOGIC ---
const menu = document.getElementById('menu');
const startBtn = document.getElementById('start-btn');
const jumpscareUI = document.getElementById('jumpscare');
const gameUI = document.getElementById('ui-ingame');

startBtn.addEventListener('click', () => {
    if (!gameGhost) { alert("Geist lädt noch..."); return; }
    
    // Start Sequenz
    menu.classList.add('hidden');
    gameUI.style.display = 'block';
    
    setTimeout(() => {
        controls.lock(); // Maus einsperren
        isPlaying = true;
        flashlight.power = 50; // Taschenlampe an
        gameGhost.visible = true; // Geist erscheint
    }, 500);
});

controls.addEventListener('unlock', () => {
    if(isPlaying) menu.classList.remove('hidden'); // Menü zeigen wenn ESC gedrückt
});

// --- JUMPSCARE LOGIC ---
function triggerJumpscare() {
    isPlaying = false;
    flashlight.power = 0;
    controls.unlock();
    gameUI.style.display = 'none';
    jumpscareUI.style.display = 'flex';
    
    // Auto-Restart nach 3 Sekunden
    setTimeout(() => { location.reload(); }, 3000);
}

// --- GAME LOOP ---
function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    if (isPlaying && controls.isLocked) {
        
        // 1. Controller Input (Gamepad API)
        const gamepads = navigator.getGamepads();
        if (gamepads[0]) {
            const gp = gamepads[0];
            const moveSpeed = 5.0;
            const lookSpeed = 1.5;

            // Linker Stick (Bewegung)
            if (Math.abs(gp.axes[1]) > 0.1) controls.moveForward(-gp.axes[1] * moveSpeed * delta);
            if (Math.abs(gp.axes[0]) > 0.1) controls.moveRight(gp.axes[0] * moveSpeed * delta);
            
            // Rechter Stick (Sicht-Rotation)
            if (Math.abs(gp.axes[2]) > 0.1) camera.rotation.y -= gp.axes[2] * lookSpeed * delta;
        }

        // 2. Keyboard Input (Bewegung)
        velocity.x -= velocity.x * 10.0 * delta;
        velocity.z -= velocity.z * 10.0 * delta;

        direction.z = Number(moveForward) - Number(moveBackward);
        direction.x = Number(moveRight) - Number(moveLeft);
        direction.normalize();

        if (moveForward || moveBackward) velocity.z -= direction.z * 50.0 * delta;
        if (moveLeft || moveRight) velocity.x -= direction.x * 50.0 * delta;

        controls.moveRight(-velocity.x * delta);
        controls.moveForward(-velocity.z * delta);

        // 3. Geist KI & Taschenlampen Flackern
        if (gameGhost) {
            // Geist verfolgt dich langsam
            gameGhost.lookAt(camera.position.x, 0, camera.position.z);
            const dist = camera.position.distanceTo(gameGhost.position);
            
            const ghostSpeed = 0.8;
            if (dist > 1.5) {
                gameGhost.translateZ(ghostSpeed * delta);
            } else {
                triggerJumpscare(); // Zu nah = Tot
            }

            // Geist Schweben
            gameGhost.position.y = Math.sin(Date.now() * 0.002) * 0.2;

            // Dynamisches Licht-Flackern basierend auf Distanz
            if (dist < 10) {
                // Je näher, desto stärker flackert es
                flashlight.power = 50 - (Math.random() * (10 - dist) * 5);
            } else {
                flashlight.power = 50; // Normales Licht
            }
        }
    }

    renderer.render(scene, camera);
}

// Resize Handling
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Loop starten
animate();
