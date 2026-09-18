const fs = require('fs');
const path = require('path');
const { marked } = require('C:/telnd app/node_modules/marked');

const mdPath = path.resolve(__dirname, 'TELND_COMPLETE_DOCUMENTATION.md');
const outputPath = path.resolve(__dirname, 'TELND_COMPLETE_DOCUMENTATION.html');

const mdContent = fs.readFileSync(mdPath, 'utf-8');

const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TELND Complete Documentation</title>
  <style>
    @page {
      margin: 20mm;
      size: A4;
    }
    * {
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.7;
      color: #1f2937;
      max-width: 100%;
      margin: 0;
      padding: 40px;
      background: white;
      font-size: 14px;
    }
    h1 {
      color: #1e40af;
      border-bottom: 3px solid #1e40af;
      padding-bottom: 12px;
      margin-top: 50px;
      font-size: 28px;
      page-break-before: always;
    }
    h1:first-of-type {
      page-break-before: avoid;
      text-align: center;
      font-size: 36px;
      border-bottom: none;
      margin-top: 80px;
      margin-bottom: 10px;
    }
    h2 {
      color: #1e3a8a;
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 8px;
      margin-top: 35px;
      font-size: 22px;
    }
    h3 {
      color: #374151;
      margin-top: 25px;
      font-size: 18px;
    }
    h4 {
      color: #4b5563;
      margin-top: 18px;
      font-size: 16px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
      font-size: 13px;
      page-break-inside: avoid;
    }
    th, td {
      border: 1px solid #d1d5db;
      padding: 10px 12px;
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
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 13px;
      font-family: 'Cascadia Code', 'Fira Code', Consolas, Monaco, monospace;
    }
    pre {
      background-color: #1f2937;
      color: #e5e7eb;
      padding: 18px;
      border-radius: 8px;
      overflow-x: auto;
      font-size: 12px;
      line-height: 1.5;
      page-break-inside: avoid;
    }
    pre code {
      background: none;
      padding: 0;
      color: inherit;
      font-size: inherit;
    }
    strong {
      color: #1e40af;
    }
    em {
      color: #6b7280;
    }
    ul, ol {
      padding-left: 28px;
    }
    li {
      margin-bottom: 6px;
    }
    blockquote {
      border-left: 4px solid #1e40af;
      padding: 12px 16px;
      margin: 16px 0;
      background-color: #eff6ff;
      border-radius: 0 8px 8px 0;
    }
    hr {
      border: none;
      border-top: 2px solid #e5e7eb;
      margin: 30px 0;
    }
    a {
      color: #2563eb;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
    @media print {
      body {
        padding: 0;
      }
      h1:first-of-type {
        margin-top: 40px;
      }
    }
  </style>
</head>
<body>
${marked.parse(mdContent)}
</body>
</html>`;

fs.writeFileSync(outputPath, htmlContent, 'utf-8');
console.log(`HTML file generated: ${outputPath}`);
console.log('Open this file in Chrome/Edge and use Ctrl+P to save as PDF.');
