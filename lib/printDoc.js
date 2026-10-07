/**
 * Prévisualisation PDF/document TOUJOURS visible (pas de page blanche).
 * Utilise srcdoc + fallback innerHTML.
 */
export function openPrintWindow(htmlBody, title = 'Document') {
  if (typeof document === 'undefined') return;

  const prev = document.getElementById('lingepro-print-root');
  if (prev) prev.remove();

  const safeTitle = String(title || 'Document').replace(/[<>&"']/g, '');

  const css = `
    *{box-sizing:border-box}
    body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;padding:28px;color:#0f172a;margin:0;background:#fff;font-size:14px;line-height:1.5}
    h1{font-size:1.4rem;margin:0 0 12px;color:#0f172a}
    h3{font-size:1.05rem;margin:20px 0 8px}
    table{width:100%;border-collapse:collapse;margin:12px 0;font-size:13px}
    th,td{border:1px solid #cbd5e1;padding:8px;text-align:left}
    th{background:#f1f5f9}
    .logo{height:52px;margin-bottom:14px;display:block;max-width:200px}
    .muted{color:#64748b;font-size:12px;margin-top:8px}
    ul{padding-left:1.25rem;margin:8px 0}
    p{margin:6px 0}
  `;

  const now = new Date();
  const dateEdition = now.toLocaleDateString('fr-FR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  const fullBody = `
    <p class="muted" style="margin:0 0 12px;font-size:11px;">Document édité le ${dateEdition}</p>
    ${htmlBody || '<p>Document vide</p>'}
    <p class="muted" style="margin-top:24px">Text'eau — Le nettoyage nature</p>
  `;

  const root = document.createElement('div');
  root.id = 'lingepro-print-root';
  root.innerHTML = `
    <div id="lingepro-print-overlay" style="position:fixed;inset:0;z-index:99999;background:rgba(15,23,42,.6);display:flex;align-items:center;justify-content:center;padding:12px;">
      <div style="background:#fff;width:100%;max-width:860px;max-height:94vh;border-radius:12px;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 25px 50px rgba(0,0,0,.3);">
        <div style="display:flex;gap:8px;align-items:center;padding:12px 16px;border-bottom:1px solid #e2e8f0;background:#f8fafc;flex-shrink:0;">
          <button type="button" id="lingepro-btn-print" style="padding:10px 18px;border-radius:8px;border:none;background:#0284c7;color:#fff;font-weight:700;cursor:pointer;font-size:14px;">Imprimer / PDF</button>
          <button type="button" id="lingepro-btn-close" style="padding:10px 18px;border-radius:8px;border:1px solid #cbd5e1;background:#fff;color:#0f172a;font-weight:600;cursor:pointer;font-size:14px;">Fermer</button>
          <span style="margin-left:auto;font-size:13px;color:#64748b;font-weight:600;">${safeTitle}</span>
        </div>
        <div id="lingepro-print-content" style="flex:1;overflow:auto;padding:24px;background:#fff;color:#0f172a;min-height:320px;">
          ${fullBody}
        </div>
      </div>
    </div>
  `;

  // Inject styles for the content area once
  if (!document.getElementById('lingepro-print-style')) {
    const st = document.createElement('style');
    st.id = 'lingepro-print-style';
    st.textContent = `
      #lingepro-print-content h1{font-size:1.4rem;margin:0 0 12px}
      #lingepro-print-content h3{font-size:1.05rem;margin:20px 0 8px}
      #lingepro-print-content table{width:100%;border-collapse:collapse;margin:12px 0;font-size:13px}
      #lingepro-print-content th,#lingepro-print-content td{border:1px solid #cbd5e1;padding:8px;text-align:left}
      #lingepro-print-content th{background:#f1f5f9}
      #lingepro-print-content .logo{height:52px;margin-bottom:14px;display:block;max-width:200px}
      #lingepro-print-content .muted{color:#64748b;font-size:12px}
      @media print {
        body * { visibility: hidden !important; }
        #lingepro-print-root, #lingepro-print-root * { visibility: visible !important; }
        #lingepro-print-overlay { position: static !important; background: #fff !important; padding: 0 !important; }
        #lingepro-print-overlay > div { box-shadow: none !important; max-height: none !important; border-radius: 0 !important; }
        #lingepro-btn-print, #lingepro-btn-close, #lingepro-print-overlay > div > div:first-child { display: none !important; }
        #lingepro-print-content { padding: 12px !important; overflow: visible !important; }
      }
    `;
    document.head.appendChild(st);
  }

  document.body.appendChild(root);

  const close = () => {
    const el = document.getElementById('lingepro-print-root');
    if (el) el.remove();
  };

  document.getElementById('lingepro-btn-close').onclick = close;
  document.getElementById('lingepro-print-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'lingepro-print-overlay') close();
  });

  document.getElementById('lingepro-btn-print').onclick = () => {
    // Impression du contenu visible via iframe srcdoc (fiable)
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
    document.body.appendChild(iframe);
    iframe.srcdoc = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${safeTitle}</title><style>${css}</style></head><body>${fullBody}</body></html>`;
    iframe.onload = () => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } catch (e) {
        // fallback: print current page with @media print rules
        window.print();
      }
      setTimeout(() => iframe.remove(), 1000);
    };
  };
}
