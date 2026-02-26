/*
 Simple presenter:
 - Slides are horizontal rectangles (one visible at center)
 - Can add/delete, navigate prev/next
 - Each slide contains an editable text block (contenteditable)
 - All slides and current index persist to localStorage
 - Export/import JSON
*/

const STORAGE_KEY = 'presenter.slides.v1';

const defaultSlides = [
  { id: genId(), text: 'Título de la presentación\n\nHaz doble clic aquí para editar.' }
];

const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const addBtn = document.getElementById('addBtn');
const delBtn = document.getElementById('delBtn');
const slidesWrapper = document.getElementById('slidesWrapper');
const indexDisplay = document.getElementById('indexDisplay');
const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');
const importFile = document.getElementById('importFile');

let state = {
  slides: [],
  current: 0
};

init();

function init(){
  load();
  renderSlides();
  attachEvents();
  updateUI();
}

function genId(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,8) }

function load(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw){
      state = JSON.parse(raw);
      // basic validation
      if(!Array.isArray(state.slides) || state.slides.length === 0){
        state = { slides: defaultSlides.slice(), current: 0 };
      } else {
        state.current = Math.min(Math.max(0, state.current||0), state.slides.length-1);
      }
    } else {
      state = { slides: defaultSlides.slice(), current: 0 };
    }
  }catch(e){
    console.error('Error loading storage', e);
    state = { slides: defaultSlides.slice(), current: 0 };
  }
}

function save(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function attachEvents(){
  prevBtn.addEventListener('click', ()=>{ goTo(state.current-1) });
  nextBtn.addEventListener('click', ()=>{ goTo(state.current+1) });
  addBtn.addEventListener('click', addSlide);
  delBtn.addEventListener('click', deleteSlide);
  exportBtn.addEventListener('click', exportJSON);
  importBtn.addEventListener('click', ()=>importFile.click());
  importFile.addEventListener('change', onImportFile);
  window.addEventListener('keydown', onKey);
  // touch swipe for stage
  addSwipeHandlers(slidesWrapper, (dir)=>{
    if(dir === 'left') goTo(state.current+1);
    if(dir === 'right') goTo(state.current-1);
  });
}

function onKey(e){
  if(e.key === 'ArrowLeft') goTo(state.current-1);
  if(e.key === 'ArrowRight') goTo(state.current+1);
  if((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n'){ e.preventDefault(); addSlide(); }
  if((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd'){ e.preventDefault(); deleteSlide(); }
}

function renderSlides(){
  slidesWrapper.innerHTML = '';
  state.slides.forEach((s, idx)=>{
    const slideEl = document.createElement('div');
    slideEl.className = 'slide';
    if(idx < state.current) slideEl.classList.add('off-left');
    if(idx > state.current) slideEl.classList.add('off-right');

    const content = document.createElement('div');
    content.className = 'content';

    const text = document.createElement('div');
    text.className = 'text-block';
    text.contentEditable = 'true';
    text.spellcheck = false;
    text.innerText = s.text || '';
    text.addEventListener('input', (ev)=>{
      state.slides[idx].text = text.innerText;
      save();
    });
    // Save on blur too to ensure persistence
    text.addEventListener('blur', ()=> save());
    // Allow Enter for new lines, avoid submitting forms
    text.addEventListener('keydown', (ev)=>{
      if(ev.key === 'Tab'){ ev.preventDefault(); }
    });

    content.appendChild(text);
    slideEl.appendChild(content);

    // Click slide to focus and set current
    slideEl.addEventListener('click', (ev)=>{
      if(ev.target === slideEl) goTo(idx);
      // focus the editable if clicking text
    });

    slidesWrapper.appendChild(slideEl);
  });
  // after DOM creation, ensure focused slide has focus on its .text-block
  requestAnimationFrame(()=> {
    focusCurrentEditable();
  });
}

function updateSlidesPosition(){
  const els = slidesWrapper.querySelectorAll('.slide');
  els.forEach((el, idx)=>{
    el.classList.remove('off-left','off-right');
    if(idx < state.current) el.classList.add('off-left');
    if(idx > state.current) el.classList.add('off-right');
  });
}

function updateUI(){
  indexDisplay.textContent = `Diapositiva ${state.current+1} / ${state.slides.length}`;
  prevBtn.disabled = state.current <= 0;
  nextBtn.disabled = state.current >= state.slides.length - 1;
  delBtn.disabled = state.slides.length === 0;
  updateSlidesPosition();
  save();
}

function goTo(idx){
  if(idx < 0) idx = 0;
  if(idx > state.slides.length - 1) idx = state.slides.length -1;
  if(idx === state.current){ focusCurrentEditable(); return; }
  state.current = idx;
  updateUI();
  // Slight delay to allow transition then focus
  setTimeout(()=> focusCurrentEditable(), 320);
}

function addSlide(){
  const newSlide = { id: genId(), text: 'Nueva diapositiva' };
  state.slides.splice(state.current+1, 0, newSlide);
  state.current = state.current+1;
  renderSlides();
  updateUI();
  // focus editable
  setTimeout(()=> focusCurrentEditable(), 240);
}

function deleteSlide(){
  if(state.slides.length === 0) return;
  // confirm
  if(!confirm('¿Eliminar la diapositiva actual?')) return;
  state.slides.splice(state.current,1);
  if(state.current >= state.slides.length) state.current = Math.max(0, state.slides.length-1);
  renderSlides();
  updateUI();
}

function focusCurrentEditable(){
  const els = slidesWrapper.querySelectorAll('.slide');
  const cur = els[state.current];
  if(!cur) return;
  const text = cur.querySelector('.text-block');
  if(text){
    text.focus();
    // place cursor at end
    placeCaretAtEnd(text);
  }
}

function placeCaretAtEnd(el){
  const range = document.createRange();
  const sel = window.getSelection();
  range.selectNodeContents(el);
  range.collapse(false);
  sel.removeAllRanges();
  sel.addRange(range);
}

// Export/import helpers
function exportJSON(){
  const blob = new Blob([JSON.stringify(state, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'presentacion.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function onImportFile(e){
  const file = e.target.files && e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = (ev)=>{
    try{
      const data = JSON.parse(ev.target.result);
      if(!Array.isArray(data.slides)) throw new Error('Formato inválido');
      state = data;
      // ensure ids exist
      state.slides = state.slides.map(s => ({ id: s.id || genId(), text: s.text || '' }));
      state.current = Math.min(Math.max(0, state.current||0), state.slides.length-1);
      renderSlides();
      updateUI();
    }catch(err){
      alert('No se pudo importar: archivo inválido.');
      console.error(err);
    }
  };
  reader.readAsText(file);
  // reset input
  importFile.value = '';
}

// Simple swipe detection for touch devices
function addSwipeHandlers(el, cb){
  let startX = null, startY = null, startTime = 0;
  const threshold = 40; // px
  const restraint = 75; // max y-distance
  const allowedTime = 500;
  el.addEventListener('touchstart', function(e){
    const t = e.changedTouches[0];
    startX = t.pageX; startY = t.pageY; startTime = Date.now();
  }, {passive:true});
  el.addEventListener('touchend', function(e){
    const t = e.changedTouches[0];
    const distX = t.pageX - startX;
    const distY = t.pageY - startY;
    const elapsed = Date.now() - startTime;
    if(elapsed <= allowedTime && Math.abs(distX) >= threshold && Math.abs(distY) <= restraint){
      if(distX < 0) cb('left'); else cb('right');
    }
    startX = startY = null;
  }, {passive:true});
}