
const seed = {
  support: {
    phone: "0345 606 1373",
    email: "DPO@esure.com",
    hours: "Monday–Friday 8am–8pm, Saturday 9am–5pm, Sunday 10am–2pm"
  },
  customers: [{
    id: "cust-001",
    name: "Muhammad Dhanyal Naweed",
    email: "dhanyalnaweed@icloud.com",
    password: "",
    address: "6 Goscote Drive, Lutterworth, LE17 4ES",
    dob: "14/02/2008",
    policies: [{
      id: "pol-001",
      number: "ESU-BL23LUO-01",
      status: "Active",
      vehicleMake: "BMW",
      vehicleModel: "218i",
      engineCc: "1499",
      registration: "BL23 LUO",
      year: "2023",
      colour: "Black",
      premium: 382.35,
      premiumType: "Monthly",
      start: "1 July 2026",
      end: "29 July 2026",
      cover: "Comprehensive Cover",
      coverage: 10000,
      excess: 450,
      totalPaid: 382.35
    }]
  }]
};

function migrate(){
  const modern = JSON.parse(localStorage.getItem("esureDemoV2") || "null");
  if(modern) return modern;
  const old = JSON.parse(localStorage.getItem("esureDemoData") || "null");
  if(!old) return seed;
  return {
    support: old.support || seed.support,
    customers: [{
      id:"cust-001",
      name:old.customer?.name || seed.customers[0].name,
      email:old.customer?.email || seed.customers[0].email,
      password:old.customer?.password || "",
      address:old.customer?.address || seed.customers[0].address,
      dob:old.customer?.dob || seed.customers[0].dob,
      policies:[{
        ...seed.customers[0].policies[0],
        number:old.policy?.number || seed.customers[0].policies[0].number,
        status:old.policy?.status || "Active",
        vehicleMake:(old.policy?.vehicle || "BMW 218i").split(" ")[0],
        vehicleModel:(old.policy?.vehicle || "BMW 218i").split(" ").slice(1).join(" "),
        registration:old.policy?.registration || "BL23 LUO",
        year:old.policy?.year || "2023",
        colour:old.policy?.colour || "Black",
        premium:Number(old.policy?.premium || 382.35),
        premiumType:old.policy?.premiumType || "Monthly",
        start:old.policy?.start || "1 July 2026",
        end:old.policy?.end || "29 July 2026",
        cover:old.policy?.cover || "Comprehensive Cover",
        coverage:Number(old.policy?.coverage || 10000),
        excess:Number(old.policy?.excess || 450),
        totalPaid:Number(old.policy?.totalPaid || 382.35)
      }]
    }]
  };
}

let data=migrate();
function storedCustomerSession(){
  try{
    const saved=JSON.parse(sessionStorage.getItem("esureSessionV2")||"null");
    if(saved?.role==="customer" && data.customers.some(c=>c.id===saved.customerId)) return saved;
  }catch(error){
    console.warn("Could not restore customer session",error);
  }
  return null;
}
let session=storedCustomerSession();
let page="home";
let selectedCustomerId=data.customers[0]?.id || null;
let selectedPolicyId=null;

function save(){localStorage.setItem("esureDemoV2",JSON.stringify(data))}
function money(n){
  const value=Number(n);
  return new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP"}).format(Number.isFinite(value)?value:0)
}
function parseMoneyInput(value){
  if(typeof value==="number") return Number.isFinite(value)?value:0;
  const cleaned=String(value??"").replace(/[^0-9.-]/g,"");
  const parsed=Number(cleaned);
  return Number.isFinite(parsed)?parsed:0;
}
function parsePortalDate(text){
  let raw=String(text||"").trim();
  if(!raw) return null;

  // Accept weekday names, commas and common UK date formats.
  raw=raw
    .replace(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s+/i,"")
    .replace(/,/g,"")
    .replace(/\s+/g," ")
    .trim();

  // ISO: 2026-07-29
  let m=raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if(m){
    const d=new Date(Number(m[1]),Number(m[2])-1,Number(m[3]),23,59,59,999);
    return Number.isNaN(d.getTime())?null:d;
  }

  // UK numeric: 29/07/2026 or 29-07-2026
  m=raw.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if(m){
    const d=new Date(Number(m[3]),Number(m[2])-1,Number(m[1]),23,59,59,999);
    return Number.isNaN(d.getTime())?null:d;
  }

  const months={
    january:0,jan:0,february:1,feb:1,march:2,mar:2,april:3,apr:3,
    may:4,june:5,jun:5,july:6,jul:6,august:7,aug:7,september:8,sep:8,sept:8,
    october:9,oct:9,november:10,nov:10,december:11,dec:11
  };

  // Written UK date: 29 July 2026
  m=raw.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
  if(m){
    const month=months[m[2].toLowerCase()];
    if(month===undefined) return null;
    const d=new Date(Number(m[3]),month,Number(m[1]),23,59,59,999);
    return Number.isNaN(d.getTime())?null:d;
  }

  // Final browser parser fallback.
  const parsed=new Date(raw);
  return Number.isNaN(parsed.getTime())?null:parsed;
}
function daysRemaining(endDate,status){
  if(String(status||"").toLowerCase()!=="active") return 0;
  const end=parsePortalDate(endDate);
  if(!end) return "—";

  const today=new Date();
  today.setHours(0,0,0,0);
  end.setHours(23,59,59,999);

  const diff=end.getTime()-today.getTime();
  if(diff<0) return 0;

  // Inclusive count: a policy ending today shows 1 day remaining.
  return Math.floor(diff/86400000)+1;
}
function actualDaysUntil(endDate){
  const end=parsePortalDate(endDate);
  if(!end) return null;
  const today=new Date();
  today.setHours(0,0,0,0);
  end.setHours(23,59,59,999);
  return Math.floor((end.getTime()-today.getTime())/86400000)+1;
}
function refreshPolicyStatuses(){
  let changed=false;
  data.customers.forEach(customer=>{
    (customer.policies||[]).forEach(policy=>{
      const days=actualDaysUntil(policy.end);
      if(days!==null && days<=0 && policy.status!=="Expired"){
        policy.status="Expired";
        changed=true;
      }
    });
  });
  if(changed) save();
}
function renewalMessage(policy){
  if(policy.status!=="Active") return "";
  const days=actualDaysUntil(policy.end);
  if(days===null) return "";
  if(days===1) return `<div class="renewal-alert urgent">Expires today</div>`;
  if(days<=7) return `<div class="renewal-alert urgent">Renewal due in ${days} days</div>`;
  if(days<=14) return `<div class="renewal-alert warning">Renewal due in ${days} days</div>`;
  if(days<=30) return `<div class="renewal-alert notice">Renewal due in ${days} days</div>`;
  return "";
}
function app(){return document.getElementById("app")}
function currentCustomer(){
  if(session?.role==="customer") return data.customers.find(c=>c.id===session.customerId);
  return data.customers.find(c=>c.id===selectedCustomerId) || data.customers[0];
}
function sortedPolicies(c=currentCustomer()){
  return [...(c?.policies||[])].sort((a,b)=>{
    const aActive=a.status==="Active"?0:1;
    const bActive=b.status==="Active"?0:1;
    if(aActive!==bActive) return aActive-bActive;
    const ad=parsePortalDate(a.end)?.getTime()||0;
    const bd=parsePortalDate(b.end)?.getTime()||0;
    return bd-ad;
  });
}
function activePolicy(c=currentCustomer()){return sortedPolicies(c).find(p=>p.status==="Active") || sortedPolicies(c)[0]}
function currentPolicy(c=currentCustomer()){
  return (c?.policies||[]).find(p=>p.id===selectedPolicyId) || activePolicy(c);
}
function totalPolicies(c){return c?.policies?.length||0}
function activeCount(c){return (c?.policies||[]).filter(p=>p.status==="Active").length}
function previousCount(c){return (c?.policies||[]).filter(p=>p.status!=="Active").length}

function totalPaid(c){return (c?.policies||[]).reduce((a,p)=>a+Number(p.premium||0),0)}
function premiumBreakdown(c){
  const policies=sortedPolicies(c);
  if(!policies.length) return `<p class="muted">No policies found.</p>`;
  return `<div class="premium-breakdown">
    ${policies.map(p=>`
      <div class="premium-breakdown-row">
        <div>
          <strong>${htmlEscape(`${p.vehicleMake} ${p.vehicleModel}`.trim() || "Policy")}</strong>
          <small>${htmlEscape(p.registration || p.number)} • ${htmlEscape(p.status)}</small>
        </div>
        <strong>${money(p.premium)}</strong>
      </div>`).join("")}
    <div class="premium-breakdown-total">
      <span>Total of all policy premiums</span>
      <strong>${money(totalPaid(c))}</strong>
    </div>
  </div>`;
}
function htmlEscape(value){
  return String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[ch]));
}
function loginView(){
 app().innerHTML=`<div class="login-wrap"><div class="login-card">
 <div class="login-top"><img src="esure-logo.png" alt="esure"><span class="help-link">▣ Need help?</span></div>
 <h1>Log in to your account</h1>
 <label>Email address</label><input class="input" id="email" type="email" placeholder="e.g. johndoe@email.com">
 <label>Password</label><input class="input" id="password" type="password" placeholder="Enter your password">
 <button class="btn btn-orange btn-wide" onclick="login()">Next</button><p id="error" style="color:#c51f34;text-align:center"></p>
 </div></div>`;
}
async function login(){
 const email=document.getElementById("email").value.trim().toLowerCase();
 const pass=document.getElementById("password").value;
 const error=document.getElementById("error");
 error.textContent="";

 // Until customer accounts are moved to Firebase, continue using the
 // customer email/password saved with the existing browser portal data.
 const customer=data.customers.find(c=>
   String(c.email||"").trim().toLowerCase()===email &&
   String(c.password||"")===pass
 );
 if(customer){
   await firebase.auth().signOut().catch(()=>{});
   session={role:"customer",customerId:customer.id,auth:"browser"};
   sessionStorage.setItem("esureSessionV2",JSON.stringify(session));
   page="home";
   render();
   return;
 }

 // Administrator login remains protected by Firebase Authentication.
 try{
   const result=await firebase.auth().signInWithEmailAndPassword(email,pass);
   const userDoc=await firebase.firestore().collection("users").doc(result.user.uid).get();
   if(!userDoc.exists) throw new Error("This account has not been given portal access.");
   const profile=userDoc.data()||{};
   if(profile.role==="admin"){
     session={role:"admin",uid:result.user.uid,auth:"firebase"};
     sessionStorage.removeItem("esureSessionV2");
   }else if(profile.role==="customer" && profile.customerId){
     session={role:"customer",uid:result.user.uid,customerId:profile.customerId,auth:"firebase"};
     sessionStorage.removeItem("esureSessionV2");
   }else{
     throw new Error("This account has not been given a valid role.");
   }
   page="home";
   render();
 }catch(err){
   await firebase.auth().signOut().catch(()=>{});
   session=null;
   error.textContent=(err.code&&err.code.startsWith("auth/"))?"Email address or password is incorrect.":err.message;
 }
}
async function logout(){
 sessionStorage.removeItem("esureSessionV2");
 if(firebase.auth().currentUser) await firebase.auth().signOut().catch(()=>{});
 session=null;
 page="home";
 render();
}
function go(p){page=p;render();window.scrollTo(0,0)}

function header(){
 const c=currentCustomer();
 return `<div class="header">
 <div class="brand"><img src="esure-logo.png"><div><b>Portal</b><small>${session.role==="admin"?"Administrator":"User Portal"}</small></div></div>
 <div class="user-chip"><div class="avatar">${session.role==="admin"?"A":(c?.name||"U").charAt(0)}</div><div class="name"><b>${session.role==="admin"?"Admin":(c?.name||"User ").split(" ")[0]}</b><small>${session.role}</small></div></div>
 </div>`;
}
function nav(){
 const admin=session.role==="admin";
 return `<nav class="nav ${admin?"nav-admin nav-admin-account":""}">
 <button class="${page==="home"?"active":""}" onclick="go('home')">⌂<br>Home</button>
 <button class="${page==="profile"?"active":""}" onclick="go('profile')">♙<br>Profile</button>
 <button class="${page==="faq"?"active":""}" onclick="go('faq')">?<br>FAQ</button>
 <button class="${page==="certificate"?"active":""}" onclick="go('certificate')">▤<br>Document</button>
 ${admin?`<button class="${page==="admin"?"active":""}" onclick="go('admin')">⚙<br>Admin</button>
 <button class="${page==="account"?"active":""}" onclick="go('account')">♙<br>Account</button>`:""}
 <button class="logout" onclick="logout()">⇥<br>Logout</button>
 </nav>`;
}
function shell(body){app().innerHTML=`<div class="shell">${header()}${body}${nav()}</div>`}

function customerPolicyCard(c,p){
 return `<div class="card policy-card" onclick="${session.role==="admin"?`selectCustomer('${c.id}','policy','${p.id}')`:`selectPolicy('${p.id}','policy')`}" style="cursor:pointer">
 <div style="display:flex;justify-content:space-between;gap:12px"><span class="badge ${p.status.toLowerCase()}">${p.status}</span><small>${c.name}</small></div>
 <h2>${p.vehicleMake} ${p.vehicleModel}</h2><p>${p.year} • ${p.colour} • ${p.engineCc} cc</p>
 <h3>${p.registration}</h3>
 <div class="info-row">
   <div><small>${p.premiumType} premium</small><h2>${money(p.premium)}</h2></div>
   <div><small>Days Remaining</small><h2>${daysRemaining(p.end,p.status)}</h2></div>
 </div>
 <div style="margin-top:14px"><small>Policy number</small><h3>${p.number}</h3></div>
 ${renewalMessage(p)}
 </div>`;
}
function selectCustomer(id,target="profile",policyId=null){
  selectedCustomerId=id;
  selectedPolicyId=policyId;
  page=target;
  render();
}
function selectPolicy(policyId,target="policy"){
  selectedPolicyId=policyId;
  page=target;
  render();
}

function home(){
 if(session.role==="admin"){
   const all=[];
   data.customers.forEach(c=>(c.policies||[]).forEach(p=>all.push({c,p})));
   const active=all.filter(x=>x.p.status==="Active");
   const previous=all.filter(x=>x.p.status!=="Active");
   shell(`<section class="hero"><div><h1>Active Policies</h1><p>${active.length} active across ${data.customers.length} customer${data.customers.length===1?"":"s"}</p></div><div class="value"><small>Total Coverage</small><br>${money(active.reduce((a,x)=>a+Number(x.p.coverage||0),0))}</div></section>
   <div class="content">
     <h2>Active Policies</h2>
     ${active.length?active.map(x=>customerPolicyCard(x.c,x.p)).join(""):`<div class="card"><p>No active policies.</p></div>`}
     <h2 class="policy-section-title">Previous Policies</h2>
     ${previous.length?previous.sort((a,b)=>(parsePortalDate(b.p.end)?.getTime()||0)-(parsePortalDate(a.p.end)?.getTime()||0)).map(x=>customerPolicyCard(x.c,x.p)).join(""):`<div class="card"><p>No previous policies.</p></div>`}
     <div class="card green"><h2>Administrator tools</h2><p>Add, edit or remove customer accounts and multiple policies.</p><button class="btn btn-light" onclick="go('admin')">Open Admin</button></div>
   </div>`);
   return;
 }
 const c=currentCustomer();
 const policies=sortedPolicies(c);
 const active=policies.filter(p=>p.status==="Active");
 const previous=policies.filter(p=>p.status!=="Active");
 const activeCoverage=active.reduce((a,p)=>a+Number(p.coverage||0),0);
 shell(`<section class="hero"><div><h1>Active Policies</h1><p>${active.length} ${active.length===1?"policy":"policies"} currently active</p></div><div class="value"><small>Total Coverage</small><br>${money(activeCoverage)}</div></section>
 <div class="content">
   <h2>Active Policies</h2>
   ${active.length?active.map(p=>customerPolicyCard(c,p)).join(""):`<div class="card"><p>No active policies found.</p></div>`}
   <h2 class="policy-section-title">Previous Policies</h2>
   ${previous.length?previous.map(p=>customerPolicyCard(c,p)).join(""):`<div class="card"><p>No previous policies found.</p></div>`}
   <div class="card green"><h2>Need Help?</h2><p>Our customer service team is here to assist you with any questions about your policies.</p><button class="btn btn-light" onclick="go('faq')">View FAQ →</button></div>
 </div>`);
}
function policy(){
 const c=currentCustomer(),p=currentPolicy(c);
 if(!p){shell(`<div class="content"><h1>Policy Details</h1><div class="card">No policy found.</div></div>`);return}
 shell(`<div class="content"><h1>Policy Details</h1><p>${p.number}</p>
 ${customerPolicyCard(c,p)}
 <div class="info-row"><button class="card btn btn-light" onclick="go('profile')">Profile</button><button class="card btn btn-light" onclick="go('certificate')">Download PDF</button></div>
 <div class="card"><h2>Vehicle Details</h2>
 <div class="field"><label>Make</label><b>${p.vehicleMake}</b></div><br>
 <div class="field"><label>Model</label><b>${p.vehicleModel}</b></div><br>
 <div class="field"><label>Engine size</label><b>${p.engineCc} cc</b></div><br>
 <div class="field"><label>Registration</label><b>${p.registration}</b></div></div>
 <div class="card"><h2>Policy Period</h2>
 <div class="field"><label>Start Date</label><b>${p.start}</b></div><br><div class="field"><label>End Date</label><b>${p.end}</b></div><br>
 <div class="field"><label>Cover Level</label><b>${p.cover}</b></div><br><div class="field"><label>Excess</label><b>${money(p.excess)}</b></div></div></div>`);
}
function profile(){
 const c=currentCustomer(),p=currentPolicy(c);
 if(!c){shell(`<div class="content"><h1>Profile</h1><div class="card">No customer selected.</div></div>`);return}
 shell(`<div class="content"><h1>Profile</h1>
 <div class="card" style="background:linear-gradient(135deg,#2461ff,#9815ff);color:white"><h1>${c.name}</h1><p>${c.email}</p><span class="badge" style="background:#ffffff33;color:white">Premium Member</span></div>
 <div class="grid3"><div class="card stat"><strong>${activeCount(c)}</strong><span>Active</span></div><div class="card stat"><strong>${previousCount(c)}</strong><span>Previous</span></div><div class="card stat"><strong>${money(p?.coverage||0)}</strong><span>Coverage</span></div></div>
 <div class="card"><h2>Personal Information</h2><div class="field"><label>Email Address</label>${c.email}</div><br><div class="field"><label>Address</label>${c.address}</div><br><div class="field"><label>Date of birth</label>${c.dob}</div></div>
 <div class="card dark"><h2>Account Summary</h2><p class="muted">Your policy portfolio overview</p>
 <div class="info-row"><div><small>Total Premium Paid</small><h2>${money(totalPaid(c))}</h2></div><div><small>Policy Count</small><h2>${totalPolicies(c)}</h2></div></div>
 <hr style="border-color:#35425a">
 <p class="muted">Premium Breakdown</p>${premiumBreakdown(c)}
 <hr style="border-color:#35425a">
 <p class="muted">Latest Policy</p>${p?`<h3>${p.vehicleMake} ${p.vehicleModel} <span class="badge ${p.status.toLowerCase()}">${p.status}</span></h3><p>${p.start} – ${p.end}</p>`:"<p>No policies.</p>"}</div>
 <div class="card green"><h2>Need Assistance?</h2><p>Our team is here to help</p><button class="btn btn-light btn-wide" onclick="go('faq')">▤ FAQ</button></div></div>`);
}

const faqData=[
 ["Policy Management","How do I view my policy details?","You can view your policy details by logging into your account and navigating to the 'My Policies' section. Click on any policy card to see comprehensive details including coverage, premium, and vehicle information."],
 ["Policy Management","Can I download my policy certificate?","Yes! On your policy details page, you'll find a 'Download PDF' button. This will generate and download your official policy certificate with all relevant information."],
 ["Policy Management","How do I update my vehicle registration?","Contact your administrator or our customer service team to update vehicle registration details. Policy modifications require administrative approval for security and accuracy."],
 ["Claims","How do I make a claim?","To make a claim, contact our 24/7 claims hotline at 0302 124567. Have your policy number and incident details ready. You can also initiate claims through our mobile app for faster processing."],
 ["Claims","What information do I need for a claim?","You'll need your policy number, date and time of incident, location details, descriptions of what happened, and any relevant photos or documentation. Police report numbers are required for certain types of claims."],
 ["Claims","How long does claim processing take?","Most claims are processed within 5-10 business days. Complex claims may take longer. You'll receive regular updates on your claim status via email and SMS."],
 ["Billing","When is my premium due?","Your premium due date is shown on your policy details page. You can view upcoming payment dates and payment history in the 'Billing' section of your account."],
 ["Billing","Can I change my payment method?","Yes, you can update your payment method by contacting customer service. We accept direct debit, credit cards, and bank transfers for premium payments."],
 ["Account","How do I reset my password?","Click 'Forgot Password' on the login page and enter your email address. You'll receive a password reset link within a few minutes. Contact support if you don't receive the email."],
 ["Account","Can I update my contact information?","Yes, you can update most contact information through your profile page. For address changes, please contact customer service as this may affect your policy terms and premium."]
];
function faq(){
 shell(`<div class="content"><h1>Help Center</h1><p>Find answers to frequently asked questions</p><input class="input" id="faqSearch" placeholder="Search for help..." oninput="filterFaq()">
 <div id="faqList">${faqData.map(f=>`<div class="faq-item" data-text="${f.join(" ").toLowerCase()}"><button class="faq-q" onclick="this.parentElement.classList.toggle('open')">${f[1]} ▾</button><div class="faq-a"><b>${f[0]}</b><p>${f[2]}</p></div></div>`).join("")}</div>
 <div class="card green"><h2>Still need help?</h2><p>Our support team is here 24/7</p><button class="btn btn-light btn-wide" disabled>✉ Email Support</button><p><b>Telephone:</b> ${data.support.phone}</p><p><b>Email:</b> ${data.support.email}</p><p><b>Opening hours:</b> ${data.support.hours}</p></div>
 <div class="card"><h2>Quick Links</h2><button class="btn btn-light" onclick="go('home')">My Policies</button> <button class="btn btn-light" onclick="go('profile')">Profile</button></div></div>`);
}
function filterFaq(){const q=document.getElementById("faqSearch").value.toLowerCase();document.querySelectorAll(".faq-item").forEach(x=>x.style.display=x.dataset.text.includes(q)?"block":"none")}


function certificate(){
 const c=currentCustomer(),p=currentPolicy(c);
 if(!c||!p){shell(`<div class="content"><div class="card">No document available.</div></div>`);return}
 const fullVehicle=`${p.vehicleMake} ${p.vehicleModel}`.trim().toUpperCase();
 const policyholder=c.name;
 shell(`
 <div class="content no-print certificate-actions">
   <button class="btn btn-primary" onclick="window.print()">Download PDF / Print</button>
 </div>

 <div class="cert-page-wrap">
   <article class="motor-certificate">
     <div class="cert-watermarks" aria-hidden="true">
       ${Array.from({length:28},(_,i)=>`<span style="left:${(i%4)*25+4}%;top:${Math.floor(i/4)*14+5}%">esure</span>`).join("")}
     </div>

     <div class="cert-logo">esure</div>

     <section class="cert-top">
       <div class="cert-title-block">
         <h1>Certificate of Motor Insurance</h1>
         <p>This certificate is evidence that you have insurance to comply with the law.<br>
         Please be aware it will not be valid if changed in any way.</p>
       </div>
       <div class="cert-meta">
         <p><strong>Date of:</strong> ${p.start}</p>
         <p>Issue: Certificate and<br>
         Policy Number :<br>
         <strong>${p.number}</strong></p>
       </div>
     </section>

     <div class="cert-columns">
       <section class="cert-column cert-left">
         <div class="blue-rule"></div>

         <h3>1) Description of vehicle:</h3>
         <p><strong>a) Vehicle Registration:</strong> ${p.registration}</p>
         <p><strong>Vehicle Model:</strong> ${fullVehicle}</p>
         <p><strong>Vehicle Year of Manufacture:</strong> ${p.year}</p>
         <p><strong>Vehicle Make:</strong> ${String(p.vehicleMake||"").toUpperCase()}</p>

         <p class="cert-spacer"><strong>b)</strong> Any motor vehicle supplied to the policyholder by the company's recommended repairer or approved supplier while the vehicle described above is being repaired as a direct result of the damage covered by the policy.</p>

         <p><strong>c)</strong> Any motor vehicle supplied to the policyholder by the company's approved vehicle supplier following the unrecovered theft of the total loss of the vehicle described above, which is the subject of a claim covered by the policy.</p>

         <p class="cert-spacer"><strong>2) Name of policyholder:</strong> ${policyholder}</p>

         <p>Effective date of the commencement of insurance for the purposes of the relevant law: ${p.start} at 00:01 hours</p>
         <p>Date of expiry of insurance: ${p.end} at 23:59 hours</p>

         <p>Persons or classes of persons entitled to drive:</p>
         <p>Provided that the person driving holds a licence to drive the vehicle and is not disqualified from holding or obtaining such a licence.</p>

         <p>I hereby certify that the policy to which this certificate relates satisfies the requirements of the relevant law applicable in Great Britain, Northern Ireland, the Isle of Man, the Island of Jersey, the Island of Guernsey and the Island of Alderney.</p>

         <p>Advice to third parties: Nothing contained in this certificate affects your rights as a third party to make a claim.</p>
       </section>

       <section class="cert-column cert-right">
         <div class="blue-rule"></div>

         <h3>3) Driving other cars:</h3>
         <p>The policyholder, ${policyholder}, may also drive a car that is not described above, not hired or leased to them under a hire purchase or leasing agreement, with the owner's permission to drive.</p>

         <h3 class="cert-spacer">4) Limitations as to use:</h3>
         <p>Use for social, domestic and pleasure purposes only</p>

         <p>This policy does not cover:</p>
         <ul class="cert-dashes">
           <li>Use for travel to or from any place of study or work</li>
           <li>Use for any business use including courier or food collection or delivery, hire or carrying goods or people for payment</li>
           <li>Use for any purpose in connection with the motor trade</li>
           <li>Use for competitions, off-road events, pace making, racing, rallies, speed testing, track days or trials</li>
           <li>Use to secure the release of a vehicle which has been seized by or on behalf of any government or public authority other than the vehicle whose registration is listed in this certificate</li>
         </ul>
       </section>
     </div>

     <p class="cert-booklet">For full details of your insurance cover take a look at your latest policy booklet and schedule.</p>

     <footer class="cert-footer">
       <img src="signature.png" alt="">
       <p><strong>David McMillan</strong><br>
       Chief Executive Officer<br>
       esure Insurance Limited, The Observatory, Reigate, Surrey, RH2 0SG<br>
       Authorised Insurer</p>
     </footer>

   </article>
 </div>`);
}

function blankCustomer(){
 return {id:"cust-"+Date.now(),name:"New Customer",email:"newcustomer@example.com",password:"Temporary1",address:"",dob:"",policies:[blankPolicy()]}
}
function admin(){
 const c=currentCustomer();
 if(!c){shell(`<div class="content"><h1>Admin</h1><button class="btn btn-primary" onclick="addCustomer()">Add customer</button></div>`);return}
 const p=currentPolicy(c);
 shell(`<div class="content"><h1>Admin</h1>
 <div class="card">
 <label>Select customer<select class="input" onchange="selectedCustomerId=this.value;selectedPolicyId=null;render()">${data.customers.map(x=>`<option value="${x.id}" ${x.id===c.id?"selected":""}>${x.name} — ${x.email}</option>`).join("")}</select></label>
 <label>Select policy<select class="input" onchange="selectedPolicyId=this.value;render()">${sortedPolicies(c).map(x=>`<option value="${x.id}" ${x.id===p.id?"selected":""}>${x.status} — ${x.registration||"No registration"} — ${x.number}</option>`).join("")}</select></label>
 <div class="admin-actions">
   <button class="btn btn-primary" onclick="addCustomer()">Add Customer</button>
   <button class="btn btn-success" onclick="addPolicy()">Add Another Policy</button>
   <button class="btn btn-danger" onclick="removePolicy()">Remove Selected Policy</button>
   <button class="btn btn-danger" onclick="removeCustomer()">Remove Customer Completely</button>
   <button class="btn btn-light" onclick="logout()">Logout</button>
 </div></div>

 <div class="card admin-grid">
 ${inp("Customer name","customer.name",c.name)}${inp("Customer email","customer.email",c.email)}${inp("Address","customer.address",c.address,"full")}${inp("Date of birth","customer.dob",c.dob)}${inp("Customer password","customer.password",c.password)}
 ${inp("Vehicle make","policy.vehicleMake",p.vehicleMake)}${inp("Vehicle model","policy.vehicleModel",p.vehicleModel)}${inp("Vehicle cc","policy.engineCc",p.engineCc)}${inp("Registration","policy.registration",p.registration)}
 ${inp("Vehicle year","policy.year",p.year)}${inp("Colour","policy.colour",p.colour)}${inp("Policy number","policy.number",p.number)}${inp("Premium","policy.premium",p.premium)}
 ${inp("Premium type","policy.premiumType",p.premiumType)}${inp("Start date","policy.start",p.start)}${inp("End date","policy.end",p.end)}${inp("Cover level","policy.cover",p.cover)}
 ${inp("Coverage amount","policy.coverage",p.coverage)}${inp("Excess","policy.excess",p.excess)}${inp("Total premium paid","policy.totalPaid",p.totalPaid)}
 <label>Status<select id="policy.status"><option ${p.status==="Active"?"selected":""}>Active</option><option ${p.status==="Expired"?"selected":""}>Expired</option></select></label>
 ${inp("Support telephone","support.phone",data.support.phone)}${inp("Support email","support.email",data.support.email)}${inp("Opening hours","support.hours",data.support.hours,"full")}
 <button class="btn btn-primary full" onclick="saveAdmin()">Save Customer Details</button>
 </div>
 </div>`);
}
function inp(label,id,value,cls=""){return `<label class="${cls}">${label}<input id="${id}" value="${String(value??"").replace(/"/g,"&quot;")}"></label>`}
function blankPolicy(){
 return {
   id:"pol-"+Date.now(),
   number:"ESU-"+Math.random().toString(36).slice(2,9).toUpperCase(),
   status:"Active",
   vehicleMake:"",
   vehicleModel:"",
   engineCc:"",
   registration:"",
   year:"",
   colour:"",
   premium:0,
   premiumType:"Monthly",
   start:"",
   end:"",
   cover:"Comprehensive Cover",
   coverage:10000,
   excess:450,
   totalPaid:0
 };
}
function addPolicy(){
 const c=currentCustomer();
 if(!c) return;
 const p=blankPolicy();
 c.policies=c.policies||[];
 c.policies.push(p);
 selectedPolicyId=p.id;
 save();
 page="admin";
 render();
}
function removePolicy(){
 const c=currentCustomer(),p=currentPolicy(c);
 if(!c||!p) return;
 if(!confirm(`Remove policy ${p.number} from ${c.name}? This cannot be undone.`)) return;
 c.policies=c.policies.filter(x=>x.id!==p.id);
 selectedPolicyId=c.policies[0]?.id||null;
 save();
 render();
}
function addCustomer(){const c=blankCustomer();data.customers.push(c);selectedCustomerId=c.id;selectedPolicyId=c.policies[0]?.id||null;save();page="admin";render()}
function removeCustomer(){
 const c=currentCustomer();if(!c)return;
 if(!confirm(`Remove ${c.name} and all of their details and policies? This cannot be undone.`))return;
 data.customers=data.customers.filter(x=>x.id!==c.id);selectedCustomerId=data.customers[0]?.id||null;save();render();
}
function saveAdmin(showMessage=true){
 const c=currentCustomer(),p=currentPolicy(c);
 document.querySelectorAll(".admin-grid input,.admin-grid select").forEach(el=>{
   const [group,key]=el.id.split(".");
   let v=el.value;
   if(["premium","coverage","excess","totalPaid"].includes(key))v=parseMoneyInput(v);
   if(group==="customer")c[key]=v;else if(group==="policy")p[key]=v;else if(group==="support")data.support[key]=v;
 });
 save();
 if(showMessage){alert("Customer details saved.");render();}
}

function firebaseAccountError(error){
  const code=error?.code||"";
  if(code==="auth/wrong-password" || code==="auth/invalid-credential") return "Your current password is incorrect.";
  if(code==="auth/email-already-in-use") return "That email address is already being used.";
  if(code==="auth/invalid-email") return "Enter a valid email address.";
  if(code==="auth/weak-password") return "Choose a stronger password with at least 6 characters.";
  if(code==="auth/requires-recent-login") return "For security, log out and sign in again before changing these details.";
  if(code==="auth/operation-not-allowed") return "Firebase requires the new email address to be verified first.";
  return error?.message||"The change could not be completed.";
}
function account(){
  if(session?.role!=="admin"){page="home";render();return;}
  shell(`<div class="content">
    <h1>Account</h1>
    <p class="muted">Change the administrator password. This page is only visible to administrators.</p>

    <div class="card account-card">
      <h2>Change admin password</h2>
      <label>Current password</label>
      <input class="input" id="accountCurrentPassword" type="password" autocomplete="current-password" placeholder="Enter current password">
      <label>New password</label>
      <input class="input" id="accountNewPassword" type="password" autocomplete="new-password" placeholder="At least 6 characters">
      <label>Confirm new password</label>
      <input class="input" id="accountConfirmPassword" type="password" autocomplete="new-password" placeholder="Enter new password again">
      <button class="btn btn-primary btn-wide" onclick="changeAdminPassword()">Change password</button>
      <p class="account-message" id="accountPasswordMessage" aria-live="polite"></p>
    </div>
  </div>`);
}
async function reauthenticateAdmin(currentPassword){
  const user=firebase.auth().currentUser;
  if(!user?.email) throw new Error("No administrator is signed in.");
  const credential=firebase.auth.EmailAuthProvider.credential(user.email,currentPassword);
  await user.reauthenticateWithCredential(credential);
  return user;
}
async function changeAdminPassword(){
  const currentPassword=document.getElementById("accountCurrentPassword").value;
  const newPassword=document.getElementById("accountNewPassword").value;
  const confirmPassword=document.getElementById("accountConfirmPassword").value;
  const message=document.getElementById("accountPasswordMessage");
  message.className="account-message";
  message.textContent="";
  if(!currentPassword||!newPassword||!confirmPassword){message.classList.add("error");message.textContent="Complete all password fields.";return;}
  if(newPassword.length<6){message.classList.add("error");message.textContent="The new password must contain at least 6 characters.";return;}
  if(newPassword!==confirmPassword){message.classList.add("error");message.textContent="The new passwords do not match.";return;}
  try{
    const user=await reauthenticateAdmin(currentPassword);
    await user.updatePassword(newPassword);
    message.classList.add("success");
    message.textContent="Admin password changed successfully.";
    document.getElementById("accountCurrentPassword").value="";
    document.getElementById("accountNewPassword").value="";
    document.getElementById("accountConfirmPassword").value="";
  }catch(error){
    message.classList.add("error");
    message.textContent=firebaseAccountError(error);
  }
}

function render(){
 refreshPolicyStatuses();
 if(!session)loginView();
 else({home,profile,faq,policy,certificate,admin,account}[page]||home)();
}
firebase.auth().onAuthStateChanged(async user=>{
  if(!user){
    session=storedCustomerSession();
    render();
    return;
  }
  try{
    const snap=await firebase.firestore().collection("users").doc(user.uid).get();
    const profile=snap.exists?(snap.data()||{}):{};
    if(profile.role==="admin"){
      session={role:"admin",uid:user.uid,auth:"firebase"};
      sessionStorage.removeItem("esureSessionV2");
    }else if(profile.role==="customer" && profile.customerId){
      session={role:"customer",uid:user.uid,customerId:profile.customerId,auth:"firebase"};
      sessionStorage.removeItem("esureSessionV2");
    }else{
      await firebase.auth().signOut();
      session=storedCustomerSession();
    }
  }catch(e){
    console.error(e);
    session=storedCustomerSession();
  }
  render();
});
