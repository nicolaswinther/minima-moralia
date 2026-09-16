/*
 * Minima Moralia — capa mínima sobre la API de Contenidos de GitHub.
 * Se usa solo desde admin.html. El token nunca sale del navegador salvo
 * hacia api.github.com (que es, justamente, a quien pertenece).
 */

const CONFIG_KEY = "minima-moralia:config";

function loadConfig() {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function saveConfig(cfg) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
}

function clearConfig() {
  localStorage.removeItem(CONFIG_KEY);
}

// Codifica UTF-8 -> base64 sin perder tildes / ñ / etc.
function utf8ToBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

function base64ToUtf8(b64) {
  const binary = atob(b64);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

class GitHubRepo {
  constructor({ owner, repo, branch, token }) {
    this.owner = owner;
    this.repo = repo;
    this.branch = branch || "main";
    this.token = token;
  }

  get base() {
    return `https://api.github.com/repos/${this.owner}/${this.repo}`;
  }

  async _request(path, opts = {}) {
    const res = await fetch(`${this.base}${path}`, {
      ...opts,
      headers: {
        Authorization: `token ${this.token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        ...(opts.headers || {}),
      },
    });
    if (!res.ok) {
      let detail = "";
      try {
        const body = await res.json();
        detail = body.message || "";
      } catch (e) {}
      const err = new Error(
        `GitHub API ${res.status}: ${detail || res.statusText}`
      );
      err.status = res.status;
      throw err;
    }
    if (res.status === 204) return null;
    return res.json();
  }

  // Lee un archivo de texto/JSON. Devuelve { content (string), json, sha } o null si no existe.
  async getFile(path) {
    try {
      const data = await this._request(
        `/contents/${encodeURIComponent(path).replace(/%2F/g, "/")}?ref=${
          this.branch
        }`
      );
      const content = base64ToUtf8(data.content.replace(/\n/g, ""));
      let json = null;
      try {
        json = JSON.parse(content);
      } catch (e) {}
      return { content, json, sha: data.sha };
    } catch (e) {
      if (e.status === 404) return null;
      throw e;
    }
  }

  // Crea o actualiza un archivo de texto (recibe string ya serializado).
  async putTextFile(path, text, message, sha) {
    return this._request(
      `/contents/${encodeURIComponent(path).replace(/%2F/g, "/")}`,
      {
        method: "PUT",
        body: JSON.stringify({
          message,
          content: utf8ToBase64(text),
          branch: this.branch,
          ...(sha ? { sha } : {}),
        }),
      }
    );
  }

  // Sube un archivo binario a partir de un base64 "puro" (sin el prefijo data:...).
  async putBinaryFile(path, base64Content, message, sha) {
    return this._request(
      `/contents/${encodeURIComponent(path).replace(/%2F/g, "/")}`,
      {
        method: "PUT",
        body: JSON.stringify({
          message,
          content: base64Content,
          branch: this.branch,
          ...(sha ? { sha } : {}),
        }),
      }
    );
  }

  async deleteFile(path, message, sha) {
    return this._request(
      `/contents/${encodeURIComponent(path).replace(/%2F/g, "/")}`,
      {
        method: "DELETE",
        body: JSON.stringify({ message, sha, branch: this.branch }),
      }
    );
  }

  // Verifica que el token realmente puede escribir en este repo.
  async verify() {
    const info = await this._request("");
    return info;
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result; // "data:<mime>;base64,XXXX"
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function slugify(str) {
  return str
    .toString()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "publicacion";
}
