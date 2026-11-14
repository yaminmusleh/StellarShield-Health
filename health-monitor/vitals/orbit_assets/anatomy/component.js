import '@google/model-viewer';
import {Streamlit} from 'streamlit-component-lib';
const organs={Heart:{p:'-0.12 1.38 0.31',label:'Heart'},Lungs:{p:'0.16 1.43 0.31',label:'Lungs'},Brain:{p:'0 1.94 0.13',label:'Brain'},Eyes:{p:'0 1.78 0.35',label:'Eyes'},Muscles:{p:'-0.41 1.12 0.14',label:'Muscles'},Bones:{p:'0.19 0.65 0.15',label:'Bones'}};
const model=document.querySelector('model-viewer');
const message=document.querySelector('#status');
const buttons=[];
let selected='Heart';
let initialized=false;
function select(organ,send=true){if(!organs[organ])return;selected=organ;buttons.forEach(b=>{let active=b.dataset.organ===organ;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});document.querySelector('#selected').textContent=organ.toUpperCase();if(send)Streamlit.setComponentValue({organ});}
for(const [organ,info] of Object.entries(organs)){const b=document.createElement('button');b.slot='hotspot-'+organ.toLowerCase();b.dataset.position=info.p;b.dataset.normal='0 0 1';b.dataset.organ=organ;b.className='hotspot';b.setAttribute('aria-label','Explore '+info.label);b.title='Explore '+info.label;b.innerHTML='<span class="dot"></span><span>'+info.label+'</span>';b.onclick=e=>{e.stopPropagation();select(organ);};model.appendChild(b);buttons.push(b);const fallback=document.createElement('button');fallback.textContent=info.label;fallback.dataset.organ=organ;fallback.className='organ-tab';fallback.onclick=()=>select(organ);document.querySelector('#organ-tabs').appendChild(fallback);buttons.push(fallback);}
document.querySelector('#reset').onclick=()=>{model.cameraOrbit='0deg 80deg 3.8m';model.cameraTarget='0m 1m 0m';model.fieldOfView='30deg';};
model.addEventListener('load',()=>{message.textContent='DRAG TO ROTATE · SCROLL TO ZOOM';document.querySelector('#loading').hidden=true;});
model.addEventListener('error',()=>{message.textContent='3D asset unavailable. Use the organ buttons below.';document.querySelector('#loading').textContent='3D could not load';});
Streamlit.events.addEventListener(Streamlit.RENDER_EVENT,e=>{if(!initialized){select(e.detail.args.selected||selected,false);initialized=true;}Streamlit.setFrameHeight(660);});
Streamlit.setComponentReady();Streamlit.setFrameHeight(660);select('Heart',false);
