(()=>{
'use strict';

const $=id=>document.getElementById(id);
const KEY_SALT='om_hiddenRoomSalt';
const KEY_HASH='om_hiddenRoomHash';
const DB='NEXORA_HIDDEN_ROOM';
const STORE='tracks';
let db=null,audioUrl=null,currentId=null;
let shuffle=false,repeat=false,favoritesOnly=false;

function openDB(){
 return new Promise((resolve,reject)=>{
  const request=indexedDB.open(DB,1);
  request.onupgradeneeded=()=>{
   const d=request.result;
   if(!d.objectStoreNames.contains(STORE))
    d.createObjectStore(STORE,{keyPath:'id'});
  };
  request.onsuccess=()=>{db=request.result;resolve(db)};
  request.onerror=()=>reject(request.error);
 });
}
function transaction(mode,action){
 return new Promise((resolve,reject)=>{
  const tx=db.transaction(STORE,mode);
  const store=tx.objectStore(STORE);
  let result;
  try{result=action(store)}catch(e){reject(e);return}
  tx.oncomplete=()=>resolve(result?.result);
  tx.onerror=()=>reject(tx.error);
 });
}
function allTracks(){
 return new Promise((resolve,reject)=>{
  const req=db.transaction(STORE).objectStore(STORE).getAll();
  req.onsuccess=()=>resolve(req.result||[]);
  req.onerror=()=>reject(req.error);
 });
}
function saveTrack(track){
 return transaction('readwrite',s=>s.put(track));
}
function deleteTrack(id){
 return transaction('readwrite',s=>s.delete(id));
}
function makeId(){
 return crypto.randomUUID?crypto.randomUUID():
  Date.now()+'-'+Math.random().toString(36).slice(2);
}
function bytesToHex(bytes){
 return Array.from(new Uint8Array(bytes))
  .map(x=>x.toString(16).padStart(2,'0')).join('');
}
async function derive(password,salt){
 const key=await crypto.subtle.importKey(
  'raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']
 );
 const bits=await crypto.subtle.deriveBits({
  name:'PBKDF2',salt,iterations:180000,hash:'SHA-256'
 },key,256);
 return bytesToHex(bits);
}
async function createPassword(password){
 const salt=crypto.getRandomValues(new Uint8Array(16));
 const hash=await derive(password,salt);
 localStorage.setItem(KEY_SALT,bytesToHex(salt));
 localStorage.setItem(KEY_HASH,hash);
}
function hexToBytes(hex){
 return new Uint8Array(hex.match(/.{2}/g).map(x=>parseInt(x,16)));
}
function escapeHTML(s){
 return String(s).replace(/[&<>"']/g,c=>({
 '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
 }[c]));
}
function modal(){
 const first=!localStorage.getItem(KEY_HASH);
 const overlay=document.createElement('div');
 overlay.id='nexoraHiddenOverlay';
 overlay.innerHTML=`
 <form class="nh-modal" id="nhAuth">
  <div class="nh-symbol">∞</div>
  <h2>NEXORA</h2>
  <h3>${first?'HIDDEN ROOM SETUP':'HIDDEN ROOM'}</h3>
  <p>${first?'أنشئ كلمة مرور خاصة بالغرفة السرية':'أدخل كلمة المرور للمتابعة'}</p>
  <input id="nhPassword" type="password" minlength="8"
   maxlength="128" autocomplete="${first?'new-password':'current-password'}"
   placeholder="Password" required>
  ${first?'<input id="nhConfirm" type="password" minlength="8" maxlength="128" placeholder="Confirm password" required>':''}
  <div class="nh-error" id="nhError" role="alert"></div>
  <button class="nh-btn" type="submit">${first?'إنشاء وفتح الغرفة':'فتح الغرفة'}</button>
  <button class="nh-btn secondary" type="button" id="nhCancel">إلغاء</button>
 </form>`;
 document.body.appendChild(overlay);
 $('nhCancel').onclick=()=>overlay.remove();
 $('nhPassword').focus();
 $('nhAuth').onsubmit=async e=>{
  e.preventDefault();
  const password=$('nhPassword').value;
  const error=$('nhError');
  if(password.length<8){error.textContent='كلمة المرور يجب أن تكون 8 أحرف على الأقل.';return}
  try{
   if(first){
    if(password!==$('nhConfirm').value){
     error.textContent='كلمتا المرور غير متطابقتين.';return;
    }
    await createPassword(password);
   }else{
    const saved=localStorage.getItem(KEY_HASH);
    const salt=hexToBytes(localStorage.getItem(KEY_SALT));
    if(await derive(password,salt)!==saved){
     error.textContent='كلمة المرور غير صحيحة.';return;
    }
   }
   overlay.remove();
   await showRoom();
  }catch(err){
   error.textContent='تعذر فتح الغرفة. تحقق من دعم التشفير والتخزين.';
  }
 };
}
async function showRoom(){
 try{await openDB()}catch(e){alert('تعذر تشغيل مكتبة الموسيقى على هذا الجهاز.');return}
 const home=$('home'),section=$('section');
 if(!home||!section)return;
 home.classList.add('hidden');
 section.classList.remove('hidden');
 current='hiddenRoom';
 $('sectionTitle').textContent='NEXORA HIDDEN ROOM';
 $('content').innerHTML=`
 <div class="nh-top">
  <div><div class="nh-title">HIDDEN ROOM</div>
   <small class="nh-muted">YOUR PRIVATE MUSIC SPACE</small></div>
  <button class="nh-btn secondary" id="nhLock">قفل الغرفة</button>
 </div>
 <div class="nh-player">
  <div class="nh-disc" id="nhDisc">∞</div>
  <div class="nh-title" id="nhNow">اختر أغنية للبدء</div>
  <div class="nh-muted">NEXORA AUDIO PLAYER</div>
  <audio id="nhAudio" controls preload="metadata"></audio>
 </div>
 <div class="nh-section">
  <label class="nh-file">＋ إضافة ملفات صوتية من الهاتف
   <input id="nhFiles" type="file" accept="audio/*,.mp3,.m4a,.ogg,.wav,.flac" multiple>
  </label>
  <div class="nh-actions">
   <button class="nh-btn secondary" id="nhAll">كل الأغاني</button>
   <button class="nh-btn secondary" id="nhFav">المفضلة ★</button>
   <button class="nh-btn secondary" id="nhShuffle">عشوائي: OFF</button>
   <button class="nh-btn secondary" id="nhRepeat">تكرار: OFF</button>
  </div>
  <div id="nhCount" class="nh-muted"></div>
  <div id="nhList"></div>
 </div>`;
 $('nhLock').onclick=lockRoom;
 $('nhAll').onclick=()=>{favoritesOnly=false;renderList()};
 $('nhFav').onclick=()=>{favoritesOnly=true;renderList()};
 $('nhShuffle').onclick=()=>{shuffle=!shuffle;$('nhShuffle').textContent='عشوائي: '+(shuffle?'ON':'OFF')};
 $('nhRepeat').onclick=()=>{repeat=!repeat;$('nhRepeat').textContent='تكرار: '+(repeat?'ON':'OFF')};
 $('nhFiles').onchange=importFiles;
 $('nhList').onclick=trackAction;
 $('nhAudio').onplay=()=>$('nhDisc').classList.remove('paused');
 $('nhAudio').onpause=()=>$('nhDisc').classList.add('paused');
 $('nhAudio').onended=nextTrack;
 await renderList();
 try{if(navigator.storage?.persist)await navigator.storage.persist()}catch(e){}
}
async function importFiles(e){
 const files=Array.from(e.target.files||[]);
 for(const file of files){
  if(!file.type.startsWith('audio/')&&!/\.(mp3|m4a|ogg|wav|flac)$/i.test(file.name))continue;
  try{
   await saveTrack({id:makeId(),name:file.name,type:file.type,
    blob:file,favorite:false,addedAt:Date.now()});
  }catch(err){alert('تعذر حفظ '+file.name+'؛ قد تكون مساحة التخزين ممتلئة.')}
 }
 e.target.value='';
 await renderList();
}
async function renderList(){
 const tracks=await allTracks();
 const shown=tracks.filter(t=>!favoritesOnly||t.favorite);
 $('nhCount').textContent=`${shown.length} أغنية`;
 $('nhList').innerHTML=shown.length?shown.map(t=>`
 <div class="nh-track">
  <button data-action="play" data-id="${escapeHTML(t.id)}">▶</button>
  <div class="nh-track-name">${escapeHTML(t.name)}</div>
  <button data-action="fav" data-id="${escapeHTML(t.id)}">${t.favorite?'★':'☆'}</button>
  <button data-action="delete" data-id="${escapeHTML(t.id)}">×</button>
 </div>`).join(''):'<div class="nh-empty">مكتبتك فارغة حالياً. أضف ملفاتك الصوتية للبدء.</div>';
}
async function playTrack(id){
 const tracks=await allTracks();
 const track=tracks.find(t=>t.id===id);
 if(!track)return;
 if(audioUrl)URL.revokeObjectURL(audioUrl);
 audioUrl=URL.createObjectURL(track.blob);
 currentId=id;
 $('nhAudio').src=audioUrl;
 $('nhNow').textContent=track.name;
 try{await $('nhAudio').play()}catch(e){}
}
async function trackAction(e){
 const b=e.target.closest('button[data-action]');
 if(!b)return;
 const {action,id}=b.dataset;
 const tracks=await allTracks();
 const track=tracks.find(t=>t.id===id);
 if(!track)return;
 if(action==='play'){await playTrack(id);return}
 if(action==='fav'){
  track.favorite=!track.favorite;await saveTrack(track);await renderList();return;
 }
 if(action==='delete'){
  if(!confirm('حذف هذا الملف من مكتبة NEXORA؟'))return;
  if(currentId===id){
   $('nhAudio').pause();$('nhAudio').removeAttribute('src');
   $('nhAudio').load();currentId=null;
   if(audioUrl)URL.revokeObjectURL(audioUrl);audioUrl=null;
   $('nhNow').textContent='اختر أغنية للبدء';
  }
  await deleteTrack(id);await renderList();
 }
}
async function nextTrack(){
 const tracks=(await allTracks()).filter(t=>!favoritesOnly||t.favorite);
 if(!tracks.length)return;
 if(repeat&&currentId){await playTrack(currentId);return}
 let index=tracks.findIndex(t=>t.id===currentId);
 let next=shuffle?tracks[Math.floor(Math.random()*tracks.length)]:
  tracks[(index+1)%tracks.length];
 if(next)await playTrack(next.id);
}
function lockRoom(){
 const audio=$('nhAudio');
 if(audio){audio.pause();audio.removeAttribute('src');audio.load()}
 if(audioUrl)URL.revokeObjectURL(audioUrl);
 audioUrl=null;currentId=null;
 if($('section'))$('section').classList.add('hidden');
 if($('home'))$('home').classList.remove('hidden');
 current='';
}
let holdTimer=null,held=false;
const logo=$('secretMark');
if(logo){
 logo.addEventListener('contextmenu',e=>e.preventDefault());
 logo.addEventListener('pointerdown',()=>{
  held=false;
  holdTimer=setTimeout(()=>{held=true;modal()},2000);
 });
 ['pointerup','pointerleave','pointercancel'].forEach(event=>
  logo.addEventListener(event,()=>clearTimeout(holdTimer))
 );
}
window.openNexoraHiddenRoom=modal;
})();
