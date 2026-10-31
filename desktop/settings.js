'use strict';

const $ = (id) => document.getElementById(id);
let appInfo = null;

async function loadInfo() {
  try {
    appInfo = await window.bibleDesktop.getInfo();
    $('serverStatus').textContent = appInfo.serverRunning ? 'Online' : 'Offline';
    $('serverStatus').style.color = appInfo.serverRunning ? '#34d399' : '#fbbf24';
    document.querySelector('.dot').classList.toggle('online', appInfo.serverRunning);
    $('port').textContent = appInfo.port;
    $('localUrl').textContent = appInfo.localUrl;
    $('lanIp').textContent = appInfo.lanIp;
    $('outputUrl').textContent = appInfo.outputUrl;
    $('dataDirectory').textContent = appInfo.dataDirectory;
  } catch (error) {
    $('serverStatus').textContent = error.message;
  }
}

$('copyUrl').addEventListener('click', async () => {
  if (!appInfo) return;
  await window.bibleDesktop.copyText(appInfo.outputUrl);
  $('copyUrl').textContent = 'Copied';
  setTimeout(() => { $('copyUrl').textContent = 'Copy'; }, 1400);
});
$('openOutput').addEventListener('click', () => window.bibleDesktop.openOutputUrl());
$('openSecondDisplay').addEventListener('click', () => window.bibleDesktop.openModule('output', 'second'));
$('closeSettings').addEventListener('click', () => window.bibleDesktop.closeCurrentWindow());
loadInfo();
