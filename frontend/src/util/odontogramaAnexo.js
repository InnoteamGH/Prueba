/**
 * E5-B: rasterizar el SVG del odontograma del paciente para el anexo del plan.
 * Evita E-5 (animación) y E-6 (mover el SVG del árbol): clona in-place styles.
 */

/**
 * @param {SVGSVGElement} svgEl
 * @param {{ scale?: number, margin?: number }} [opts]
 * @returns {Promise<string>} data URL PNG
 */
export function svgElementoAPngDataUrl(svgEl, opts = {}) {
  const scale = opts.scale ?? 2;
  const margin = opts.margin ?? 18;
  if (!svgEl || typeof svgEl.cloneNode !== "function") {
    return Promise.reject(new Error("SVG inválido"));
  }

  const clone = svgEl.cloneNode(true);
  // E-5: sin animación de entrada
  const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
  style.textContent = `
    .pieza{animation:none!important;opacity:1!important;transform:none!important}
    .halo,.anillo{display:none!important}
  `;
  clone.insertBefore(style, clone.firstChild);

  const vb = clone.viewBox?.baseVal;
  const w = (vb && vb.width) || Number(clone.getAttribute("width")) || 1440;
  const h = (vb && vb.height) || Number(clone.getAttribute("height")) || 880;
  clone.setAttribute("width", String(w));
  clone.setAttribute("height", String(h));
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");

  const xml = new XMLSerializer().serializeToString(clone);
  const blob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const cw = Math.round(w * scale) + margin * 2;
        const ch = Math.round(h * scale) + margin * 2;
        const canvas = document.createElement("canvas");
        canvas.width = cw;
        canvas.height = ch;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, cw, ch);
        ctx.drawImage(img, margin, margin, Math.round(w * scale), Math.round(h * scale));
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL("image/png"));
      } catch (e) {
        URL.revokeObjectURL(url);
        reject(e);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo rasterizar el odontograma"));
    };
    img.src = url;
  });
}

/**
 * Pide al iframe anatómico un PNG del SVG actual (postMessage).
 * @param {Window} contentWindow
 * @param {number} [timeoutMs]
 */
export function pedirAnexoAlIframe(contentWindow, timeoutMs = 4000) {
  return new Promise((resolve, reject) => {
    if (!contentWindow) {
      reject(new Error("iframe no listo"));
      return;
    }
    const id = `anexo-${Date.now()}`;
    const t = setTimeout(() => {
      window.removeEventListener("message", onMsg);
      reject(new Error("timeout anexo"));
    }, timeoutMs);
    function onMsg(ev) {
      const d = ev?.data;
      if (!d || d.type !== "dento-odontograma-anexo" || d.id !== id) return;
      clearTimeout(t);
      window.removeEventListener("message", onMsg);
      if (d.error) reject(new Error(d.error));
      else resolve(d.dataUrl);
    }
    window.addEventListener("message", onMsg);
    try {
      contentWindow.postMessage({ type: "dento-odontograma-export-png", id }, "*");
    } catch (e) {
      clearTimeout(t);
      window.removeEventListener("message", onMsg);
      reject(e);
    }
  });
}

export function altAnexoOdontograma(paciente, fase, fecha) {
  const nom = paciente?.nombre || "paciente";
  const f = fase || "inicial";
  const fe = fecha || new Date().toISOString().slice(0, 10);
  return `Odontograma de ${nom}, fase ${f}, ${fe}`;
}
