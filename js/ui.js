// Utilidades de interface.
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function toast(msg, kind = '') {
  let box = document.getElementById('toasts');
  if (!box) { box = document.createElement('div'); box.id = 'toasts'; box.setAttribute('aria-live', 'polite'); document.body.append(box); }
  const t = document.createElement('div'); t.className = 'toast ' + kind; t.textContent = msg; box.append(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, kind === 'err' ? 6000 : 3500);
}

// Redimensiona e comprime a foto no aparelho (JPEG) antes de guardar.
export function imgToDataURL(file, max = 480, quality = 0.8) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) return reject(new Error('Escolha um arquivo de imagem.'));
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height)), w = Math.round(img.width * k), h = Math.round(img.height * k);
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      const g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url); resolve(cv.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Não consegui abrir essa imagem.')); };
    img.src = url;
  });
}

export const fmtData = iso => { const d = new Date(iso); return Number.isNaN(+d) ? '' : d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }); };
export const toLocalInput = iso => { if (!iso) return ''; const d = new Date(iso); if (Number.isNaN(+d)) return ''; const p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };

// Caixa de diálogo simples com um campo de texto (substitui prompt()).
export function ask(titulo, { label = '', valor = '', ok = 'OK', ph = '' } = {}) {
  return new Promise(res => {
    const dlg = document.createElement('dialog'); dlg.className = 'ask';
    dlg.innerHTML = `<form method="dialog"><h3>${esc(titulo)}</h3><label>${esc(label)}<input id="askv" class="f" value="${esc(valor)}" placeholder="${esc(ph)}" autocomplete="off"></label><div class="rl-btns"><button class="btn accent" value="ok">${esc(ok)}</button><button class="btn ghost" value="x">Cancelar</button></div></form>`;
    document.body.append(dlg);
    dlg.addEventListener('close', () => { res(dlg.returnValue === 'ok' ? dlg.querySelector('#askv').value.trim() : null); dlg.remove(); });
    dlg.showModal(); dlg.querySelector('#askv').focus();
  });
}
export function confirmar(msg) { return Promise.resolve(window.confirm(msg)); }
