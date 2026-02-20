// dependencies: { "three": "latest", "pixi.js": "latest" }
// description: A basic integration of PixiJS and Three.js sharing the same WebGL context
// Import required classes from PixiJS and Three.js
import * as PIXI from 'pixi.js';
import * as THREE from 'three';
import { Vector3 } from 'three.js';
import { Object3D } from 'three.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mod } from 'three/tsl';

// Self-executing async function to set up the demo
(async () => {
const WIDTH = window.innerWidth;
const HEIGHT = window.innerHeight;
const globals = {
  time: 0,
  deltaTime: 0,
};

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

//Camera setup
const camera = new THREE.PerspectiveCamera(70, WIDTH / HEIGHT);
camera.position.set(50, -20, -20);
camera.lookAt(0, 0, 0);
scene.add(camera);

//Light setup
const color = 0xFFFFFF;
const intensity = 3;
const light = new THREE.DirectionalLight(color, intensity);
light.position.set(10, 10, 20);
scene.add(light);

// Load 3D player model
const textureloader = new THREE.TextureLoader();
const plrtexture = textureloader.load('assets/ninja.png');
plrtexture.colorSpace = THREE.SRGBColorSpace;

const plrmaterial = new THREE.MeshPhongMaterial({ 
  map: plrtexture,  
});

const objloader = new GLTFLoader();


  objloader.load('assets/cibus_ninja.glb', (glb) => {
  const model = glb.scene;    
  model.traverse((node) => {
        if (node.isMesh) {            
            node.material.map = plrtexture;
            node.material.needsUpdate = true;
        }
    }); 
  model.name = 'player';   
  model.scale.set(10 , 10, 10);
  // model.translateX(direction.x * 5); // Move model left or right based on direction
  // model.translateY(direction.y * 5); // Move model forward or backward based on direction
  //model.rotation.y = 4.5; // Rotate model to face the camera
  scene.add(model); 
}); 



const cylinderGeometry = new THREE.CylinderGeometry(3, 3, 10);
const basicMaterial = new THREE.MeshPhongMaterial({ color: 0x0095dd });
const player = new THREE.Mesh(cylinderGeometry, basicMaterial);
//scene.add(player);

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

const stage = new PIXI.Container();
// Create a simple UI element in PixiJS
const amazingUI = new PIXI.Graphics().roundRect(20, 80, 100, 100, 5).roundRect(220, 80, 100, 100, 5).fill(0xffff00);
// Create a simple BG in PixiJS
const bg = new PIXI.Graphics().fill(0x0000ff).rect(0, 0, WIDTH, HEIGHT);

stage.addChild(bg);
stage.addChild(amazingUI);

let then = 0;

function render(now: number) {

  // convert to seconds
  globals.time = now * 0.001;
  // make sure delta time isn't too big.
  globals.deltaTime = Math.min(globals.time - then, 1 / 20);
  then = globals.time;
  const plr = scene.getObjectByName('player') as Object3D;
  //  if (plr) {
  //   plr.rotation.y += 0.01; // Rotate player continuously
  // }  

  window.addEventListener('keydown', (e) => {  
    if (e.code === 'KeyW') {
      console.log('W key pressed');
      console.log(scene.getObjectByName('player') as Object3D); 
      plr.translateZ(-.1); // Move model forward or backward based on direction
      turnCamera(plr.position); // Rotate camera to face the player
      return;
    }
    if (e.code === 'KeyA') {
      console.log('A key pressed');
      console.log(scene.getObjectByName('player') as Object3D);      
      plr.translateX(-.1); // Move model left or right based on direction
      turnCamera(plr.position); // Rotate camera to face the player
      return;
    }
    if (e.code === 'KeyS') {
      console.log('S key pressed');
      console.log(scene.getObjectByName('player') as Object3D);     
      plr.translateZ(.1); // Move model forward or backward based on direction
      turnCamera(plr.position); // Rotate camera to face the player
      return;
    }
    if (e.code === 'KeyD') {
      console.log('D key pressed');
      console.log(scene.getObjectByName('player') as Object3D);       
      plr.translateX(.1); // Move model left or right based on direction
      turnCamera(plr.position); // Rotate camera to face the player
      return;
    }
  });
  // Rotate player continuously
  // player.rotation.x += 0.01;
  // player.rotation.y += 0.01;
  

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
