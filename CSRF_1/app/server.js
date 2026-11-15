/*
 * ShopBase - a deliberately small, insecure web app for demonstrating
 * GET-based Cross-Site Request Forgery (CSRF Variant 1: forged action).
 *
 * Cyber Security (IT-30001) - IIIT Allahabad
 *
 * ZERO DEPENDENCIES: built-in modules only.
 *   node app/server.js            -> VULNERABLE  (no CSRF protection)
 *   SECURE=1 node app/server.js   -> MITIGATED   (synchronizer token required)
 *
 * The state-changing action targeted by the attack is "change account email",
 * which lives under Login & security (a realistic place for it). In vulnerable
 * mode a forged cross-site GET changes it; in mitigated mode it is rejected 403.
 */

const http = require('http');
const crypto = require('crypto');
const { URL } = require('url');

const PORT = 3000;
const SECURE = process.env.SECURE === '1';

const users = {
  priya: {
    username: 'priya', password: 'password123',
    name: 'Priya Sharma', email: 'priya@shopbase.com',
    phone: '+91 98765 4xx10', wallet: 4820, memberSince: 'Mar 2023',
  },
};
const sessions = Object.create(null);

const orders = [
  { id: 'OD3391845720', item: 'boAt Rockerz 550 Wireless Headphones', date: '12 Nov 2026', amt: 1799, status: 'Delivered' },
  { id: 'OD3390114562', item: 'Prestige Induction Cooktop 2000W',     date: '06 Nov 2026', amt: 2449, status: 'Delivered' },
  { id: 'OD3388907431', item: 'Classmate Notebooks (Pack of 6)',      date: '02 Nov 2026', amt:  320, status: 'Shipped'   },
  { id: 'OD3387220198', item: 'Wildcraft 35L Laptop Backpack',        date: '28 Oct 2026', amt: 1299, status: 'Processing'},
];

function parseCookies(req){const h=req.headers.cookie||'';const o={};h.split(';').forEach(p=>{const i=p.indexOf('=');if(i>-1)o[p.slice(0,i).trim()]=decodeURIComponent(p.slice(i+1).trim());});return o;}
function getSession(req){const sid=parseCookies(req).sid;return sid&&sessions[sid]?{sid,data:sessions[sid]}:null;}
function currentUser(req){const s=getSession(req);return s&&s.data.username?users[s.data.username]:null;}
function send(res,status,html,extra={}){res.writeHead(status,{'Content-Type':'text/html; charset=utf-8',...extra});res.end(html);}
function readBody(req){return new Promise(r=>{let b='';req.on('data',c=>b+=c);req.on('end',()=>{const p={};new URLSearchParams(b).forEach((v,k)=>p[k]=v);r(p);});});}
function inr(n){return n.toLocaleString('en-IN');}

const ICON = {
  grid:'<path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z"/>',
  box:'<path d="M21 16V8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="M3.3 7 12 12l8.7-5M12 22V12"/>',
  pin:'<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
  card:'<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>',
  lock:'<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
};
function navItem(href,ic,label,active){
  return `<a class="side-link${active?' active':''}" href="${href}">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${ICON[ic]}</svg>
    <span>${label}</span></a>`;
}
function badge(status){
  const m={Delivered:'ok',Shipped:'info',Processing:'warn'}[status]||'info';
  return `<span class="tag ${m}">${status}</span>`;
}

const STYLE = `
*{box-sizing:border-box}
body{margin:0;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:#eef1f6;color:#1b2436}
a{color:#13326b;text-decoration:none}
.topbar{background:#0f2a57;color:#fff;display:flex;align-items:center;gap:22px;padding:0 26px;height:60px;position:sticky;top:0;z-index:10}
.logo{display:flex;align-items:center;gap:9px;font-weight:800;font-size:1.22rem;letter-spacing:.2px}
.logo .mark{width:30px;height:30px;border-radius:7px;background:#ff6a2b;display:grid;place-items:center}
.search{flex:1;max-width:520px;display:flex;background:#fff;border-radius:7px;overflow:hidden}
.search input{flex:1;border:0;padding:10px 14px;font-size:.95rem;outline:none}
.search .go{background:#ff6a2b;color:#fff;border:0;padding:0 16px;font-weight:700;cursor:pointer}
.topnav{display:flex;align-items:center;gap:20px;font-size:.92rem}
.topnav .who{opacity:.85}.topnav .who b{color:#fff}
.demo{font-size:.68rem;font-weight:800;letter-spacing:.5px;padding:4px 9px;border-radius:5px;text-transform:uppercase}
.demo.vuln{background:#ffe0e3;color:#c81e3a}.demo.safe{background:#d8f5e4;color:#0f7a42}
.shell{max-width:1060px;margin:26px auto;padding:0 20px;display:grid;grid-template-columns:230px 1fr;gap:24px}
.side{background:#fff;border:1px solid #e3e8f0;border-radius:12px;padding:10px;height:max-content}
.side-link{display:flex;align-items:center;gap:11px;padding:11px 13px;border-radius:9px;color:#394559;font-weight:600;font-size:.94rem}
.side-link svg{width:19px;height:19px;color:#8793a8}
.side-link:hover{background:#f3f6fb}
.side-link.active{background:#eaf0fb;color:#0f2a57}.side-link.active svg{color:#0f2a57}
.panel{background:#fff;border:1px solid #e3e8f0;border-radius:12px;padding:22px 24px;margin-bottom:22px}
.panel h2{margin:0 0 4px;font-size:1.15rem}.panel .sub{color:#6b7488;font-size:.9rem;margin-bottom:16px}
.hello{display:flex;align-items:center;gap:15px}
.avatar{width:50px;height:50px;border-radius:50%;background:#0f2a57;color:#fff;display:grid;place-items:center;font-weight:700;font-size:1.3rem}
.hello .n{font-weight:700;font-size:1.15rem}.hello .m{color:#6b7488;font-size:.88rem}
.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:18px}
.stat{border:1px solid #e9edf4;border-radius:10px;padding:14px 16px}
.stat .k{color:#6b7488;font-size:.78rem;text-transform:uppercase;letter-spacing:.4px}
.stat .v{font-size:1.4rem;font-weight:800;margin-top:4px}
table{width:100%;border-collapse:collapse;font-size:.92rem}
th{text-align:left;color:#6b7488;font-weight:600;font-size:.78rem;text-transform:uppercase;letter-spacing:.3px;padding:9px 8px;border-bottom:1px solid #eef1f6}
td{padding:12px 8px;border-bottom:1px solid #f1f4f9;vertical-align:top}
td .oid{color:#8793a8;font-size:.78rem}
.tag{font-size:.74rem;font-weight:700;padding:4px 10px;border-radius:999px}
.tag.ok{background:#d8f5e4;color:#0f7a42}.tag.info{background:#e1ecff;color:#1c4fb0}.tag.warn{background:#fff0d6;color:#9a6400}
.setrow{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:15px 0;border-bottom:1px solid #f1f4f9}
.setrow:last-child{border-bottom:0}
.setlabel{color:#6b7488;font-size:.78rem;text-transform:uppercase;letter-spacing:.4px}
.setval{font-weight:600;margin-top:3px}
details.edit summary{list-style:none;cursor:pointer;background:#f3f6fb;border:1px solid #dbe2ee;color:#0f2a57;font-weight:600;font-size:.86rem;padding:8px 15px;border-radius:8px}
details.edit summary::-webkit-details-marker{display:none}
details.edit[open] summary{background:#eaf0fb}
.editform{display:flex;gap:10px;margin-top:12px;flex-wrap:wrap}
.editform input{flex:1;min-width:220px;padding:10px 13px;border:1px solid #cfd8e6;border-radius:8px;font-size:.95rem}
.btn{border:0;border-radius:8px;background:#ff6a2b;color:#fff;font-weight:700;padding:10px 20px;font-size:.92rem;cursor:pointer}
.btn:hover{filter:brightness(1.05)}
.ghost{background:#f3f6fb;border:1px solid #dbe2ee;color:#0f2a57;font-weight:600;padding:8px 15px;border-radius:8px;font-size:.86rem;cursor:pointer}
.note{background:#fbfcfe;border:1px solid #e9edf4;border-radius:9px;padding:11px 14px;color:#6b7488;font-size:.84rem;margin-top:14px}
.banner{padding:14px 16px;border-radius:10px;font-weight:600;margin-bottom:14px}
.banner.ok{background:#e4f8ec;border:1px solid #b5e8c9;color:#0f7a42}
.banner.bad{background:#fde7ea;border:1px solid #f3c0c8;color:#c81e3a}
.auth{max-width:400px;margin:70px auto;padding:0 20px}
.auth .panel{padding:28px}
label.fld{display:block;font-size:.8rem;color:#6b7488;margin:14px 0 6px;font-weight:600}
input.big{width:100%;padding:12px 14px;border:1px solid #cfd8e6;border-radius:9px;font-size:1rem}
.foot{grid-column:1/-1;text-align:center;color:#9aa3b4;font-size:.8rem;padding:10px 0 4px}
`;

function chrome(req, body, opts={}){
  const user = currentUser(req);
  const header = `
  <div class="topbar">
    <div class="logo"><span class="mark"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18M16 10a4 4 0 0 1-8 0"/></svg></span>ShopBase</div>
    <div class="search"><input placeholder="Search for products, brands and more" ${opts.auth?'disabled':''}><button class="go">Search</button></div>
    <div class="topnav">
      <span class="demo ${SECURE?'safe':'vuln'}">${SECURE?'Demo: Protected':'Demo: Vulnerable'}</span>
      ${user?`<span class="who">Hi, <b>${user.name.split(' ')[0]}</b></span><a style="color:#fff" href="/logout">Sign out</a>`:`<a style="color:#fff" href="/">Sign in</a>`}
    </div>
  </div>`;
  if(opts.auth){
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${opts.title} - ShopBase</title><style>${STYLE}</style></head><body>${header}<div class="auth">${body}</div></body></html>`;
  }
  const side = `<nav class="side">
    ${navItem('/account','grid','Overview',opts.active==='overview')}
    ${navItem('/account#orders','box','My Orders',false)}
    ${navItem('/account#address','pin','Addresses',false)}
    ${navItem('/account#payments','card','Payments',false)}
    ${navItem('/account#security','lock','Login & security',opts.active==='security')}
  </nav>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${opts.title} - ShopBase</title><style>${STYLE}</style></head><body>${header}
    <div class="shell">${side}<main>${body}</main>
      <div class="foot">ShopBase demo - CSRF (GET-based forged action) - IT-30001</div>
    </div></body></html>`;
}

const server = http.createServer(async (req,res)=>{
  const u = new URL(req.url, `http://localhost:${PORT}`);
  const path = u.pathname;

  if(req.method==='GET' && path==='/'){
    if(currentUser(req)){res.writeHead(302,{Location:'/account'});return res.end();}
    return send(res,200,chrome(req,`
      <div class="panel">
        <h2>Sign in</h2>
        <div class="sub">Access your orders, wallet and account settings.</div>
        <form method="POST" action="/login">
          <label class="fld">Username</label>
          <input class="big" name="username" value="priya" autocomplete="off">
          <label class="fld">Password</label>
          <input class="big" type="password" name="password" value="password123">
          <button class="btn" style="width:100%;margin-top:20px;padding:12px">Sign in securely</button>
        </form>
        <div class="note">Demo account is pre-filled: priya / password123</div>
      </div>`,{auth:true,title:'Sign in'}));
  }

  if(req.method==='POST' && path==='/login'){
    const {username,password}=await readBody(req);
    const user=users[username];
    if(user&&user.password===password){
      const sid=crypto.randomBytes(16).toString('hex');
      sessions[sid]={username,csrfToken:crypto.randomBytes(16).toString('hex')};
      return send(res,302,'',{Location:'/account','Set-Cookie':`sid=${sid}; HttpOnly; Path=/`});
    }
    return send(res,401,chrome(req,`<div class="panel"><div class="banner bad">Incorrect username or password.</div><a class="btn" href="/">Try again</a></div>`,{auth:true,title:'Sign in'}));
  }

  if(req.method==='GET' && path==='/logout'){
    const s=getSession(req); if(s) delete sessions[s.sid];
    return send(res,302,'',{Location:'/','Set-Cookie':'sid=; Path=/; Max-Age=0'});
  }

  if(req.method==='GET' && path==='/account'){
    const user=currentUser(req);
    if(!user){res.writeHead(302,{Location:'/'});return res.end();}
    const token=getSession(req).data.csrfToken;
    const rows=orders.map(o=>`<tr><td><div>${o.item}</div><div class="oid">${o.id}</div></td><td>${o.date}</td><td>Rs.${inr(o.amt)}</td><td>${badge(o.status)}</td></tr>`).join('');
    return send(res,200,chrome(req,`
      <section class="panel">
        <div class="hello"><div class="avatar">${user.name.charAt(0)}</div>
          <div><div class="n">${user.name}</div><div class="m">@${user.username} - Member since ${user.memberSince}</div></div></div>
        <div class="stats">
          <div class="stat"><div class="k">Orders</div><div class="v">${orders.length}</div></div>
          <div class="stat"><div class="k">Wallet</div><div class="v">Rs.${inr(user.wallet)}</div></div>
          <div class="stat"><div class="k">Tier</div><div class="v">Gold</div></div>
        </div>
      </section>

      <section class="panel" id="orders">
        <h2>Recent orders</h2><div class="sub">Your last ${orders.length} orders</div>
        <table><thead><tr><th>Item</th><th>Date</th><th>Amount</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>
      </section>

      <section class="panel" id="address">
        <h2>Default address</h2>
        <div class="setval" style="font-weight:500;line-height:1.5">Priya Sharma<br>Girls Hostel, IIIT Allahabad, Jhalwa<br>Prayagraj, Uttar Pradesh 211015</div>
      </section>

      <section class="panel" id="security">
        <h2>Login &amp; security</h2><div class="sub">Manage the details used to sign in and recover your account.</div>
        <div class="setrow"><div><div class="setlabel">Name</div><div class="setval">${user.name}</div></div><button class="ghost" disabled>Edit</button></div>
        <div class="setrow">
          <div><div class="setlabel">Email</div><div class="setval" id="email">${user.email}</div></div>
          <details class="edit"><summary>Edit</summary></details>
        </div>
        <form method="GET" action="/account/update-email" class="editform">
          <input name="email" placeholder="Enter new email address">
          ${SECURE?`<input type="hidden" name="csrf" value="${token}">`:''}
          <button class="btn">Save email</button>
        </form>
        <div class="setrow" style="margin-top:6px"><div><div class="setlabel">Password</div><div class="setval">&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;</div></div><button class="ghost" disabled>Edit</button></div>
        <div class="setrow"><div><div class="setlabel">Phone</div><div class="setval">${user.phone}</div></div><button class="ghost" disabled>Edit</button></div>
        <div class="note">Your email is used for order updates and password resets, so changing it changes who controls the account.</div>
      </section>`,{active:'overview',title:'Your account'}));
  }

  // ---- VULNERABLE state-changing endpoint (item a) ----
  if(req.method==='GET' && path==='/account/update-email'){
    const user=currentUser(req);
    if(!user) return send(res,401,chrome(req,`<div class="panel"><div class="banner bad">Not signed in.</div></div>`,{active:'security',title:'Blocked'}));
    if(SECURE){ // ---- mitigation (item d): synchronizer token ----
      const token=getSession(req).data.csrfToken;
      if(u.searchParams.get('csrf')!==token){
        return send(res,403,chrome(req,`<div class="panel"><div class="banner bad">Request blocked - CSRF token missing or invalid.</div>
          <p>The email was <b>not</b> changed. This request did not carry the secret token tied to your session, so ShopBase rejected it.</p>
          <a class="btn" href="/account#security">Back to security</a></div>`,{active:'security',title:'Blocked'}));
      }
    }
    const newEmail=u.searchParams.get('email');
    if(!newEmail) return send(res,400,chrome(req,`<div class="panel"><div class="banner bad">No email provided.</div></div>`,{active:'security',title:'Error'}));
    user.email=newEmail;
    return send(res,200,chrome(req,`<div class="panel"><div class="banner ok">Email updated successfully.</div>
      <p>Your account email is now <b>${newEmail}</b>.</p>
      <a class="btn" href="/account#security">Back to security</a></div>`,{active:'security',title:'Updated'}));
  }

  send(res,404,chrome(req,`<div class="panel"><div class="banner bad">404 - Page not found.</div></div>`,{active:'overview',title:'Not found'}));
});

server.listen(PORT,()=>console.log(`\n  ShopBase running at http://localhost:${PORT}   (mode: ${SECURE?'SECURE / mitigated':'VULNERABLE'})\n`));
