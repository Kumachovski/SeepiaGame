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
      if(globals.stateReset){
        globals.stateReset = false;
      }
      
    }
  }

  const forward = new THREE.Vector3( 0, 0, 1 );
  const backwards = new THREE.Vector3( 0, 0, -1 );
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
    stateReset: false,
    gamePaused: false,
    amountOfBoxes: 16,
  };

  const gameObjectManager = new GameObjectManager();
  const inputManager = new InputManager();

  class GameObject {
    name: string;
    components: any[];
    transform: THREE.Object3D;
    mesh: THREE.Mesh | null;
    moveThisObject: boolean;
      constructor( parent: THREE.Scene, name: string ) {
        this.name = name;
        this.components = [];
        this.transform = new THREE.Object3D();
        this.mesh = null;
        this.moveThisObject = false;
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
    plrPos = new THREE.Vector3(5, 1, 5);
    name: string;
    boundingBox: THREE.Box3;
    baseBoundingBox: THREE.Box3;
    freeze: boolean;
    constructor( gameObject: GameObject ) {
      super( gameObject );
      const model = models.ninja;
      this.skinInstance = gameObject.addComponent( SkinInstance, model );
      this.skinInstance.setAnimation( 4 ); // 0- front flip, 1- weapon flip  ,2- weapon crossing(defend?) ,3- getting hit , 4- idle
      this.turnSpeed = globals.moveSpeed / 4;
      this.offscreenTimer = 0;
      this.maxTimeOffScreen = 3;
      this.plrStateNow = 'idle';
      gameObject.transform.position.copy(this.plrPos);
      this.name = gameObject.name;
      this.baseBoundingBox = new THREE.Box3(new THREE.Vector3(-0.5,1.1,-0.5),new THREE.Vector3(0.5,2.1,0.5));
      this.boundingBox = new THREE.Box3(new THREE.Vector3(),new THREE.Vector3());
      this.freeze = false;      
    }

    update() {      
      const { deltaTime, moveSpeed } = globals;
      const { transform } = this.gameObject;
      const delta = ( inputManager.keys.left.down ? 1 : 0 ) +
                    ( inputManager.keys.right.down ? - 1 : 0 );      
      transform.rotation.y += this.turnSpeed * delta * deltaTime;      
      //Move bounding box with model geometry
      this.boundingBox.copy(this.baseBoundingBox).applyMatrix4(transform.matrixWorld);
      // Move player while up or down arrow key is pressed and set player global state to running, otherwise set it to idle
      if (!this.freeze){
        if ( inputManager.keys.up.down ) {
          transform.translateOnAxis( forward, moveSpeed * deltaTime );
          this.plrStateNow = 'running';        
        } else {
          this.plrStateNow = 'idle';
        }
        
        if ( inputManager.keys.down.down ) {
          transform.translateOnAxis( backwards, moveSpeed * deltaTime );
          this.plrStateNow = 'running';
        } else if (!inputManager.keys.up.down && !inputManager.keys.down.down) {
          this.plrStateNow = 'idle';
        }
      }
     
      // Change player animation based on player state, if state changed since last frame
      if ( this.plrStateNow !== globals.playerState ) {                      
        this.skinInstance.setAnimation( this.plrStateNow === 'running' ? 0 : 4 )       
        globals.playerState = this.plrStateNow;
      }

      var freezingBlock = "";
      // Check if player is colliding with any object and proceed accordingly
      gameObjectManager.gameObjects.forEach((gameObject: any) => {        
          
        if (gameObject.name.includes('redBox')){          
          if (this.boundingBox.intersectsBox(gameObject.components[0].hitBoundingBox)){
            this.freeze= true;
            freezingBlock = gameObject.name;
          } 
        }
        if (gameObject.name.includes('enemy')){          
          if (this.boundingBox.intersectsBox(gameObject.components[1].boundingBox)){ 
            console.log('Player is colliding with ' + gameObject.name);            
            gameOver();           
          }
        } 
        if (gameObject.name.includes(freezingBlock)){
          if (gameObject.transform.position.y <= 0){
            this.freeze = false;
          }
        }     
      });
                  
      // Keep track of player position in globals and 
      globals.playerPosition = transform.position.clone();
      
      //If game resets
      if (globals.stateReset){
        transform.position.copy(this.plrPos);        
      }      
    }
  }

  class Enemy extends Component {
    skinInstance: SkinInstance;   
    enemyPos = new THREE.Vector3(10, 1, 10);
    boundingBox: THREE.Box3;
    baseBoundingBox: THREE.Box3;
    freeze: boolean;
    constructor( gameObject: GameObject ) {
      super( gameObject );
      const model = models.ninja;
      this.skinInstance = gameObject.addComponent( SkinInstance, model );                        
      gameObject.transform.position.copy(this.enemyPos);
      gameObject.transform.rotateY(Math.PI/2);
      this.baseBoundingBox = new THREE.Box3(new THREE.Vector3(-0.5,1.1,-0.5),new THREE.Vector3(0.5,2.1,0.5));
      this.boundingBox = new THREE.Box3(new THREE.Vector3(),new THREE.Vector3());
      this.freeze = false;
    }

    update() {      
      const { deltaTime, moveSpeed } = globals;
      const { transform } = this.gameObject;      
      const dirx = globals.playerPosition.x - transform.position.x;
      const dirz = globals.playerPosition.z - transform.position.z;
      const angleToPlayer = -Math.atan2(dirz, dirx) + Math.PI/2;
      
      //Move bounding box with model geometry
      this.boundingBox.copy(this.baseBoundingBox).applyMatrix4(transform.matrixWorld);
      
      transform.rotation.y = angleToPlayer;      
      
      // Move enemy forward all the time when not freezed
      if (!this.freeze) {
        transform.translateOnAxis( forward, moveSpeed * deltaTime * Number(globals.timer.text) * 0.01 );              
      }
      
      var freezingBlock = "";
      // Check if enemy is colliding with any object and proceed accordingly
      gameObjectManager.gameObjects.forEach((gameObject: any) => {        
          
        if (gameObject.name.includes('redBox')){          
          if (this.boundingBox.intersectsBox(gameObject.components[0].hitBoundingBox)){
            this.freeze= true;
            freezingBlock = gameObject.name;
            console.log('Enemy is colliding with ' + gameObject.name);           
          } 
        }      
        if (gameObject.name.includes(freezingBlock)){
          if (gameObject.transform.position.y <= 0){
            this.freeze = false;
          }
        }     
      });

      //If game resets
      if (globals.stateReset){
        transform.position.copy(this.enemyPos);        
      }      
    }
  }

  class GroundBlock extends Component {    
    moveup = true;    
    name: string;
    hitBoundingBox: THREE.Box3;
    
    constructor( gameObject: GameObject, color: THREE.ColorRepresentation, position: THREE.Vector3 ) {
      super( gameObject );
      const model = new THREE.BoxGeometry(BOXHEIGHT, BOXWIDTH, BOXDEPTH);
      const material = new THREE.MeshStandardMaterial({ color: color });
      gameObject.mesh = new THREE.Mesh(model, material);      
      gameObject.transform.position.set(position.x, position.y, position.z);
      gameObject.transform.add(gameObject.mesh);
      this.name = gameObject.name;
      this.hitBoundingBox = new THREE.Box3(new THREE.Vector3(), new THREE.Vector3());
      this.hitBoundingBox.setFromObject(gameObject.mesh);          
    }

    update() {      
      const { deltaTime } = globals;
      const { transform, mesh, moveThisObject } = this.gameObject; 
      //Move bounding box with box geometry
      this.hitBoundingBox.copy(mesh.geometry.boundingBox).applyMatrix4(transform.matrixWorld)                       
      // Move Block up and down if it's a red block and if moveThisBlock is true
      if (moveThisObject) {
        if(!this.moveup && transform.position.y >= 0){        
          transform.translateOnAxis( new THREE.Vector3(0, -1, 0), deltaTime);
        
          if(transform.position.y <= 0){            
            this.gameObject.moveThisObject = false;
            this.moveup = true;
          }        
        } 
        if(this.moveup){
          transform.translateOnAxis( new THREE.Vector3(0, 1, 0), deltaTime);
          if(transform.position.y >= 2){
            this.moveup = false;
          }        
        }
        //If game resets
        if (globals.stateReset){
          transform.position.y = 0;
        }        
      }
    }
  }
  
  manager.onLoad = init;

  function init() {
    //add camera 
    addCamera(0, 20, 0);
    //add lights
    addLight(8, 20, 8);                

    // Pixi objects setup 
    addSettingsButton();
    stage.addChild(globals.timer);

    //Three objects setup
    {
			const gameObject = gameObjectManager.createGameObject( scene, 'player' );
			gameObject.addComponent( Player );    
		}
    {
			const gameObject = gameObjectManager.createGameObject( scene, 'enemy' );
			gameObject.addComponent( Enemy );    
		}    
        
    //propagate ground with Boxes
    for (let i = 0; i < globals.amountOfBoxes; i++) {
      for (let j = 0; j < globals.amountOfBoxes; j++) {        
        if (i % 2 === 0) {      
          if (j % 2 === 0) {
            {
              const gameObject = gameObjectManager.createGameObject( scene, 'redBox'+i+j );
              gameObject.addComponent( GroundBlock, 0xff0000, new THREE.Vector3(i * BOXWIDTH, 0, j * BOXWIDTH ) );    
            }
          } else {
            {
              const gameObject = gameObjectManager.createGameObject( scene, 'greenBox'+i+j );
              gameObject.addComponent( GroundBlock, 0x00ff00, new THREE.Vector3(i * BOXWIDTH, 0, j * BOXWIDTH ) );    
            }
          }          
        } else {
          if (j % 2 !== 0) {
            {
              const gameObject = gameObjectManager.createGameObject( scene, 'redBox'+i+j );
              gameObject.addComponent( GroundBlock, 0xff0000, new THREE.Vector3(i * BOXWIDTH, 0, j * BOXWIDTH ) );    
            }
          } else {
            {
              const gameObject = gameObjectManager.createGameObject( scene, 'greenBox'+i+j );
              gameObject.addComponent( GroundBlock, 0x00ff00, new THREE.Vector3(i * BOXWIDTH, 0, j * BOXWIDTH ) );    
            }
          }
        } 
      }
    }
    console.log(gameObjectManager);
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
    
    sNow = Math.round(globals.time)

    if (!globals.gamePaused) {            

      gameObjectManager.update();
		  inputManager.update();

      if (sNow !== sThen){
        const rand1 = Math.round(Math.random() * globals.amountOfBoxes);
        const rand2 = Math.round(Math.random() * globals.amountOfBoxes);
        const rand3 = Math.round(Math.random() * globals.amountOfBoxes);
        const rand4 = Math.round(Math.random() * globals.amountOfBoxes);
        const rand5 = Math.round(Math.random() * globals.amountOfBoxes);
        const rand6 = Math.round(Math.random() * globals.amountOfBoxes);
        globals.timer.text = Number(globals.timer.text) + 1;        
        sThen = sNow;
        gameObjectManager.gameObjects.forEach((gameObject: any) => {
          if (gameObject.name === 'redBox'+rand1+rand2 || gameObject.name === 'redBox'+rand3+rand4||gameObject.name === 'redBox'+rand5+rand6){
            gameObject.moveThisObject = true;
          }
        });
      }      
    }

    turnCamera(globals.playerPosition);           

    // Render the Three.js scene
    threeRenderer.resetState();
    threeRenderer.render(scene, camera);

    // Render the PixiJS stage
    pixiRenderer.resetState();
    pixiRenderer.render({ container: stage });

    requestAnimationFrame(render);
  }  

  function addSettingsButton(){
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
  }

  function turnCamera(direction: THREE.Vector3) {
    camera.lookAt(direction);
  }
  
  function onButtonDown(btn: PIXI.Sprite) {       
    if (globals.btnState.isOver === true){
      console.log("button '"+ globals.oBtn +"' is pressed with mouse");
      if(globals.oBtn ==='settingsBtn'){
        onSettingsClicked();
      }
      if(globals.oBtn ==='startBtn'){        
        globals.timer.text = 0; 
        globals.stateReset = true;
        settingsMenuClosed();        
        globals.settingsOpen = false;
      }
    } else {
      if (globals.settingsOpen === true){        
        settingsMenuClosed();        
        globals.settingsOpen = false;
      }
    }
    globals.btnState.isDown = true;    
  }

  function onButtonUp(btn: PIXI.Sprite) {    
    globals.btnState.isDown = false;
    if (globals.btnState.isOver) {
      if (globals.oBtn === 'settingsBtn'){
        btn.texture = settingsOnTexture;
      }
      if (globals.oBtn === 'startBtn'){
        btn.texture = startBtnOnTexture;
      }
    } else {      
      if (globals.oBtn === 'settingsBtn'){
        btn.texture = settingsTexture;
      }
      if (globals.oBtn === 'startBtn'){
        btn.texture = startBtnTexture;
      }
    }    
  }

  function onButtonOver(btn: PIXI.Sprite) {    
    globals.btnState.isOver = true;
    globals.oBtn = btn.label;
    if (globals.btnState.isDown) {
      return;
    }
    if (btn.label === 'settingsBtn'){
      btn.texture = settingsOnTexture;
    }
    if (btn.label === 'startBtn'){
      btn.texture = startBtnOnTexture;
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
    if (btn.label === 'startBtn'){
      btn.texture = startBtnTexture;
    }
  }

  function onSettingsClicked(){
    globals.settingsOpen = true;
    //Pause game
    globals.gamePaused = true;
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
    globals.oBtn = 'none';
  }

  function gameOver(){    
    globals.stateReset = true;
    onSettingsClicked();
    var gameOverText = new PIXI.BitmapText({
      text: "Game Over \n your score is\n"+globals.timer.text,
      style: {
        fontFamily: 'Grandstander ExtraBold',
        fontSize: 70,
        fill: 0x557755, 
        align: 'center',           
      },
      label: 'gameOverText',        
    })
    gameOverText.position.set(WIDTH/2-210 , HEIGHT/2+90)
    stage.addChild(gameOverText);
  }

  function settingsMenuClosed(){
    var i = 10;
    do {
      stage.children.forEach(child => {
      if (child.label === 'settingsMenu'||child.label === 'startBtn'||child.label === 'gameOverText'){
        stage.removeChild(child);
      }
      i--;      
    });   
    } while (i > 0 );
    globals.oBtn = 'none';
    globals.gamePaused = false;     
  }

  requestAnimationFrame(render);

})();
