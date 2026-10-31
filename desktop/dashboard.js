'use strict';

const statusLabel = document.getElementById('serverStatus');
const statusPill = document.querySelector('.server-pill');
const outputUrlLabel = document.getElementById('outputUrl');
const copyButton = document.getElementById('copyOutput');
const copyHighlighterButton = document.getElementById('copyHighlighter');
const highlighterUrlLabel = document.getElementById('highlighterUrl');

async function refreshInfo() {
  try {
    const info = await window.bibleDesktop.getInfo();
    statusLabel.textContent = info.serverRunning ? 'Local server online' : 'Local server offline';
    statusPill.classList.toggle('online', info.serverRunning);
    outputUrlLabel.textContent = info.outputUrl;
    highlighterUrlLabel.textContent = info.highlighterUrl;
    document.getElementById('portLabel').textContent = info.port;
    document.getElementById('versionLabel').textContent = `Desktop Edition · v${info.version}`;
  } catch (error) {
    statusLabel.textContent = 'Unable to read server status';
    outputUrlLabel.textContent = error.message;
  }
}

document.querySelectorAll('[data-module]').forEach((button) => {
  button.addEventListener('click', async () => {
    const moduleId = button.dataset.module;
    button.disabled = true;
    try {
      await window.bibleDesktop.openModule(moduleId);
    } catch (error) {
      console.error(`Unable to open ${moduleId}:`, error);
    } finally {
      button.disabled = false;
    }
  });
});

copyHighlighterButton.addEventListener('click', async () => {
  try {
    const info = await window.bibleDesktop.getInfo();
    await window.bibleDesktop.copyText(info.highlighterUrl);
    copyHighlighterButton.textContent = 'Copied';
    setTimeout(() => { copyHighlighterButton.textContent = 'Copy URL'; }, 1400);
  } catch (error) {
    copyHighlighterButton.textContent = 'Copy failed';
  }
});

copyButton.addEventListener('click', async () => {
  try {
    const info = await window.bibleDesktop.getInfo();
    await window.bibleDesktop.copyText(info.outputUrl);
    copyButton.textContent = 'Copied';
    setTimeout(() => { copyButton.textContent = 'Copy URL'; }, 1400);
  } catch (error) {
    copyButton.textContent = 'Copy failed';
  }
});

refreshInfo();
