/* Minima Moralia — blog público (solo lectura, sin token). */

const state = {
  posts: [],
  taxonomy: { categories: [], tags: [] },
  settings: {},
  filter: null, // { type: "category"|"tag", value: string }
};

const ICONS = {
  eye: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z"/><circle cx="12" cy="12" r="3.2"/></svg>`,
  image: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.5"/><path d="M21 16l-5.5-5.5L3 21"/></svg>`,
  tiktok: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.6 5.82a4.2 4.2 0 0 1-2.6-3.6h-3.2v13.3a2.5 2.5 0 1 1-2.06-2.46v-3.2a5.7 5.7 0 1 0 5.26 5.68V9.4a7.4 7.4 0 0 0 4.2 1.3V7.5a4.2 4.2 0 0 1-1.6-1.68Z"/></svg>`,
  substack: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 4h18v2.7H3V4Zm0 4.6h18v2.7H3V8.6ZM3 13.3h18V16L12 21.5 3 16v-2.7Z"/></svg>`,
  linkedin: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9h4v12H3zm7 0h3.8v1.7h.05c.53-.95 1.83-1.95 3.77-1.95 4.03 0 4.78 2.55 4.78 5.86V21H18v-5.85c0-1.4-.03-3.2-2-3.2-2 0-2.3 1.5-2.3 3.1V21H10z"/></svg>`,
  heart: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 20.5s-7.5-4.6-10-9.3C.4 8 1.9 4.7 5 3.9c2-.5 4 .3 5.2 2 .4.6.8 1.2.8 1.2s.4-.6.8-1.2c1.2-1.7 3.2-2.5 5.2-2 3.1.8 4.6 4.1 3 7.3-2.5 4.7-10 9.3-10 9.3Z"/></svg>`,
  share: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="18" cy="5" r="2.6"/><circle cx="6" cy="12" r="2.6"/><circle cx="18" cy="19" r="2.6"/><path d="M8.3 10.6 15.7 6.4M8.3 13.4l7.4 4.2"/></svg>`,
  bookmark: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 3h12v18l-6-4.2L6 21Z"/></svg>`,
};

/* ---------------- interacciones reales (sin datos inventados) ----------------
 * "Me gusta" usa un contador público real (CounterAPI): cada clic suma o
 * resta de verdad. Qué publicaciones ha marcado ESTE visitante se recuerda
 * solo en su navegador (localStorage), para poder alternar el estado.
 * No hay contadores de comentarios ni de "reposts": inventar esos números
 * sería mostrar una popularidad falsa, así que no están. */

function counterNamespace() {
  return (state.settings && state.settings.counterNamespace) || "minima-moralia";
}

function counterAction(key, action) {
  const ns = counterNamespace();
  return fetch(`https://api.counterapi.dev/v1/${encodeURIComponent(ns)}/${encodeURIComponent(key)}/${action}`)
    .then((r) => (r.ok ? r.json() : Promise.reject()))
    .then((data) => data.count ?? data.value ?? null)
    .catch(() => null);
}

function isLiked(slug) {
  try {
    return localStorage.getItem("mm:liked:" + slug) === "1";
  } catch (e) {
    return false;
  }
}
function setLiked(slug, val) {
  try {
    localStorage.setItem("mm:liked:" + slug, val ? "1" : "0");
  } catch (e) {}
}

function engagementRowHTML(slug, { sticky } = {}) {
  const liked = isLiked(slug);
  const cls = sticky ? "eng-btn" : "eng-btn";
  return `
    <button class="${cls} ${liked ? "liked" : ""}" data-like="${escapeHtml(slug)}" aria-pressed="${liked}">
      ${ICONS.heart}<span class="like-count" data-like-count="${escapeHtml(slug)}">—</span>
    </button>`;
}

function hydrateEngagement(scope) {
  scope.querySelectorAll("[data-like]").forEach((btn) => {
    const slug = btn.dataset.like;
    const countEl = scope.querySelector(`[data-like-count="${cssEscape(slug)}"]`);
    counterAction(`post-${slug}-likes`, "get").then((count) => {
      if (countEl && count !== null) countEl.textContent = count;
    });
    btn.addEventListener("click", async () => {
      const liked = isLiked(slug);
      btn.classList.toggle("liked", !liked);
      btn.setAttribute("aria-pressed", String(!liked));
      const count = await counterAction(`post-${slug}-likes`, liked ? "down" : "up");
      setLiked(slug, !liked);
      if (countEl && count !== null) countEl.textContent = count;
    });
  });
}

function cssEscape(str) {
  return String(str).replace(/["\\]/g, "\\$&");
}

async function loadJSON(path) {
  const res = await fetch(path + "?_=" + Date.now());
  if (!res.ok) throw new Error("No se pudo cargar " + path);
  return res.json();
}

function escapeHtml(str = "") {
  return str.replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleString("es-CL", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function countBy(list, key) {
  const counts = {};
  list.forEach((p) => {
    if (key === "category") {
      counts[p.category] = (counts[p.category] || 0) + 1;
    } else {
      (p.tags || []).forEach((t) => (counts[t] = (counts[t] || 0) + 1));
    }
  });
  return counts;
}

function renderSidebar() {
  const s = state.settings;
  document.getElementById("site-title").textContent = s.siteTitle || "Minima Moralia";
  document.getElementById("site-subtitle").textContent = s.siteSubtitle || "";
  document.getElementById("about-me-text").textContent = s.aboutMe || "";

  const socialRow = document.getElementById("social-row");
  const socialBlock = document.getElementById("social-block");
  socialRow.innerHTML = "";
  let anySocial = false;
  ["tiktok", "substack", "linkedin"].forEach((k) => {
    const url = s.social && s.social[k];
    if (!url) return;
    anySocial = true;
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener";
    a.title = k[0].toUpperCase() + k.slice(1);
    a.innerHTML = ICONS[k];
    socialRow.appendChild(a);
  });
  socialBlock.hidden = !anySocial;

  const catCounts = countBy(state.posts, "category");
  const tagCounts = countBy(state.posts, "tag");

  document.getElementById("category-list").innerHTML = state.taxonomy.categories
    .map(
      (c) => `<li><button data-type="category" data-value="${escapeHtml(c)}"
        class="${state.filter && state.filter.type === "category" && state.filter.value === c ? "active" : ""}">
        <span>${escapeHtml(c)}</span><span class="count">${catCounts[c] || 0}</span></button></li>`
    )
    .join("");

  document.getElementById("tag-list").innerHTML = state.taxonomy.tags
    .map(
      (t) => `<li><button data-type="tag" data-value="${escapeHtml(t)}"
        class="${state.filter && state.filter.type === "tag" && state.filter.value === t ? "active" : ""}">
        <span>${escapeHtml(t)}</span><span class="count">${tagCounts[t] || 0}</span></button></li>`
    )
    .join("");

  document.querySelectorAll(".taxo-list button").forEach((btn) => {
    btn.addEventListener("click", () => {
      const type = btn.dataset.type;
      const value = btn.dataset.value;
      const isActive = state.filter && state.filter.type === type && state.filter.value === value;
      location.hash = isActive ? "#/" : `#/${type}/${encodeURIComponent(value)}`;
    });
  });
}

function loadVisitCounter() {
  const ns = (state.settings && state.settings.counterNamespace) || "minima-moralia";
  const el = document.getElementById("visit-count");
  fetch(`https://api.counterapi.dev/v1/${encodeURIComponent(ns)}/site/up`)
    .then((r) => (r.ok ? r.json() : Promise.reject()))
    .then((data) => {
      el.textContent = (data.count ?? data.value ?? "—").toLocaleString("es-CL");
    })
    .catch(() => {
      el.textContent = "—";
    });
}

function bumpPostViews(slug) {
  const el = document.getElementById("post-views");
  if (!el) return;
  counterAction(`post-${slug}-views`, "up").then((count) => {
    el.textContent = count !== null ? count.toLocaleString("es-CL") : "—";
  });
}

function postCardHTML(p) {
  const bg = p.image ? `<div class="card-bg" style="background-image:url('${escapeHtml(p.image)}')"></div>` : "";
  const compact = !p.image && !p.subtitle && !p.summary;
  return `
  <div class="post-card-wrap">
    <a class="post-card${compact ? " compact" : ""}" href="#/post/${encodeURIComponent(p.slug)}">
      ${bg}
      <div class="card-scrim"></div>
      <div class="card-content">
        <div class="card-topline">
          <span class="eyebrow-pill">${escapeHtml(p.category || "")}</span>
          <span class="bookmark-icon">${ICONS.bookmark}</span>
        </div>
        <div class="card-text">
          <h2>${escapeHtml(p.title || "Sin título")}</h2>
          ${p.subtitle ? `<p class="subtitle">${escapeHtml(p.subtitle)}</p>` : ""}
          ${p.summary ? `<p class="summary">${escapeHtml(p.summary)}</p>` : ""}
          ${(p.tags && p.tags.length) ? `<div class="tag-row card-tag-row">${p.tags.map((t) => `<span class="tag-pill">${escapeHtml(t)}</span>`).join("")}</div>` : ""}
        </div>
      </div>
    </a>
    <div class="engagement-row" data-engagement-for="${escapeHtml(p.slug)}">
      ${engagementRowHTML(p.slug)}
      <span class="eng-meta">${fmtDate(p.date)} · ${escapeHtml(p.author || "")}</span>
    </div>
  </div>`;
}

function renderList() {
  const main = document.getElementById("main-view");
  let posts = [...state.posts].sort((a, b) => new Date(b.date) - new Date(a.date));

  let bannerHTML = "";
  if (state.filter) {
    posts = posts.filter((p) =>
      state.filter.type === "category"
        ? p.category === state.filter.value
        : (p.tags || []).includes(state.filter.value)
    );
    bannerHTML = `<div class="filter-banner">Mostrando ${
      state.filter.type === "category" ? "tema" : "etiqueta"
    }: <strong>${escapeHtml(state.filter.value)}</strong>
      <button onclick="location.hash='#/'">ver todo</button></div>`;
  }

  if (!state.posts.length) {
    main.innerHTML = `<div class="empty-state">
      <h2>Todavía no hay publicaciones</h2>
      <p>Este espacio se irá llenando con ensayos, cuentos y poemas. Vuelve pronto.</p>
    </div>`;
    return;
  }

  if (!posts.length) {
    main.innerHTML = bannerHTML + `<div class="empty-state"><p>No hay publicaciones con este filtro todavía.</p></div>`;
    return;
  }

  main.innerHTML = bannerHTML + `<div class="post-list">${posts.map(postCardHTML).join("")}</div>`;
  hydrateEngagement(main);
}

function renderArticle(slug) {
  const main = document.getElementById("main-view");
  const p = state.posts.find((x) => x.slug === slug);
  if (!p) {
    main.innerHTML = `<div class="empty-state"><h2>No encontrada</h2><p>Esta publicación no existe o fue eliminada.</p></div>`;
    return;
  }

  const bodyHtml = window.marked ? marked.parse(p.body || "") : `<p>${escapeHtml(p.body || "")}</p>`;
  const bibHtml = p.bibliography
    ? `<div class="bibliography"><h3>Referencias</h3><div class="body-text">${
        window.marked ? marked.parse(p.bibliography) : `<p>${escapeHtml(p.bibliography)}</p>`
      }</div></div>`
    : "";

  main.innerHTML = `
    <a class="back-link" href="#/">&larr; Volver</a>
    <article class="article">
      <div class="eyebrow">${escapeHtml(p.category || "")}</div>
      <h1>${escapeHtml(p.title || "")}</h1>
      ${p.subtitle ? `<p class="subtitle">${escapeHtml(p.subtitle)}</p>` : ""}
      <div class="byline">
        <div class="avatar">${escapeHtml((p.author || "N").slice(0, 1))}</div>
        <div>
          <div class="name">${escapeHtml(p.author || "")}</div>
          <div class="date">${fmtDate(p.date)} · <span class="views-inline">${ICONS.eye}<span id="post-views">…</span></span></div>
        </div>
      </div>
      <hr class="byline-rule">
      ${
        p.image
          ? `<figure class="figure"><img src="${escapeHtml(p.image)}" alt="">
             ${p.imageCaption ? `<figcaption>${escapeHtml(p.imageCaption)}</figcaption>` : ""}</figure>`
          : ""
      }
      <div class="body-text">${bodyHtml}</div>
      ${bibHtml}
      <div class="tag-row">
        ${(p.tags || []).map((t) => `<span class="tag-pill">${escapeHtml(t)}</span>`).join("")}
      </div>
      <div class="sticky-engagement" data-engagement-for="${escapeHtml(p.slug)}">
        <div class="pill">${engagementRowHTML(p.slug, { sticky: true })}</div>
      </div>
    </article>`;

  hydrateEngagement(main);
  bumpPostViews(slug);
}

function route() {
  const hash = location.hash.replace(/^#\/?/, "");
  const parts = hash.split("/").filter(Boolean);

  if (parts[0] === "post" && parts[1]) {
    state.filter = null;
    renderArticle(decodeURIComponent(parts[1]));
  } else if ((parts[0] === "category" || parts[0] === "tag") && parts[1]) {
    state.filter = { type: parts[0], value: decodeURIComponent(parts[1]) };
    renderSidebar();
    renderList();
  } else {
    state.filter = null;
    renderSidebar();
    renderList();
  }
  window.scrollTo(0, 0);
}

async function init() {
  try {
    const [posts, taxonomy, settings] = await Promise.all([
      loadJSON("data/posts.json"),
      loadJSON("data/taxonomy.json"),
      loadJSON("data/settings.json"),
    ]);
    state.posts = posts;
    state.taxonomy = taxonomy;
    state.settings = settings;
  } catch (e) {
    console.error(e);
  }
  renderSidebar();
  loadVisitCounter();
  route();
  window.addEventListener("hashchange", route);
}

document.addEventListener("DOMContentLoaded", init);
