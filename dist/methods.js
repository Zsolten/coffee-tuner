import { t } from "./language.js";

const simple = {id:"three", name:"Three-pour V60", ratio:16, temp:94, finish:180, pours:[[0,20],[40,40],[85,40]]};
const hoffmann = {id:"hoffmann", name:"James Hoffmann", ratio:16.67, temp:100, finish:180, pours:[[0,20],[45,20],[70,20],[90,20],[110,20]]};
const key = "coffee-tuner-methods-v1";
function valid(m) {
  return m && typeof m.name === "string" && m.name.trim() && m.ratio >= 5 && m.ratio <= 30 &&
    Number.isInteger(m.temp) && m.temp >= 50 && m.temp <= 100 && Number.isInteger(m.finish) && m.finish <= 3600 &&
    Array.isArray(m.pours) && m.pours.length && m.pours.every(([start, share], i) =>
      Number.isInteger(start) && (i ? start > m.pours[i-1][0] : start === 0) &&
      start < m.finish && Number.isInteger(share) && share > 0) &&
    m.pours.reduce((sum,pour)=>sum+pour[1],0) === 100;
}

export function customBrew(settings, method) {
  const brews = settings.batch === "separate" ? settings.servings : 1;
  const dosePerBrew = settings.dose / brews;
  const waterPerBrew = Math.round(dosePerBrew * method.ratio);
  let share = 0;
  const schedule = method.pours.map(([start, percent], i) => {
    share += percent;
    return {kind:"pour", label:"Pour {count}", labelValues:{count:i+1}, start,
      total:Math.round(waterPerBrew * share / 100)};
  });
  const finish = {start:method.finish};
  schedule.push({...finish,kind:"finish",label:"Target finish"});
  return {brews,dosePerBrew,waterPerBrew,water:waterPerBrew*brews,ratio:method.ratio,
    temperature:method.temp+" °C",temperatureNote:"Start each pour at the listed time.",schedule,finish};
}

export function setupMethods(onChange) {
  const el = id => document.getElementById(id);
  const menu = el("method"), dialog = el("method-dialog"), list = el("method-pours");
  let saved = [], active = "hoffmann", editing;
  try {
    const data = JSON.parse(localStorage.getItem(key));
    if (Array.isArray(data?.saved)) saved = data.saved.filter(m=>m?.id?.startsWith("user-") && valid(m));
    if ([hoffmann,simple,...saved].some(m=>m.id === data?.active)) active = data.active;
  } catch { /* Use presets when storage is unavailable. */ }
  const all = () => [hoffmann,simple,...saved];
  const selected = () => all().find(m=>m.id === active);
  function refresh() {
    menu.replaceChildren(...all().map(m=>new Option(m === simple ? t(m.name) : m.name,m.id)));
    menu.value = active;
  }
  function persist() {
    localStorage.setItem(key,JSON.stringify({active,saved}));
  }
  menu.onchange = () => {
    active = menu.value;
    try { persist(); } catch { /* Switching still works for this session. */ }
    onChange();
  };
  function field(label, value, min, max) {
    const wrapper = document.createElement("label"), input = document.createElement("input");
    wrapper.textContent = t(label);
    Object.assign(input,{type:"number",required:true,min,max,step:1,value});
    wrapper.append(input);
    return wrapper;
  }
  function addRow(start, percent) {
    const row = document.createElement("div"), remove = document.createElement("button");
    row.className = "pour-inputs";
    remove.type = "button"; remove.textContent = "×"; remove.setAttribute("aria-label",t("Remove pour"));
    remove.onclick = () => row.remove();
    row.append(field("Start (s)",start,0,3599),field("Water (%)",percent,1,100),remove);
    list.append(row);
  }
  function open(isEdit) {
    const m = isEdit ? selected() : simple;
    editing = isEdit && saved.includes(m) ? m.id : null;
    el("method-name").value = editing ? m.name : isEdit ? m.name+" ("+t("copy")+")" : "";
    el("method-ratio").value = m.ratio; el("method-temp").value = m.temp;
    el("method-finish").value = m.finish;
    list.replaceChildren(); m.pours.forEach(([s,p])=>addRow(s,p));
    el("method-error").textContent = "";
    dialog.showModal();
  }
  el("create-method").onclick = ()=>open(false);
  el("edit-method").onclick = ()=>open(true);
  el("cancel-method").onclick = ()=>dialog.close();
  el("add-pour").onclick = ()=>addRow("","");
  el("method-form").onsubmit = event => {
    event.preventDefault();
    const m = {id:editing ?? "user-"+crypto.randomUUID(),name:el("method-name").value.trim(),
      ratio:el("method-ratio").valueAsNumber,temp:el("method-temp").valueAsNumber,finish:el("method-finish").valueAsNumber,
      pours:Array.from(list.children,row=>Array.from(row.querySelectorAll("input"),i=>i.valueAsNumber))};
    if (!valid(m)) {
      el("method-error").textContent=t("Enter a name, start at 0, put pours in time order before the finish, and use 100% of the water.");
      return;
    }
    if(all().some(other=>other.id!==editing && other.name.toLowerCase()===m.name.toLowerCase())) {
      el("method-error").textContent=t("Choose a different recipe name."); return;
    }
    const next = editing ? saved.map(old=>old.id===editing ? m : old) : [...saved,m];
    try { localStorage.setItem(key,JSON.stringify({active:m.id,saved:next})); }
    catch { el("method-error").textContent=t("Browser storage is unavailable. Your recipe could not be saved."); return; }
    saved=next; active=m.id; dialog.close(); onChange();
  };
  return {refresh,selected:()=>active==="hoffmann" ? null : selected()};
}
