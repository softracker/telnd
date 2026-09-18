const fs = require('fs');
const path = require('path');
const { marked } = require('C:/telnd app/node_modules/marked');
const puppeteer = require('C:/telnd app/node_modules/puppeteer-core');

const mdPath = process.argv[2] || 'TELND_COMPLETE_DOCUMENTATION.md';
const outputPath = process.argv[3] || 'TELND_COMPLETE_DOCUMENTATION.pdf';

async function convertMdToPdf() {
  const mdContent = fs.readFileSync(path.resolve(__dirname, mdPath), 'utf-8');
  
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page {
      margin: 20mm;
      size: A4;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 100%;
      font-size: 11pt;
    }
    h1 {
      color: #1e40af;
      border-bottom: 2px solid #1e40af;
      padding-bottom: 8px;
      margin-top: 30px;
      page-break-before: always;
      font-size: 22pt;
    }
    h1:first-of-type {
      page-break-before: avoid;
      text-align: center;
      font-size: 28pt;
    }
    h2 {
      color: #1e3a8a;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 6px;
      margin-top: 24px;
      font-size: 16pt;
    }
    h3 {
      color: #374151;
      margin-top: 18px;
      font-size: 13pt;
    }
    h4 {
      color: #4b5563;
      margin-top: 14px;
      font-size: 11pt;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 12px 0;
      font-size: 10pt;
    }
    th, td {
      border: 1px solid #d1d5db;
      padding: 8px 10px;
      text-align: left;
    }
    th {
      background-color: #1e40af;
      color: white;
      font-weight: 600;
    }
    tr:nth-child(even) {
      background-color: #f9fafb;
    }
    code {
      background-color: #f3f4f6;
      padding: 2px 5px;
      border-radius: 3px;
      font-size: 10pt;
      font-family: 'Consolas', 'Monaco', monospace;
    }
    pre {
      background-color: #1f2937;
      color: #e5e7eb;
      padding: 14px;
      border-radius: 6px;
      overflow-x: auto;
      font-size: 9pt;
      line-height: 1.4;
      page-break-inside: avoid;
    }
    pre code {
      background: none;
      padding: 0;
      color: inherit;
    }
    strong {
      color: #1e40af;
    }
    em {
      color: #6b7280;
    }
    ul, ol {
      padding-left: 24px;
    }
    li {
      margin-bottom: 4px;
    }
    blockquote {
      border-left: 4px solid #1e40af;
      padding-left: 16px;
      margin: 12px 0;
      color: #6b7280;
    }
    hr {
      border: none;
      border-top: 2px solid #e5e7eb;
      margin: 24px 0;
    }
    a {
      color: #2563eb;
      text-decoration: none;
    }
  </style>
</head>
<body>
  ${marked.parse(mdContent)}
</body>
</html>`;

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:/Users/devel/.cache/puppeteer/chrome/win64-152.0.7977.75/chrome-win64/chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
  
  await page.pdf({
    path: path.resolve(__dirname, outputPath),
    format: 'A4',
    printBackground: true,
    margin: {
      top: '20mm',
      bottom: '20mm',
      left: '15mm',
      right: '15mm'
    }
  });
  
  await browser.close();
  console.log(`PDF generated: ${outputPath}`);
}

convertMdToPdf().catch(console.error);
