const fs = require('fs');
const path = require('path');
const { marked } = require('C:/telnd app/node_modules/marked');

const logo1 = fs.readFileSync(path.resolve(__dirname, 'TELND-Logo-1.png')).toString('base64');
const logo2 = fs.readFileSync(path.resolve(__dirname, 'TELND-Logo-2.png')).toString('base64');
const logo3 = fs.readFileSync(path.resolve(__dirname, 'TELND-Logo-3.png')).toString('base64');
const favicon = fs.readFileSync(path.resolve(__dirname, 'favicon.png')).toString('base64');

const mdPath = path.resolve(__dirname, 'TELND_PROJECT_DETAILS.md');
let mdContent = fs.readFileSync(mdPath, 'utf-8');

const htmlContent = marked(mdContent);

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="icon" type="image/png" href="data:image/png;base64,${favicon}">
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
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      line-height: 1.7;
      color: #1f2937;
      margin: 0;
      padding: 40px;
      background: white;
      font-size: 14px;
    }

    .cover-page {
      text-align: center;
      padding: 80px 40px;
      page-break-after: always;
      background: linear-gradient(135deg, #0B1B2F 0%, #034548 100%);
      color: white;
      margin: -40px -40px 40px -40px;
    }

    .cover-logo-main {
      width: 280px;
      height: auto;
      margin-bottom: 20px;
    }

    .cover-title {
      font-size: 42px;
      font-weight: 800;
      margin: 20px 0 10px;
      color: #F9F6F0;
      letter-spacing: 2px;
    }

    .cover-subtitle {
      font-size: 18px;
      color: #30A9A2;
      margin-bottom: 10px;
    }

    .cover-tagline {
      font-size: 16px;
      color: #FE793F;
      margin-bottom: 30px;
    }

    .cover-meta {
      font-size: 13px;
      color: #94a3b8;
      margin-top: 40px;
      line-height: 2;
    }

    .toc-page {
      page-break-after: always;
      padding: 20px 0;
    }

    .toc-title {
      font-size: 28px;
      font-weight: 700;
      color: #034548;
      border-bottom: 3px solid #30A9A2;
      padding-bottom: 10px;
      margin-bottom: 20px;
    }

    .toc-item {
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
      border-bottom: 1px dotted #cbd5e1;
      font-size: 13px;
    }

    .toc-num {
      color: #30A9A2;
      font-weight: 600;
      width: 30px;
    }

    .toc-label {
      flex: 1;
      color: #1f2937;
    }

    .toc-page-num {
      color: #64748b;
      width: 40px;
      text-align: right;
    }

    h1 {
      font-size: 24px;
      color: #034548;
      border-bottom: 2px solid #30A9A2;
      padding-bottom: 8px;
      margin-top: 30px;
      page-break-before: always;
    }

    h1:first-of-type {
      page-break-before: avoid;
    }

    h2 {
      font-size: 20px;
      color: #0B1B2F;
      margin-top: 20px;
    }

    h3 {
      font-size: 16px;
      color: #034548;
      margin-top: 15px;
    }

    h4 {
      font-size: 14px;
      color: #0B1B2F;
      margin-top: 12px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
      font-size: 13px;
    }

    th {
      background: #034548;
      color: white;
      padding: 10px;
      text-align: left;
    }

    td {
      padding: 8px 10px;
      border-bottom: 1px solid #e2e8f0;
    }

    tr:nth-child(even) {
      background: #f8fafc;
    }

    code {
      background: #1e293b;
      color: #30A9A2;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 12px;
    }

    pre {
      background: #1e293b;
      color: #e2e8f0;
      padding: 15px;
      border-radius: 8px;
      overflow-x: auto;
      font-size: 12px;
      line-height: 1.5;
    }

    pre code {
      background: none;
      padding: 0;
      color: inherit;
    }

    blockquote {
      border-left: 4px solid #30A9A2;
      padding: 10px 15px;
      margin: 15px 0;
      background: #f0fdfa;
      color: #034548;
    }

    strong {
      color: #0B1B2F;
    }

    em {
      color: #64748b;
    }

    hr {
      border: none;
      border-top: 1px solid #e2e8f0;
      margin: 20px 0;
    }

    ul, ol {
      padding-left: 25px;
      margin: 10px 0;
    }

    li {
      margin-bottom: 4px;
    }

    @media print {
      .cover-page { page-break-after: always; }
      .toc-page { page-break-after: always; }
      h1 { page-break-before: always; }
      h1:first-of-type { page-break-before: avoid; }
    }
  </style>
</head>
<body>

<div class="cover-page">
  <img src="data:image/png;base64,${logo1}" class="cover-logo-main" alt="TELND Logo">
  <div class="cover-title">TELND</div>
  <div class="cover-subtitle">Complete Product Documentation</div>
  <div class="cover-tagline">One Platform, Multiple Everyday Needs</div>
  <div style="width:100px; height:3px; background:#FE793F; margin:20px auto;"></div>
  <div style="font-size:12px; color:#94a3b8; margin-top:20px; font-style:italic;">Proposed plan and architecture. Will be adjusted as per requirements. Final documentation will be released after completion of work.</div>
  <div class="cover-meta">
    <div>Version 2.0 | September 2026</div>
    <div>Career & Talent Ecosystem for Bangladesh</div>
    <div style="margin-top:30px;">Design By: Pranta Biswas</div>
    <div>biswaspranta@hotmail.com | 01316397072</div>
    <div>Founder of TELND</div>
  </div>
</div>

<div class="toc-page">
  <div class="toc-title">Table of Contents</div>
  <div class="toc-item"><span class="toc-num">1</span><span class="toc-label">Project Overview</span><span class="toc-page-num">3</span></div>
  <div class="toc-item"><span class="toc-num">2</span><span class="toc-label">Product Vision</span><span class="toc-page-num">4</span></div>
  <div class="toc-item"><span class="toc-num">3</span><span class="toc-label">Target Users</span><span class="toc-page-num">4</span></div>
  <div class="toc-item"><span class="toc-num">4</span><span class="toc-label">User Types & Roles</span><span class="toc-page-num">5</span></div>
  <div class="toc-item"><span class="toc-num">5</span><span class="toc-label">Account Types</span><span class="toc-page-num">5</span></div>
  <div class="toc-item"><span class="toc-num">6</span><span class="toc-label">Authentication Requirements</span><span class="toc-page-num">6</span></div>
  <div class="toc-item"><span class="toc-num">7</span><span class="toc-label">Authentication & Onboarding Workflow</span><span class="toc-page-num">7</span></div>
  <div class="toc-item"><span class="toc-num">8</span><span class="toc-label">Candidate Career Profile</span><span class="toc-page-num">8</span></div>
  <div class="toc-item"><span class="toc-num">9</span><span class="toc-label">AI Career Assistant</span><span class="toc-page-num">10</span></div>
  <div class="toc-item"><span class="toc-num">10</span><span class="toc-label">Intelligent Job Search</span><span class="toc-page-num">10</span></div>
  <div class="toc-item"><span class="toc-num">11</span><span class="toc-label">AI Job Matching & Eligibility</span><span class="toc-page-num">11</span></div>
  <div class="toc-item"><span class="toc-num">12</span><span class="toc-label">Job Listings & Applications</span><span class="toc-page-num">12</span></div>
  <div class="toc-item"><span class="toc-num">13</span><span class="toc-label">Application Tracker</span><span class="toc-page-num">17</span></div>
  <div class="toc-item"><span class="toc-num">14</span><span class="toc-label">Employer Accounts & Company Profiles</span><span class="toc-page-num">17</span></div>
  <div class="toc-item"><span class="toc-num">15</span><span class="toc-label">Employer Recruitment Dashboard</span><span class="toc-page-num">17</span></div>
  <div class="toc-item"><span class="toc-num">16</span><span class="toc-label">Employer-to-Candidate Invitations</span><span class="toc-page-num">18</span></div>
  <div class="toc-item"><span class="toc-num">17</span><span class="toc-label">Assessments & Company Initial Tests</span><span class="toc-page-num">19</span></div>
  <div class="toc-item"><span class="toc-num">18</span><span class="toc-label">TELND Online Mock Tests</span><span class="toc-page-num">20</span></div>
  <div class="toc-item"><span class="toc-num">19</span><span class="toc-label">AI Mock Interview</span><span class="toc-page-num">20</span></div>
  <div class="toc-item"><span class="toc-num">19B</span><span class="toc-label">AI Live Skill Test</span><span class="toc-page-num">21</span></div>
  <div class="toc-item"><span class="toc-num">20</span><span class="toc-label">AI CV & Cover Letter Tools</span><span class="toc-page-num">22</span></div>
  <div class="toc-item"><span class="toc-num">21</span><span class="toc-label">TELND Learn — Courses</span><span class="toc-page-num">23</span></div>
  <div class="toc-item"><span class="toc-num">22</span><span class="toc-label">TELND Certifications & Skill Assessments</span><span class="toc-page-num">24</span></div>
  <div class="toc-item"><span class="toc-num">23</span><span class="toc-label">Career Path & Skill Gap Analysis</span><span class="toc-page-num">24</span></div>
  <div class="toc-item"><span class="toc-num">24</span><span class="toc-label">Interview & Offer Management</span><span class="toc-page-num">24</span></div>
  <div class="toc-item"><span class="toc-num">25</span><span class="toc-label">Messaging & Notifications</span><span class="toc-page-num">26</span></div>
  <div class="toc-item"><span class="toc-num">26</span><span class="toc-label">Trust, Verification & Safety</span><span class="toc-page-num">27</span></div>
  <div class="toc-item"><span class="toc-num">27</span><span class="toc-label">Salary Intelligence & Career Analytics</span><span class="toc-page-num">29</span></div>
  <div class="toc-item"><span class="toc-num">28</span><span class="toc-label">TELND Workforce — TELND as Employer</span><span class="toc-page-num">30</span></div>
  <div class="toc-item"><span class="toc-num">29</span><span class="toc-label">Outsourcing / Workforce Services</span><span class="toc-page-num">31</span></div>
  <div class="toc-item"><span class="toc-num">30</span><span class="toc-label">Payments & Monetization</span><span class="toc-page-num">31</span></div>
  <div class="toc-item"><span class="toc-num">31</span><span class="toc-label">Candidate Premium</span><span class="toc-page-num">32</span></div>
  <div class="toc-item"><span class="toc-num">32</span><span class="toc-label">Personalized Home Feed</span><span class="toc-page-num">32</span></div>
  <div class="toc-item"><span class="toc-num">33</span><span class="toc-label">Gamification & Engagement</span><span class="toc-page-num">33</span></div>
  <div class="toc-item"><span class="toc-num">34</span><span class="toc-label">End-to-End Workflows</span><span class="toc-page-num">33</span></div>
  <div class="toc-item"><span class="toc-num">35</span><span class="toc-label">Technical Architecture</span><span class="toc-page-num">34</span></div>
  <div class="toc-item"><span class="toc-num">36</span><span class="toc-label">Database Design (77+ Models)</span><span class="toc-page-num">35</span></div>
  <div class="toc-item"><span class="toc-num">37</span><span class="toc-label">API Endpoints (120+ Endpoints)</span><span class="toc-page-num">39</span></div>
  <div class="toc-item"><span class="toc-num">38</span><span class="toc-label">File Structure (Web + Mobile + Admin)</span><span class="toc-page-num">45</span></div>
  <div class="toc-item"><span class="toc-num">39</span><span class="toc-label">Development Timeline</span><span class="toc-page-num">55</span></div>
  <div class="toc-item"><span class="toc-num">40</span><span class="toc-label">Recommended Improvements</span><span class="toc-page-num">57</span></div>
  <div class="toc-item"><span class="toc-num">41</span><span class="toc-label">Open Questions / Decisions Required Later</span><span class="toc-page-num">58</span></div>
  <div class="toc-item"><span class="toc-num">42</span><span class="toc-label">In-App Messaging System (Future)</span><span class="toc-page-num">58</span></div>
  <div class="toc-item"><span class="toc-num">43</span><span class="toc-label">Video Interview Platform (Future)</span><span class="toc-page-num">59</span></div>
  <div class="toc-item"><span class="toc-num">44</span><span class="toc-label">Internationalization & Multi-Language Support</span><span class="toc-page-num">60</span></div>
  <div class="toc-item"><span class="toc-num">45</span><span class="toc-label">Multi-Type Accounts (Enhanced)</span><span class="toc-page-num">62</span></div>
  <div class="toc-item"><span class="toc-num">46</span><span class="toc-label">Security System (Comprehensive)</span><span class="toc-page-num">63</span></div>
  <div class="toc-item"><span class="toc-num">47</span><span class="toc-label">Map Feature</span><span class="toc-page-num">64</span></div>
  <div class="toc-item"><span class="toc-num">48</span><span class="toc-label">Merchant System</span><span class="toc-page-num">65</span></div>
  <div class="toc-item"><span class="toc-num">49</span><span class="toc-label">LMS System</span><span class="toc-page-num">66</span></div>
  <div class="toc-item"><span class="toc-num">50</span><span class="toc-label">Analytics System</span><span class="toc-page-num">68</span></div>
  <div class="toc-item"><span class="toc-num">51</span><span class="toc-label">Packages & Subscriptions</span><span class="toc-page-num">69</span></div>
  <div class="toc-item"><span class="toc-num">52</span><span class="toc-label">Coupon & Discount System</span><span class="toc-page-num">71</span></div>
  <div class="toc-item"><span class="toc-num">53</span><span class="toc-label">Support System</span><span class="toc-page-num">71</span></div>
  <div class="toc-item"><span class="toc-num">54</span><span class="toc-label">Security Features</span><span class="toc-page-num">72</span></div>
  <div class="toc-item"><span class="toc-num">55</span><span class="toc-label">Age Restrictions</span><span class="toc-page-num">73</span></div>
  <div class="toc-item"><span class="toc-num">56</span><span class="toc-label">Multi-Language Support</span><span class="toc-page-num">73</span></div>
  <div class="toc-item"><span class="toc-num">57</span><span class="toc-label">Job Boost & Ads Manager</span><span class="toc-page-num">74</span></div>
  <div class="toc-item"><span class="toc-num">58</span><span class="toc-label">Advertising System</span><span class="toc-page-num">75</span></div>
  <div class="toc-item"><span class="toc-num">58B</span><span class="toc-label">Force Update Policy</span><span class="toc-page-num">76</span></div>
  <div class="toc-item"><span class="toc-num">59</span><span class="toc-label">Wallet System</span><span class="toc-page-num">77</span></div>
  <div class="toc-item"><span class="toc-num">60</span><span class="toc-label">Tutor & Influencer Pricing</span><span class="toc-page-num">78</span></div>
  <div class="toc-item"><span class="toc-num">61</span><span class="toc-label">Pro/Premium Subscriber Benefits</span><span class="toc-page-num">81</span></div>
  <div class="toc-item"><span class="toc-num">62</span><span class="toc-label">Workflow Map</span><span class="toc-page-num">81</span></div>
  <div class="toc-item"><span class="toc-num">63</span><span class="toc-label">Portal Structure</span><span class="toc-page-num">83</span></div>
  <div class="toc-item"><span class="toc-num">64</span><span class="toc-label">Future Updates</span><span class="toc-page-num">84</span></div>
</div>

${htmlContent}

<div style="text-align:center; padding:40px; margin-top:40px; border-top:2px solid #30A9A2;">
  <img src="data:image/png;base64,${logo3}" style="width:120px; margin-bottom:15px;" alt="TELND">
  <div style="font-size:14px; color:#64748b;">telnd.com</div>
  <div style="font-size:12px; color:#94a3b8; margin-top:10px;">Design By: Pranta Biswas | biswaspranta@hotmail.com | 01316397072</div>
  <div style="font-size:11px; color:#94a3b8;">&copy; 2026 TELND. All rights reserved.</div>
</div>

</body>
</html>`;

const outputPath = path.resolve(__dirname, 'TELND_COMPLETE_DOCUMENTATION_V2.html');
fs.writeFileSync(outputPath, html);
console.log('HTML file generated:', outputPath);
