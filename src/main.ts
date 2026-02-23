// dependencies: { "three": "latest", "pixi.js": "latest" }
// description: A basic integration of PixiJS and Three.js sharing the same WebGL context
// Import required classes from PixiJS and Three.js
import * as PIXI from 'pixi.js';
import * as THREE from 'three';
import { Vector3 } from 'three.js';
import { Object3D } from 'three.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { add } from 'three/tsl';

// Self-executing async function to set up the demo
(async () => {
const WIDTH = window.innerWidth;
const HEIGHT = window.innerHeight;
const globals = {
  time: 0,
  deltaTime: 0,
};

const SLATEWIDTH = 2;
const SLATEHEIGHT = SLATEWIDTH;

const camera = new THREE.PerspectiveCamera(70, WIDTH / HEIGHT);

// Create a container for PixiJS elements
const stage = new PIXI.Container();
//Scene setup
const scene = new THREE.Scene();

//Three.js renderer setup
const threeRenderer = new THREE.WebGLRenderer({
  antialias: true,
  stencil: true, // so masks work in pixijs
});

threeRenderer.setSize(WIDTH, HEIGHT);
threeRenderer.setClearColor(0xdddddd, 1);
document.body.appendChild(threeRenderer.domElement);

const controls = new OrbitControls( camera, threeRenderer.domElement );

//Camera setup
function addCamera(x: number, y: number, z: number) {  
  camera.position.set(x, y, z);
  camera.lookAt(0, 0, 0);
  scene.add(camera);
}

//Light setup
function addLight(x: number, y: number, z: number) {
  const color = 0xFFFFFF;
  const intensity = 3;
  const light = new THREE.DirectionalLight(color, intensity);
  light.position.set(x, y, z);
  scene.add(light);
}

// Load 3D player texture and model
const textureloader = new THREE.TextureLoader();
const plrtexture = textureloader.load('assets/ninja.png');
plrtexture.colorSpace = THREE.SRGBColorSpace;

const gltfLoader = new GLTFLoader();
gltfLoader.load('assets/cibus_ninja.glb', (glb) => {
const model = glb.scene; 
model.traverse((node) => {
      if (node.isMesh) {            
          node.material.map = plrtexture;
          node.material.needsUpdate = true;
      }
  }); 
model.name = 'player';   
model.scale.set(1, 1, 1);
scene.add(model); 
}); 

function prepModelsAndAnimations() {
  
    const animsByName = {};
    model.gltf.animations.forEach((clip) => {
      animsByName[clip.name] = clip;
    });
    model.animations = animsByName;
 
}


// Cast the context to satisfy TypeScript
const context = threeRenderer.getContext() as WebGL2RenderingContext;

//Pixi.js renderer setup
const pixiRenderer = new PIXI.WebGLRenderer();
await pixiRenderer.init({
  context: context,
  width: WIDTH,
  height: HEIGHT,
  clearBeforeRender: false, // Prevent PixiJS from clearing the Three.js render
});


function init() {
  //add camera 
  addCamera(-10, 10, -10);
  //add lights
  addLight(10, 20, 10);   
      
  // Pixi objects setup 
  const amazingUI = new PIXI.Graphics().roundRect(20, 80, 100, 30, 5).roundRect(140, 80, 100, 30, 5).fill(0xffff00);
  const bg = new PIXI.Graphics().rect(0, 0, WIDTH, HEIGHT).fill({color: 0x0000ff, alpha: 0.2});
  stage.addChild(bg);
  stage.addChild(amazingUI);

  //Three objects setup
  // Create a simple ground plane slates
  const planeGeometry = new THREE.PlaneGeometry(SLATEHEIGHT, SLATEWIDTH);
  const planeMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
  const plane = new THREE.Mesh(planeGeometry, planeMaterial);
  plane.rotation.x = -Math.PI / 2; // Rotate to make it horizontal
  const planeGeometry2 = new THREE.PlaneGeometry(SLATEHEIGHT, SLATEWIDTH);
  const planeMaterial2 = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
  const plane2 = new THREE.Mesh(planeGeometry2, planeMaterial2);
  plane2.rotation.x = -Math.PI / 2; // Rotate to make it horizontal
  const amountOfSlates = 10;

  //propagate ground with slates
  for (let i = -amountOfSlates; i < amountOfSlates; i++) {
    for (let j = -amountOfSlates; j < amountOfSlates; j++) {
      const slate = plane.clone();
      const slate2 = plane2.clone();
      if (i % 2 === 0) {      
        if (j % 2 === 0) {
        slate.position.set(i * SLATEWIDTH, 0, j * SLATEWIDTH); 
        scene.add(slate);
        } else {
        slate2.position.set(i * SLATEWIDTH, 0, j * SLATEWIDTH);
        scene.add(slate2);
        }          
      } else {
        if (j % 2 !== 0) {
        slate.position.set(i * SLATEWIDTH, 0, j * SLATEWIDTH);
        scene.add(slate);
        } else {
        slate2.position.set(i * SLATEWIDTH, 0, j * SLATEWIDTH); 
        scene.add(slate2);
        }
      } 
    }
  }

}

init();

let then = 0;
function render(now: number) {

  // convert to seconds
  globals.time = now * 0.001;
  // make sure delta time isn't too big.
  globals.deltaTime = Math.min(globals.time - then, 1 / 20);
  then = globals.time;
  const plr = scene.getObjectByName('player') as THREE.Object3D;  

  window.addEventListener('keydown', (e) => {  
    if (e.code === 'KeyW') {
      console.log('W key pressed');      
      plr.translateZ(.001); // Move model forward or backward based on direction
      turnCamera(plr.position); // Rotate camera to face the player
      console.log(plr.position); 
      return;
    }
    if (e.code === 'KeyA') {
      console.log('A key pressed');          
      //plr.translateX(-.001); // Move model left or right based on direction
      plr.rotateY(0.001); // Rotate model left or right based on direction
      turnCamera(plr.position); // Rotate camera to face the player
      console.log(plr.position);
      return;
    }
    if (e.code === 'KeyS') {
      console.log('S key pressed');          
      plr.translateZ(-.001); // Move model forward or backward based on direction
      turnCamera(plr.position); // Rotate camera to face the player
      console.log(plr.position);
      return;
    }
    if (e.code === 'KeyD') {
      console.log('D key pressed');             
      //plr.translateX(.001); // Move model left or right based on direction
      plr.rotateY(-0.001); // Rotate model left or right based on direction
      turnCamera(plr.position); // Rotate camera to face the player
      console.log(plr.position);
      return;
    }
  });

  // Animate UI layer position using sine wave
  //amazingUI.y = ((Math.sin(Date.now() * 0.001) + 1) * 0.5 * WIDTH) / 2;

  // Render the Three.js scene
  threeRenderer.resetState();
  threeRenderer.render(scene, camera);

  // Render the PixiJS stage
  pixiRenderer.resetState();
  pixiRenderer.render({ container: stage });

  requestAnimationFrame(render);
}

function turnCamera(direction: Vector3) {
  camera.lookAt(direction);
}

requestAnimationFrame(render);

})();
