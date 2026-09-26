/*! odontograma-dibujo.js — dibujo aprobado (referencia/odontograma.html, E5-A.1)
 * API: Odontograma.crear(svg, {denticion:'adulto'|'leche'|'mixta'})
 */
(function (global) {
'use strict';

const SUP_P=[18,17,16,15,14,13,12,11,21,22,23,24,25,26,27,28];
const INF_P=[48,47,46,45,44,43,42,41,31,32,33,34,35,36,37,38];
const SUP_T=[55,54,53,52,51,61,62,63,64,65];
const INF_T=[85,84,83,82,81,71,72,73,74,75];

const AN=48, W=860;
function esSup(n){const q=(n/10)|0;return q===1||q===2||q===5||q===6;}
function esDer(n){const q=(n/10)|0;return q===1||q===4||q===5||q===8;}
function esTemp(n){return ((n/10)|0)>=5;}
function esAnt(n){return (n%10)<=3;}
function esMolar(n){const p=n%10;return esTemp(n)?p>=4:p>=6;}
function fdi(n){
  const v=String(n==null?'':n);
  return /^[1-8][1-8]$/.test(v) ? v.charAt(0)+'.'+v.charAt(1) : v;
}
function nombrePieza(n){
  const q=(n/10)|0,p=n%10;
  const A=['','Incisivo central','Incisivo lateral','Canino','Primera premolar','Segunda premolar',
           'Primera molar','Segunda molar','Tercera molar'];
  const T=['','Incisivo central','Incisivo lateral','Canino','Primera molar','Segunda molar'];
  return (q<=4?A[p]:T[p])||'Pieza';
}
const NS='http://www.w3.org/2000/svg';
function el(t,a){const e=document.createElementNS(NS,t);if(a)for(const k in a)e.setAttribute(k,a[k]);return e;}
function txt(s,a){const e=el('text',a);e.textContent=s;return e;}

/* ================= arcadas ================= */
const VB={w:1440,h:880};
/* arcada con fondo y bien envolvente por detrás: se lee como una boca y las dos
   quedan cerca, sin dejar un hueco muerto en medio */
/* Cada dentición tiene su geometría. En la mixta las dos arcadas se separan más,
   porque la fila temporal se mete por dentro y necesita sitio para sus raíces. */
/* Arco más ancho y arcadas más separadas que en la versión anterior: es el «darle un
   poco más de espacio a los dientes» que pidió Innoteam. Rx pasa de 476 a 528 —el mismo
   número de piezas repartidas sobre un arco más largo— y las dos arcadas se abren de
   222/330 a 214/344 para que las raíces tengan sitio propio. */
/* ══ la forma de la arcada ══
   Antes era una elipse muy achatada (620 × 132). El problema no era el espaciado sino
   la CURVATURA: en una elipse plana toda la curva se concentra en los extremos, así que
   las molares giraban de golpe unas sobre otras —hasta 16° de una pieza a la siguiente—
   mientras el frente iba casi recto. Es justo al revés de una boca.
   Ahora es una parábola: la curva está en el frente, donde están los incisivos, y el
   sector posterior corre casi derecho hacia atrás. El giro entre diente y diente pasa
   de variar 14° a variar 3°, y el hueco entre coronas es el mismo en toda la arcada
   (ver el reparto en puestos()). */
const GEO={sup:{cx:720,cy:372,Rx:600,Ry:250}, inf:{cx:720,cy:508,Rx:600,Ry:250}};
const YMED=440;                       /* plano oclusal: la horizontal de la cruz */
function geoDe(sup){return GEO[sup?'sup':'inf'];}

function carasLocal(n){
  const der=esDer(n);
  const V={id:'V',nom:'Vestibular'};
  const L=esSup(n)?{id:'P',nom:'Palatina'}:{id:'L',nom:'Lingual'};
  const M={id:'M',nom:'Mesial'}, D={id:'D',nom:'Distal'};
  const C=esAnt(n)?{id:'I',nom:'Incisal'}:{id:'O',nom:'Oclusal'};
  return {arriba:V, abajo:L, izq:der?M:D, der:der?D:M, centro:C};
}
/* Reparto por longitud de arco sobre la parábola. El sitio de cada pieza no es una
   rebanada igual para todas: es su propio ancho mesiodistal más un hueco, y ese hueco
   es el mismo para todas. Antes, con rebanadas iguales, la molar (66 px de ancho) y el
   incisivo lateral (49) recibían el mismo sitio, así que el hueco entre coronas iba de
   21 px atrás a 36 px delante —eso era lo que se veía descuadrado—. Ahora es 29,5 px
   en las 16 piezas, de la línea media a la tercera molar. */
function puestos(pz,sup,esc,anchos){
  const g=geoDe(sup), n=pz.length, sg=sup?-1:1;
  const Rx=g.Rx*esc, Ry=g.Ry*esc;
  const P=u=>[g.cx+Rx*u, g.cy+sg*Ry*(1-u*u)];
  const M=800, us=[], ls=[0];
  for(let i=0;i<=M;i++) us.push(-1+2*i/M);
  for(let i=1;i<=M;i++){const a=P(us[i-1]),b=P(us[i]);
    ls.push(ls[i-1]+Math.hypot(b[0]-a[0],b[1]-a[1]));}
  const total=ls[M], out=[];
  /* el hueco sobrante se reparte a partes iguales: medio hueco antes de la primera
     pieza, uno entero entre cada par, medio después de la última */
  const A=(anchos&&anchos.length===n)?anchos:pz.map(()=>1);
  const suma=A.reduce((a,b)=>a+b,0), hueco=(total-suma)/n;
  const metas=[]; let acc=hueco/2;
  for(let k=0;k<n;k++){metas.push(acc+A[k]/2); acc+=A[k]+hueco;}
  for(let k=0;k<n;k++){
    const meta=metas[k]; let i=1; while(i<M&&ls[i]<meta)i++;
    const u=us[i], p=P(u);
    /* normal hacia fuera del arco: hacia arriba en la arcada de arriba, hacia abajo en
       la de abajo, y hacia los lados conforme se va hacia las molares */
    const nx=2*Ry*u, ny=sg*Rx, L=Math.hypot(nx,ny)||1;
    out.push({x:p[0],y:p[1],rot:Math.atan2(ny,nx)*180/Math.PI+90,ux:nx/L,uy:ny/L,u:u});
  }
  return out;
}
function forma(n){
  const p=n%10, sup=esSup(n);
  /* Los temporales anteriores estaban en 34x24 px: demasiado chicos para marcar una
     cara con el dedo o con el ratón. Se suben acercándolos a la proporción real frente
     al molar temporal (un incisivo central de leche mide ~6,5 mm mesiodistal contra los
     ~7,3 del segundo molar), y la fila entera crece en capas(). */
  if(esTemp(n)){
    if(p===1) return {w:.80,h:.60,e:2.7,punta:0};
    if(p===2) return {w:.68,h:.58,e:2.7,punta:0};
    if(p===3) return {w:.72,h:.74,e:2.2,punta:.16};
    return {w:.90,h:.94,e:3.0,punta:0};
  }
  if(p===1) return sup?{w:.88,h:.60,e:2.8,punta:0}:{w:.58,h:.52,e:2.7,punta:0};
  if(p===2) return sup?{w:.74,h:.58,e:2.8,punta:0}:{w:.64,h:.54,e:2.7,punta:0};
  if(p===3) return {w:.70,h:.78,e:2.2,punta:.16};
  if(p===4) return {w:.72,h:.92,e:2.6,punta:0};
  if(p===5) return {w:.74,h:.91,e:2.7,punta:0};
  if(p===6) return {w:.96,h:.98,e:3.2,punta:0};
  if(p===7) return {w:.92,h:.95,e:3.2,punta:0};
  return {w:.82,h:.89,e:3.0,punta:0};
}
const NPT=64;
function contorno(fo,w,h){
  const a=w/2,b=h/2,pts=[];
  for(let i=0;i<NPT;i++){
    const t=i/NPT*Math.PI*2,c=Math.cos(t),s=Math.sin(t);
    let x=a*Math.sign(c)*Math.pow(Math.abs(c),2/fo.e);
    let y=b*Math.sign(s)*Math.pow(Math.abs(s),2/fo.e);
    if(fo.punta){const k=1+fo.punta*Math.max(0,-s);x*=k;y*=k;}
    pts.push([x,y]);
  }
  return pts;
}
function facetas(fo,w,h){
  const out=contorno(fo,w,h),K=0.40;
  const inn=out.map(p=>[p[0]*K,p[1]*K]);
  const idx=g=>Math.round((g/360)*NPT);
  const sec=(g0,g1)=>{const o=[],v=[];
    for(let i=idx(g0);i<=idx(g1);i++){const j=((i%NPT)+NPT)%NPT;o.push(out[j]);v.push(inn[j]);}
    return o.concat(v.reverse());};
  return {der:sec(-45,45),abajo:sec(45,135),izq:sec(135,225),arriba:sec(225,315),
          centro:inn.map(p=>[p[0]*1.05,p[1]*1.05])};
}
function encoge(pts,k){
  let cx=0,cy=0;pts.forEach(p=>{cx+=p[0];cy+=p[1];});cx/=pts.length;cy/=pts.length;
  return pts.map(p=>{const dx=cx-p[0],dy=cy-p[1],d=Math.hypot(dx,dy)||1;
    return [p[0]+dx/d*k,p[1]+dy/d*k];});
}
function centro(pts){let x=0,y=0;pts.forEach(p=>{x+=p[0];y+=p[1];});return [x/pts.length,y/pts.length];}
let CAJAS={};
function defs(destino){
  const d=el('defs');
  const rg=(id,cx,cy,r,paradas)=>{
    const g=el('radialGradient',{id:id,gradientUnits:'userSpaceOnUse',cx:cx,cy:cy,r:r});
    paradas.forEach(([o,c,op])=>{const st=el('stop',{offset:o,'stop-color':c});
      if(op!==undefined)st.setAttribute('stop-opacity',op);g.appendChild(st);});
    d.appendChild(g);
  };
  /* esmalte: la luz entra por arriba a la izquierda, con caída suave */
  rg('esmalte',  -13,-15,  74, [[0,'var(--esm-luz)'],[.26,'var(--esm-tibio)'],
                                [.62,'var(--esm-med)'],[1,'var(--esm-hondo)']]);
  rg('esmalteG', -46,-52, 270, [[0,'var(--esm-luz)'],[.26,'var(--esm-tibio)'],
                                [.62,'var(--esm-med)'],[1,'var(--esm-hondo)']]);
  /* la mesa oclusal es un rehundido: algo más apagada que las cúspides */
  rg('esmalteO', -6, -7,   34, [[0,'var(--esm-tibio)'],[.62,'var(--esm-med)'],[1,'var(--esm-hondo)']]);
  rg('esmalteOG',-22,-26, 120, [[0,'var(--esm-tibio)'],[.62,'var(--esm-med)'],[1,'var(--esm-hondo)']]);
  /* oclusión sólo en el filo del contorno: es lo que da bulto sin ensuciar */
  rg('ao',  0,0,  40, [[.74,'var(--ao)',0],[1,'var(--ao)',1]]);
  rg('aoG', 0,0, 140, [[.74,'var(--ao)',0],[1,'var(--ao)',1]]);
  /* brillo especular, relativo a su propia elipse */
  const suave=(id,color,dentro)=>{const g=el('radialGradient',{id:id,cx:'.5',cy:'.5',r:'.5'});
    g.appendChild(el('stop',{offset:'0','stop-color':color,'stop-opacity':'1'}));
    g.appendChild(el('stop',{offset:String(dentro||0.55),'stop-color':color,'stop-opacity':'.55'}));
    g.appendChild(el('stop',{offset:'1','stop-color':color,'stop-opacity':'0'}));
    d.appendChild(g);};
  suave('brillo','var(--brillo)'); suave('brilloG','var(--brillo)');
  /* cada cúspide es un bulto: una sombra debajo y a la derecha, y la luz arriba a la izquierda */
  const cusp=(id)=>{const g=el('radialGradient',{id:id,cx:'.38',cy:'.32',r:'.60'});
    g.appendChild(el('stop',{offset:'0','stop-color':'var(--cuspide)','stop-opacity':'1'}));
    g.appendChild(el('stop',{offset:'1','stop-color':'var(--cuspide)','stop-opacity':'0'}));
    d.appendChild(g);};
  cusp('cusp'); cusp('cuspG');
  suave('cuspSom','var(--ao)',.5);
  /* dentina: la raíz no es esmalte, va más apagada y más cálida que la corona */
  rg('dentina',  -11,-14,  70, [[0,'var(--den-1)'],[.55,'var(--den-1)'],[1,'var(--den-2)']]);
  rg('dentinaG', -44,-56, 260, [[0,'var(--den-1)'],[.55,'var(--den-1)'],[1,'var(--den-2)']]);
  destino.appendChild(d);
}
/* ---- anatomía: cada clase de diente tiene sus propias cúspides y surcos ---- */
/* un bulto de esmalte: su sombra abajo-derecha y su luz arriba-izquierda */
function bulto(destino,q){
  const rx=+q.rx, ry=+q.ry, cx=+q.cx, cy=+q.cy;
  destino.appendChild(el('ellipse',{class:'cusp-som vol',
    cx:(cx+rx*0.17).toFixed(1),cy:(cy+ry*0.22).toFixed(1),
    rx:rx.toFixed(1),ry:ry.toFixed(1)}));
  destino.appendChild(el('ellipse',{class:'cuspide vol',cx:q.cx,cy:q.cy,rx:q.rx,ry:q.ry}));
}
function clase(n){
  const p=n%10;
  if(p===1||p===2) return 'inc';
  if(p===3) return 'can';
  if(esTemp(n)) return 'mol';          /* 54,55,64,65,74,75,84,85 son molares */
  if(p===4||p===5) return 'pre';
  return 'mol';
}
/* ================== raíces ==================
   Cuántas raíces tiene de verdad cada pieza. Es lo que pidió el área clínica: el
   odontograma tiene que dibujar el diente entero, no sólo la mesa oclusal.
     incisivos, caninos y 2.ª premolar ....... 1
     1.ª premolar superior (14 y 24) ......... 2
     molares inferiores (36-38, 46-48) ....... 2
     molares superiores (16-18, 26-28) ....... 3
     molares temporales: arriba 3, abajo 2; los temporales anteriores, 1            */
function numRaices(n){
  const p=n%10, sup=esSup(n);
  if(esTemp(n)) return p>=4 ? (sup?3:2) : 1;
  if(p<=3)   return 1;
  if(p===4)  return sup?2:1;
  if(p===5)  return 1;
  return sup?3:2;
}
/* Cómo se llama cada raíz. Hace falta para nombrarla en el panel y en la lista:
   «raíz distal», no «raíz 2». El orden es el mismo con el que se dibujan, de mesial
   a distal tal como queda la pieza en pantalla. */
function nombresRaiz(n){
  const k=numRaices(n);
  if(k===1) return ['única'];
  if(k===2) return esSup(n)&&(n%10)===4 ? ['vestibular','palatina'] : ['mesial','distal'];
  return ['mesiovestibular','distovestibular','palatina'];
}
/* Eje de cada raíz en coordenadas locales del diente. En este dibujo -Y es hacia
   fuera del arco, que es justo donde cae el ápice. El mismo eje sirve para dibujar
   la raíz y para meter dentro el conducto de la endodoncia. */
function ejesRaiz(n,w,h,dir){
  dir=dir||1;                                   /* 1 hacia fuera del arco, -1 hacia dentro */
  const k=numRaices(n), hw=w/2, hh=h/2;
  /* el largo se mide contra el tamaño de la fila, no contra el ancho del diente: si no,
     la molar acabaría con la raíz más larga que el incisivo, que es justo al revés */
  const u=w/(forma(n).w||1);
  /* En el diente de leche la corona es baja y ancha, así que con el mismo factor que el
     permanente la raíz salía 1,5 veces más larga que la corona y se leía como una aguja
     colgando. Se acorta sólo en la dentición temporal: la silueta queda cónica y corta,
     que es como se ve una raíz de leche en reabsorción. */
  const largo=u*(esTemp(n) ? (k===1?0.62 : k===2?0.54 : 0.52)
                           : (k===1?0.78 : k===2?0.64 : 0.62));
  /* el grosor se mide también contra el tamaño de la fila y se limita al ancho de la
     corona: si se midiera sólo contra el diente, el incisivo superior —que es ancho y
     bajo— sacaría una raíz con forma de lápida en vez de cónica */
  const gr=k===1?0.170 : k===2?0.135 : 0.115;
  const tope=k===1?0.62 : k===2?0.40 : 0.31;
  const cuello=-hh*0.78*dir;
  const ejes=[];
  for(let i=0;i<k;i++){
    const t = k===1 ? 0 : (i-(k-1)/2)/((k-1)/2);
    ejes.push({x0:t*hw*(k===3?0.44:0.38), y0:cuello,
               x1:t*hw*(k===3?0.66:0.62), y1:cuello-largo*dir,
               b : Math.min(u*gr, hw*tope)});
  }
  return ejes;
}
/* Silueta: sale del cuello con todo su grosor, se estrecha por el tercio medio y
   cierra en un ápice redondeado. Nada de rectángulos con la punta cortada.
   Los dos hombros del ápice se retranquean SIEMPRE hacia el cuello, y para eso hay que
   ir en el sentido de la raíz. Con el desplazamiento fijo, la fila temporal —que saca
   la raíz hacia dentro del arco, con L negativa— los ponía por detrás del vértice y el
   ápice salía bifurcado: eran las puntas en forma de horquilla que se veían en las 20
   piezas de leche. */
function raices(n,w,h,dir){
  const f=v=>v.toFixed(1);
  return ejesRaiz(n,w,h,dir).map(e=>{
    const b=e.b, L=e.y0-e.y1, sg=L<0?-1:1, hom=e.y1+sg*b*0.78;
    return 'M'+f(e.x0-b)+','+f(e.y0)+
      ' C'+f(e.x0-b*0.93)+','+f(e.y0-L*0.46)+' '+f(e.x1-b*0.66)+','+f(e.y1+L*0.34)+' '+f(e.x1-b*0.34)+','+f(hom)+
      ' Q'+f(e.x1)+','+f(e.y1)+' '+f(e.x1+b*0.34)+','+f(hom)+
      ' C'+f(e.x1+b*0.66)+','+f(e.y1+L*0.34)+' '+f(e.x0+b*0.93)+','+f(e.y0-L*0.46)+' '+f(e.x0+b)+','+f(e.y0)+' Z';
  });
}
/* el cuello: la línea amelocementaria, donde acaba el esmalte y empieza la raíz */
function cuelloDe(n,w,h,dir){
  const hw=w/2, hh=h/2, y=(-hh*0.78*(dir||1)).toFixed(1);
  return 'M'+(-hw*0.80).toFixed(1)+','+y+'L'+(hw*0.80).toFixed(1)+','+y;
}
/* cuánto sobresale la pieza con su raíz: lo necesita el reparto de números */
function alcanceRaiz(n,w,h){const e=ejesRaiz(n,w,h)[0];return Math.abs(e.y1)+e.b*0.6;}

function anatomia(n,fo,w,h,grande){
  const cl=clase(n), a=w/2, b=h/2, cus=[], fis=[], div=[];
  const L=(A,x1,y1,x2,y2)=>A.push('M'+x1.toFixed(1)+','+y1.toFixed(1)+
                                  'L'+x2.toFixed(1)+','+y2.toFixed(1));
  const C=(cx,cy,rx,ry)=>cus.push({cx:cx.toFixed(1),cy:cy.toFixed(1),
                                   rx:rx.toFixed(1),ry:ry.toFixed(1)});
  if(cl==='inc'){                       /* borde incisal: un filo mesio-distal */
    C(0,-b*0.16, a*0.60, b*0.30);
    L(fis,-a*0.30,-b*0.13, a*0.30,-b*0.13);
  }else if(cl==='can'){                 /* una sola cúspide, algo vestibular */
    C(0,-b*0.08, a*0.44, b*0.38);
    L(fis,-a*0.26, b*0.10, 0,-b*0.22); L(fis,0,-b*0.22, a*0.26, b*0.10);
  }else if(cl==='pre'){                 /* dos cúspides con su fisura en medio */
    C(0,-b*0.44, a*0.42, b*0.24);
    C(0, b*0.42, a*0.36, b*0.22);
    L(fis,-a*0.26,-b*0.02, a*0.26,-b*0.02);
  }else{                                /* molar: cuatro cúspides y fisura central */
    C(-a*0.40,-b*0.40, a*0.34, b*0.30);
    C( a*0.40,-b*0.40, a*0.34, b*0.30);
    C(-a*0.40, b*0.40, a*0.32, b*0.28);
    C( a*0.40, b*0.40, a*0.32, b*0.28);
    if(n%10===6 && !esSup(n) && !esTemp(n))   /* la quinta cúspide distal del primer molar inferior */
      C((esDer(n)?1:-1)*a*0.52, 0, a*0.20, b*0.22);
    L(fis,-a*0.28,0, a*0.28,0);
    L(fis,-a*0.11,0, -a*0.11,-b*0.20);
    L(fis, a*0.11,0,  a*0.11, b*0.20);
  }
  /* Las cinco caras se separan con línea entera, del borde de la cara oclusal al contorno,
     y la oclusal se cierra con su anillo. Es lo que hace que las zonas se distingan de un
     vistazo, y va en un tono más marcado que la anatomía para que mande sobre ella. */
  const out=contorno(fo,w,h), idx=g=>((Math.round((g/360)*NPT)%NPT)+NPT)%NPT;
  const K=0.42;
  [45,135,225,315].forEach(g=>{
    const q=out[idx(g)];
    L(div,q[0]*0.99,q[1]*0.99, q[0]*K,q[1]*K);
  });
  const anillo=out.map(q=>[q[0]*K,q[1]*K]);
  div.push('M'+anillo.map(q=>q[0].toFixed(1)+','+q[1].toFixed(1)).join('L')+'Z');
  /* en la pieza grande la anatomía la cuentan las cúspides, con sitio de sobra; en la
     arcada la cuentan las fisuras, que a 60 px se leen mejor que un bulto */
  return {cusp:cus, fisuras:(grande?[]:fis).join(''), divisiones:div.join('')};
}

/* Un solo odontograma, siempre. Lo pidió la Dra. Cinthya el 12/09: «un solo
   odontograma que esté tanto niño como adulto, porque si no nos podría confundir a
   todos los doctores». Ya no hay vistas de adulto, niño y mixta. */
function cuadrantes(destino){
  const g=el('g',{class:'cuad'});
  const x=GEO.sup.cx, y=YMED;
  /* Sin paneles rectangulares: la arcada es curva y las cajas dejaban cuatro huecos
     muertos en las esquinas. La cruz sola ya divide la boca, que es lo que se pidió. */
  [['Cuadrante 1','5',1,30],['Cuadrante 2','6',0,30],
   ['Cuadrante 4','8',1,VB.h-14],['Cuadrante 3','7',0,VB.h-14]
  ].forEach(q=>{
    g.appendChild(txt(q[0]+' – temporales '+q[1],{class:'cuad-rot',
      x:(q[2]?44:VB.w-44), y:q[3], 'text-anchor':q[2]?'start':'end'}));
  });
  g.appendChild(el('line',{class:'cruz',x1:x,y1:20,x2:x,y2:VB.h-28}));
  g.appendChild(el('line',{class:'cruz cruz--ocl',x1:40,y1:y,x2:VB.w-40,y2:y}));
  destino.appendChild(g);
}


function capasPara(denticion) {
  const all = [
    {pz:SUP_P,sup:1,s:66,esc:1,  cap:'SP'},
    {pz:SUP_T,sup:1,s:56,esc:.58,cap:'ST',alinea:1},
    {pz:INF_T,sup:0,s:56,esc:.58,cap:'IT',alinea:1},
    {pz:INF_P,sup:0,s:66,esc:1,  cap:'IP'}
  ];
  const d = String(denticion || 'mixta').toLowerCase();
  if (d === 'adulto' || d === 'permanente') return all.filter(c => c.cap === 'SP' || c.cap === 'IP');
  if (d === 'leche' || d === 'temporal' || d === 'infantil') return all.filter(c => c.cap === 'ST' || c.cap === 'IT');
  return all;
}

function pol(pts){return pts.map(function(p){return p[0].toFixed(1)+','+p[1].toFixed(1);}).join(' ');}

function dibujarEn(svg, denticion) {
  svg.setAttribute('viewBox','0 0 '+VB.w+' '+VB.h);
  svg.setAttribute('role', svg.getAttribute('role') || 'img');
  if (!svg.getAttribute('aria-label')) svg.setAttribute('aria-label', 'Odontograma');
  while (svg.firstChild) svg.removeChild(svg.firstChild);
  CAJAS = {};
  defs(svg);
  cuadrantes(svg);
  const gD = el('g'); svg.appendChild(gD);
  capasPara(denticion).forEach(c=>{
    const P=puestos(c.pz,c.sup,c.esc,c.pz.map(n=>c.s*forma(n).w)), mitad=(c.pz.length-1)/2;
    /* números y siglas a distancia fija: quedan alineados en una curva limpia.
       En dentición mixta la fila temporal va por dentro, así que sus números salen
       hacia el centro y no se pisan con los de la fila permanente. */
    /* La fila interior de la dentición mixta saca las raíces hacia el centro: si las
       sacara hacia fuera se metería dentro de la fila permanente. */
    const dirR=c.alinea?-1:1;
    const rMax=Math.max.apply(null,c.pz.map(n=>{const f=forma(n);
      return alcanceRaiz(n,c.s*f.w,c.s*f.h);}));
    const hMax=Math.max.apply(null,c.pz.map(n=>c.s*forma(n).h));
    /* el número y la sigla van del mismo lado que la raíz —fuera del arco, o hacia el
       centro en la fila temporal—, y la sigla por detrás del número */
    /* las filas temporales llevan el número más pegado a su corona: van hacia el centro
       y con la distancia de la fila permanente acababan encima del plano oclusal */
    /* El número se pone a una distancia fija medida desde el ápice más lejano de la fila.
       Con +5 en la fila temporal el número acababa tocando la raíz —0 px de separación
       medidos en las 20 piezas—, y en las molares permanentes quedaban 6 px. Ahora la
       separación mínima es la misma en toda la arcada. */
    const dentro=c.alinea?-1:1, Lf=rMax+(c.alinea?26:21), Ls=rMax+(c.alinea?43:39);
    c.pz.forEach((n,i)=>{
      const p=P[i], fo=forma(n), w=c.s*fo.w, h=c.s*fo.h;
      const g=el('g',{class:'pieza','data-pz':n,tabindex:'0',role:'button',
                      'aria-label':'Pieza '+fdi(n)+', '+nombrePieza(n)});
      g.style.setProperty('--onda',Math.round(Math.abs(i-mitad)));
      const T='translate('+p.x.toFixed(1)+','+p.y.toFixed(1)+') rotate('+p.rot.toFixed(1)+')';
      /* la sombra es la misma silueta corrida abajo y a la derecha. El desplazamiento va
         antes del giro, así cae hacia el mismo lado en las 32 piezas */
      const Ts='translate('+(p.x+1.6).toFixed(1)+','+(p.y+2.6).toFixed(1)+
               ') rotate('+p.rot.toFixed(1)+')';
      const F=facetas(fo,w,h), M=carasLocal(n), cont=contorno(fo,w,h), an=anatomia(n,fo,w,h);
      const RA=raices(n,w,h,dirR);
      const gs=el('g',{transform:Ts});
      RA.forEach(d=>gs.appendChild(el('path',{class:'sombra',d:d})));
      gs.appendChild(el('polygon',{class:'sombra',points:pol(cont.filter((_,k)=>k%2===0))}));
      g.appendChild(gs);
      /* halo de selección: sigue el contorno del diente, no una caja */
      const gh=el('g',{transform:T});
      gh.appendChild(el('polygon',{class:'halo',points:pol(encoge(cont,-7))}));
      gh.appendChild(el('polygon',{class:'anillo',points:pol(encoge(cont,-12))}));
      g.appendChild(gh);
      /* las raíces van debajo de la corona: la corona tapa el cuello y el empalme
         queda limpio sin tener que recortar nada */
      const gr=el('g',{transform:T,class:'raices'});
      const NR=nombresRaiz(n);
      RA.forEach((d,ri)=>{
        const p=el('path',{class:'raiz',d:d,'data-raiz':ri});
        const t=el('title'); t.textContent='Raíz '+NR[ri]; p.appendChild(t);
        gr.appendChild(p);
      });
      g.appendChild(gr);
      const cu=el('g',{transform:T});
      const conNom=(e,nom)=>{const t=el('title');t.textContent=nom;e.appendChild(t);return e;};
      ['arriba','der','abajo','izq'].forEach(k=>cu.appendChild(conNom(el('polygon',
        {class:'cara',points:pol(F[k]),'data-cara':M[k].id,'data-nom':M[k].nom}),M[k].nom)));
      cu.appendChild(conNom(el('polygon',{class:'cara cara--o',points:pol(F.centro),
        'data-cara':M.centro.id,'data-nom':M.centro.nom}),M.centro.nom));
      cu.appendChild(el('path',{class:'surcos vol',d:an.fisuras}));
      cu.appendChild(el('polygon',{class:'ao vol',points:pol(cont)}));
      cu.appendChild(el('path',{class:'division vol',d:an.divisiones}));
      cu.appendChild(el('polygon',{class:'perfil',points:pol(cont)}));
      cu.appendChild(el('path',{class:'cemento',d:cuelloDe(n,w,h,dirR)}));
      g.appendChild(cu);
      /* las marcas van encima y aparte, para que nada las tape */
      const cm=el('g',{transform:T});
      cm.appendChild(el('g',{class:'otras','data-otras':n}));
      cm.appendChild(el('g',{'data-marcas':n}));
      g.appendChild(cm);
      g.appendChild(txt(fdi(n),{class:'num',x:(p.x+p.ux*Lf*dentro).toFixed(1),
        y:(p.y+p.uy*Lf*dentro+4).toFixed(1)}));
      g.appendChild(txt('',{class:'sig','data-sig':n,x:(p.x+p.ux*Ls*dentro).toFixed(1),
        y:(p.y+p.uy*Ls*dentro+4).toFixed(1)}));
      gD.appendChild(g);
      CAJAS[n]={w:w,h:h,sup:c.sup,pz:n,dir:dirR,cap:c.cap,i:i,p:p,T:T};
    });
  });
  return CAJAS;
}

const Odontograma = {
  VIEWBOX: { w: 1440, h: 880 },
  fdi: fdi,
  numRaices: numRaices,
  crear: function (svg, opts) {
    if (!svg) throw new Error('Odontograma.crear: falta <svg>');
    const denticion = (opts && opts.denticion) || 'mixta';
    const cajas = dibujarEn(svg, denticion);
    const piezas = Object.keys(cajas).map(Number).sort(function(a,b){return a-b;});
    const api = {
      svg: svg,
      piezas: piezas,
      cajas: cajas,
      denticion: denticion,
      redibujar: function (o) {
        const d = (o && o.denticion) || api.denticion;
        api.denticion = d;
        api.cajas = dibujarEn(svg, d);
        api.piezas = Object.keys(api.cajas).map(Number).sort(function(a,b){return a-b;});
        return api;
      },
      pieza: function (n) { return svg.querySelector('g.pieza[data-pz="'+n+'"]'); },
      cara: function (n, c) { return svg.querySelector('g.pieza[data-pz="'+n+'"] polygon.cara[data-cara="'+c+'"]'); },
      raiz: function (n, i) { return svg.querySelector('g.pieza[data-pz="'+n+'"] path.raiz[data-raiz="'+i+'"]'); },
      marcas: function (n) { return svg.querySelector('g[data-marcas="'+n+'"]'); },
    };
    return api;
  },
};

global.Odontograma = Odontograma;
if (typeof module !== "undefined") module.exports = Odontograma;
})(typeof window !== "undefined" ? window : globalThis);
