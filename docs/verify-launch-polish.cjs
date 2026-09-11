// node docs/verify-launch-polish.cjs index.html /path/three-r128.js /path/cannon-0.6.2.js
// Geometry/scene audit only. No telemetry/speedometer scope, no claimed GPU pixels.
const fs=require('fs'),assert=require('assert'),r=require('./launch-headless-runtime.cjs'),d=r.dbg,T=r.THREE;
d.chooseCar(d.cars[1]);d.setMap('offroad');
const h=d.OFFROAD.horizon,g=h.mesh.geometry,p=g.attributes.position,idx=g.index.array,tc=d.OFFROAD.treeCollisions;
let seamError=0,minNormal=1,area=0,edges=new Map();
for(let i=0;i<h.seamVertices;i++)seamError=Math.max(seamError,Math.abs(p.getY(i)-d.OFFROAD.groundY(p.getX(i),p.getZ(i))));
for(let i=0;i<g.attributes.normal.count;i++)minNormal=Math.min(minNormal,g.attributes.normal.getY(i));
for(let i=0;i<idx.length;i+=3){const [a,b,c]=[idx[i],idx[i+1],idx[i+2]];area+=Math.abs((p.getX(b)-p.getX(a))*(p.getZ(c)-p.getZ(a))-(p.getZ(b)-p.getZ(a))*(p.getX(c)-p.getX(a)))/2;for(const [x,y] of [[a,b],[b,c],[c,a]]){let k=x<y?`${x},${y}`:`${y},${x}`;edges.set(k,(edges.get(k)||0)+1);}}
assert.equal([...edges.values()].filter(n=>n===1).length,h.seamVertices+h.rings.at(-1).count);assert([...edges.values()].every(n=>n===1||n===2));assert(seamError<1e-4);assert(minNormal>0);assert(Math.abs(area-4*(h.outerHalfSize**2-d.OFFROAD.halfSize**2))<1);
let minDepth=Infinity,frustums=0;for(const p of d.OFFROAD.trailWorld)for(let elevation of [1,4,9,66])for(let aspect of [9/16,16/9,32/9])for(let direction=0;direction<4;direction++){
 const distance=h.outerHalfSize-Math.max(Math.abs(p[0]-d.OFFROAD.OX),Math.abs(p[1]))-20;
 minDepth=Math.min(minDepth,distance/Math.sqrt(1+Math.tan(68*Math.PI/360)**2*(1+aspect**2)));frustums++;
}assert(minDepth>d.scene.fog.far);
let high=d.OFFROAD.trailWorld.map((p,i)=>({p,i})).sort((a,b)=>b.p[2]-a.p[2]).slice(0,12);high.push({p:d.OFFROAD.trailWorld[0],i:0});
let rays=0,misses=0,minSkyDistance=Infinity,maxSkyDistance=0;let ray=new T.Raycaster();
for(let {p} of high)for(let elevation of [4,66])for(let heading=0;heading<4;heading++){
 let a=heading*Math.PI/2;d.camera.position.set(p[0],p[2]+elevation,p[1]);d.camera.lookAt(p[0]+Math.sin(a)*100,p[2]+elevation-10,p[1]+Math.cos(a)*100);d.camera.updateMatrixWorld(true);d.sky.onBeforeRender(d.renderer,d.scene,d.camera);
 for(let x of [-1,-.5,0,.5,1])for(let y of [-1,-.5,0,.5,1]){ray.setFromCamera(new T.Vector2(x,y),d.camera);let hit=ray.intersectObject(d.sky);rays++;if(!hit.length)misses++;else{minSkyDistance=Math.min(minSkyDistance,hit[0].distance);maxSkyDistance=Math.max(maxSkyDistance,hit[0].distance)}}
}assert.equal(misses,0);assert(minSkyDistance>d.camera.near&&maxSkyDistance<d.camera.far);assert(d.scene.background.equals(d.scene.fog.color));
let maxTrees=0,orphans=0,audited=0,ids=new Set(),m=new T.Matrix4(),visible=new T.Box3();tc.records[0].mesh.geometry.computeBoundingBox();
for(let p of d.OFFROAD.trailWorld){tc.update(p[0],p[1],true);maxTrees=Math.max(maxTrees,tc.active.size);for(let body of tc.active.values()){
 body.computeAABB();body.tree.mesh.getMatrixAt(body.tree.instance,m);visible.copy(body.tree.mesh.geometry.boundingBox).applyMatrix4(m);
 const bounds=new T.Box3(new T.Vector3(...body.aabb.lowerBound.toArray()),new T.Vector3(...body.aabb.upperBound.toArray()));
 if(!visible.intersectsBox(bounds))orphans++;assert(visible.containsBox(bounds));assert.equal(body.collisionFilterGroup,8);audited++;ids.add(body.tree.instance);
}}assert.equal(orphans,0);assert(maxTrees<=96);
let minMetreRange=Infinity,maxMetreRange=0,flatMetres=0,metres=0;
for(let s=0;s<d.OFFROAD.technical.routeLength-1;s++){let heights=[];for(let j=0;j<=8;j++){let p=d.OFFROAD.technical.routePoint(s+j/8);heights.push(d.OFFROAD.groundY(p.x+d.OFFROAD.OX,p.z));}let range=Math.max(...heights)-Math.min(...heights);minMetreRange=Math.min(minMetreRange,range);maxMetreRange=Math.max(maxMetreRange,range);if(range<.001)flatMetres++;metres++;}
assert.equal(flatMetres,0);assert.equal(d.OFFROAD.bodies[0].collisionFilterGroup,2);assert.equal(d.OFFROAD.bodies[0].collisionFilterMask,4);
let phy=d.cars[1].phys,ratios=phy.gears.map(r=>r*phy.final*phy.lowRange),speed=(rpm,ratio)=>rpm/ratio*2*Math.PI*.42/60*3.6;
let report={runtime:'Three/Cannon geometry and app logic in Node; renderer stubbed, no GPU pixel test',trees:{records:tc.records.length,maxActive:maxTrees,auditedInstances:audited,uniqueTrunks:ids.size,orphans,allCylinderAabbsInsideTrunkAabbs:true},terrain:{metresTested:metres,flatMetres,minMetreRangeM:minMetreRange,maxMetreRangeM:maxMetreRange,obstacles:d.OFFROAD.technical.obstacles.map(o=>({type:o.type,height:o.height,depth:o.depth,degrees:o.degrees}))},horizon:{vertices:p.count,triangles:idx.length/3,seamErrorM:seamError,internalHoles:0,frustums,minOuterEdgeDepthM:minDepth,fogFarM:d.scene.fog.far,skyRays:rays,missingSkyRays:misses,minSkyDistance,maxSkyDistance,highestRouteY:high[0].p[2],terrainMaxY:d.OFFROAD.maxY},drivetrain:{massKg:phy.mass,ratios,firstIdleKmh:speed(900,ratios[0]),firstAt2300Kmh:speed(2300,ratios[0]),thirdAt2600Kmh:speed(2600,ratios[2]),ratedTorqueNm:353*d.jeepTorqueFactor(4800),ratedPowerHp:353*d.jeepTorqueFactor(6400)*6400*Math.PI/30/745.7}};
d.setMap('circuit');assert.equal(tc.active.size,0);assert(!d.OFFROAD.group.visible);assert.equal(d.chassis.collisionFilterMask,1);report.circuit={treeBodiesRemaining:0,horizonHidden:true,normalCollisionMask:1};
fs.writeFileSync('docs/emiliano-scene-report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
