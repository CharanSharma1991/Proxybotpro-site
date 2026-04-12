(function () {
  // ─── CLIENT CONFIG ──────────────────────────────────────────────────────────
  // Each client's embed snippet defines window.PProConfig BEFORE loading this script.
  // Falls back to ProxyBot Pro defaults if not set.
  const CLIENT = window.PProConfig || {};

  const CONFIG = {
    apiEndpoint:    CLIENT.apiEndpoint    || "/.netlify/functions/chat",
    brandName:      CLIENT.brandName      || "Assistant Virtuel",
    welcomeMessage: CLIENT.welcomeMessage || "Bonjour 👋 Comment puis-je vous aider ?",
    placeholder:    CLIENT.placeholder    || "Écrivez votre question...",
    accentColor:    CLIENT.accentColor    || "#0057FF",   // customise per brand
    quickReplies:   CLIENT.quickReplies   || ["Horaires", "Tarifs", "Adresse", "Contact"],

    // ── THE MAGIC: client-specific system prompt ─────────────────────────────
    systemPrompt: CLIENT.systemPrompt || `Tu es un assistant virtuel professionnel.
Réponds aux questions des visiteurs en français de façon claire et concise.
Si tu ne sais pas, propose de contacter l'équipe directement.`,

    // Fixed ProxyBot brand palette
    colors: {
      navy: "#060B18",
      blue: "#0057FF",
      cyan: "#00C8F0",
      mint: "#00FFB2",
    },
  };

  // ─── PREVENT DOUBLE INIT ────────────────────────────────────────────────────
  if (document.getElementById("ppro-widget-root")) return;

  // ─── STYLES ─────────────────────────────────────────────────────────────────
  const style = document.createElement("style");
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap');
    #ppro-widget-root * { box-sizing:border-box; margin:0; padding:0; font-family:'Poppins',sans-serif; }

    #ppro-bubble {
      position:fixed; bottom:24px; right:24px; width:62px; height:62px;
      border-radius:50%; background:linear-gradient(135deg,${CONFIG.colors.blue},${CONFIG.colors.cyan});
      box-shadow:0 4px 24px rgba(0,87,255,0.45); cursor:pointer;
      display:flex; align-items:center; justify-content:center;
      z-index:99998; transition:transform .2s,box-shadow .2s; border:none; outline:none;
    }
    #ppro-bubble:hover { transform:scale(1.1); box-shadow:0 6px 30px rgba(0,200,240,.5); }
    #ppro-badge {
      position:absolute; top:-4px; right:-4px;
      background:${CONFIG.colors.mint}; color:${CONFIG.colors.navy};
      font-size:9px; font-weight:700; padding:2px 6px;
      border-radius:10px; letter-spacing:.5px; text-transform:uppercase; white-space:nowrap;
    }
    #ppro-window {
      position:fixed; bottom:96px; right:24px;
      width:360px; max-width:calc(100vw - 32px);
      height:540px; max-height:calc(100vh - 120px);
      background:${CONFIG.colors.navy}; border-radius:20px;
      box-shadow:0 16px 60px rgba(0,0,0,.5),0 0 0 1px rgba(0,200,240,.15);
      display:flex; flex-direction:column; overflow:hidden; z-index:99999;
      transform:scale(.85) translateY(20px); opacity:0; pointer-events:none;
      transform-origin:bottom right;
      transition:transform .25s cubic-bezier(.34,1.56,.64,1),opacity .2s;
    }
    #ppro-window.ppro-open { transform:scale(1) translateY(0); opacity:1; pointer-events:all; }

    #ppro-header {
      background:linear-gradient(135deg,${CONFIG.colors.blue},rgba(0,200,240,.12));
      padding:16px 20px; display:flex; align-items:center; gap:12px;
      border-bottom:1px solid rgba(0,200,240,.15); flex-shrink:0;
    }
    #ppro-avatar {
      width:40px; height:40px; border-radius:50%;
      background:linear-gradient(135deg,${CONFIG.colors.cyan},${CONFIG.colors.mint});
      display:flex; align-items:center; justify-content:center; flex-shrink:0;
    }
    #ppro-header-name { font-size:14px; font-weight:700; color:#fff; line-height:1.2; }
    #ppro-header-status {
      font-size:11px; color:${CONFIG.colors.mint};
      display:flex; align-items:center; gap:5px; margin-top:2px;
    }
    #ppro-header-status::before {
      content:''; width:6px; height:6px; border-radius:50%;
      background:${CONFIG.colors.mint}; display:inline-block; animation:ppro-pulse 2s infinite;
    }
    #ppro-close {
      background:rgba(255,255,255,.1); border:none; border-radius:50%;
      width:30px; height:30px; cursor:pointer;
      display:flex; align-items:center; justify-content:center;
      color:rgba(255,255,255,.7); transition:background .15s,color .15s; flex-shrink:0; margin-left:auto;
    }
    #ppro-close:hover { background:rgba(255,255,255,.2); color:#fff; }

    #ppro-messages {
      flex:1; overflow-y:auto; padding:16px;
      display:flex; flex-direction:column; gap:12px;
      scrollbar-width:thin; scrollbar-color:rgba(0,200,240,.2) transparent;
    }
    #ppro-messages::-webkit-scrollbar { width:4px; }
    #ppro-messages::-webkit-scrollbar-thumb { background:rgba(0,200,240,.2); border-radius:4px; }

    .ppro-msg {
      max-width:84%; padding:10px 14px; border-radius:16px;
      font-size:13px; line-height:1.6; animation:ppro-fadeup .2s ease;
    }
    .ppro-msg-bot {
      background:rgba(0,200,240,.09); border:1px solid rgba(0,200,240,.18);
      color:rgba(255,255,255,.92); align-self:flex-start; border-bottom-left-radius:4px;
    }
    .ppro-msg-user {
      background:linear-gradient(135deg,${CONFIG.colors.blue},#0041CC);
      color:#fff; align-self:flex-end; border-bottom-right-radius:4px;
    }

    #ppro-typing {
      display:none; align-self:flex-start;
      background:rgba(0,200,240,.07); border:1px solid rgba(0,200,240,.15);
      border-radius:16px; border-bottom-left-radius:4px; padding:12px 16px;
    }
    #ppro-typing.ppro-visible { display:flex; gap:5px; align-items:center; }
    .ppro-dot {
      width:7px; height:7px; background:${CONFIG.colors.cyan}; border-radius:50%;
      animation:ppro-bounce 1.2s infinite;
    }
    .ppro-dot:nth-child(2){animation-delay:.2s} .ppro-dot:nth-child(3){animation-delay:.4s}

    #ppro-quick-replies { padding:0 16px 10px; display:flex; flex-wrap:wrap; gap:6px; flex-shrink:0; }
    .ppro-qr {
      background:transparent; border:1px solid rgba(0,200,240,.35);
      color:${CONFIG.colors.cyan}; border-radius:20px; padding:5px 12px;
      font-size:11px; font-family:'Poppins',sans-serif; font-weight:600;
      cursor:pointer; transition:background .15s,color .15s; white-space:nowrap;
    }
    .ppro-qr:hover { background:rgba(0,200,240,.15); color:#fff; }

    #ppro-input-row {
      padding:12px 16px; display:flex; gap:8px; align-items:flex-end;
      border-top:1px solid rgba(0,200,240,.1); background:rgba(0,0,0,.2); flex-shrink:0;
    }
    #ppro-input {
      flex:1; background:rgba(255,255,255,.07); border:1px solid rgba(0,200,240,.25);
      border-radius:12px; padding:10px 14px; color:#fff; font-size:13px;
      font-family:'Poppins',sans-serif; resize:none; min-height:42px; max-height:100px;
      line-height:1.4; transition:border-color .15s; outline:none;
    }
    #ppro-input::placeholder { color:rgba(255,255,255,.3); }
    #ppro-input:focus { border-color:${CONFIG.colors.cyan}; }
    #ppro-send {
      width:42px; height:42px; border-radius:12px;
      background:linear-gradient(135deg,${CONFIG.colors.blue},${CONFIG.colors.cyan});
      border:none; cursor:pointer; display:flex; align-items:center; justify-content:center;
      flex-shrink:0; transition:opacity .15s,transform .15s;
    }
    #ppro-send:hover { opacity:.85; transform:scale(1.05); }
    #ppro-send:disabled { opacity:.35; cursor:not-allowed; transform:none; }

    #ppro-footer { text-align:center; padding:6px; font-size:10px; color:rgba(255,255,255,.2); flex-shrink:0; }
    #ppro-footer a { color:rgba(0,200,240,.45); text-decoration:none; }
    #ppro-footer a:hover { color:${CONFIG.colors.cyan}; }

    @keyframes ppro-fadeup { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
    @keyframes ppro-bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-6px)} }
    @keyframes ppro-pulse  { 0%,100%{opacity:1} 50%{opacity:.4} }
  `;
  document.head.appendChild(style);

  // ─── DOM ─────────────────────────────────────────────────────────────────────
  const qrHTML = CONFIG.quickReplies
    .map(label => `<button class="ppro-qr">${label}</button>`)
    .join("");

  const root = document.createElement("div");
  root.id = "ppro-widget-root";
  root.innerHTML = `
    <button id="ppro-bubble" aria-label="Ouvrir le chat">
      <span id="ppro-badge">FAQ</span>
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        <circle cx="9" cy="10" r="1" fill="#fff" stroke="none"/>
        <circle cx="12" cy="10" r="1" fill="#fff" stroke="none"/>
        <circle cx="15" cy="10" r="1" fill="#fff" stroke="none"/>
      </svg>
    </button>
    <div id="ppro-window" role="dialog">
      <div id="ppro-header">
        <div id="ppro-avatar">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#060B18" stroke-width="2.5" stroke-linecap="round">
            <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
          </svg>
        </div>
        <div>
          <div id="ppro-header-name">${CONFIG.brandName}</div>
          <div id="ppro-header-status">En ligne · Répond instantanément</div>
        </div>
        <button id="ppro-close" aria-label="Fermer">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <line x1="1" y1="1" x2="13" y2="13"/><line x1="13" y1="1" x2="1" y2="13"/>
          </svg>
        </button>
      </div>
      <div id="ppro-messages">
        <div class="ppro-msg ppro-msg-bot">${CONFIG.welcomeMessage}</div>
        <div id="ppro-typing"><span class="ppro-dot"></span><span class="ppro-dot"></span><span class="ppro-dot"></span></div>
      </div>
      <div id="ppro-quick-replies">${qrHTML}</div>
      <div id="ppro-input-row">
        <textarea id="ppro-input" placeholder="${CONFIG.placeholder}" rows="1"></textarea>
        <button id="ppro-send">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2" fill="#fff" stroke="none"/>
          </svg>
        </button>
      </div>
      <div id="ppro-footer">Propulsé par <a href="https://proxybotpro.fr" target="_blank">ProxyBot Pro</a></div>
    </div>
  `;
  document.body.appendChild(root);

  // ─── REFS ────────────────────────────────────────────────────────────────────
  const bubble = document.getElementById("ppro-bubble");
  const win    = document.getElementById("ppro-window");
  const closeB = document.getElementById("ppro-close");
  const msgs   = document.getElementById("ppro-messages");
  const input  = document.getElementById("ppro-input");
  const sendB  = document.getElementById("ppro-send");
  const typing = document.getElementById("ppro-typing");
  const qrBtns = document.querySelectorAll(".ppro-qr");
  let history  = [];

  // ─── OPEN / CLOSE ────────────────────────────────────────────────────────────
  bubble.addEventListener("click", () => { win.classList.add("ppro-open"); bubble.style.display="none"; input.focus(); });
  closeB.addEventListener("click", () => { win.classList.remove("ppro-open"); bubble.style.display="flex"; });

  // ─── HELPERS ─────────────────────────────────────────────────────────────────
  function addMsg(text, role) {
    msgs.removeChild(typing);
    const d = document.createElement("div");
    d.className = "ppro-msg ppro-msg-" + (role === "user" ? "user" : "bot");
    d.textContent = text;
    msgs.appendChild(d);
    msgs.appendChild(typing);
    msgs.scrollTop = msgs.scrollHeight;
  }

  // ─── SEND ────────────────────────────────────────────────────────────────────
  async function doSend(text) {
    text = text.trim();
    if (!text || sendB.disabled) return;

    addMsg(text, "user");
    history.push({ role: "user", content: text });
    input.value = "";
    input.style.height = "auto";
    sendB.disabled = true;
    typing.classList.add("ppro-visible");
    msgs.scrollTop = msgs.scrollHeight;

    try {
      const res = await fetch(CONFIG.apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: CONFIG.systemPrompt,
          messages: history
        })
      });

      if (!res.ok) throw new Error("API " + res.status);
      const data = await res.json();

      const reply =
        data?.content?.[0]?.text ||
        data?.reply ||
        data?.message ||
        "Désolé, une erreur est survenue. Veuillez nous contacter directement.";

      typing.classList.remove("ppro-visible");
      addMsg(reply, "bot");
      history.push({ role: "assistant", content: reply });

    } catch (err) {
      typing.classList.remove("ppro-visible");
      addMsg("Une erreur est survenue. Contactez-nous directement, nous répondons rapidement ! 😊", "bot");
      console.error("[ProxyBot Widget]", err);
    } finally {
      sendB.disabled = false;
      input.focus();
    }
  }

  // ─── EVENTS ──────────────────────────────────────────────────────────────────
  qrBtns.forEach(b => b.addEventListener("click", () => {
    doSend(b.textContent.replace(/^[^\w\u00C0-\u024F]+/, "").trim());
  }));
  input.addEventListener("input", function () {
    this.style.height = "auto";
    this.style.height = Math.min(this.scrollHeight, 100) + "px";
  });
  input.addEventListener("keydown", e => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); doSend(input.value); }
  });
  sendB.addEventListener("click", () => doSend(input.value));

})();
