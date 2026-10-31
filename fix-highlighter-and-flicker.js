const fs = require('fs');
const path = require('path');

const ROOT = __dirname;

// 1. PATCH PARA SA OUTPUT.HTML (Anti-Flicker sa Highlight & Clear)
const OUTPUT_ANTI_FLICKER_PATCH = `
<style id="anti-flicker-style">
  /* Pigilan ang entrance animation kapag highlight/clear lang ang nagbago */
  body.suppress-verse-anim *,
  body.suppress-verse-anim *::before,
  body.suppress-verse-anim *::after {
    animation-duration: 0.001s !important;
    animation-delay: 0s !important;
    transition: background-color 0.15s ease, color 0.15s ease, text-shadow 0.15s ease !important;
  }
</style>
<script>
/* ANTI-FLICKER-HIGHLIGHT-PATCH */
(function() {
  let lastVerseSignature = '';
  let animTimer = null;

  function checkAndSuppressAnimation(rawPayload) {
    try {
      const data = typeof rawPayload === 'string' ? JSON.parse(rawPayload) : rawPayload;
      if (!data) return;

      // Kunin lang ang mismong Verse ID / Text (hiwalay sa highlight state)
      const sig = JSON.stringify({
        b: data.book || data.bookName || data.b || '',
        c: data.chapter || data.c || '',
        v: data.verse || data.v || '',
        t: data.translation || data.version || '',
        txt: data.text || data.verseText || data.html || ''
      });

      // Kung PAREHO pa rin ang talata at highlight/clear lang ang nag-update:
      if (sig === lastVerseSignature && lastVerseSignature !== '{"b":"","c":"","v":"","t":"","txt":""}') {
        document.body.classList.add('suppress-verse-anim');
        clearTimeout(animTimer);
        animTimer = setTimeout(() => {
          document.body.classList.remove('suppress-verse-anim');
        }, 120);
      } else {
        // Bagong talata ang isinalang -> Hayaang gumana ang normal na entrance animation!
        document.body.classList.remove('suppress-verse-anim');
        lastVerseSignature = sig;
      }
    } catch (e) {}
  }

  // Bantayan ang localStorage / Server Memory sync events
  window.addEventListener('storage', (e) => {
    if (e.newValue) {
      // Kung highlight key lang ang nagbago, wag patakbuhin ang verse entrance animation
      if (/highlight|hl|word|mark/i.test(e.key || '')) {
        document.body.classList.add('suppress-verse-anim');
        clearTimeout(animTimer);
        animTimer = setTimeout(() => document.body.classList.remove('suppress-verse-anim'), 120);
      } else {
        checkAndSuppressAnimation(e.newValue);
      }
    }
  }, true);

  // Bantayan din ang WebSocket messages kung doon dumadaan ang highlight
  const OrigWS = window.WebSocket;
  if (OrigWS) {
    window.WebSocket = function(url, protocols) {
      const ws = protocols ? new OrigWS(url, protocols) : new OrigWS(url);
      ws.addEventListener('message', (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg && (/highlight|hl|clear/i.test(msg.type || msg.action || '') || msg.highlights !== undefined)) {
            document.body.classList.add('suppress-verse-anim');
            clearTimeout(animTimer);
            animTimer = setTimeout(() => document.body.classList.remove('suppress-verse-anim'), 120);
          } else {
            checkAndSuppressAnimation(msg);
          }
        } catch (e) {}
      });
      return ws;
    };
    window.WebSocket.prototype = OrigWS.prototype;
    window.WebSocket.OPEN = OrigWS.OPEN;
    window.WebSocket.CLOSED = OrigWS.CLOSED;
  }
})();
</script>
`;

// 2. PATCH PARA SA HIGHLIGHTER.HTML (Auto-Fit Font Size sa Tablet Box + Smooth Clear)
const HIGHLIGHTER_AUTOFIT_PATCH = `
<style id="highlighter-autofit-style">
  /* Siguraduhing walang scrollbar at sakto sa screen ng tablet */
  html, body {
    overflow: hidden !important;
    touch-action: manipulation;
  }
  .autofit-verse-box {
    overflow: hidden !important;
    display: flex !important;
    flex-wrap: wrap !important;
    align-content: center !important;
    justify-content: center !important;
  }
  /* Pigilan din ang flicker sa mismong highlighter screen kapag nag-click o nag-clear */
  .suppress-hl-flicker, .suppress-hl-flicker * {
    animation: none !important;
    transition: background-color 0.12s ease, color 0.12s ease, transform 0.08s ease !important;
  }
</style>
<script>
/* HIGHLIGHTER-AUTOFIT-AND-SMOOTH-CLEAR */
(function() {
  function findVerseContainer() {
    // Hanapin ang mismong box kung saan nakalagay ang mga salita ng verse
    const selectors = [
      '#verse-box', '#verseBox', '#verse-container', '#verseContainer',
      '#highlighter-box', '#words-container', '#verse-text', '#verseText',
      '.verse-box', '.verse-container', '.highlighter-content', '.words-area', '#content'
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el && el.innerText && el.innerText.trim().length > 0) return el;
    }
    // Fallback: Hanapin ang parent container ng mga clickable word spans
    const wordSpan = document.querySelector('span[data-index], span.word, .word-item, .hl-word');
    if (wordSpan && wordSpan.parentElement) return wordSpan.parentElement;
    return null;
  }

  function fitTextToBox() {
    const box = findVerseContainer();
    if (!box) return;

    box.classList.add('suppress-hl-flicker');
    box.style.overflowY = 'hidden';

    // Kunin ang available height ng box (o ng natitirang espasyo sa tablet screen)
    const rect = box.getBoundingClientRect();
    const maxHeight = box.clientHeight > 60 ? box.clientHeight : (window.innerHeight - rect.top - 24);
    const maxWidth = box.clientWidth || (window.innerWidth - 32);

    if (maxHeight <= 40 || !box.innerText.trim()) return;

    // Binary search para mahanap ang pinakamalaking font size na kasya nang walang scroll
    let minSize = 14;
    let maxSize = 90;
    let optimalSize = 28;

    while (minSize <= maxSize) {
      const mid = Math.floor((minSize + maxSize) / 2);
      box.style.fontSize = mid + 'px';
      box.style.lineHeight = '1.32';

      // I-check kung sumobra sa taas o lapad ng box
      if (box.scrollHeight <= maxHeight && box.scrollWidth <= maxWidth + 4) {
        optimalSize = mid;
        minSize = mid + 1; // Subukan pang lakihan
      } else {
        maxSize = mid - 1; // Paliitin dahil umapaw
      }
    }

    box.style.fontSize = optimalSize + 'px';
  }

  // Patakbuhin ang auto-fit tuwing magbabago ang verse o ikot ng tablet
  let fitTimeout = null;
  function scheduleFit() {
    clearTimeout(fitTimeout);
    fitTimeout = setTimeout(fitTextToBox, 30);
  }

  window.addEventListener('DOMContentLoaded', () => {
    scheduleFit();
    const observer = new MutationObserver((mutations) => {
      // Mag-recalculate lang kapag nagpalit ng mga salita (childList), hindi kapag nag-toggle lang ng highlight class
      const hasNewWords = mutations.some(m => m.type === 'childList');
      if (hasNewWords) scheduleFit();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  });

  window.addEventListener('resize', scheduleFit);
  window.addEventListener('orientationchange', scheduleFit);
  window.addEventListener('storage', scheduleFit);
})();
</script>
`;

function applyPatches(dir) {
  for (const file of fs.readdirSync(dir)) {
    if (['node_modules', '.git'].includes(file)) continue;
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      applyPatches(fullPath);
    } else if (file.toLowerCase().includes('output') && file.endsWith('.html')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      if (!content.includes('ANTI-FLICKER-HIGHLIGHT-PATCH')) {
        content = content.includes('<head>')
          ? content.replace('<head>', '<head>' + OUTPUT_ANTI_FLICKER_PATCH)
          : OUTPUT_ANTI_FLICKER_PATCH + content;
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`✅ Anti-Flicker Patch ikinabit sa: ${path.relative(ROOT, fullPath)}`);
      }
    } else if (file.toLowerCase().includes('highlight') && file.endsWith('.html')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      if (!content.includes('HIGHLIGHTER-AUTOFIT-AND-SMOOTH-CLEAR')) {
        content = content.includes('<head>')
          ? content.replace('<head>', '<head>' + HIGHLIGHTER_AUTOFIT_PATCH)
          : HIGHLIGHTER_AUTOFIT_PATCH + content;
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`✅ Tablet Auto-Fit & Smooth Highlight ikinabit sa: ${path.relative(ROOT, fullPath)}`);
      }
    }
  }
}

applyPatches(ROOT);
console.log('\n🎉 Tapos na! Naayos na ang Flicker at naka-Auto-Fit na ang Highlighter sa Tablet.');