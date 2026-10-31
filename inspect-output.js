const fs = require('fs');
const path = require('path');

const outHtmlPath = path.join('C:', 'bible-html5-app', 'output', 'output.html');
const outJsPath = path.join('C:', 'bible-html5-app', 'output', 'output.js');

console.log('==================== OUTPUT.HTML STRUCTURE ====================');
if (fs.existsSync(outHtmlPath)) {
  const html = fs.readFileSync(outHtmlPath, 'utf8');
  // Kunin ang mismong mga tag sa loob ng body
  const bodyContent = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyContent) {
    console.log(bodyContent[1].trim());
  } else {
    console.log('Hindi mabasa ang body:', html.slice(0, 500));
  }
} else {
  console.log('Wala ang output.html');
}

console.log('\n==================== OUTPUT.JS RENDER LOGIC ====================');
if (fs.existsSync(outJsPath)) {
  const js = fs.readFileSync(outJsPath, 'utf8');
  const lines = js.split('\n');
  lines.forEach((line, i) => {
    // Hanapin kung paano nirerender o itinatago ang kahon
    if (/innerHTML|appendChild|hideVerseBox|\.style\.display|render/i.test(line)) {
      console.log(`L${i + 1}: ${line.trim()}`);
    }
  });
} else {
  console.log('Wala ang output.js');
}
console.log('================================================================');