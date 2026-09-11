// Run: node docs/verify-circuit-contact.cjs /path/to/cannon-0.6.2.js /path/to/pre-change-index.html
const fs=require('fs'),vm=require('vm'),assert=require('assert'),CANNON=require(process.argv[2]);
function rig(src,car){const cut=(a,b)=>src.slice(src.indexOf(a),src.indexOf(b));const c=vm.createContext({CANNON,Math,clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),buildFormula(){},buildJeep(){}});vm.runInContext(`
var world=new CANNON.World();world.gravity.set(0,-12,0);world.broadphase=new CANNON.SAPBroadphase(world);world.defaultContactMaterial.friction=.4;
var roadMat=new CANNON.Material('road'),wallMat=new CANNON.Material('wall');
var floor=new CANNON.Body({mass:0,material:roadMat,shape:new CANNON.Box(new CANNON.Vec3(100,5,100))});floor.position.set(0,-5,0);world.addBody(floor);
var barrier=new CANNON.Body({mass:0,material:wallMat,shape:new CANNON.Box(new CANNON.Vec3(10,2,.5))});barrier.position.set(0,2,16);world.addBody(barrier);
${cut('  var CH =','  var currentCar =')}
var MODE='circuit',currentCar=CARS[${car}],OFFROAD={};
${cut('  function wheelDef(', '  var carMesh =')}
${cut('  function configureSuspension()', '  function applyCar(')}
${cut('    chassisBody.mass = spec.phys.mass;', '    carPaint.color.setHex').replace(/^/,'var spec=currentCar;\n')}
${src.includes('  var terrainSupport =')?cut('  var terrainSupport =','  /* ================= engine sound'):''}
chassisBody.position.set(0,2,0);
`,c);let trace=[];for(let j=0;j<600;j++){for(let i=0;i<4;i++)c.vehicle.applyEngineForce(j>120&&j<400?-800:0,i);c.world.step(1/60);assert(Number.isFinite(c.chassisBody.position.y));trace.push([c.chassisBody.position.toArray(),c.chassisBody.velocity.toArray(),c.chassisBody.quaternion.toArray(),c.world.contacts.length]);}return trace;}
const before=fs.readFileSync(process.argv[3],'utf8'),after=fs.readFileSync('index.html','utf8');for(let car=0;car<2;car++)assert.deepStrictEqual(rig(before,car),rig(after,car));
const cut=(s,a,b)=>s.slice(s.indexOf(a),s.indexOf(b));assert.equal(cut(before,'  var world =','  var OFFROAD ='),cut(after,'  var world =','  var OFFROAD ='));
console.log('PASS: circuit world/geometry byte-identical; both cars produce identical 600-step trajectories and barrier contacts with the new circuit-guarded listener.');
