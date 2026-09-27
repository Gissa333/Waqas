const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

const today = new Date().toISOString().slice(0,10);
let db = JSON.parse(localStorage.getItem("snowWhiteDentalDB") || "null") || {
  patients: [],
  appointments: [],
  treatments: [],
  payments: []
};

function save(){ localStorage.setItem("snowWhiteDentalDB", JSON.stringify(db)); renderAll(); }

function money(n){ return new Intl.NumberFormat("ar-SA").format(Number(n)||0) + " ر.س"; }
function patientName(id){ return db.patients.find(p=>p.id===id)?.name || "غير محدد"; }
function emptyRow(cols,msg="لا توجد بيانات"){ return '<tr><td colspan="'+cols+'" class="empty">'+msg+'</td></tr>'; }

function renderAll(){
  $("#stat-patients").textContent=db.patients.length;
  $("#stat-appointments").textContent=db.appointments.filter(a=>a.date===today).length;
  $("#stat-treatments").textContent=db.treatments.length;
  const revenue=db.payments.reduce((s,p)=>s+Number(p.amount||0),0);
  $("#stat-revenue").textContent=money(revenue);
  $("#finance-revenue").textContent=money(revenue);
  $("#finance-count").textContent=db.payments.length;
  renderPatients();
  renderAppointments();
  renderTreatments();
  renderFinance();
  renderDashboard();
}

function renderDashboard(){
  const apps=db.appointments.filter(a=>a.date===today).slice(0,6);
  $("#today-list").innerHTML=apps.length?apps.map(a=>'<div class="list-item"><div><b>'+patientName(a.patientId)+'</b><div class="muted">'+a.doctor+'</div></div><span class="badge">'+a.time+'</span></div>').join(""):'<div class="empty">لا توجد مواعيد اليوم</div>';
  const recent=[...db.patients].reverse().slice(0,6);
  $("#recent-patients").innerHTML=recent.length?recent.map(p=>'<div class="list-item"><div><b>'+p.name+'</b><div class="muted">'+p.phone+'</div></div><span class="badge">'+(p.lastVisit||"جديد")+'</span></div>').join(""):'<div class="empty">لم تتم إضافة مرضى بعد</div>';
}

function renderPatients(){
  const q=($("#patient-search")?.value||"").trim().toLowerCase();
  const rows=db.patients.filter(p=>(p.name+" "+p.phone).toLowerCase().includes(q));
  $("#patients-table").innerHTML=rows.length?rows.map(p=>'<tr><td><b>'+p.name+'</b></td><td>'+p.phone+'</td><td>'+p.age+'</td><td>'+ (p.lastVisit||"-") +'</td><td><span class="danger" onclick="deletePatient(\''+p.id+'\')">حذف</span></td></tr>').join(""):emptyRow(5,"لا يوجد مرضى");
}

function renderAppointments(){
  const rows=[...db.appointments].sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
  $("#appointments-table").innerHTML=rows.length?rows.map(a=>'<tr><td>'+a.date+'</td><td>'+a.time+'</td><td><b>'+patientName(a.patientId)+'</b></td><td>'+a.doctor+'</td><td><span class="badge">'+a.status+'</span></td></tr>').join(""):emptyRow(5,"لا توجد مواعيد");
}

function renderTreatments(){
  $("#treatments-table").innerHTML=db.treatments.length?db.treatments.map(t=>'<tr><td>'+t.date+'</td><td>'+patientName(t.patientId)+'</td><td>'+t.name+'</td><td>'+t.doctor+'</td><td>'+money(t.cost)+'</td></tr>').join(""):emptyRow(5,"لا توجد علاجات مسجلة");
}

function renderFinance(){
  $("#finance-table").innerHTML=db.payments.length?db.payments.map(p=>'<tr><td>'+p.date+'</td><td>'+patientName(p.patientId)+'</td><td>'+p.description+'</td><td><b>'+money(p.amount)+'</b></td></tr>').join(""):emptyRow(4,"لا توجد مدفوعات");
}

function openModal(title,html,onSubmit){
  $("#modal-title").textContent=title;
  $("#modal-form").innerHTML=html;
  $("#modal").classList.remove("hidden");
  $("#modal-form").onsubmit=e=>{e.preventDefault();onSubmit(new FormData(e.target));$("#modal").classList.add("hidden");};
}

function patientOptions(){return db.patients.map(p=>'<option value="'+p.id+'">'+p.name+'</option>').join("")}

function addPatient(){
  openModal("إضافة مريض",'<div class="form-grid"><div class="field"><label>اسم المريض</label><input name="name" required></div><div class="field"><label>رقم الهاتف</label><input name="phone" required></div><div class="field"><label>العمر</label><input name="age" type="number" min="0"></div><div class="field"><label>آخر زيارة</label><input name="lastVisit" type="date"></div><div class="field full"><label>ملاحظات</label><textarea name="notes" rows="3"></textarea></div></div><div class="form-actions"><button class="primary">حفظ المريض</button></div>',
  f=>{db.patients.push({id:crypto.randomUUID(),name:f.get("name"),phone:f.get("phone"),age:f.get("age")||"-",lastVisit:f.get("lastVisit")||"",notes:f.get("notes")||""});save();});
}

function addAppointment(){
  if(!db.patients.length){alert("أضف مريضاً أولاً.");return;}
  openModal("موعد جديد",'<div class="form-grid"><div class="field"><label>المريض</label><select name="patientId" required>'+patientOptions()+'</select></div><div class="field"><label>الطبيب</label><input name="doctor" value="د. بياض الثلج" required></div><div class="field"><label>التاريخ</label><input name="date" type="date" value="'+today+'" required></div><div class="field"><label>الوقت</label><input name="time" type="time" required></div><div class="field full"><label>الحالة</label><select name="status"><option>مؤكد</option><option>بانتظار التأكيد</option><option>تمت الزيارة</option><option>ملغي</option></select></div></div><div class="form-actions"><button class="primary">حفظ الموعد</button></div>',
  f=>{db.appointments.push({id:crypto.randomUUID(),patientId:f.get("patientId"),doctor:f.get("doctor"),date:f.get("date"),time:f.get("time"),status:f.get("status")});save();});
}

function addTreatment(){
  if(!db.patients.length){alert("أضف مريضاً أولاً.");return;}
  openModal("تسجيل علاج",'<div class="form-grid"><div class="field"><label>المريض</label><select name="patientId" required>'+patientOptions()+'</select></div><div class="field"><label>التاريخ</label><input name="date" type="date" value="'+today+'" required></div><div class="field"><label>نوع العلاج</label><input name="name" placeholder="تنظيف، حشو، خلع..." required></div><div class="field"><label>الطبيب</label><input name="doctor" value="د. بياض الثلج"></div><div class="field full"><label>التكلفة</label><input name="cost" type="number" min="0" step="0.01" required></div></div><div class="form-actions"><button class="primary">حفظ العلاج</button></div>',
  f=>{const patientId=f.get("patientId"),cost=Number(f.get("cost")||0);db.treatments.push({id:crypto.randomUUID(),patientId,date:f.get("date"),name:f.get("name"),doctor:f.get("doctor"),cost});db.payments.push({id:crypto.randomUUID(),patientId,date:f.get("date"),description:f.get("name"),amount:cost});save();});
}

function deletePatient(id){
  if(!confirm("حذف المريض وجميع بياناته المرتبطة؟"))return;
  db.patients=db.patients.filter(p=>p.id!==id);
  db.appointments=db.appointments.filter(a=>a.patientId!==id);
  db.treatments=db.treatments.filter(t=>t.patientId!==id);
  db.payments=db.payments.filter(p=>p.patientId!==id);
  save();
}

$$(".nav-btn").forEach(btn=>btn.onclick=()=>showSection(btn.dataset.section));
$$("[data-go]").forEach(btn=>btn.onclick=()=>showSection(btn.dataset.go));
function showSection(id){
  $$(".section").forEach(s=>s.classList.remove("active"));
  $("#"+id).classList.add("active");
  $$(".nav-btn").forEach(b=>b.classList.toggle("active",b.dataset.section===id));
  const titles={dashboard:"لوحة التحكم",patients:"المرضى",appointments:"المواعيد",treatments:"العلاجات",finance:"الحسابات"};
  $("#page-title").textContent=titles[id];
}

$("#quick-add").onclick=addPatient;
$("#add-patient").onclick=addPatient;
$("#add-appointment").onclick=addAppointment;
$("#add-treatment").onclick=addTreatment;
$("#close-modal").onclick=()=>$("#modal").classList.add("hidden");
$("#modal").onclick=e=>{if(e.target.id==="modal")$("#modal").classList.add("hidden")};
$("#patient-search").oninput=renderPatients;
$("#today").textContent=new Intl.DateTimeFormat("ar-SA",{dateStyle:"full"}).format(new Date());

window.deletePatient=deletePatient;
renderAll();
