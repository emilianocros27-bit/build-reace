// Run: node docs/verify-offroad-contact.cjs /path/to/cannon-0.6.2.js [index.html]
// Executes the actual terrain generator and physics functions, without rendering.
const fs = require('fs'), vm = require('vm'), assert = require('assert');
// Match the game's narrow suppression of Cannon's prism winding warnings.
for (const method of ['warn', 'error']) {
  const original = console[method];
  console[method] = function(message, ...args) {
    if (typeof message === 'string' && /faceNormals|^\.vertices|^Vertices: /.test(message)) return;
    original.call(console, message, ...args);
  };
}
const CANNON = require(process.argv[2]);
const source = fs.readFileSync(process.argv[3] || 'index.html', 'utf8');
for (const m of source.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) if (m[1].trim()) new Function(m[1]);
const cut = (a, b) => { assert(source.includes(a) && source.includes(b), a); return source.slice(source.indexOf(a), source.indexOf(b)); };
const context = vm.createContext({ CANNON, Math, console: { log() {}, warn() {}, error() {} },
  clamp: (v,a,b) => Math.max(a,Math.min(b,v)), localStorage: { getItem() { return null; } },
  buildFormula() {}, buildJeep() {}, resetFeel() {}, steerNow: 0 });
vm.runInContext(`
var world = new CANNON.World(); world.gravity.set(0,-12,0);
world.broadphase = new CANNON.SAPBroadphase(world);
world.defaultContactMaterial.friction = 0.4; world.defaultContactMaterial.restitution = 0;
var roadMat = new CANNON.Material('road'), wallMat = new CANNON.Material('wall');
var OFFROAD = (function(){
${cut('    var OX = 4200;', '    /* Adaptive render cells')}
return { bodies: bodies, groundY: groundY, maxY: maxY, minY: minY,
  trailWorld: TRAIL.map(function(p,i){return [p[0]+OX,p[1],trailY[i]];}),
  normalAt: function(x,z){var dx=(groundY(x+3,z)-groundY(x-3,z))/6,dz=(groundY(x,z+3)-groundY(x,z-3))/6;return {y:1/Math.sqrt(1+dx*dx+dz*dz)};},
  obstacles: obstacles, fineResolution: FINE_ES };
})();
${cut('  var CH =', '  var currentCar =')}
var currentCar = CARS[1], MODE='offroad', offroad={};
${cut('  function wheelDef(', '  var carMesh =')}
${cut('  function configureSuspension()', '  function applyCar(')}
${cut('  function reseatVehicle()', '  function resetCar()')}
${source.includes('  var terrainSupport =') ? cut('  var terrainSupport =', '  /* ================= engine sound') : 'var terrainSupport={contacts:0,maxPenetration:0,totalLift:0};'}
// Physics portion of applyCar; material/visual rebuilding is intentionally omitted.
${cut('    chassisBody.mass = spec.phys.mass;', '    carPaint.color.setHex').replace(/^/,'var spec=currentCar;\n')}
OFFROAD.bodies.forEach(function(b){world.addBody(b);});
`, context, { timeout: 120000 });
const {world, vehicle, chassisBody: chassis, OFFROAD: terrain, terrainSupport} = context;
const dt=1/60;
const reset=(i,settle=0)=>{
  const p=terrain.trailWorld[i],a=terrain.trailWorld[Math.max(0,i-1)],b=terrain.trailWorld[Math.min(terrain.trailWorld.length-1,i+1)];
  const yaw=Math.atan2(b[0]-a[0],b[1]-a[1]);
  context.placeCar(p[0],p[1],yaw,p[2]+.85);
  chassis.aabbNeedsUpdate=true; world.broadphase.dirty=true;
  for(let j=0;j<settle;j++)world.step(dt);
  return {x:Math.sin(yaw),z:Math.cos(yaw)};
};
reset(0);chassis.position.y=terrain.trailWorld[0][2]+2.45;
for(let j=0;j<600;j++)world.step(dt);
const wheels=vehicle.wheelInfos.map((w,i)=>{
  const contact=w.isInContact;vehicle.updateWheelTransform(i);
  const p=w.worldTransform.position;
  return {contact,hubMinusRadius:p.y-w.radius-terrain.groundY(p.x,p.z)};
});
const spawn={wheels,heightAboveGround:chassis.position.y-terrain.groundY(chassis.position.x,chassis.position.z)};
assert(wheels.every(w=>w.contact && Math.abs(w.hubMinusRadius)<.02),'spawn wheel support');
let results=[],horizontal=0,hfContacts=0,supportSteps=0,maxPenetration=0;
for(let i=0;i<terrain.trailWorld.length;i++){
  const f=reset(i),start=chassis.position.clone();
  chassis.velocity.set(6*f.x,0,6*f.z);
  // Cannon 0.6.2 uses negative engine force for nose-first (+Z) acceleration.
  for(let w=0;w<4;w++)vehicle.applyEngineForce(-1100,w);
  let bad=false,contacts=0;
  for(let j=0;j<36;j++){
    world.step(dt);
    for(const c of world.contacts)if(c.bi===terrain.bodies[0]||c.bj===terrain.bodies[0]){
      contacts++;hfContacts++;
      if(Math.abs(c.ni.y)<.35&&terrain.normalAt(chassis.position.x,chassis.position.z).y>.9)bad=true;
    }
    if(terrainSupport.contacts)supportSteps++;
    maxPenetration=Math.max(maxPenetration,terrainSupport.maxPenetration);
    assert(Number.isFinite(chassis.position.y)&&chassis.position.y>terrain.minY-3,'fell through terrain');
  }
  horizontal+=bad;
  results.push({i,advance:(chassis.position.x-start.x)*f.x+(chassis.position.z-start.z)*f.z,contacts,bad});
}
const ordered=results.map(r=>r.advance).sort((a,b)=>a-b);
const report={points:results.length,horizontalWallPoints:horizontal,heightfieldShapeContacts:hfContacts,
  medianAdvance:(ordered[Math.floor((ordered.length-1)/2)]+ordered[Math.floor(ordered.length/2)])/2,
  below1_2:ordered.filter(v=>v<1.2).length,minAdvance:ordered[0],worstOldPoints:results.filter(r=>[137,211,212,213].includes(r.i)),
  spawn,supportSteps,maxPenetration,obstacles:terrain.obstacles.length,resolution:terrain.fineResolution};
// Drop onto the belly with wheel force support disabled: probes must carry it alone.
if(source.includes('  var terrainSupport =')){
  reset(211);vehicle.wheelInfos.forEach(w=>w.maxSuspensionForce=0);
  chassis.position.y=terrain.trailWorld[211][2]+3;
  let peak=0;for(let j=0;j<900;j++){world.step(dt);peak=Math.max(peak,terrainSupport.maxPenetration);}
  report.bellyDrop={heightAboveGround:chassis.position.y-terrain.groundY(chassis.position.x,chassis.position.z),verticalSpeed:chassis.velocity.y,peakPenetration:peak,contacts:terrainSupport.contacts};
  assert(terrainSupport.contacts>0&&Math.abs(chassis.velocity.y)<.01&&report.bellyDrop.heightAboveGround>0,'belly support');
  assert.equal(hfContacts,0);assert.equal(horizontal,0);assert(report.medianAdvance>2.5);
}
console.log(JSON.stringify(report,null,2));
fs.writeFileSync('/tmp/offroad-contact-results.json',JSON.stringify({report,results},null,2));
