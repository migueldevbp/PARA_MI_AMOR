(() => {
  const C = window.AMOR;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  const SCENES = [
    { id: "intro", label: "Inicio" },
    { id: "letter", label: "Carta" },
    { id: "stars", label: "Estrellas" },
    { id: "photos", label: "Recuerdos" },
    { id: "reasons", label: "Razones" },
    { id: "constellation", label: "Constelación" },
    { id: "finale", label: "Para siempre" }
  ];

  const HEART_NODES = [
    { n: 1, x: 26, y: 28 },
    { n: 2, x: 50, y: 18 },
    { n: 3, x: 74, y: 28 },
    { n: 4, x: 86, y: 48 },
    { n: 5, x: 68, y: 68 },
    { n: 6, x: 50, y: 86 },
    { n: 7, x: 32, y: 68 },
    { n: 8, x: 14, y: 48 }
  ];

  const state = {
    scene: "intro",
    starsCaught: 0,
    starGoal: 8,
    flipped: 0,
    nextNode: 1,
    moonTaps: 0,
    starTimer: null,
    constDone: false
  };

  function chime(freq = 660) {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.value = 0.04;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
      osc.stop(ctx.currentTime + 0.36);
    } catch (_) { /* silencio si el navegador bloquea audio */ }
  }

  /* ── Cielo de fondo ── */
  function paintSky() {
    const canvas = $("#stars");
    const ctx = canvas.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    function resize() {
      canvas.width = innerWidth * dpr;
      canvas.height = innerHeight * dpr;
      canvas.style.width = `${innerWidth}px`;
      canvas.style.height = `${innerHeight}px`;
    }
    resize();
    window.addEventListener("resize", resize);

    const stars = Array.from({ length: 120 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: Math.random() * 1.4 + 0.3,
      a: Math.random(),
      s: Math.random() * 0.02 + 0.005
    }));

    function tick() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      stars.forEach((st) => {
        st.a += st.s;
        const alpha = 0.25 + Math.abs(Math.sin(st.a)) * 0.75;
        ctx.beginPath();
        ctx.fillStyle = `rgba(246,239,228,${alpha})`;
        ctx.arc(st.x * canvas.width, st.y * canvas.height, st.r * dpr, 0, Math.PI * 2);
        ctx.fill();
      });
      requestAnimationFrame(tick);
    }
    tick();
  }

  function spawnPetals() {
    const box = $("#petals");
    for (let i = 0; i < 14; i++) {
      const p = document.createElement("i");
      p.className = "petal";
      p.style.left = `${Math.random() * 100}%`;
      p.style.animationDuration = `${9 + Math.random() * 10}s`;
      p.style.animationDelay = `${-Math.random() * 12}s`;
      p.style.transform = `scale(${0.6 + Math.random() * 0.8})`;
      box.appendChild(p);
    }
  }

  /* ── Navegación ── */
  function buildDots() {
    const wrap = $("#dots");
    wrap.innerHTML = SCENES.map((s) => `<span data-dot="${s.id}"></span>`).join("");
  }

  function resetJourney() {
    stopStars();
    state.starsCaught = 0;
    state.flipped = 0;
    state.nextNode = 1;
    state.constDone = false;
    state.moonTaps = 0;
    const env = $("#envelope");
    env.classList.remove("is-open");
    $("#envelopeWrap").hidden = false;
    $("#letterPaper").hidden = true;
    $$(".card").forEach((c) => c.classList.remove("is-flipped"));
    $("#btnAfterCards").hidden = true;
    $("#cardCounter").textContent = `0 / ${C.razones.length} volteadas`;
    $("#catchSky").innerHTML = "";
  }

  function go(id) {
    if (state.scene === "stars") stopStars();
    if (id === "intro") resetJourney();
    state.scene = id;
    $$(".scene").forEach((el) => {
      const on = el.dataset.scene === id;
      el.classList.toggle("is-active", on);
      el.hidden = !on;
    });
    const meta = SCENES.find((s) => s.id === id);
    $("#progressLabel").textContent = meta ? meta.label : "";
    $$("#dots span").forEach((d) => d.classList.toggle("is-on", d.dataset.dot === id));
    if (id === "stars") startStars();
    if (id === "constellation") buildConstellation();
    if (id === "finale") celebrate();
    $(".app").scrollTop = 0;
  }

  /* ── Contenido ── */
  function fillContent() {
    $("#herFull").textContent = C.ellaCompleto;
    $("#letterDate").textContent = C.fecha;
    $("#letterTo").textContent = C.ella;
    $("#letterBody").innerHTML = C.carta.map((p) => `<p>${p}</p>`).join("");
    $("#letterSign").textContent = C.el;
    $("#finaleName").textContent = C.ella;
    $("#togetherNames").textContent = `${C.el}  ♡  ${C.ella}`;
    $("#daysLine").textContent = C.etiqueta;
    $("#finalLetter").innerHTML = C.cartaFinal.map((p) => `<p>${p}</p>`).join("");

    const polaroids = $("#polaroids");
    polaroids.innerHTML = C.fotos.map((f, i) => `
      <figure class="polaroid" data-src="${f.src}" data-cap="${f.pie}" style="animation-delay:${i * 0.08}s">
        <div class="frame"><img alt="" src="${f.src}" /></div>
        <figcaption>${f.pie}</figcaption>
      </figure>
    `).join("");

    polaroids.querySelectorAll("img").forEach((img) => {
      const fail = () => {
        img.parentElement.classList.add("is-empty");
        img.style.display = "none";
      };
      img.addEventListener("error", fail);
      if (img.complete && img.naturalWidth === 0) fail();
    });

    polaroids.addEventListener("click", (e) => {
      const card = e.target.closest(".polaroid");
      if (!card) return;
      const img = card.querySelector("img");
      if (!img || img.parentElement.classList.contains("is-empty")) return;
      $("#lightboxImg").src = img.src;
      $("#lightboxCap").textContent = card.dataset.cap;
      $("#lightbox").hidden = false;
    });

    const fp = $("#finalPhoto");
    fp.innerHTML = `<img alt="${C.fotoFinal.pie}" src="${C.fotoFinal.src}" />`;
    const fimg = fp.querySelector("img");
    fimg.addEventListener("error", () => {
      fp.classList.add("is-empty");
      fp.innerHTML = "♡";
    });

    const cards = $("#cards");
    cards.innerHTML = C.razones.map((r, i) => `
      <button class="card" data-i="${i}" aria-label="${r.titulo}">
        <span class="card-inner">
          <span class="card-face card-front">♡</span>
          <span class="card-face card-back">
            <strong>${r.titulo}</strong>
            <span>${r.texto}</span>
          </span>
        </span>
      </button>
    `).join("");
  }

  /* ── Sobre ── */
  function bindEnvelope() {
    const env = $("#envelope");
    env.addEventListener("click", () => {
      if (env.classList.contains("is-open")) return;
      env.classList.add("is-open");
      chime(520);
      setTimeout(() => {
        $("#envelopeWrap").hidden = true;
        $("#letterPaper").hidden = false;
      }, 900);
    });
  }

  /* ── Mini-juego estrellas ── */
  function starSvg() {
    return `<svg viewBox="0 0 24 24" fill="#f3deaa"><path d="M12 2.2l2.4 6.9h7.2l-5.8 4.3 2.2 7-6-4.2-6 4.2 2.2-7-5.8-4.3h7.2z"/></svg>`;
  }

  function spawnFallingStar() {
    const sky = $("#catchSky");
    if (!sky || state.scene !== "stars" || state.starsCaught >= state.starGoal) return;
    if (sky.querySelectorAll(".falling-star:not(.is-caught)").length >= 7) return;
    const btn = document.createElement("button");
    btn.className = "falling-star";
    btn.innerHTML = starSvg();
    btn.style.left = `${8 + Math.random() * 78}%`;
    btn.style.animationDuration = `${3.4 + Math.random() * 2}s`;
    btn.style.animationDelay = `${-Math.random() * 2.8}s`;
    const word = C.estrellas[Math.floor(Math.random() * C.estrellas.length)];
    btn.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      catchStar(btn, word);
    });
    btn.addEventListener("animationend", () => btn.remove());
    sky.appendChild(btn);
  }

  function catchStar(btn, word) {
    if (btn.classList.contains("is-caught")) return;
    btn.classList.add("is-caught");
    state.starsCaught += 1;
    $("#starCounter").textContent = `${state.starsCaught} / ${state.starGoal}`;
    const toast = $("#starToast");
    toast.hidden = false;
    toast.textContent = word;
    chime(640 + state.starsCaught * 40);
    setTimeout(() => { toast.hidden = true; }, 1200);
    setTimeout(() => { if (btn.parentNode) btn.remove(); }, 350);
    if (state.starsCaught >= state.starGoal) {
      stopStars();
      setTimeout(() => go("photos"), 900);
    }
  }

  function startStars() {
    state.starsCaught = 0;
    $("#starCounter").textContent = `0 / ${state.starGoal}`;
    $("#catchSky").innerHTML = "";
    spawnFallingStar();
    spawnFallingStar();
    spawnFallingStar();
    state.starTimer = setInterval(spawnFallingStar, 850);
  }

  function stopStars() {
    clearInterval(state.starTimer);
    state.starTimer = null;
  }

  /* ── Cartas ── */
  function bindCards() {
    $("#cards").addEventListener("click", (e) => {
      const card = e.target.closest(".card");
      if (!card || card.classList.contains("is-flipped")) return;
      card.classList.add("is-flipped");
      state.flipped += 1;
      $("#cardCounter").textContent = `${state.flipped} / ${C.razones.length} volteadas`;
      chime(500);
      if (state.flipped >= C.razones.length) {
        $("#btnAfterCards").hidden = false;
      }
    });
  }

  /* ── Constelación ── */
  function buildConstellation() {
    const box = $("#constellation");
    $$(".node, .heart-done", box).forEach((n) => n.remove());
    $("#constellationLines").innerHTML = "";
    state.nextNode = 1;
    HEART_NODES.forEach((p) => {
      const b = document.createElement("button");
      b.className = "node";
      b.textContent = p.n;
      b.style.left = `${p.x}%`;
      b.style.top = `${p.y}%`;
      b.dataset.n = p.n;
      if (p.n === 1) b.classList.add("is-next");
      b.addEventListener("click", () => tapNode(p.n, b));
      box.appendChild(b);
    });
    $("#constCounter").textContent = "Estrella 1 de 8";
  }

  function tapNode(n, btn) {
    if (state.constDone) return;
    if (n !== state.nextNode) {
      btn.classList.add("is-wrong");
      setTimeout(() => btn.classList.remove("is-wrong"), 350);
      return;
    }
    btn.classList.remove("is-next");
    btn.classList.add("is-done");
    chime(480 + n * 50);
    if (n > 1) {
      const prev = HEART_NODES[n - 2];
      const cur = HEART_NODES[n - 1];
      const svg = $("#constellationLines");
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", prev.x);
      line.setAttribute("y1", prev.y);
      line.setAttribute("x2", cur.x);
      line.setAttribute("y2", cur.y);
      svg.appendChild(line);
    }
    if (n === 8) {
      const first = HEART_NODES[0];
      const last = HEART_NODES[7];
      const svg = $("#constellationLines");
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", last.x);
      line.setAttribute("y1", last.y);
      line.setAttribute("x2", first.x);
      line.setAttribute("y2", first.y);
      svg.appendChild(line);
      finishConstellation();
      return;
    }
    state.nextNode += 1;
    const next = $(`.node[data-n="${state.nextNode}"]`);
    if (next) next.classList.add("is-next");
    $("#constCounter").textContent = `Estrella ${state.nextNode} de 8`;
  }

  function finishConstellation() {
    state.constDone = true;
    $("#constCounter").textContent = "El corazón ya es nuestro";
    const done = document.createElement("div");
    done.className = "heart-done";
    done.innerHTML = `<p>${C.ella}</p>`;
    $("#constellation").appendChild(done);
    setTimeout(() => go("finale"), 1600);
  }

  /* ── Final ── */
  function celebrate() {
    const box = $("#finaleBurst");
    box.innerHTML = "";
    for (let i = 0; i < 42; i++) {
      const s = document.createElement("i");
      s.className = Math.random() > 0.5 ? "spark is-heart" : "spark";
      s.style.left = "50%";
      s.style.top = "30%";
      const ang = Math.random() * Math.PI * 2;
      const dist = 80 + Math.random() * 220;
      s.style.setProperty("--x", `${Math.cos(ang) * dist}px`);
      s.style.setProperty("--y", `${Math.sin(ang) * dist}px`);
      s.style.animationDelay = `${Math.random() * 0.4}s`;
      box.appendChild(s);
    }
  }

  function bindMoon() {
    $("#moon").addEventListener("click", () => {
      state.moonTaps += 1;
      if (state.moonTaps === 3) {
        const n = document.createElement("div");
        n.className = "secret";
        n.textContent = `Sheylhi: años después, cada primero, sigues siendo mi lugar favorito. — ${C.el}`;
        document.body.appendChild(n);
        chime(880);
        setTimeout(() => n.remove(), 4200);
        state.moonTaps = 0;
      }
    });
  }

  function bindNav() {
    document.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-go]");
      if (!btn) return;
      go(btn.dataset.go);
    });
    $("#lightboxClose").addEventListener("click", () => {
      $("#lightbox").hidden = true;
    });
    $("#lightbox").addEventListener("click", (e) => {
      if (e.target.id === "lightbox") $("#lightbox").hidden = true;
    });
  }

  function boot() {
    paintSky();
    spawnPetals();
    buildDots();
    fillContent();
    bindEnvelope();
    bindCards();
    bindMoon();
    bindNav();
    go("intro");
    C.ir = go;

    const loader = $("#loader");
    setTimeout(() => {
      loader.classList.add("is-gone");
      $("#app").hidden = false;
      setTimeout(() => { loader.hidden = true; }, 800);
    }, 1600);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
