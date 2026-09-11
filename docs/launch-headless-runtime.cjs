// Numerical scene/physics harness. DOM, canvas 2D and WebGLRenderer are stubs; no pixel rendering.
const fs=require('fs'),vm=require('vm');
const THREE=require(process.argv[3] || '/tmp/three-launch.js'),CANNON=require(process.argv[4] || '/tmp/cannon-offroad.js');
for(const method of ['warn','error']){const orig=console[method];console[method]=function(m,...a){if(typeof m==='string'&&/faceNormals|^\.vertices|^Vertices: /.test(m))return;orig(m,...a)}}
const noop=()=>{};
function element(){const children=new Map();let e={style:{},classList:{add:noop,remove:noop,toggle:noop,contains:()=>false},appendChild:noop,append:noop,remove:noop,addEventListener:noop,setAttribute(k,v){this[k]=v},getAttribute(k){return this[k]},focus:noop,querySelector(k){if(!children.has(k))children.set(k,element());return children.get(k)},querySelectorAll(k){return k==='.start-row i'?Array.from({length:5},element):[]},getBoundingClientRect(){return {width:300,height:200,left:0,top:0}},width:128,height:128,textContent:'',innerHTML:''};let ctx=new Proxy({createLinearGradient(){return {addColorStop:noop}},createRadialGradient(){return {addColorStop:noop}},measureText(){return {width:10}},getImageData(){return {data:new Uint8ClampedArray(e.width*e.height*4)}},createImageData(w,h){return {data:new Uint8ClampedArray(w*h*4)}}},{get(o,k){return k in o?o[k]:noop}});e.getContext=()=>ctx;return e;}
const els=new Map();const document={createElement:element,createElementNS:element,getElementById(id){if(!els.has(id))els.set(id,element());return els.get(id)},querySelector(k){return this.getElementById(k)},querySelectorAll(k){return k==='.start-row i'?Array.from({length:5},element):[]},addEventListener:noop,body:element(),hidden:false};
THREE.WebGLRenderer=class {constructor(){this.domElement=element();this.shadowMap={};this.info={render:{calls:0,triangles:0}}}setPixelRatio(){}setSize(){}render(scene,camera){scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);scene.traverse(o=>{if(o.onBeforeRender)o.onBeforeRender(this,scene,camera)})}getPixelRatio(){return 1}};
let now=0,nextFrame,delta=1/60; THREE.Clock=class {getDelta(){return delta}};
const context={THREE,CANNON,console,Math,document,performance:{now:()=>now},innerWidth:1280,innerHeight:800,devicePixelRatio:1,matchMedia:()=>({matches:false}),addEventListener:noop,localStorage:{getItem:()=>null,setItem:noop},setTimeout:noop,clearTimeout:noop,requestAnimationFrame:f=>{nextFrame=f},navigator:{},location:{search:''},URLSearchParams};context.window=context;
vm.createContext(context);
let script=fs.readFileSync(process.argv[2]||'index.html','utf8').match(/<script>([\s\S]*)<\/script>/)[1];
vm.runInContext(script,context,{timeout:120000});
module.exports={context,dbg:context.__DBG,els,THREE,CANNON,frame(dt=1/60){delta=dt;now+=dt*1000;nextFrame()},setNow(v){now=v}};
if(require.main===module)console.log('FULL APP BOOT',!!context.__DBG,'bodies',context.__DBG.world.bodies.length,'three',THREE.REVISION);
