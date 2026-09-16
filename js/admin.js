/* Minima Moralia — panel de administración. Todo corre en tu navegador:
   el token de GitHub se guarda solo en localStorage y viaja únicamente
   hacia api.github.com. */

let repo = null; // instancia de GitHubRepo una vez configurado
let cache = { posts: null, postsSha: null, taxonomy: null, taxonomySha: null, settings: null, settingsSha: null };
let editingSlug = null; // slug del post que se está editando (null = nuevo)
let pendingImageFile = null;

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

function showStatus(el, msg, type) {
  el.textContent = msg;
  el.className = "status-msg " + type;
  el.hidden = false;
}
function clearStatus(el) {
  el.hidden = true;
  el.textContent = "";
}

/* ---------------- arranque / configuración ---------------- */

function initConfigGate() {
  const cfg = loadConfig();
  if (cfg) {
    repo = new GitHubRepo(cfg);
    $("#config-gate").hidden = true;
    $("#dashboard").hidden = false;
    bootDashboard();
    return;
  }
  $("#config-gate").hidden = false;
  $("#dashboard").hidden = true;
}

$("#config-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const cfg = {
    owner: $("#cfg-owner").value.trim(),
    repo: $("#cfg-repo").value.trim(),
    branch: $("#cfg-branch").value.trim() || "main",
    token: $("#cfg-token").value.trim(),
  };
  const statusEl = $("#config-status");
  showStatus(statusEl, "Verificando acceso al repositorio…", "pending");
  const candidate = new GitHubRepo(cfg);
  try {
    await candidate.verify();
    saveConfig(cfg);
    repo = candidate;
    showStatus(statusEl, "Conectado. Cargando panel…", "ok");
    setTimeout(() => {
      $("#config-gate").hidden = true;
      $("#dashboard").hidden = false;
      bootDashboard();
    }, 400);
  } catch (err) {
    showStatus(statusEl, "No se pudo conectar: " + err.message, "err");
  }
});

$("#change-config").addEventListener("click", () => {
  if (!confirm("Esto borra la configuración guardada en este navegador (no el repositorio). ¿Continuar?")) return;
  clearConfig();
  repo = null;
  location.reload();
});

/* ---------------- carga de datos ---------------- */

async function bootDashboard() {
  $("#repo-label").textContent = `${repo.owner}/${repo.repo} (${repo.branch})`;
  await Promise.all([loadPosts(), loadTaxonomy(), loadSettings()]);
  renderSettingsForm();
  renderTaxonomyPanel();
  renderPostList();
}

async function loadPosts() {
  const file = await repo.getFile("data/posts.json");
  cache.posts = file ? file.json || [] : [];
  cache.postsSha = file ? file.sha : null;
}
async function loadTaxonomy() {
  const file = await repo.getFile("data/taxonomy.json");
  cache.taxonomy = file ? file.json || { categories: [], tags: [] } : { categories: [], tags: [] };
  cache.taxonomySha = file ? file.sha : null;
}
async function loadSettings() {
  const file = await repo.getFile("data/settings.json");
  cache.settings = file ? file.json || {} : {};
  cache.settingsSha = file ? file.sha : null;
}

/* ---------------- ajustes del sitio ---------------- */

function renderSettingsForm() {
  const s = cache.settings;
  $("#set-title").value = s.siteTitle || "";
  $("#set-subtitle").value = s.siteSubtitle || "";
  $("#set-author").value = s.author || "";
  $("#set-about").value = s.aboutMe || "";
  $("#set-tiktok").value = (s.social && s.social.tiktok) || "";
  $("#set-substack").value = (s.social && s.social.substack) || "";
  $("#set-linkedin").value = (s.social && s.social.linkedin) || "";
  $("#set-counter-ns").value = s.counterNamespace || "";
}

$("#settings-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const statusEl = $("#settings-status");
  const newSettings = {
    siteTitle: $("#set-title").value.trim(),
    siteSubtitle: $("#set-subtitle").value.trim(),
    author: $("#set-author").value.trim(),
    aboutMe: $("#set-about").value.trim(),
    social: {
      tiktok: $("#set-tiktok").value.trim(),
      substack: $("#set-substack").value.trim(),
      linkedin: $("#set-linkedin").value.trim(),
    },
    counterNamespace: $("#set-counter-ns").value.trim() || "minima-moralia",
  };
  showStatus(statusEl, "Guardando…", "pending");
  try {
    const res = await repo.putTextFile(
      "data/settings.json",
      JSON.stringify(newSettings, null, 2),
      "chore: actualizar configuración del sitio",
      cache.settingsSha
    );
    cache.settings = newSettings;
    cache.settingsSha = res.content.sha;
    showStatus(statusEl, "Configuración guardada.", "ok");
  } catch (err) {
    showStatus(statusEl, "Error al guardar: " + err.message, "err");
  }
});

/* ---------------- temas y etiquetas ---------------- */

function renderTaxonomyPanel() {
  $("#cat-chip-list").innerHTML = cache.taxonomy.categories
    .map((c) => `<span class="chip">${escapeAdmin(c)}</span>`)
    .join("");
  $("#tag-chip-list").innerHTML = cache.taxonomy.tags
    .map((t) => `<span class="chip">${escapeAdmin(t)}</span>`)
    .join("");
  renderCategorySelect();
  renderTagChipPicker();
}

function escapeAdmin(str = "") {
  return str.replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

async function persistTaxonomy() {
  const res = await repo.putTextFile(
    "data/taxonomy.json",
    JSON.stringify(cache.taxonomy, null, 2),
    "chore: actualizar temas y etiquetas",
    cache.taxonomySha
  );
  cache.taxonomySha = res.content.sha;
}

$("#add-category-btn").addEventListener("click", async () => {
  const val = prompt("Nombre del nuevo tema (ej: Reseñas):");
  if (!val) return;
  if (cache.taxonomy.categories.includes(val)) return;
  cache.taxonomy.categories.push(val);
  await persistTaxonomy();
  renderTaxonomyPanel();
});

$("#add-tag-btn").addEventListener("click", async () => {
  const val = prompt("Nombre de la nueva etiqueta (ej: Fenomenología):");
  if (!val) return;
  if (cache.taxonomy.tags.includes(val)) return;
  cache.taxonomy.tags.push(val);
  await persistTaxonomy();
  renderTaxonomyPanel();
});

/* ---------------- listado de publicaciones ---------------- */

function renderPostList() {
  const list = $("#post-list");
  if (!cache.posts.length) {
    list.innerHTML = `<p class="admin-sub" style="margin:0;">Aún no hay publicaciones.</p>`;
    return;
  }
  const sorted = [...cache.posts].sort((a, b) => new Date(b.date) - new Date(a.date));
  list.innerHTML = sorted
    .map(
      (p) => `
    <div class="admin-post-row">
      <div class="info">
        <div class="t">${escapeAdmin(p.title || "(sin título)")}</div>
        <div class="m">${escapeAdmin(p.category || "")} · ${new Date(p.date).toLocaleDateString("es-CL")}</div>
      </div>
      <div class="actions">
        <button data-action="edit" data-slug="${escapeAdmin(p.slug)}">Editar</button>
        <button data-action="delete" data-slug="${escapeAdmin(p.slug)}">Eliminar</button>
      </div>
    </div>`
    )
    .join("");

  list.querySelectorAll('[data-action="edit"]').forEach((btn) =>
    btn.addEventListener("click", () => openEditor(btn.dataset.slug))
  );
  list.querySelectorAll('[data-action="delete"]').forEach((btn) =>
    btn.addEventListener("click", () => deletePost(btn.dataset.slug))
  );
}

async function deletePost(slug) {
  if (!confirm("¿Eliminar esta publicación? Esta acción no se puede deshacer.")) return;
  const statusEl = $("#post-list-status");
  showStatus(statusEl, "Eliminando…", "pending");
  try {
    cache.posts = cache.posts.filter((p) => p.slug !== slug);
    const res = await repo.putTextFile(
      "data/posts.json",
      JSON.stringify(cache.posts, null, 2),
      `chore: eliminar publicación ${slug}`,
      cache.postsSha
    );
    cache.postsSha = res.content.sha;
    showStatus(statusEl, "Publicación eliminada.", "ok");
    renderPostList();
  } catch (err) {
    showStatus(statusEl, "Error al eliminar: " + err.message, "err");
  }
}

/* ---------------- editor de publicación ---------------- */

function renderCategorySelect() {
  const sel = $("#post-category");
  const current = sel.value;
  sel.innerHTML = cache.taxonomy.categories
    .map((c) => `<option value="${escapeAdmin(c)}">${escapeAdmin(c)}</option>`)
    .join("");
  if (current) sel.value = current;
}

let selectedTags = new Set();

function renderTagChipPicker() {
  const wrap = $("#post-tags-picker");
  wrap.innerHTML = cache.taxonomy.tags
    .map(
      (t) =>
        `<span class="chip ${selectedTags.has(t) ? "selected" : ""}" data-tag="${escapeAdmin(t)}">${escapeAdmin(t)}</span>`
    )
    .join("");
  wrap.querySelectorAll(".chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const t = chip.dataset.tag;
      selectedTags.has(t) ? selectedTags.delete(t) : selectedTags.add(t);
      chip.classList.toggle("selected");
    });
  });
}

$("#open-new-post").addEventListener("click", () => openEditor(null));
$("#cancel-editor").addEventListener("click", () => closeEditor());

function openEditor(slug) {
  editingSlug = slug;
  pendingImageFile = null;
  selectedTags = new Set();
  const p = slug ? cache.posts.find((x) => x.slug === slug) : null;

  $("#editor-title").textContent = slug ? "Editar publicación" : "Nueva publicación";
  $("#post-title").value = p ? p.title : "";
  $("#post-subtitle").value = p ? p.subtitle || "" : "";
  $("#post-author").value = p ? p.author : cache.settings.author || "Nicolás Winther";
  $("#post-date").value = p ? toLocalInputValue(p.date) : toLocalInputValue(new Date().toISOString());
  $("#post-summary").value = p ? p.summary || "" : "";
  $("#post-body").value = p ? p.body || "" : "";
  $("#post-bibliography").value = p ? p.bibliography || "" : "";
  $("#post-image-caption").value = p ? p.imageCaption || "" : "";
  $("#post-image-input").value = "";
  $("#current-image-note").textContent = p && p.image ? `Imagen actual: ${p.image}` : "Sin imagen todavía.";

  renderCategorySelect();
  if (p) $("#post-category").value = p.category;
  if (p) (p.tags || []).forEach((t) => selectedTags.add(t));
  renderTagChipPicker();

  clearStatus($("#editor-status"));
  $("#editor-panel").hidden = false;
  $("#editor-panel").scrollIntoView({ behavior: "smooth", block: "start" });
}

function closeEditor() {
  $("#editor-panel").hidden = true;
  editingSlug = null;
}

function toLocalInputValue(iso) {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

$("#post-image-input").addEventListener("change", (e) => {
  pendingImageFile = e.target.files[0] || null;
});

$("#post-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const statusEl = $("#editor-status");
  const title = $("#post-title").value.trim();
  if (!title) {
    showStatus(statusEl, "El título es obligatorio.", "err");
    return;
  }

  const isNew = !editingSlug;
  const existing = editingSlug ? cache.posts.find((p) => p.slug === editingSlug) : null;
  const slug = editingSlug || uniqueSlug(slugify(title));

  showStatus(statusEl, "Guardando…", "pending");
  $("#post-save-btn").disabled = true;

  try {
    let imagePath = existing ? existing.image : null;

    if (pendingImageFile) {
      showStatus(statusEl, "Subiendo imagen…", "pending");
      const base64 = await fileToBase64(pendingImageFile);
      const ext = (pendingImageFile.name.split(".").pop() || "jpg").toLowerCase();
      imagePath = `images/${slug}-${Date.now()}.${ext}`;
      await repo.putBinaryFile(imagePath, base64, `feat: imagen para ${slug}`);
    }

    const dateLocal = $("#post-date").value;
    const post = {
      slug,
      title,
      subtitle: $("#post-subtitle").value.trim(),
      author: $("#post-author").value.trim() || "Nicolás Winther",
      date: dateLocal ? new Date(dateLocal).toISOString() : new Date().toISOString(),
      category: $("#post-category").value,
      tags: Array.from(selectedTags),
      image: imagePath,
      imageCaption: $("#post-image-caption").value.trim(),
      summary: $("#post-summary").value.trim(),
      body: $("#post-body").value,
      bibliography: $("#post-bibliography").value.trim(),
    };

    if (isNew) {
      cache.posts.push(post);
    } else {
      cache.posts = cache.posts.map((p) => (p.slug === slug ? post : p));
    }

    showStatus(statusEl, "Guardando publicación…", "pending");
    const res = await repo.putTextFile(
      "data/posts.json",
      JSON.stringify(cache.posts, null, 2),
      `${isNew ? "feat" : "chore"}: ${isNew ? "nueva publicación" : "editar publicación"} ${slug}`,
      cache.postsSha
    );
    cache.postsSha = res.content.sha;

    showStatus(statusEl, "Publicación guardada. Puede tardar uno o dos minutos en verse en el sitio (GitHub Pages se reconstruye).", "ok");
    renderPostList();
    setTimeout(closeEditor, 1200);
  } catch (err) {
    showStatus(statusEl, "Error al guardar: " + err.message, "err");
  } finally {
    $("#post-save-btn").disabled = false;
  }
});

function uniqueSlug(base) {
  const existingSlugs = new Set(cache.posts.map((p) => p.slug));
  if (!existingSlugs.has(base)) return base;
  let i = 2;
  while (existingSlugs.has(`${base}-${i}`)) i++;
  return `${base}-${i}`;
}

document.addEventListener("DOMContentLoaded", initConfigGate);
