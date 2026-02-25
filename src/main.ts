// dependencies: { "three": "latest", "pixi.js": "latest" }
// description: A basic integration of PixiJS and Three.js sharing the same WebGL context
// Import required classes from PixiJS and Three.js
import * as PIXI from 'pixi.js';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

// Self-executing async function to set up the demo
(async () => {  
  const WIDTH = window.innerWidth;
  const HEIGHT = window.innerHeight;

  const BOXWIDTH = 2;
  const BOXHEIGHT = BOXWIDTH;
  const BOXDEPTH = BOXWIDTH;

  const stage = new PIXI.Container();
  const scene = new THREE.Scene();
  const manager = new THREE.LoadingManager();
  
  const settingsTexture = await PIXI.Assets.load('assets/settingsIcon.png');
  const settingsOnTexture = await PIXI.Assets.load('assets/settingIconOn.png');
  const startBtnTexture = await PIXI.Assets.load('assets/startBtn.png');
  const startBtnOnTexture = await PIXI.Assets.load('assets/StartBtnOn.png');

  // Loading ninja texture/material
  const textureloader = new THREE.TextureLoader();
  const plrtexture = textureloader.load('assets/ninja.png');
  plrtexture.colorSpace = THREE.SRGBColorSpace;

  const models: any = {
    ninja: THREE.Group<THREE.Object3DEventMap>,
  };
  {
    const gltfLoader = new GLTFLoader( manager );
    for ( const model of Object.values( models ) ) {
      if ( model === models.ninja ) {
        gltfLoader.load( 'assets/cibus_ninja.glb', ( glb ) => {
        const model = glb.scene;
        model.animations = glb.animations;
        model.traverse( ( node ) => {
          node.visible = true;
          if ( node.isMesh ) {
            node.material.side = THREE.DoubleSide;
            node.material.map = plrtexture;
            node.material.needsUpdate = true;
          }});
        model.scale.set( 1, 1, 1 );
        model.name = 'ninja';
        models.ninja = model;
        } );
      }    
    }
  }

  const camera = new THREE.PerspectiveCamera(70, WIDTH / HEIGHT);

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

  // Keeps the state of keys/buttons
  //
  // You can check
  //
  //   inputManager.keys.left.down
  //
  // to see if the left key is currently held down
  // and you can check
  //
  //   inputManager.keys.left.justPressed
  //
  // To see if the left key was pressed this frame
  //
  // Keys are 'left', 'right', 'a', 'b', 'up', 'down'
  class InputManager {
    keys: {[key: string]: { down: boolean; justPressed: boolean }};

    constructor() {

      this.keys = {};
      const keyMap = new Map();

      const setKey = ( keyName: string, pressed: boolean ) => {

        const keyState = this.keys[ keyName ];
        keyState.justPressed = pressed && ! keyState.down;
        keyState.down = pressed;

      };

      const addKey = ( keyCode: string, name: string ) => {

        this.keys[ name ] = { down: false, justPressed: false };
        keyMap.set( keyCode, name );

      };

      const setKeyFromKeyCode = ( keyCode: string, pressed: boolean ) => {

        const keyName = keyMap.get( keyCode );
        if ( ! keyName ) {

          return;

        }

        setKey( keyName, pressed );

      };

      addKey( 'ArrowLeft', 'left' );
      addKey( 'ArrowRight', 'right' );
      addKey( 'ArrowUp', 'up' );
      addKey( 'ArrowDown', 'down' );
      // addKey( 'KeyA', 'a' );
      // addKey( 'KeyB', 'b' );

      window.addEventListener( 'keydown', ( e ) => {

        setKeyFromKeyCode( e.code, true );

      } );
      window.addEventListener( 'keyup', ( e ) => {

        setKeyFromKeyCode( e.code, false );

      } );

      const sides = [
        { elem: document.querySelector( '#left' ), key: 'left' },
        { elem: document.querySelector( '#right' ), key: 'right' },
      ];

      // note: not a good design?
      // The last direction the user presses should take
      // precedence. Example: User presses L, without letting go of
      // L user presses R. Input should now be R. User lets off R
      // Input should now be L.
      // With this code if user pressed both L and R result is nothing

      
      // Mouse event handling
      // const clearKeys = () => {
      // 	for ( const { key } of sides ) {
      //		setKey( key, false );
      // 	}
      // };
      // const handleMouseMove = ( e:PointerEvent ) => {

      // 	e.preventDefault();
      // 	// this is needed because we call preventDefault();
      // 	// we also gave the canvas a tabindex so it can
      // 	// become the focus
      // 	canvas.focus();
      // 	window.addEventListener( 'pointermove', handleMouseMove );
      // 	window.addEventListener( 'pointerup', handleMouseUp );

      // 	for ( const { elem, key } of sides ) {

      // 		let pressed = false;
      // 		const rect = elem.getBoundingClientRect();
      // 		const x = e.clientX;
      // 		const y = e.clientY;
      // 		const inRect = x >= rect.left && x < rect.right &&
      //                    y >= rect.top && y < rect.bottom;
      // 		if ( inRect ) {

      // 			pressed = true;

      // 		}

      // 		setKey( key, pressed );

      // 	}

      // };

      // function handleMouseUp() {

      // 	clearKeys();
      // 	window.removeEventListener( 'pointermove', handleMouseMove, { passive: false } );
      // 	window.removeEventListener( 'pointerup', handleMouseUp );

      // }

      // const uiElem = document.querySelector( '#ui' );
      // uiElem.addEventListener( 'pointerdown', handleMouseMove, { passive: false } );

      // uiElem.addEventListener( 'touchstart', ( e ) => {

      // 	// prevent scrolling
      // 	e.preventDefault();

      // }, { passive: false } );

    }
    update() {

      for ( const keyState of Object.values( this.keys ) ) {

        if ( keyState.justPressed ) {

          keyState.justPressed = false;

        }

      }

    }

  }

  function removeArrayElement( array: any[], element: number ) {
    const ndx = array.indexOf( element );
    if ( ndx >= 0 ) {
      array.splice( ndx, 1 );
    }
  }

  class SafeArray {
      array: any[];
      addQueue: any[];
      removeQueue: Set<any>;

      constructor() {
        this.array = [];
        this.addQueue = [];
        this.removeQueue = new Set();
      }

      get isEmpty() {
        return this.addQueue.length + this.array.length > 0;
      }

      add( element: any ) {
        this.addQueue.push( element );
      }

      remove( element: any ) {
        this.removeQueue.add( element );
      }

      forEach( fn: ( element: any ) => void ) {
        this._addQueued();
        this._removeQueued();
        for ( const element of this.array ) {
          if ( this.removeQueue.has( element ) ) {
            continue;
          }

          fn( element );
        }

        this._removeQueued();
      }

      _addQueued() {
        if ( this.addQueue.length ) {
          this.array.splice( this.array.length, 0, ...this.addQueue );
          this.addQueue = [];
        }
      }

      _removeQueued() {
        if ( this.removeQueue.size ) {
          this.array = this.array.filter( element => ! this.removeQueue.has( element ) );
          this.removeQueue.clear();
        }
      }
  }

  class GameObjectManager {
    gameObjects: SafeArray; 

    constructor() {

      this.gameObjects = new SafeArray();

    }

    createGameObject( parent: any, name: string ) {
      const gameObject = new GameObject( parent, name );
      this.gameObjects.add( gameObject );
      return gameObject;
    }

    removeGameObject( gameObject: any ) {
      this.gameObjects.remove( gameObject );
    }

    update() {
      this.gameObjects.forEach( gameObject => gameObject.update() );
    }
  }

  const forward = new THREE.Vector3( 0, 0, 1 );
  const globals = {
    time: 0,
    deltaTime: 0,
    moveSpeed: 16,
    camera,
    playerPosition: new THREE.Vector3(10, 0, 10),
    playerState: 'idle',
    cameraInfo: {
      frustum: new THREE.Frustum(),
      projScreenMatrix: new THREE.Matrix4(),
    },
    btnState:{
      isDown: false,
      isOver: false
    },
    settingsOpen: false,
    oBtn: 'none',
    timer: new PIXI.BitmapText({
      text: 0,
      style: {
        fontFamily: 'Grandstander ExtraBold',
        fontSize: 70,
        fill: 0x557755,            
      },
      x: WIDTH - 400,
      y: 30    
    }),
    stateReset: false
  };

  const gameObjectManager = new GameObjectManager();
  const inputManager = new InputManager();

  class GameObject {
    name: string;
    components: any[];
    transform: THREE.Object3D;

      constructor( parent: any, name: string ) {
        this.name = name;
        this.components = [];
        this.transform = new THREE.Object3D();
        parent.add( this.transform );
      }

      addComponent( ComponentType: any, ...args: any[] ) {
        const component = new ComponentType( this, ...args );
        this.components.push( component );
        return component;
      }

      removeComponent( component: any ) {
        removeArrayElement( this.components, component );
      }

      getComponent( ComponentType: any ) {
        return this.components.find( c => c instanceof ComponentType );
      }

      update() {
        for ( const component of this.components ) {
          component.update();
        }
      }
  }
    
  // Base for all components
  class Component {
    gameObject: any;
    constructor( gameObject: any ) {

      this.gameObject = gameObject;

    }
    update() {
    }

  }

  class SkinInstance extends Component {
    model: THREE.Group<THREE.Object3DEventMap>;
    animRoot: THREE.Object3D<THREE.Object3DEventMap>;
    mixer: THREE.AnimationMixer;
    actions: Array<THREE.AnimationAction>;

    constructor( gameObject: any, model: THREE.Group<THREE.Object3DEventMap>) {
      super( gameObject );
      this.model = model;
      this.animRoot = SkeletonUtils.clone( this.model );
      this.mixer = new THREE.AnimationMixer( this.animRoot );
      gameObject.transform.add( this.animRoot );
      this.actions = [];
    }

    setAnimation( animNbr: number ) {
      const clip = this.model.animations[ animNbr ];
      // turn off all current actions
      for ( const action of Object.values( this.actions ) ) {
        action.enabled = false;
      }

      // get or create existing action for clip
      const action = this.mixer.clipAction( clip );
      action.enabled = true;
      action.reset();
      action.play();
      this.actions[ animNbr ] = action;
    }

    update() {
      this.mixer.update( globals.deltaTime );
    }
  }

  class Player extends Component {
    skinInstance: SkinInstance;
    turnSpeed: number;
    offscreenTimer: number;
    maxTimeOffScreen: number;
    plrStateNow: string;

    constructor( gameObject: GameObject ) {
      super( gameObject );
      const model = models.ninja;
      this.skinInstance = gameObject.addComponent( SkinInstance, model );
      this.skinInstance.setAnimation( 4 ); // 0- front flip, 1- weapon flip  ,2- weapon crossing(defend?) ,3- getting hit , 4- idle
      this.turnSpeed = globals.moveSpeed / 4;
      this.offscreenTimer = 0;
      this.maxTimeOffScreen = 3;
      this.plrStateNow = 'idle';
      gameObject.transform.position.set(-10, 2, -10);
    }

    update() {      
      const { deltaTime, moveSpeed } = globals;
      const { transform } = this.gameObject;
      const delta = ( inputManager.keys.left.down ? 1 : 0 ) +
                    ( inputManager.keys.right.down ? - 1 : 0 );
      transform.rotation.y += this.turnSpeed * delta * deltaTime;

      // Move player while up key is pressed and set player global state to running, otherwise set it to idle
      if ( inputManager.keys.up.down ) {              
        transform.translateOnAxis( forward, moveSpeed * deltaTime );
        globals.playerState = 'running';        
      } else {
        globals.playerState = 'idle';
      }
      
      // Change player animation based on player state, if state changed since last frame
      if ( this.plrStateNow !== globals.playerState ) {                      
        this.skinInstance.setAnimation( globals.playerState === 'running' ? 0 : 4 )       
        this.plrStateNow = globals.playerState;
      }

      // Keep track of player position in globals and 
      globals.playerPosition = transform.position.clone();
      
      //If game resets
      if (globals.stateReset){
        transform.position.set(-10, 2, -10);
        globals.stateReset = false;
      }
      // If player is outside of camera frustum for too long, reset player position to (0, 0, 0)
      // const { frustum } = globals.cameraInfo;
      // if ( frustum.containsPoint( transform.position ) ) {
      //   this.offscreenTimer = 0;
      // } else {
      //   this.offscreenTimer += deltaTime;
      //   if ( this.offscreenTimer >= this.maxTimeOffScreen ) {
      //     transform.position.set( 0, 0, 0 );
      //   }
      // }
    }
  }

  
  manager.onLoad = init;

  function init() {
    //add camera 
    addCamera(-15, 10, -15);
    //add lights
    addLight(10, 20, 10);                

    // Pixi objects setup 
    //const settingsBtn = new PIXI.Graphics().roundRect(20, 20, 100, 100, 5).fill(0xffff00);
    const settingsBtn = new PIXI.Sprite(settingsTexture);
    settingsBtn.label = 'settingsBtn';
    settingsBtn.width = 100;
    settingsBtn.height = 100;
    settingsBtn.position.set(20);
    settingsBtn.hitArea = new PIXI.Rectangle(20,20,100,100);
    settingsBtn.eventMode = 'static';
    settingsBtn.cursor = 'pointer';
    settingsBtn
      .on('pointerover', (e) => onButtonOver(settingsBtn))
      .on('pointerout', (e) => onButtonOut(settingsBtn));
    window.addEventListener('pointerdown', (e) => onButtonDown(settingsBtn))
    window.addEventListener('pointerup', (e) => onButtonUp(settingsBtn))
    window.addEventListener('pointerupoutside', (e) => onButtonUp(settingsBtn))

    stage.addChild(settingsBtn);      
    stage.addChild(globals.timer);

    //Three objects setup
    {
			const gameObject = gameObjectManager.createGameObject( scene, 'player' );
			gameObject.addComponent( Player );    
		}
    
    // Create a simple ground boxes
    const boxGeometry = new THREE.BoxGeometry(BOXHEIGHT, BOXWIDTH, BOXDEPTH);
    const boxMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    const box1 = new THREE.Mesh(boxGeometry, boxMaterial);      
    const boxMaterial2 = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
    const box2 = new THREE.Mesh(boxGeometry, boxMaterial2);
    
    
    //propagate ground with slates
    const amountOfBoxes = 10;
    for (let i = -amountOfBoxes; i < amountOfBoxes; i++) {
      for (let j = -amountOfBoxes; j < amountOfBoxes; j++) {
        const slate1 = box1.clone();
        const slate2 = box2.clone();
        if (i % 2 === 0) {      
          if (j % 2 === 0) {
          slate1.position.set(i * BOXWIDTH, 0, j * BOXWIDTH); 
          scene.add(slate1);
          } else {
          slate2.position.set(i * BOXWIDTH, 0, j * BOXWIDTH);
          scene.add(slate2);
          }          
        } else {
          if (j % 2 !== 0) {
          slate1.position.set(i * BOXWIDTH, 0, j * BOXWIDTH);
          scene.add(slate1);
          } else {
          slate2.position.set(i * BOXWIDTH, 0, j * BOXWIDTH); 
          scene.add(slate2);
          }
        } 
      }
    }
  }

  var sNow = 0;
  var sThen = 0;
  let then = 0;
  function render(now: number) {
    
    // convert to seconds
    globals.time = now * 0.001;
    // make sure delta time isn't too big.
    globals.deltaTime = Math.min(globals.time - then, 1 / 20);
    then = globals.time;
    
    gameObjectManager.update();
		inputManager.update();
    
    turnCamera(globals.playerPosition);   
    sNow = Math.round(globals.time)
    if (sNow !== sThen){
      globals.timer.text = Number(globals.timer.text) + 1;
      sThen = sNow;
    }

    // Render the Three.js scene
    threeRenderer.resetState();
    threeRenderer.render(scene, camera);

    // Render the PixiJS stage
    pixiRenderer.resetState();
    pixiRenderer.render({ container: stage });

    requestAnimationFrame(render);
  }

  function turnCamera(direction: THREE.Vector3) {
    camera.lookAt(direction);
  }
  
  function onButtonDown(btn: PIXI.Sprite) { 
    //console.log('button down');   
    if (globals.btnState.isOver === true){
      console.log("button '"+ globals.oBtn +"' is pressed with mouse");
      if(globals.oBtn ==='settingsBtn'){
        onSettingsClicked();
      }
      if(globals.oBtn ==='startBtn'){
        console.log('start clicked '+globals.settingsOpen);
        globals.timer.text = 0; 
        globals.stateReset = true;
        settingsMenuClosed();
        console.log(stage.children);
        globals.settingsOpen = false;
      }
    } else {
      if (globals.settingsOpen === true){
        console.log('menu closed '+globals.settingsOpen);
        settingsMenuClosed();
        console.log(stage.children);
        globals.settingsOpen = false;
      }
    }
    globals.btnState.isDown = true;
    //btn.alpha = 1;
  }

  function onButtonUp(btn: PIXI.Sprite) {
    //console.log('button up');
    globals.btnState.isDown = false;
    if (globals.btnState.isOver) {
      if (globals.oBtn === 'settingsBtn'){
      btn.texture = settingsOnTexture;
    }
    } else {      
      btn.texture = settingsTexture;
    }    
  }

  function onButtonOver(btn: PIXI.Sprite) {
    console.log('button '+btn.label+' over');
    globals.btnState.isOver = true;
    globals.oBtn = btn.label;
    if (globals.btnState.isDown) {
      return;
    }
    if (btn.label === 'settingsBtn'){
      btn.texture = settingsOnTexture;
    }
    
  }

  function onButtonOut(btn: PIXI.Sprite) {
    globals.btnState.isOver = false;
    globals.oBtn = 'none';
    if (globals.btnState.isDown) {
      return;
    }
    if (btn.label === 'settingsBtn'){
      btn.texture = settingsTexture;
    }
  }

  function onSettingsClicked(){
    globals.settingsOpen = true;
    //Pause game

    //Popup settings window
    const settingsPopUpSprite = new PIXI.Sprite(PIXI.Texture.WHITE);
    const startBtn = new PIXI.Sprite(startBtnTexture);

    const w = 500;
    const h = 700;
    const bw = 400;
    const bh = 200;

    settingsPopUpSprite.label = 'settingsMenu'
    settingsPopUpSprite.eventMode = 'static';
    settingsPopUpSprite.cursor = 'pointer';
    settingsPopUpSprite.setSize(w,h);
    //settingsPopUpSprite.hitArea = new PIXI.Rectangle(WIDTH/2- w/2, HEIGHT/2-h/2, w, h);
    settingsPopUpSprite.position.set(WIDTH/2- w/2, HEIGHT/2-h/2)    
    settingsPopUpSprite
      .on('pointerover', (e) => onButtonOver(settingsPopUpSprite))
      .on('pointerout', (e) => onButtonOut(settingsPopUpSprite));

    startBtn.label = 'startBtn'
    startBtn.eventMode = 'static';
    startBtn.cursor = 'pointer';
    startBtn.setSize(bw,bh);
    //settingsPopUpSprite.hitArea = new PIXI.Rectangle(WIDTH/2- w/2, HEIGHT/2-h/2, w, h);
    startBtn.position.set(WIDTH/2- bw/2, HEIGHT/2-bh/2-100)    
    startBtn
      .on('pointerover', (e) => onButtonOver(startBtn))
      .on('pointerout', (e) => onButtonOut(startBtn));

    
    stage.addChild(settingsPopUpSprite);
    stage.addChild(startBtn);
  }

  function settingsMenuClosed(){
    var i = 5;
    do {
      stage.children.forEach(child => {
      if (child.label === 'settingsMenu'||child.label === 'startBtn') {
        stage.removeChild(child);
      }
      i--;      
    });   
    } while (i > 0 );     
  }

  requestAnimationFrame(render);

})();
