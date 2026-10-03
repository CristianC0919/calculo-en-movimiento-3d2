// CÁLCULO EN MOVIMIENTO 3D
// La función es introducida por el usuario. Math.js obtiene automáticamente
// f(x), f'(x) y f''(x), por lo que no queda una función fija en el programa.

let expressionText = "x^2";
let compiled, derivativeExpr, secondDerivativeExpr;
let range = 5, a = 1.5, mode = 0;
let cameraRunning=false, lastGesture=0, stableCount=0;

const $=id=>document.getElementById(id);
const fmt=n=>Number.isFinite(n)?(Math.abs(n)<1e-8?0:n).toFixed(3):"no definida";

// Lee, valida y compila la función; también calcula sus dos derivadas.
function prepareFunction(){
  const raw=$("functionInput").value.trim().replaceAll("sen","sin").replaceAll("coseno","cos");
  // Evita analizar accidentalmente la función anterior si la nueva es inválida.
  compiled=null; derivativeExpr=null; secondDerivativeExpr=null;
  if(!raw){ $("functionError").textContent="Escribe una función."; return false; }

  // "tan8(0)" es una notación ambigua/no admitida por esta aplicación.
  // Se avisa al usuario en vez de intentar dibujar una expresión mal escrita.
  if(/^tan\s*8\s*\(\s*0\s*\)$/i.test(raw)){
    $("functionError").textContent="No se puede graficar: «tan8(0)» no está escrita con una notación válida. Escribe, por ejemplo, tan(8*x), (tan(x))^8 o tan(0), según lo que quieras representar.";
    $("mathResult").textContent="No se puede graficar: revisa la notación de la función.";
    alert("No se puede resolver esta función: «tan8(0)» tiene una notación ambigua. Usa tan(8*x), (tan(x))^8 o tan(0), según lo que quieras expresar.");
    return false;
  }
  try{
    const node=math.parse(raw);
    compiled=node.compile();
    derivativeExpr=math.derivative(node,"x");
    secondDerivativeExpr=math.derivative(derivativeExpr,"x");
    expressionText=raw;
    $("functionError").textContent="";
    $("functionText").textContent=`f(x) = ${raw}`;
    $("derivativesText").textContent=`f'(x) = ${derivativeExpr.toString()} · f''(x) = ${secondDerivativeExpr.toString()}`;
    rebuildCurves();
    updateMath();
    updateVisualization();
    return true;
  }catch(e){
    $("functionError").textContent="No se puede graficar esa expresión. Revisa la notación. Ejemplos válidos: x^2, x^3-2*x, sin(x), tan(x), exp(x).";
    $("mathResult").textContent="No se puede graficar: función no válida.";
    alert(`No se puede resolver ni graficar la expresión «${raw}». Motivo: la expresión tiene una sintaxis no válida o contiene una operación que el analizador no reconoce. Revisa paréntesis, operadores y nombres de funciones. Ejemplos: x^2, sin(x), tan(x), exp(x).`);
    return false;
  }
}

// Evalúa una expresión en x; devuelve NaN si no hay un resultado numérico finito.
function val(expr,x){
  try{
    const v=expr.evaluate({x});
    return typeof v==="number"&&Number.isFinite(v)?v:NaN;
  }catch{return NaN}
}
// Evalúa la función original f(x).
function f(x){return val(compiled,x)}
// Evalúa la primera derivada f'(x), que representa la pendiente.
function df(x){return val(derivativeExpr,x)}
// Evalúa la segunda derivada f''(x), relacionada con la concavidad.
function d2f(x){return val(secondDerivativeExpr,x)}

// Estima un límite lateral usando valores cada vez más cercanos al punto.
// Es un diagnóstico numérico: no reemplaza una demostración algebraica.
function estimateSideLimit(at, side){
  const samples=[];
  for(const h of [1e-1,1e-2,1e-3,1e-4,1e-5,1e-6,1e-7]){
    samples.push(f(at + side*h));
  }
  const valid=samples.filter(Number.isFinite);
  if(valid.length<4) return {kind:"undefined", value:NaN, samples};
  const tail=valid.slice(-4);
  const scale=Math.max(1,...tail.map(Math.abs));
  const diffs=[];
  for(let i=1;i<tail.length;i++) diffs.push(Math.abs(tail[i]-tail[i-1]));
  const converges=diffs.every(d=>d < 2e-3*Math.max(1,Math.abs(tail[tail.length-1]))) &&
    Math.abs(tail[tail.length-1]-tail[0]) < 5e-3*scale;
  if(converges && Math.abs(tail[tail.length-1])<1e8)
    return {kind:"finite",value:tail[tail.length-1],samples};
  const magnitudes=tail.map(Math.abs);
  const growing=magnitudes.every((v,i)=>i===0 || v>magnitudes[i-1]*1.15);
  const sameSign=tail.every(v=>Math.sign(v)===Math.sign(tail[0]));
  if(growing && sameSign && magnitudes[magnitudes.length-1]>1e4)
    return {kind:tail[0]>0?"posInf":"negInf",value:tail[tail.length-1],samples};
  return {kind:"diverges",value:tail[tail.length-1],samples};
}
function describeSide(result){
  if(result.kind==="finite") return `≈ ${fmt(result.value)}`;
  if(result.kind==="posInf") return "+∞ (crece sin límite)";
  if(result.kind==="negInf") return "−∞ (disminuye sin límite)";
  if(result.kind==="undefined") return "no se pudo evaluar en puntos cercanos";
  return "no converge a un valor estable";
}
function analyzeLimit(){
  const raw=$("limitPoint").value.trim().replace(",", ".");
  const at=Number(raw);
  const out=$("limitResult");
  out.classList.remove("limit-error");
  if(!compiled){out.textContent="Error: primero escribe y aplica una función válida.";out.classList.add("limit-error");return;}
  if(raw===""||!Number.isFinite(at)){out.textContent="Error: el punto debe ser un número finito, por ejemplo 0, 1 o -2.";out.classList.add("limit-error");return;}
  const left=estimateSideLimit(at,-1), right=estimateSideLimit(at,1);
  let conclusion="";
  if(left.kind==="finite"&&right.kind==="finite"){
    const tol=1e-2*Math.max(1,Math.abs(left.value),Math.abs(right.value));
    if(Math.abs(left.value-right.value)<=tol){
      conclusion=`El límite EXISTE y es aproximadamente ${fmt((left.value+right.value)/2)}.`;
    }else conclusion="El límite NO EXISTE porque los límites laterales son diferentes.";
  }else if(left.kind==="posInf"&&right.kind==="posInf"){
    conclusion="La función tiende a +∞ por ambos lados. No existe un límite finito; hay divergencia infinita positiva.";
  }else if(left.kind==="negInf"&&right.kind==="negInf"){
    conclusion="La función tiende a −∞ por ambos lados. No existe un límite finito; hay divergencia infinita negativa.";
  }else if((left.kind==="posInf"&&right.kind==="negInf")||(left.kind==="negInf"&&right.kind==="posInf")){
    conclusion="El límite NO EXISTE porque los límites laterales divergen a infinitos de signos opuestos.";
  }else if(left.kind==="finite"||right.kind==="finite"){
    conclusion="El límite bilateral NO EXISTE o no pudo confirmarse: los comportamientos laterales son distintos o uno de los lados no está definido cerca del punto.";
  }else{
    conclusion="ALERTA: NO SE PUDO RESOLVER AUTOMÁTICAMENTE. Los valores cercanos no permiten confirmar un límite. Puede tratarse de una función oscilante, una discontinuidad complicada o una expresión no definida cerca del punto. Se necesita un análisis algebraico adicional.";
    out.classList.add("limit-error");
    alert(`No se pudo resolver automáticamente el límite de f(x) = ${expressionText} cuando x → ${fmt(at)}. Motivo: el análisis numérico no encontró un comportamiento estable o la función no está definida en suficientes puntos cercanos. No significa necesariamente que el límite no exista; puede requerir demostración algebraica.`);
  }
  out.innerHTML=`<b>${conclusion}</b><br><span>Límite por la izquierda (x→${fmt(at)}⁻): ${describeSide(left)}</span><br><span>Límite por la derecha (x→${fmt(at)}⁺): ${describeSide(right)}</span><br><small>f(${fmt(at)}) = ${fmt(f(at))}. El valor de la función en el punto puede ser distinto del límite.</small>`;
}
$("limitBtn").onclick=analyzeLimit;
$("limitPoint").addEventListener("keydown",e=>{if(e.key==="Enter")analyzeLimit()});

$("applyBtn").onclick=prepareFunction;
$("functionInput").addEventListener("keydown",e=>{if(e.key==="Enter")prepareFunction()});
document.querySelectorAll("[data-fn]").forEach(b=>b.onclick=()=>{$("functionInput").value=b.dataset.fn;prepareFunction()});
$("rangeInput").oninput=e=>{range=+e.target.value;$("rangeValue").textContent=`−${range} a ${range}`;rebuildCurves();updateVisualization()};

// THREE.JS
const canvas=$("scene"), renderer=new THREE.WebGLRenderer({canvas,antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
const scene=new THREE.Scene();scene.background=new THREE.Color(0x05070c);
const cam3d=new THREE.PerspectiveCamera(55,1,.1,100);cam3d.position.set(8,6,10);cam3d.lookAt(0,1,0);
scene.add(new THREE.AmbientLight(0xffffff,1.5));
const grid=new THREE.GridHelper(14,28,0x344155,0x1a2230);scene.add(grid);
scene.add(new THREE.AxesHelper(5));
const group=new THREE.Group();scene.add(group);

// Muestrea una función en el rango visible y crea una línea de Three.js.
function lineFrom(fn,color){
  const pts=[];
  for(let x=-range;x<=range;x+=range/180){
    const y=fn(x);
    if(Number.isFinite(y)&&Math.abs(y)<range*2.8)pts.push(new THREE.Vector3(x,y,0));
  }
  return new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color}));
}
let functionCurve,derivativeCurve,secondCurve,tangentLine;
// Sustituye una línea y libera los recursos gráficos anteriores.
function replaceLine(old,newLine){
  if(old){group.remove(old);old.geometry.dispose();old.material.dispose()}
  group.add(newLine);return newLine;
}
// Redibuja f, f' y f'' cuando cambia la función o el rango.
function rebuildCurves(){
  if(!compiled)return;
  functionCurve=replaceLine(functionCurve,lineFrom(f,0x6ee7ff));
  derivativeCurve=replaceLine(derivativeCurve,lineFrom(df,0xffbd6e));
  secondCurve=replaceLine(secondCurve,lineFrom(d2f,0xc891ff));
  derivativeCurve.visible=secondCurve.visible=false;
  updateTangent();
}
// Construye la tangente: y = f'(a)(x-a) + f(a).
function updateTangent(){
  if(!compiled)return;
  const m=df(a), y0=f(a);
  if(!Number.isFinite(m)||!Number.isFinite(y0)){tangentLine.visible=false;return}
  tangentLine=replaceLine(tangentLine,lineFrom(x=>m*(x-a)+y0,0xffbd6e));
  tangentLine.visible=mode===2;
}

const point=new THREE.Mesh(new THREE.SphereGeometry(.13,20,20),new THREE.MeshBasicMaterial({color:0xffffff}));
scene.add(point);
const criticalGroup=new THREE.Group();scene.add(criticalGroup);

const count=800,pGeo=new THREE.BufferGeometry(),pPos=new Float32Array(count*3);
for(let i=0;i<count;i++){const r=5+Math.random()*5,t=Math.random()*Math.PI*2;pPos[i*3]=Math.cos(t)*r;pPos[i*3+1]=(Math.random()-.5)*5;pPos[i*3+2]=Math.sin(t)*r}
pGeo.setAttribute("position",new THREE.BufferAttribute(pPos,3));
const particles=new THREE.Points(pGeo,new THREE.PointsMaterial({color:0x6ee7ff,size:.035,transparent:true,opacity:.7}));scene.add(particles);

// Ajusta el renderizador y la cámara al tamaño del canvas.
function resize(){const w=canvas.clientWidth,h=canvas.clientHeight;renderer.setSize(w,h,false);cam3d.aspect=w/h;cam3d.updateProjectionMatrix()}
addEventListener("resize",resize);resize();

// Cambia el modo de interacción y los textos explicativos.
function setMode(n){
  mode=n;
  const titles=["Sin interacción","1 dedo · Evaluación","2 dedos · Recta tangente","3 dedos · Derivadas","4 dedos · Puntos críticos","5 dedos · Reto aplicado"];
  const actions=["Activa la cámara o usa el teclado.","Mueve el dedo horizontalmente para cambiar x=a.","La pendiente se calcula con f'(a).","Se muestran simultáneamente función y derivadas.","Se buscan numéricamente puntos críticos.","Se calcula una razón de cambio usando la función ingresada."];
  $("gestureTitle").textContent=titles[n];$("gestureAction").textContent=actions[n];
  $("challenge").classList.toggle("hidden",n!==5);
  updateVisualization();
}
// Actualiza los resultados numéricos mostrados según el modo.
function updateMath(){
  if(!compiled)return;
  if(mode===0)$("mathResult").textContent="Esperando una interacción…";
  if(mode===1)$("mathResult").textContent=`x=${fmt(a)} | f(a)=${fmt(f(a))} | f'(a)=${fmt(df(a))}`;
  if(mode===2)$("mathResult").textContent=`Tangente: y=${fmt(df(a))}(x−${fmt(a)})+${fmt(f(a))}`;
  if(mode===3)$("mathResult").textContent=`f(x), f'(x) y f''(x) visibles en la escena 3D.`;
  if(mode===4){
    const cps=findCriticalPoints();
    $("mathResult").textContent=cps.length?`Puntos críticos aproximados: ${cps.map(x=>`x=${fmt(x)}`).join(", ")}`:"No se encontraron críticos en el rango.";
  }
  if(mode===5){
    const x0=2;
    const dx=.5;
    const exact=f(x0+dx)-f(x0),approx=df(x0)*dx;
    $("challengeText").textContent=`Cerca de x=2: ¿cuánto cambia f(x) si x aumenta ${dx}?`;
    $("challengeAnswer").textContent=Number.isFinite(exact)?`Δf exacto ≈ ${fmt(exact)} · Aproximación lineal ≈ ${fmt(approx)}`:"No se puede evaluar en x=2.";
    $("mathResult").textContent=`Razón de cambio en x=2: f'(2)=${fmt(df(2))}`;
  }
}
// Busca aproximadamente ceros de f' usando muestreo y el método de Newton.
function findCriticalPoints(){
  const out=[],step=range/250;
  let px=-range,py=df(px);
  for(let x=-range+step;x<=range;x+=step){
    const y=df(x);
    if(Number.isFinite(py)&&Number.isFinite(y)&&py*y<=0){
      let root=x-step/2;
      for(let k=0;k<12;k++){const d=df(root),dd=d2f(root);if(!Number.isFinite(d)||!Number.isFinite(dd)||Math.abs(dd)<1e-8)break;root-=d/dd}
      if(Math.abs(df(root))<.08&&!out.some(v=>Math.abs(v-root)<.12))out.push(root);
    }
    px=x;py=y;
  }
  return out;
}
// Dibuja los marcadores de los puntos críticos encontrados.
function drawCriticals(){
  while(criticalGroup.children.length){const o=criticalGroup.children.pop();o.geometry.dispose();o.material.dispose()}
  if(mode!==4)return;
  findCriticalPoints().forEach(x=>{const y=f(x);if(Number.isFinite(y)){const s=new THREE.Mesh(new THREE.SphereGeometry(.17,16,16),new THREE.MeshBasicMaterial({color:0xff7a90}));s.position.set(x,y,0);criticalGroup.add(s)}})
}
// Sincroniza punto, curvas visibles, tangente y resultados.
function updateVisualization(){
  if(!compiled)return;
  point.position.set(a,f(a),0);
  point.visible=mode!==4;
  derivativeCurve.visible=mode===3;secondCurve.visible=mode===3;
  updateTangent();drawCriticals();updateMath();
}

// Control alternativo: arrastrar con el mouse cambia el valor a.
// Mouse control
let dragging=false,lastX=0;
canvas.onpointerdown=e=>{dragging=true;lastX=e.clientX};addEventListener("pointerup",()=>dragging=false);
addEventListener("pointermove",e=>{if(!dragging)return;a=THREE.MathUtils.clamp(a+(e.clientX-lastX)*.015,-range*.9,range*.9);lastX=e.clientX;if(mode<3||mode===5)updateVisualization()});

// Teclado alternativo para usar el proyecto sin cámara.
// Keyboard fallback
addEventListener("keydown",e=>{
  if("12345".includes(e.key)){setMode(+e.key);return}
  if(e.key==="ArrowLeft"){a=THREE.MathUtils.clamp(a-.1,-range*.9,range*.9);updateVisualization()}
  if(e.key==="ArrowRight"){a=THREE.MathUtils.clamp(a+.1,-range*.9,range*.9);updateVisualization()}
  if(e.key.toLowerCase()==="r")reset();
});
// Restablece el valor a y vuelve al modo inicial.
function reset(){a=1.5;setMode(0);updateVisualization()}

// Cámara y MediaPipe: detecta la mano y convierte el número de dedos en modos.
// CAMERA + MEDIAPIPE
const video=$("video"),handCanvas=$("handCanvas"),ctx=handCanvas.getContext("2d");
// Estima cuántos dedos están extendidos usando puntos de referencia de MediaPipe.
function countFingers(lm){
  let c=0,w=lm[0];
  if(Math.hypot(lm[4].x-w.x,lm[4].y-w.y)>Math.hypot(lm[3].x-w.x,lm[3].y-w.y)*1.08)c++;
  [[8,6],[12,10],[16,14],[20,18]].forEach(([t,p])=>{if(lm[t].y<lm[p].y-.015)c++});
  return c;
}
const hands=new Hands({locateFile:f=>`https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`});
hands.setOptions({maxNumHands:1,modelComplexity:1,minDetectionConfidence:.65,minTrackingConfidence:.65});
// En cada resultado, dibuja los puntos de la mano, cuenta dedos y cambia el modo.
hands.onResults(res=>{
  if(!cameraRunning)return;
  handCanvas.width=video.videoWidth||640;handCanvas.height=video.videoHeight||480;
  ctx.clearRect(0,0,handCanvas.width,handCanvas.height);
  if(res.multiHandLandmarks?.length){
    const lm=res.multiHandLandmarks[0];
    drawConnectors(ctx,lm,HAND_CONNECTIONS,{color:"#6ee7ff",lineWidth:3});
    drawLandmarks(ctx,lm,{color:"#fff",lineWidth:1,radius:3});
    $("statusText").textContent="Mano detectada · dedos: calculando";
    const fingers=countFingers(lm);
    $("statusText").textContent=`Mano detectada · ${fingers} dedo(s)`;
    if(fingers>=1&&fingers<=5){
      if(fingers===lastGesture)stableCount++;else{lastGesture=fingers;stableCount=0}
      if(stableCount>3 && currentMode!==fingers)setMode(fingers);
      if(fingers===1){a=THREE.MathUtils.clamp((.5-lm[8].x)*range*1.8,-range*.9,range*.9);updateVisualization()}
    }
  } else {
    lastGesture=0;stableCount=0;
    $("statusText").textContent="Cámara activa · coloca la mano frente a la cámara";
  }
});

let cameraStream=null;
let cameraLoop=null;
let processingFrame=false;

// Envía un fotograma a MediaPipe y programa el siguiente.
async function processCameraFrame(){
  if(!cameraRunning)return;
  // Importante: si el video aún no tiene dimensiones, volver a intentar en el siguiente frame.
  // Antes, la función retornaba sin programar otro frame y el reconocimiento se detenía.
  if(!video.videoWidth || processingFrame){
    cameraLoop=requestAnimationFrame(processCameraFrame);
    return;
  }
  processingFrame=true;
  try{ await hands.send({image:video}); }
  catch(e){
    console.error("MediaPipe Hands:",e);
    $("statusText").textContent="Error al reconocer la mano. Recarga la página e inténtalo de nuevo.";
  }
  finally{
    processingFrame=false;
    if(cameraRunning) cameraLoop=requestAnimationFrame(processCameraFrame);
  }
}

$("cameraBtn").onclick=async()=>{
  if(cameraRunning){stopCamera();return}
  try{
    if(!navigator.mediaDevices?.getUserMedia){
      throw new Error("Este navegador no permite acceder a la cámara desde este sitio.");
    }

    // Usamos getUserMedia directamente para que GitHub Pages/Chrome controle el permiso de forma fiable.
    cameraStream=await navigator.mediaDevices.getUserMedia({
      video:{width:{ideal:640},height:{ideal:480},facingMode:"user"},
      audio:false
    });

    video.srcObject=cameraStream;
    await video.play();
    cameraRunning=true;
    $("cameraBtn").textContent="⏹ Desactivar cámara";
    $("cameraStatus").className="dot on";
    $("statusText").textContent="Cámara activa · buscando mano";
    cameraLoop=requestAnimationFrame(processCameraFrame);
  }catch(e){
    console.error("Error de cámara:",e);
    cameraRunning=false;
    const msg=e?.name==="NotAllowedError"
      ? "Permiso de cámara bloqueado. Permite la cámara para este sitio y vuelve a intentarlo."
      : e?.name==="NotFoundError"
      ? "No se encontró ninguna cámara disponible."
      : `No se pudo activar la cámara: ${e?.message||e}`;
    $("statusText").textContent=msg;
    alert(msg);
  }
};

// Detiene la cámara, libera sus pistas y limpia el canvas de la mano.
function stopCamera(){
  cameraRunning=false;
  if(cameraLoop)cancelAnimationFrame(cameraLoop);
  cameraLoop=null;
  if(cameraStream)cameraStream.getTracks().forEach(t=>t.stop());
  cameraStream=null;
  if(video.srcObject)video.srcObject=null;
  $("cameraBtn").textContent="📷 Activar cámara";
  $("cameraStatus").className="dot off";
  $("statusText").textContent="Cámara desactivada";
  ctx.clearRect(0,0,handCanvas.width,handCanvas.height);
}
$("resetBtn").onclick=reset;

// Bucle de animación: mueve partículas y renderiza la escena.
function animate(){requestAnimationFrame(animate);particles.rotation.y+=.0007;renderer.render(scene,cam3d)}
animate();
prepareFunction();
