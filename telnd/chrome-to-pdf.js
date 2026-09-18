const { execSync } = require('child_process');
const path = require('path');

const htmlPath = path.resolve(__dirname, 'TELND_COMPLETE_DOCUMENTATION.html');
const pdfPath = path.resolve(__dirname, 'TELND_COMPLETE_DOCUMENTATION.pdf');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

try {
  execSync(`"${chromePath}" --headless --disable-gpu --no-sandbox --print-to-pdf="${pdfPath}" "${htmlPath}"`, {
    timeout: 60000,
    stdio: 'pipe'
  });
  console.log(`PDF generated: ${pdfPath}`);
} catch (error) {
  console.error('Error:', error.message);
}
