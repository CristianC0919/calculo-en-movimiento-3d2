/*
 CÁLCULO EN MOVIMIENTO · ENTREGA 3
 Flujo principal: VALIDAR → CALCULAR → VISUALIZAR → INTERACTUAR.
 Math.js: interpreta expresiones y deriva simbólicamente cuando es posible.
 Three.js: crea la gráfica 3D, tangentes, puntos críticos y partículas.
 MediaPipe Hands: detecta la mano y estima la cantidad de dedos.
*/

let expressionText = 'x^3 - 3*x';
let compiled = null;
let parsedNode = null;
let derivativeNode = null;
let secondNode = null;
let derivativeMode = 'symbolic';
let secondMode = 'symbolic';
let functionValid = false;
let range = 5;
let a = 0;
let mode = 0;
let cameraRunning = false;
let cameraStream = null;
let processingFrame = false;
let cameraFrameId = null;
let lastGesture = 0;
let stableCount = 0;

const $ = id => document.getElementById(id);
const fmt = n => Number.isFinite(n) ? (Math.abs(n) < 1e-8 ? '0' : n.toFixed(3)) : 'no definida';
const clamp = (v,min,max) => Math.min(max,Math.max(min,v));

const ALLOWED_FUNCTIONS = new Set([
  'sin','cos','tan','asin','acos','atan','sinh','cosh','tanh','exp','log','ln','sqrt','abs','sign','floor','ceil','round','sec','csc','cot','pow'
]);
const ALLOWED_NAMES = new Set(['x','pi','e','E']);

const CODE_GUIDE = [
  ['Entrada y validación', [
    ['normalizeExpression(raw)', 'Convierte nombres comunes en español, por ejemplo sen(x) → sin(x), para que Math.js pueda interpretarlos.'],
    ['findUnknownFunctions(raw)', 'Busca nombres seguidos de paréntesis y detecta errores como tan8(0). Si tan8 no es una función conocida, la aplicación detiene la gráfica y explica el motivo.'],
    ['findUnknownNames(raw)', 'Revisa variables o nombres que no sean x, constantes válidas o funciones admitidas.'],
    ['prepareFunction()', 'Es la función central: valida la expresión, la compila, obtiene f′ y f′′ cuando puede, muestra mensajes de error y actualiza todo el programa.']
  ]],
  ['Cálculo matemático', [
    ['evaluateExpression(expr,x)', 'Evalúa una expresión en un punto x. Si el punto está fuera del dominio o devuelve un valor no finito, retorna NaN.'],
    ['f(x), df(x), d2f(x)', 'Atajos para evaluar la función, la primera derivada y la segunda derivada.'],
    ['numericDerivative(x)', 'Calcula una aproximación de f′(x) con diferencia central cuando la derivada simbólica no está disponible.'],
    ['numericSecondDerivative(x)', 'Calcula una aproximación de f′′(x) con diferencias finitas.'],
    ['findCriticalPoints()', 'Busca raíces aproximadas de f′(x) dentro del rango; luego intenta refinarlas con Newton.']
  ]],
  ['Límites y dominio', [
    ['evaluateLimitAtPoint(target)', 'Toma puntos cada vez más cercanos a la izquierda y derecha de x = target y compara su comportamiento.'],
    ['classifySide(values)', 'Clasifica cada lado como finito, infinito, no definido u oscilante/no estable.'],
    ['analyzeLimitAtPoint()', 'Lee el punto elegido, analiza el límite y actualiza el resultado visible.'],
    ['findKnownDiscontinuities()', 'Añade candidatos conocidos para tan, sec, cot, csc y algunas restricciones de dominio como ln(x) y √x.'],
    ['scanDiscontinuities()', 'Recorre el rango, detecta saltos o valores no finitos y analiza los candidatos para localizar puntos donde el límite bilateral no existe.']
  ]],
  ['Gráfica 3D', [
    ['lineFrom(fn,color)', 'Muestrea una función y crea segmentos 3D para Three.js; corta el trazo cuando encuentra valores no finitos o saltos grandes.'],
    ['rebuildCurves()', 'Regenera f(x), f′(x) y f′′(x) después de cambiar la función o el rango.'],
    ['updateTangent()', 'Construye y = f′(a)(x−a)+f(a) para mostrar la recta tangente cuando corresponde.'],
    ['updateVisualization()', 'Sincroniza el punto a, curvas, tangente, puntos críticos, resultados y reto con el gesto activo.']
  ]],
  ['Cámara e interacción', [
    ['countFingers(lm)', 'Estima cuántos dedos están extendidos a partir de los puntos de la mano detectados por MediaPipe.'],
    ['processCameraFrame()', 'Envía cada cuadro de la cámara a MediaPipe Hands y mantiene el reconocimiento en tiempo real.'],
    ['setMode(n)', 'Asigna la acción correspondiente a 1, 2, 3, 4 o 5 dedos.'],
    ['reset()', 'Devuelve la aplicación a una función inicial y al estado de partida.'],
    ['animate()', 'Mantiene el renderizado 3D y la animación suave de las partículas.']
  ]]
];

function normalizeExpression(raw){
  return raw
    .replace(/sen\s*\(/gi,'sin(')
    .replace(/seno\s*\(/gi,'sin(')
    .replace(/coseno\s*\(/gi,'cos(')
    .replace(/tg\s*\(/gi,'tan(')
    .trim();
}

function findUnknownFunctions(raw){
  const out=[];
  const re=/([A-Za-z_][A-Za-z0-9_]*)\s*\(/g;
  let m;
  while((m=re.exec(raw))){
    if(!ALLOWED_FUNCTIONS.has(m[1])) out.push(m[1]);
  }
  return [...new Set(out)];
}

function findUnknownNames(raw){
  const scrubbed=raw.replace(/([A-Za-z_][A-Za-z0-9_]*)\s*\(/g,'(');
  const names=scrubbed.match(/[A-Za-z_][A-Za-z0-9_]*/g)||[];
  return [...new Set(names.filter(n=>!ALLOWED_NAMES.has(n)&&!ALLOWED_FUNCTIONS.has(n)))];
}

function showFunctionError(message){
  $('functionError').textContent=message;
  $('functionError').classList.toggle('hidden',!message);
}

function showGraphError(title,detail,example){
  $('graphErrorTitle').textContent=title;
  $('graphErrorDetail').textContent=detail;
  $('graphErrorExample').textContent=example||'';
  $('graphErrorOverlay').classList.remove('hidden');
  [functionCurve,derivativeCurve,secondCurve,tangentLine].forEach(o=>{if(o)o.visible=false;});
  point.visible=false;
  criticalGroup.visible=false;
}

function hideGraphError(){ $('graphErrorOverlay').classList.add('hidden'); }

function prepareFunction(){
  const rawInput=$('functionInput').value.trim();
  const raw=normalizeExpression(rawInput);
  if(!raw){
    functionValid=false;
    showFunctionError('Escribe una función antes de calcular.');
    showGraphError('No hay función','El campo está vacío. El programa necesita una expresión matemática en x.','Ejemplo válido: x^2 - 3*x + 1');
    return false;
  }

  const unknownFns=findUnknownFunctions(raw);
  if(unknownFns.length){
    functionValid=false;
    const names=unknownFns.join(', ');
    const extra=names.includes('tan8') ? ' “tan8” no existe como función matemática en este programa. “tan(0)” sí es una función válida.' : ` “${names}” no pertenece a las funciones soportadas.`;
    showFunctionError(`No se puede graficar: función no reconocida: ${names}.${extra}`);
    showGraphError('No se puede graficar',`La expresión contiene una función que el programa no puede interpretar: ${names}.${extra}`,'Usa, por ejemplo: tan(x), sin(x), cos(x), exp(x), ln(x), sqrt(x) o un polinomio.');
    return false;
  }

  const unknownNames=findUnknownNames(raw);
  if(unknownNames.length){
    functionValid=false;
    showFunctionError(`No se puede graficar: nombre o variable no reconocida: ${unknownNames.join(', ')}. Usa x y funciones matemáticas compatibles.`);
    showGraphError('Expresión no reconocida',`La variable o nombre “${unknownNames[0]}” no tiene significado dentro de f(x).`,'Ejemplo: x^3 - 3*x');
    return false;
  }

  try{
    const node=math.parse(raw);
    const compiledNext=node.compile();
    let dNode=null,d2Node=null;
    derivativeMode='symbolic'; secondMode='symbolic';
    try{ dNode=math.derivative(node,'x'); }catch(e){ derivativeMode='numeric'; }
    try{ if(dNode) d2Node=math.derivative(dNode,'x'); else throw new Error('sin derivada simbólica'); }catch(e){ secondMode='numeric'; }

    parsedNode=node; compiled=compiledNext; derivativeNode=dNode; secondNode=d2Node;
    expressionText=raw; functionValid=true;
    showFunctionError(''); hideGraphError();
    $('functionText').textContent=`f(x) = ${raw}`;
    $('resultFunction').textContent=`f(x) = ${raw}`;
    $('derivativesText').textContent=`f'(x) = ${derivativeDisplay()} · f''(x) = ${secondDerivativeDisplay()}`;
    a=clamp(a,-range*.9,range*.9);
    setMode(0);
    rebuildCurves();
    updateVisualization();
    scanDiscontinuities();
    analyzeLimitAtPoint();
    return true;
  }catch(e){
    functionValid=false;
    const reason=e?.message||String(e);
    showFunctionError(`No se puede graficar. Error de sintaxis o expresión: ${reason}`);
    showGraphError('No se puede graficar',`Math.js no pudo interpretar la expresión. Error: ${reason}`,'Ejemplo válido: x^2 + 3*x - 1');
    return false;
  }
}

function evaluateExpression(expr,x){
  if(!expr)return NaN;
  try{
    const value=expr.evaluate({x});
    return typeof value==='number'&&Number.isFinite(value)?value:NaN;
  }catch{return NaN;}
}
function f(x){ return evaluateExpression(compiled,x); }
function numericDerivative(x){
  const h=Math.max(1e-5,Math.min(1e-3,1e-3*Math.max(1,Math.abs(x))));
  const y1=f(x+h),y0=f(x-h);
  return Number.isFinite(y1)&&Number.isFinite(y0)?(y1-y0)/(2*h):NaN;
}
function numericSecondDerivative(x){
  const h=Math.max(2e-4,Math.min(1e-2,2e-3*Math.max(1,Math.abs(x))));
  const yp=f(x+h),y=f(x),ym=f(x-h);
  return Number.isFinite(yp)&&Number.isFinite(y)&&Number.isFinite(ym)?(yp-2*y+ym)/(h*h):NaN;
}
function df(x){ return derivativeMode==='symbolic' ? evaluateExpression(derivativeNode,x) : numericDerivative(x); }
function d2f(x){ return secondMode==='symbolic' ? evaluateExpression(secondNode,x) : numericSecondDerivative(x); }
function derivativeDisplay(){ return derivativeMode==='symbolic' ? derivativeNode.toString() : 'aproximación numérica'; }
function secondDerivativeDisplay(){ return secondMode==='symbolic' ? secondNode.toString() : 'aproximación numérica'; }

// THREE.JS
const canvas=$('scene');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
const scene=new THREE.Scene(); scene.background=new THREE.Color(0x010102);
const cam3d=new THREE.PerspectiveCamera(55,1,.1,100); cam3d.position.set(8,6,10); cam3d.lookAt(0,1,0);
scene.add(new THREE.AmbientLight(0xffffff,1.35));
scene.add(new THREE.GridHelper(14,28,0x3a3a3e,0x151518));
scene.add(new THREE.AxesHelper(5));
const group=new THREE.Group(); scene.add(group);
let functionCurve,derivativeCurve,secondCurve,tangentLine;
const point=new THREE.Mesh(new THREE.SphereGeometry(.14,20,20),new THREE.MeshBasicMaterial({color:0xff4a52}));scene.add(point);
const criticalGroup=new THREE.Group();scene.add(criticalGroup);

function disposeObject(obj){ if(!obj)return; group.remove(obj); obj.geometry?.dispose(); obj.material?.dispose(); }
function replaceLine(old,next){ disposeObject(old); group.add(next); return next; }
function lineFrom(fn,color){
  const step=range/420, segments=[]; let current=[]; let prevGood=false; let prevY=null;
  for(let x=-range;x<=range+step/2;x+=step){
    const y=fn(x);
    const good=Number.isFinite(y)&&Math.abs(y)<Math.max(7,range*3.2);
    const jump=prevGood&&good&&Number.isFinite(prevY)&&Math.abs(y-prevY)>Math.max(8,range*10);
    if(good&&!jump) current.push(new THREE.Vector3(x,y,0));
    else { if(current.length>=2)segments.push(...current); current=[]; }
    prevGood=good; prevY=y;
  }
  if(current.length>=2)segments.push(...current);
  return new THREE.Line(new THREE.BufferGeometry().setFromPoints(segments),new THREE.LineBasicMaterial({color}));
}
function rebuildCurves(){
  if(!functionValid)return;
  functionCurve=replaceLine(functionCurve,lineFrom(f,0xffffff));
  derivativeCurve=replaceLine(derivativeCurve,lineFrom(df,0xff4a52));
  secondCurve=replaceLine(secondCurve,lineFrom(d2f,0xa0a0a5));
  derivativeCurve.visible=false; secondCurve.visible=false;
  updateTangent();
}
function updateTangent(){
  if(!functionValid)return;
  const slope=df(a), y0=f(a);
  if(!Number.isFinite(slope)||!Number.isFinite(y0)){ if(tangentLine)tangentLine.visible=false; return; }
  tangentLine=replaceLine(tangentLine,lineFrom(x=>slope*(x-a)+y0,0xff222b));
  tangentLine.visible=mode===2;
}

// Partículas decorativas del espacio 3D.
const pCount=900, pGeo=new THREE.BufferGeometry(), pPos=new Float32Array(pCount*3);
for(let i=0;i<pCount;i++){
  const r=5+Math.random()*6, t=Math.random()*Math.PI*2;
  pPos[i*3]=Math.cos(t)*r; pPos[i*3+1]=(Math.random()-.5)*5; pPos[i*3+2]=Math.sin(t)*r;
}
pGeo.setAttribute('position',new THREE.BufferAttribute(pPos,3));
scene.add(new THREE.Points(pGeo,new THREE.PointsMaterial({color:0xffffff,size:.03,transparent:true,opacity:.65})));

function resize(){ const w=Math.max(1,canvas.clientWidth),h=Math.max(1,canvas.clientHeight); renderer.setSize(w,h,false); cam3d.aspect=w/h; cam3d.updateProjectionMatrix(); }
window.addEventListener('resize',resize); resize();

function setMode(n){
  mode=n;
  const titles=['Sin interacción','1 dedo · Evaluación','2 dedos · Recta tangente','3 dedos · Derivadas','4 dedos · Puntos críticos','5 dedos · Reto de razón de cambio'];
  const actions=['Activa la cámara o usa el teclado.','Mueve el dedo índice horizontalmente para cambiar x = a.','La pendiente es f\'(a) y se dibuja la recta tangente.','Se muestran simultáneamente f(x), f\'(x) y f\'\'(x).','Se marcan candidatos a máximos, mínimos y puntos críticos.','Se calcula una variación exacta y una aproximación lineal.'];
  $('gestureTitle').textContent=titles[n]; $('gestureAction').textContent=actions[n];
  $('challenge').classList.toggle('hidden',n!==5); updateVisualization();
}

function updateMathPanel(){
  if(!functionValid)return;
  $('resultFunction').textContent=`f(x) = ${expressionText}`;
  $('resultDerivative').textContent=`f'(x) = ${derivativeDisplay()}`;
  $('resultSecond').textContent=`f''(x) = ${secondDerivativeDisplay()}`;
  $('resultPoint').textContent=fmt(a); $('resultF').textContent=fmt(f(a)); $('resultDf').textContent=fmt(df(a));
  if(mode===0) $('mathResult').textContent='Función lista. Selecciona un gesto del 1 al 5.';
  if(mode===1) $('mathResult').textContent=`x=${fmt(a)} · f(a)=${fmt(f(a))} · f'(a)=${fmt(df(a))}`;
  if(mode===2) $('mathResult').textContent=Number.isFinite(df(a))&&Number.isFinite(f(a))?`y = ${fmt(df(a))}(x − ${fmt(a)}) + ${fmt(f(a))}`:'Tangente no definida en este punto.';
  if(mode===3) $('mathResult').textContent='Curvas visibles: f(x) · f\'(x) · f\'\'(x)';
  if(mode===4){ const cps=findCriticalPoints(); $('mathResult').textContent=cps.length?`Críticos aproximados: ${cps.map(x=>`x=${fmt(x)}`).join(' · ')}`:'No se encontraron críticos en este rango.'; }
  if(mode===5){
    const x0=2,dx=.5,y0=f(x0),y1=f(x0+dx),s=df(x0);
    const exact=Number.isFinite(y0)&&Number.isFinite(y1)?y1-y0:NaN, approx=Number.isFinite(s)?s*dx:NaN;
    $('challengeText').textContent=`Variación: x pasa de ${x0} a ${x0+dx}.`;
    $('challengeAnswer').textContent=Number.isFinite(exact)?`Δf = ${fmt(exact)} · aproximación lineal = ${fmt(approx)}`:'No se puede evaluar ese intervalo dentro del dominio.';
    $('mathResult').textContent=Number.isFinite(s)?`Razón de cambio en x=2: f'(2)=${fmt(s)}`:'f\'(2) no está definida.';
  }
  const names=['SIN INTERACCIÓN','1 DEDO · EVALUACIÓN','2 DEDOS · TANGENTE','3 DEDOS · DERIVADAS','4 DEDOS · CRÍTICOS','5 DEDOS · RAZÓN DE CAMBIO'];
  const desc=['Activa la cámara o usa 1—5.','Mueve x y evalúa la función.','Se construye la recta tangente.','Se comparan las tres curvas.','Se localizan candidatos críticos.','Se interpreta una variación de la función.'];
  $('modeTitle').textContent=names[mode]; $('modeDescription').textContent=desc[mode];
}

function findCriticalPoints(){
  if(!functionValid)return [];
  const roots=[],step=range/480; let x0=-range,y0=df(x0);
  for(let x=-range+step;x<=range+1e-9;x+=step){
    const y=df(x);
    if(Number.isFinite(y0)&&Number.isFinite(y)&&y0*y<=0){
      let r=x-step/2;
      for(let i=0;i<12;i++){
        const d=df(r),dd=d2f(r); if(!Number.isFinite(d))break;
        if(Math.abs(d)<1e-5)break;
        if(!Number.isFinite(dd)||Math.abs(dd)<1e-8){ r-=Math.sign(d)*.01; } else r-=d/dd;
        r=clamp(r,-range,range);
      }
      if(Number.isFinite(r)&&Math.abs(df(r))<.12&&!roots.some(v=>Math.abs(v-r)<.12))roots.push(r);
    }
    x0=x;y0=y;
  }
  return roots.sort((u,v)=>u-v);
}
function drawCriticals(){
  while(criticalGroup.children.length){const o=criticalGroup.children.pop();o.geometry.dispose();o.material.dispose();}
  criticalGroup.visible=mode===4&&functionValid;
  if(!criticalGroup.visible)return;
  findCriticalPoints().forEach(x=>{const y=f(x);if(Number.isFinite(y)){const m=new THREE.Mesh(new THREE.SphereGeometry(.17,18,18),new THREE.MeshBasicMaterial({color:0xff222b}));m.position.set(x,y,0);criticalGroup.add(m);}});
}
function updateVisualization(){
  if(!functionValid)return;
  const y=f(a); point.position.set(a,Number.isFinite(y)?y:0,0); point.visible=mode!==4&&Number.isFinite(y);
  if(derivativeCurve)derivativeCurve.visible=mode===3; if(secondCurve)secondCurve.visible=mode===3;
  updateTangent(); drawCriticals(); updateMathPanel();
}

// ==============================\n// LÍMITES Y PUNTOS DE DISCONTINUIDAD
// ==============================
function sideText(s){ if(s.type==='finite')return fmt(s.value); if(s.type==='infinite')return s.value>0?'+∞':'−∞'; if(s.type==='undefined')return 'no definida'; return 'no estable'; }
function classifySide(values){
  const finite=values.filter(Number.isFinite);
  if(finite.length<3)return {type:'undefined',value:NaN};
  const tail=finite.slice(-4), mean=tail.reduce((a,b)=>a+b,0)/tail.length;
  const span=Math.max(...tail)-Math.min(...tail);
  if(span<=.1*Math.max(1,Math.abs(mean)))return {type:'finite',value:mean};
  const last=tail[tail.length-1];
  if(Math.abs(last)>500&&tail.every(v=>Math.sign(v)===Math.sign(last)&&Math.abs(v)>150))return {type:'infinite',value:last>0?Infinity:-Infinity};
  return {type:'oscillating',value:NaN};
}
function sampleLimit(target,direction){
  const eps=[.2,.1,.05,.02,.01,.005,.002,.001,.0005,.0002,.0001,.00001].map(e=>Math.max(e,1e-7*Math.max(1,Math.abs(target))));
  return classifySide(eps.map(e=>f(target+direction*e)));
}
function evaluateLimitAtPoint(target){
  const left=sampleLimit(target,-1),right=sampleLimit(target,1),at=f(target);
  if(left.type==='finite'&&right.type==='finite'&&Math.abs(left.value-right.value)<=.12*Math.max(1,Math.abs(left.value),Math.abs(right.value))){
    return {type:'ok',value:(left.value+right.value)/2,left,right,at,message:'Las aproximaciones por ambos lados coinciden.'};
  }
  if(left.type==='infinite'&&right.type==='infinite'&&Math.sign(left.value)===Math.sign(right.value)){
    return {type:'inf',value:left.value,left,right,at,message:'Ambos lados crecen sin cota con el mismo signo.'};
  }
  if(left.type==='undefined'&&right.type==='finite')return {type:'domain',value:NaN,left,right,at,message:'Por la izquierda la función no está definida en el entorno; el límite bilateral no existe como límite real.'};
  if(left.type==='finite'&&right.type==='undefined')return {type:'domain',value:NaN,left,right,at,message:'Por la derecha la función no está definida en el entorno; el límite bilateral no existe como límite real.'};
  return {type:'dne',value:NaN,left,right,at,message:`Los dos lados no coinciden: izquierda ${sideText(left)} · derecha ${sideText(right)}.`};
}
function renderLimitResult(result,target){
  const box=$('limitResult'); box.innerHTML='';
  const pill=document.createElement('span'); pill.className=`status ${result.type}`;
  pill.textContent=result.type==='ok'?'LÍMITE EXISTE':result.type==='inf'?'LÍMITE INFINITO':result.type==='domain'?'RESTRICCIÓN DE DOMINIO':'LÍMITE NO EXISTE';
  const strong=document.createElement('strong');
  strong.textContent=result.type==='ok'?`lim x→${fmt(target)} f(x) ≈ ${fmt(result.value)}`:result.type==='inf'?`lim x→${fmt(target)} f(x) = ${result.value>0?'+∞':'−∞'}`:`lim x→${fmt(target)} f(x) no existe.`;
  const detail=document.createElement('div'); detail.className='small'; detail.textContent=`Izquierda: ${sideText(result.left)} · Derecha: ${sideText(result.right)} · f(${fmt(target)}): ${fmt(result.at)}. ${result.message}`;
  box.append(pill,strong,detail);
}
function analyzeLimitAtPoint(){
  if(!functionValid)return;
  const target=Number($('limitPoint').value);
  if(!Number.isFinite(target)){
    $('limitResult').innerHTML='<span class="status dne">PUNTO INVÁLIDO</span><strong>Escribe un número en x → a.</strong>';
    return;
  }
  renderLimitResult(evaluateLimitAtPoint(target),target);
}
function findKnownDiscontinuities(){
  if(!functionValid)return [];
  const set=new Set(); const raw=expressionText.replace(/\s+/g,'');
  const add=v=>{if(v>=-range-.02&&v<=range+.02)set.add(Number(v.toFixed(6)));};
  if(/tan\(/i.test(raw)||/sec\(/i.test(raw)){ for(let k=-20;k<=20;k++)add(Math.PI/2+k*Math.PI); }
  if(/cot\(/i.test(raw)||/csc\(/i.test(raw)){ for(let k=-20;k<=20;k++)add(k*Math.PI); }
  if(/^ln\(x\)$/i.test(raw)||/^log\(x\)$/i.test(raw)||/^sqrt\(x\)$/i.test(raw))add(0);
  if(/1\/?\(?x\)?/.test(raw))add(0);
  return [...set];
}
function scanDiscontinuities(){
  const list=$('discontinuityList'); list.innerHTML='';
  if(!functionValid){list.innerHTML='<span class="muted">Corrige la función para buscar puntos.</span>';return;}
  const candidates=[...findKnownDiscontinuities()];
  const step=range/900; let prev=f(-range);
  for(let x=-range+step;x<=range;x+=step){
    const y=f(x);
    if(!Number.isFinite(prev)&&Number.isFinite(y))candidates.push(x-step/2);
    if(Number.isFinite(prev)&&!Number.isFinite(y))candidates.push(x-step/2);
    if(Number.isFinite(prev)&&Number.isFinite(y)&&Math.abs(y-prev)>Math.max(10,range*14))candidates.push(x-step/2);
    prev=y;
  }
  const unique=[]; candidates.sort((u,v)=>u-v).forEach(c=>{if(!unique.some(v=>Math.abs(v-c)<Math.max(.06,step*2)))unique.push(c);});
  const analyzed=unique.map(x=>({x,result:evaluateLimitAtPoint(x)})).filter(o=>o.result.type!=='ok');
  if(!analyzed.length){list.innerHTML='<span class="muted">No se detectaron puntos donde el límite bilateral deje de existir en este rango.</span>';return;}
  analyzed.slice(0,12).forEach(item=>{
    const el=document.createElement('div'); el.className='discontinuity-item';
    el.innerHTML=`<b>x ≈ ${fmt(item.x)}</b><span>${item.result.message}</span>`;
    el.onclick=()=>{$('limitPoint').value=item.x.toFixed(4);renderLimitResult(item.result,item.x);};
    list.appendChild(el);
  });
}

// ==============================\n// CONTROLES DE MOUSE / TECLADO
// ==============================
let dragging=false,lastX=0;
canvas.addEventListener('pointerdown',e=>{dragging=true;lastX=e.clientX;canvas.setPointerCapture?.(e.pointerId);});
window.addEventListener('pointerup',()=>dragging=false);
window.addEventListener('pointermove',e=>{if(!dragging||!functionValid)return;a=clamp(a+(e.clientX-lastX)*.012,-range*.9,range*.9);lastX=e.clientX;updateVisualization();});
window.addEventListener('keydown',e=>{
  if(['1','2','3','4','5'].includes(e.key)){setMode(Number(e.key));return;}
  if(e.key==='ArrowLeft'){a=clamp(a-.1,-range*.9,range*.9);updateVisualization();}
  if(e.key==='ArrowRight'){a=clamp(a+.1,-range*.9,range*.9);updateVisualization();}
  if(e.key.toLowerCase()==='r')reset();
});
function reset(){ $('functionInput').value='x^3 - 3*x'; $('limitPoint').value='0'; range=5; $('rangeInput').value='5'; $('rangeValue').textContent='−5 a 5'; a=0; setMode(0); prepareFunction(); }

// ==============================\n// CÁMARA + MEDIAPIPE HANDS
// ==============================
const video=$('video'), handCanvas=$('handCanvas'), ctx=handCanvas.getContext('2d');
function countFingers(lm){
  const wrist=lm[0]; let count=0;
  if(Math.hypot(lm[4].x-wrist.x,lm[4].y-wrist.y)>Math.hypot(lm[3].x-wrist.x,lm[3].y-wrist.y)*1.08)count++;
  [[8,6],[12,10],[16,14],[20,18]].forEach(([tip,pip])=>{if(lm[tip].y<lm[pip].y-.015)count++;});
  return count;
}
const hands=new Hands({locateFile:file=>`https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`});
hands.setOptions({maxNumHands:1,modelComplexity:1,minDetectionConfidence:.65,minTrackingConfidence:.65});
hands.onResults(res=>{
  if(!cameraRunning)return;
  const w=video.videoWidth||640,h=video.videoHeight||480; handCanvas.width=w;handCanvas.height=h;ctx.clearRect(0,0,w,h);
  if(res.multiHandLandmarks?.length){
    const lm=res.multiHandLandmarks[0];
    drawConnectors(ctx,lm,HAND_CONNECTIONS,{color:'#ff4a52',lineWidth:2});
    drawLandmarks(ctx,lm,{color:'#ffffff',lineWidth:1,radius:2});
    const fingers=countFingers(lm); $('fingerState').textContent=`${fingers} dedo${fingers===1?'':'s'} detectado${fingers===1?'':'s'}`; $('pointsState').textContent=`${lm.length} puntos`;
    $('handBadge').textContent=fingers?`${fingers} DEDOS`:'SIN DEDOS';
    if(fingers>=1&&fingers<=5){
      if(fingers===lastGesture)stableCount++;else{lastGesture=fingers;stableCount=0;}
      if(stableCount>=4)setMode(fingers);
      if(fingers===1&&functionValid){a=clamp((.5-lm[8].x)*range*1.8,-range*.9,range*.9);updateVisualization();}
    }
  }else{ $('fingerState').textContent='Sin mano';$('pointsState').textContent='0 puntos';$('handBadge').textContent='SIN MANO'; }
});
async function processCameraFrame(){
  if(!cameraRunning||!video.videoWidth||processingFrame)return;
  processingFrame=true;
  try{await hands.send({image:video});}catch(err){console.error('MediaPipe:',err);}finally{processingFrame=false;if(cameraRunning)cameraFrameId=requestAnimationFrame(processCameraFrame);}
}
async function startCamera(){
  if(cameraRunning){stopCamera();return;}
  try{
    if(!window.isSecureContext)throw new Error('La cámara necesita HTTPS. Abre el enlace publicado en GitHub Pages.');
    if(!navigator.mediaDevices?.getUserMedia)throw new Error('Este navegador no permite acceder a la cámara desde este sitio.');
    cameraStream=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:640},height:{ideal:480},facingMode:'user'},audio:false});
    video.srcObject=cameraStream; await video.play(); cameraRunning=true;
    $('cameraBtn').textContent='■ DESACTIVAR CÁMARA';$('cameraDot').className='dot on';$('cameraState').textContent='CÁMARA ACTIVA';$('cameraEmpty').classList.add('hidden');
    requestAnimationFrame(processCameraFrame);
  }catch(e){
    console.error(e);
    const msg=e.name==='NotAllowedError'?'Permiso de cámara bloqueado. Permite la cámara para este sitio y recarga la página.':e.name==='NotFoundError'?'No se encontró una cámara disponible.':e.message||String(e);
    $('cameraState').textContent=msg; showFunctionError(msg);
  }
}
function stopCamera(){
  cameraRunning=false;if(cameraFrameId)cancelAnimationFrame(cameraFrameId);cameraFrameId=null;processingFrame=false;
  cameraStream?.getTracks().forEach(t=>t.stop());cameraStream=null;video.srcObject=null;$('cameraBtn').textContent='▶ ACTIVAR CÁMARA';$('cameraDot').className='dot';$('cameraState').textContent='CÁMARA INACTIVA';$('cameraEmpty').classList.remove('hidden');$('handBadge').textContent='SIN MANO';$('fingerState').textContent='Sin mano';$('pointsState').textContent='0 puntos';ctx.clearRect(0,0,handCanvas.width,handCanvas.height);
}

// ==============================\n// UI
// ==============================
$('calculateBtn').onclick=prepareFunction;
$('functionInput').addEventListener('keydown',e=>{if(e.key==='Enter')prepareFunction();});
document.querySelectorAll('[data-fn]').forEach(b=>b.addEventListener('click',()=>{$('functionInput').value=b.dataset.fn;prepareFunction();}));
$('resetBtn').onclick=reset;
$('cameraBtn').onclick=startCamera;
$('rangeInput').oninput=e=>{range=Number(e.target.value);$('rangeValue').textContent=`−${range} a ${range}`;if(functionValid){rebuildCurves();updateVisualization();scanDiscontinuities();}};
$('limitBtn').onclick=analyzeLimitAtPoint;$('scanBtn').onclick=scanDiscontinuities;$('limitPoint').addEventListener('keydown',e=>{if(e.key==='Enter')analyzeLimitAtPoint();});

function buildCodeExplanation(){
  const box=$('codeExplanation');
  CODE_GUIDE.forEach(([title,items])=>{
    const details=document.createElement('details');details.className='code-group';details.open=title==='Entrada y validación';
    const summary=document.createElement('summary');summary.textContent=title;details.appendChild(summary);
    items.forEach(([name,desc])=>{const row=document.createElement('div');row.className='code-item';row.innerHTML=`<b>${name}</b><span>${desc}</span>`;details.appendChild(row);});
    box.appendChild(details);
  });
}

function animate(){requestAnimationFrame(animate);scene.rotation.y+=0.00012;renderer.render(scene,cam3d);}
buildCodeExplanation();animate();prepareFunction();
