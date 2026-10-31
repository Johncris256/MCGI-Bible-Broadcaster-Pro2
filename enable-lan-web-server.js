const fs = require('fs');
const path = require('path');
const os = require('os');

const baseDir = path.join('C:', 'bible-html5-app');
const serverJsPath = path.join(baseDir, 'server.js');
const opHtmlPath = path.join(baseDir, 'operator', 'index.html');

console.log('--- ENABLING LAN WEB CONTROLLER SERVER (vMix Style) ---');

// 1. HANAPIN ANG LOCAL IP ADDRESS NG PC
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

const localIP = getLocalIP();
const PORT = 3300;

console.log(`\nLocal IP Address ng PC: ${localIP}`);

// 2. I-UPDATE ANG SERVER.JS PARA MAG-BIND SA '0.0.0.0' (OPEN TO LAN)
if (fs.existsSync(serverJsPath)) {
  let serverCode = `
const express = require('express');
const path = require('path');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 3300;

// Serve static folders
app.use(express.static(__dirname));
app.use('/operator', express.static(path.join(__dirname, 'operator')));
app.use('/output', express.static(path.join(__dirname, 'output')));

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

// Bind sa '0.0.0.0' para tanggapin ang koneksyon mula sa ibang devices sa LAN
app.listen(PORT, '0.0.0.0', () => {
  const ip = getLocalIP();
  console.log('===========================================================');
  console.log('       ✨ BIBLE PROJECTION WEB SERVER IS RUNNING ✨');
  console.log('===========================================================');
  console.log(\`  > Local PC Access:       http://localhost:\${PORT}/operator/\`);
  console.log(\`  > LAN Web Address (vMix): http://\${ip}:\${PORT}/operator/\`);
  console.log(\`  > Output Display Stream: http://\${ip}:\${PORT}/output/output.html\`);
  console.log('===========================================================');
});
`;
  fs.writeFileSync(serverJsPath, serverCode, 'utf8');
  console.log('✓ Naisaayos ang server.js para suportahan ang LAN network access.');
}

// 3. MAGDAGDAG NG VMix-STYLE ADDRESS DISPLAY BAR SA OPERATOR PANEL
if (fs.existsSync(opHtmlPath)) {
  let opHtml = fs.readFileSync(opHtmlPath, 'utf8');

  // Linisin ang lumang LAN banner kung mayroon man
  opHtml = opHtml.replace(/<div id="VMIX_LAN_ADDRESS_BAR">[\s\S]*?<\/div>/gi, '');

  const lanBannerUI = `
  <div id="VMIX_LAN_ADDRESS_BAR" style="background: rgba(15, 23, 42, 0.95); border-bottom: 1px solid rgba(255, 215, 0, 0.3); padding: 6px 16px; display: flex; align-items: center; justify-content: space-between; font-family: monospace; font-size: 0.82rem; color: #cbd5e1;">
    <div style="display: flex; align-items: center; gap: 10px;">
      <span style="display: inline-block; width: 8px; height: 8px; background: #22c55e; border-radius: 50%; box-shadow: 0 0 8px #22c55e;"></span>
      <strong style="color: #ffd700;">LAN Web Controller Address:</strong>
      <a href="http://${localIP}:${PORT}/operator/" target="_blank" style="color: #38bdf8; text-decoration: underline; font-weight: bold;">http://${localIP}:${PORT}/operator/</a>
    </div>
    <div>
      <span style="color: #94a3b8;">Output Stream:</span>
      <a href="http://${localIP}:${PORT}/output/output.html" target="_blank" style="color: #a855f7; text-decoration: underline; margin-left: 5px;">http://${localIP}:${PORT}/output/output.html</a>
    </div>
  </div>
  `;

  if (opHtml.includes('<body>')) {
    opHtml = opHtml.replace('<body>', '<body>\n' + lanBannerUI);
  } else {
    opHtml = lanBannerUI + '\n' + opHtml;
  }

  fs.writeFileSync(opHtmlPath, opHtml, 'utf8');
  console.log('✓ Naidagdag ang vMix-Style Web Address Bar sa Operator Panel header.');
}

console.log('\n========================================================');
console.log('✓ SUCCESS! LAN WEB CONTROLLER FEATURE IS FULLY ENABLED.');
console.log('========================================================');