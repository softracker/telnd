const pptxgen = require('C:/telnd app/node_modules/pptxgenjs');
const fs = require('fs');
const path = require('path');

const logo1 = fs.readFileSync(path.resolve(__dirname, 'TELND-Logo-1.png'));
const logo2 = fs.readFileSync(path.resolve(__dirname, 'TELND-Logo-2.png'));
const logo3 = fs.readFileSync(path.resolve(__dirname, 'TELND-Logo-3.png'));
const favicon = fs.readFileSync(path.resolve(__dirname, 'favicon.png'));

const C = {
  primary: '034548',
  secondary: '0B1B2F',
  bg: 'F9F6F0',
  accent1: '30A9A2',
  accent2: 'FE793F',
  white: 'FFFFFF',
  light: 'F1F5F9',
  dark: '1F2937',
  gray: '64748B',
  ltGray: 'E2E8F0',
};

const pptx = new pptxgen();
pptx.layout = 'LAYOUT_16x9';
pptx.author = 'Pranta Biswas';
pptx.company = 'TELND';
pptx.title = 'TELND Complete Documentation';

const TOTAL = 42;

function bg(s, c = C.bg) { s.background = { color: c }; }

function footer(s, n) {
  s.addText(`TELND | Confidential | ${n} / ${TOTAL}`, {
    x: 0.4, y: 6.9, w: 5, h: 0.25, fontSize: 8, color: C.gray,
  });
  s.addText('Design by Pranta Biswas', {
    x: 7.0, y: 6.9, w: 2.8, h: 0.25, fontSize: 8, color: C.accent1, align: 'right',
  });
}

function titleBar(s, title, n) {
  bg(s);
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 0.06, fill: { color: C.primary } });
  s.addText(title, {
    x: 0.4, y: 0.15, w: 9.2, h: 0.55, fontSize: 22, color: C.primary, bold: true,
  });
  s.addShape(pptx.ShapeType.rect, { x: 0.4, y: 0.72, w: 2.0, h: 0.035, fill: { color: C.accent1 } });
  footer(s, n);
  return s;
}

function sectionSlide(title, sub, n) {
  const s = pptx.addSlide();
  bg(s, C.secondary);
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 3.0, w: '100%', h: 0.06, fill: { color: C.accent1 } });
  s.addText(title, {
    x: 0.5, y: 2.0, w: 9, h: 1.0, fontSize: 34, color: C.white, align: 'center', bold: true,
  });
  s.addText(sub, {
    x: 1, y: 3.3, w: 8, h: 0.5, fontSize: 15, color: C.accent1, align: 'center', italic: true,
  });
  footer(s, n);
  return s;
}

function bulletBox(s, items, x, y, w, h, opts = {}) {
  const fs = opts.fontSize || 10;
  const lines = items.map(i => ({ text: i, options: { bullet: { code: '2022' }, fontSize: fs, color: opts.color || C.dark, breakType: 'none', indentLevel: 0 } }));
  s.addText(lines, { x, y, w, h, lineSpacing: fs * 1.5, valign: 'top', paraSpaceAfter: 2 });
}

function card(s, x, y, w, h, color) {
  s.addShape(pptx.ShapeType.roundRect, {
    x, y, w, h, fill: { color: color || C.white },
    shadow: { type: 'outer', blur: 4, offset: 1, color: '000000', opacity: 0.07 },
    rectRadius: 0.08,
  });
}

function pill(s, text, x, y, w, h, color, fontSize) {
  s.addShape(pptx.ShapeType.roundRect, { x, y, w, h, fill: { color }, rectRadius: 0.06 });
  s.addText(text, { x, y, w, h, fontSize: fontSize || 10, color: C.white, align: 'center', bold: true, valign: 'middle' });
}

// ============================================================
// SLIDE 1: Title
// ============================================================
const s1 = pptx.addSlide();
bg(s1, C.secondary);
s1.addShape(pptx.ShapeType.ellipse, { x: -1.5, y: -1.5, w: 5, h: 5, fill: { color: C.primary, transparency: 60 } });
s1.addShape(pptx.ShapeType.ellipse, { x: 7, y: 4, w: 5, h: 5, fill: { color: C.accent1, transparency: 70 } });
s1.addImage({ data: logo1, x: 3.2, y: 0.8, w: 3.5, h: 1.8 });
s1.addText('TELND', { x: 0.5, y: 2.8, w: 9, h: 0.9, fontSize: 52, color: C.white, align: 'center', bold: true });
s1.addText('Career & Talent Platform', { x: 0.5, y: 3.6, w: 9, h: 0.5, fontSize: 22, color: C.accent1, align: 'center', italic: true });
s1.addShape(pptx.ShapeType.rect, { x: 3.8, y: 4.2, w: 2.4, h: 0.04, fill: { color: C.accent2 } });
s1.addText('Complete Project Documentation', { x: 0.5, y: 4.5, w: 9, h: 0.4, fontSize: 16, color: C.white, align: 'center' });
s1.addText('Version 1.0 | September 2026', { x: 0.5, y: 5.2, w: 9, h: 0.35, fontSize: 13, color: C.gray, align: 'center' });
s1.addText('Designed by Pranta Biswas | biswaspranta@hotmail.com', { x: 0.5, y: 6.5, w: 9, h: 0.3, fontSize: 10, color: C.accent1, align: 'center' });

// ============================================================
// SLIDE 2: Table of Contents
// ============================================================
const s2slide = pptx.addSlide();
const s2 = titleBar(s2slide, 'Table of Contents', 2);
const toc = [
  ['01', 'Executive Summary', C.accent1],
  ['02', 'Product Vision & Overview', C.primary],
  ['03', 'Authentication & Profiles', C.accent2],
  ['04', 'AI-Powered Features', C.accent1],
  ['05', 'CV Box & Upload System', C.primary],
  ['06', 'Verification Badge System', C.accent2],
  ['07', 'Technical Architecture', C.accent1],
  ['08', 'Technology Stack', C.primary],
  ['09', 'Database Design', C.accent2],
  ['10', 'API Reference', C.accent1],
  ['11', 'Map & Location System', C.primary],
  ['12', 'Merchant & Institution System', C.accent2],
  ['13', 'Learning Management System', C.accent1],
  ['14', 'Packages & Monetization', C.primary],
  ['15', 'Standard Employer Packages', C.accent2],
  ['16', 'VIP Employer Packages', C.accent1],
  ['17', 'Pay Later Mode', C.primary],
  ['18', 'Job Boost & Ads Manager', C.accent2],
  ['19', 'Advertising System', C.accent1],
  ['20', 'Wallet System', C.primary],
  ['21', 'Premium Content Creators', C.accent2],
  ['22', 'Escrow Payment System', C.accent1],
  ['23', 'Tutor & Creator Pricing', C.primary],
  ['24', 'Logo & Ad-Free Benefits', C.accent2],
  ['25', 'Security & Compliance', C.accent1],
  ['26', 'Deployment & Scaling', C.primary],
  ['27', 'Implementation Timeline', C.accent2],
];
toc.forEach(([num, title, color], i) => {
  const row = i % 9;
  const col = Math.floor(i / 9);
  const x = 0.4 + col * 4.8;
  const y = 1.0 + row * 0.6;
  pill(s2, num, x, y, 0.45, 0.38, color, 9);
  s2.addText(title, { x: x + 0.55, y, w: 4.0, h: 0.38, fontSize: 11, color: C.dark, valign: 'middle' });
});

// ============================================================
// SLIDE 3: Section
// ============================================================
sectionSlide('Executive Summary', 'Platform Overview & Core Vision', 3);

// ============================================================
// SLIDE 4: What is TELND
// ============================================================
const s4 = titleBar(pptx.addSlide(), 'What is TELND?', 4);
s4.addText('TELND is a comprehensive career and talent ecosystem focused on Bangladesh. It helps people prepare for careers, discover opportunities, prove their skills, get hired, and continue growing professionally.', {
  x: 0.4, y: 0.9, w: 9.2, h: 0.6, fontSize: 12, color: C.dark, lineSpacing: 1.3,
});

// Core Loop
s4.addShape(pptx.ShapeType.roundRect, { x: 0.4, y: 1.65, w: 9.2, h: 1.1, fill: { color: C.primary }, rectRadius: 0.08 });
s4.addText('THE CORE JOURNEY', { x: 0.5, y: 1.7, w: 9, h: 0.3, fontSize: 10, color: C.accent1, align: 'center', bold: true });
const loop = ['Learn', 'Practice', 'Assess', 'Match', 'Apply', 'Interview', 'Offer', 'Hired', 'Grow'];
const lw = 9.0 / loop.length;
loop.forEach((item, i) => {
  s4.addText(item, { x: 0.5 + i * lw, y: 2.05, w: lw, h: 0.3, fontSize: 10, color: C.white, align: 'center', bold: true });
  if (i < loop.length - 1) s4.addText('>', { x: 0.5 + (i + 1) * lw - 0.12, y: 2.05, w: 0.24, h: 0.3, fontSize: 10, color: C.accent2, align: 'center' });
});

// Target Users
s4.addText('Target Users', { x: 0.4, y: 2.9, w: 4.5, h: 0.35, fontSize: 14, color: C.primary, bold: true });
const users = [
  ['Job Seekers', 'Find jobs, build CVs, prepare for interviews'],
  ['Students', 'Access courses, find tutors, build skills'],
  ['Employers', 'Post jobs, search candidates, manage hiring'],
  ['Tutors', 'Offer classes, manage bookings, earn income'],
  ['Freelancers', 'Find projects, manage contracts, get paid'],
  ['Merchants', 'Manage institutions, students, courses'],
];
users.forEach(([role, desc], i) => {
  const row = i % 3;
  const col = Math.floor(i / 3);
  const x = 0.4 + col * 4.7;
  const y = 3.35 + row * 0.65;
  card(s4, x, y, 4.4, 0.55);
  s4.addText(role, { x: x + 0.15, y, w: 1.5, h: 0.55, fontSize: 10, color: C.primary, bold: true, valign: 'middle' });
  s4.addText(desc, { x: x + 1.6, y, w: 2.7, h: 0.55, fontSize: 9, color: C.gray, valign: 'middle' });
});

// Key Stats
const stats = [
  ['Target Market', 'Bangladesh'],
  ['Languages', 'EN + BN'],
  ['AI Features', '6+ Powered'],
  ['DB Models', '77 Total'],
  ['API Endpoints', '102+ RESTful'],
];
stats.forEach(([label, value], i) => {
  const x = 0.4 + i * 1.85;
  card(s4, x, 5.5, 1.65, 0.9);
  s4.addText(value, { x, y: 5.55, w: 1.65, h: 0.45, fontSize: 13, color: C.accent1, align: 'center', bold: true });
  s4.addText(label, { x, y: 6.0, w: 1.65, h: 0.35, fontSize: 9, color: C.gray, align: 'center' });
});

// ============================================================
// SLIDE 5: Product Modules
// ============================================================
const s5 = titleBar(pptx.addSlide(), 'Product Modules', 5);
const mods = [
  ['TELND Jobs', 'Job opportunities marketplace with AI matching', C.accent1],
  ['TELND Hire', 'Employer recruitment and hiring tools', C.primary],
  ['TELND Assess', 'Company assessments and evaluations', C.accent2],
  ['TELND Mock', 'Interview and test preparation platform', C.primary],
  ['TELND Learn', 'Courses, tutorials, and learning content', C.accent1],
  ['TELND Workforce', 'Recruitment and outsourcing services', C.accent2],
];
mods.forEach(([name, desc, color], i) => {
  const row = i % 3;
  const col = Math.floor(i / 3);
  const x = 0.4 + col * 4.7;
  const y = 0.95 + row * 1.6;
  card(s5, x, y, 4.4, 1.35);
  pill(s5, name.substring(0, 8), x + 0.15, y + 0.15, 1.4, 0.35, color, 9);
  s5.addText(name, { x: x + 1.65, y: y + 0.15, w: 2.6, h: 0.35, fontSize: 12, color: C.primary, bold: true, valign: 'middle' });
  s5.addText(desc, { x: x + 0.15, y: y + 0.6, w: 4.1, h: 0.65, fontSize: 10, color: C.gray, lineSpacing: 1.3 });
});

// ============================================================
// SLIDE 6: Section
// ============================================================
sectionSlide('Authentication & Profiles', 'Multi-Method Login & Comprehensive Profiles', 6);

// ============================================================
// SLIDE 7: Auth Methods
// ============================================================
const s7 = titleBar(pptx.addSlide(), 'Authentication Methods', 7);
s7.addText('TELND supports multiple authentication methods for user convenience and security. Users can register and login using their preferred method.', {
  x: 0.4, y: 0.9, w: 9.2, h: 0.5, fontSize: 11, color: C.dark,
});

const authMethods = [
  ['Email + Password', 'Traditional email registration with strong password requirements'],
  ['Phone + OTP', 'SMS-based one-time password verification via local carriers'],
  ['Google OAuth', 'Single sign-on using Google accounts'],
  ['Facebook OAuth', 'Single sign-on using Facebook accounts'],
  ['LinkedIn OAuth', 'Professional identity verification via LinkedIn'],
];
authMethods.forEach(([method, desc], i) => {
  const y = 1.55 + i * 0.55;
  card(s7, 0.4, y, 9.2, 0.48);
  s7.addShape(pptx.ShapeType.roundRect, { x: 0.55, y: y + 0.08, w: 0.32, h: 0.32, fill: { color: C.accent1 }, rectRadius: 0.04 });
  s7.addText(String(i + 1), { x: 0.55, y: y + 0.08, w: 0.32, h: 0.32, fontSize: 10, color: C.white, align: 'center', valign: 'middle', bold: true });
  s7.addText(method, { x: 1.05, y, w: 2.5, h: 0.48, fontSize: 11, color: C.primary, bold: true, valign: 'middle' });
  s7.addText(desc, { x: 3.6, y, w: 5.8, h: 0.48, fontSize: 10, color: C.gray, valign: 'middle' });
});

// ============================================================
// SLIDE 8: Profile Sections
// ============================================================
const s8 = titleBar(pptx.addSlide(), 'Candidate Profile Sections', 8);
s8.addText('A complete profile helps AI matching accuracy. Candidates fill in structured sections, verified and scored by the platform.', {
  x: 0.4, y: 0.9, w: 9.2, h: 0.5, fontSize: 11, color: C.dark,
});

const profileSections = [
  ['Personal Info', 'Name, photo, contact details, age, location, preferred language', C.accent1],
  ['Education', 'Degrees, institutions, graduation years, GPA, certifications', C.primary],
  ['Skills & Experience', 'Technical skills, soft skills, work history, achievements', C.accent2],
  ['Career Preferences', 'Target roles, preferred locations, salary range, job type', C.accent1],
  ['Portfolio', 'Projects, publications, code samples, creative works', C.primary],
  ['TELND Career Score', 'AI-computed score based on profile completeness and activity', C.accent2],
];
profileSections.forEach(([section, desc, color], i) => {
  const row = i % 3;
  const col = Math.floor(i / 3);
  const x = 0.4 + col * 4.7;
  const y = 1.55 + row * 1.35;
  card(s8, x, y, 4.4, 1.15);
  pill(s8, section, x + 0.15, y + 0.1, 2.0, 0.32, color, 9);
  s8.addText(desc, { x: x + 0.15, y: y + 0.5, w: 4.1, h: 0.55, fontSize: 10, color: C.dark, lineSpacing: 1.3 });
});

// ============================================================
// SLIDE 9: Security Features
// ============================================================
const s9 = titleBar(pptx.addSlide(), 'Security Features', 9);
const secFeatures = [
  ['Password Hashing', 'bcrypt with 12+ salt rounds for secure password storage'],
  ['JWT Tokens', '15-minute access tokens, 7-day refresh tokens with rotation'],
  ['MFA Support', 'SMS and authenticator app based multi-factor authentication'],
  ['Session Management', 'Track active sessions, revoke on logout, device fingerprinting'],
  ['Rate Limiting', 'Redis-based rate limiting to prevent brute force attacks'],
  ['Input Validation', 'Zod schema validation on all API endpoints'],
  ['SQL Injection Prevention', 'Prisma ORM parameterized queries, no raw SQL'],
  ['Data Encryption', 'AES-256 encryption for sensitive data at rest'],
  ['HTTPS/TLS', 'TLS 1.3 enforced for all API communication'],
  ['CORS Policy', 'Strict origin validation for cross-origin requests'],
];
secFeatures.forEach(([feature, desc], i) => {
  const y = 0.95 + i * 0.55;
  card(s9, 0.4, y, 9.2, 0.48);
  s9.addShape(pptx.ShapeType.roundRect, { x: 0.55, y: y + 0.08, w: 0.32, h: 0.32, fill: { color: i % 2 === 0 ? C.accent1 : C.accent2 }, rectRadius: 0.04 });
  s9.addText(String(i + 1), { x: 0.55, y: y + 0.08, w: 0.32, h: 0.32, fontSize: 9, color: C.white, align: 'center', valign: 'middle', bold: true });
  s9.addText(feature, { x: 1.05, y, w: 2.8, h: 0.48, fontSize: 10, color: C.primary, bold: true, valign: 'middle' });
  s9.addText(desc, { x: 3.9, y, w: 5.5, h: 0.48, fontSize: 9, color: C.gray, valign: 'middle' });
});

// ============================================================
// SLIDE 10: Section
// ============================================================
sectionSlide('AI-Powered Features', 'Smart Matching, CV Builder, Mock Interviews', 10);

// ============================================================
// SLIDE 11: AI Career Assistant
// ============================================================
const s11 = titleBar(pptx.addSlide(), 'AI Career Assistant', 11);
s11.addText('The AI Career Assistant is a natural-language interface that helps users navigate the platform and make career decisions.', {
  x: 0.4, y: 0.9, w: 9.2, h: 0.45, fontSize: 11, color: C.dark,
});

const aiCapabilities = [
  ['Natural Language Job Search', 'Users describe what they want in plain language and get matched results', 'e.g. "I want a junior React developer role in Dhaka paying 30k+"'],
  ['CV Improvement', 'AI analyzes uploaded CV and suggests improvements for specific roles', 'Reorders skills, suggests keywords, improves bullet points'],
  ['Interview Preparation', 'AI generates practice questions based on target role and resume', 'Provides scoring and feedback on answers'],
  ['Skill Gap Analysis', 'Compare current skills against target role requirements', 'Recommends specific courses and learning paths'],
  ['Salary Intelligence', 'Market-rate estimates based on role, location, experience', 'Bangladesh-specific salary data with trend analysis'],
  ['Job Alerts', 'AI-powered job recommendations based on profile and behavior', 'Daily digest with explainability scores'],
];
aiCapabilities.forEach(([title, desc, detail], i) => {
  const row = i % 3;
  const col = Math.floor(i / 3);
  const x = 0.4 + col * 4.7;
  const y = 1.5 + row * 1.45;
  card(s11, x, y, 4.4, 1.25);
  pill(s11, title, x + 0.12, y + 0.08, 2.2, 0.28, C.accent1, 8);
  s11.addText(desc, { x: x + 0.12, y: y + 0.42, w: 4.1, h: 0.35, fontSize: 9, color: C.dark, bold: true });
  s11.addText(detail, { x: x + 0.12, y: y + 0.78, w: 4.1, h: 0.4, fontSize: 8, color: C.gray, lineSpacing: 1.2 });
});

// ============================================================
// SLIDE 12: AI Matching
// ============================================================
const s12 = titleBar(pptx.addSlide(), 'AI Smart Job Matching', 12);
s12.addText('The matching engine uses multiple signals to rank candidates and jobs. Scores are explainable so users understand why they match.', {
  x: 0.4, y: 0.9, w: 9.2, h: 0.45, fontSize: 11, color: C.dark,
});

const matchingFactors = [
  ['Skills Match', '30%', 'Technical and soft skills alignment with job requirements', C.accent1],
  ['Experience', '20%', 'Years of relevant work experience and seniority level', C.primary],
  ['Education', '15%', 'Degree relevance, institution ranking, GPA', C.accent2],
  ['Location', '15%', 'Geographic compatibility and commute distance', C.accent1],
  ['Salary Range', '10%', 'Candidate expectations vs employer budget', C.primary],
  ['Activity Score', '10%', 'Profile completeness, application history, engagement', C.accent2],
];
matchingFactors.forEach(([factor, weight, desc, color], i) => {
  const y = 1.5 + i * 0.65;
  card(s12, 0.4, y, 9.2, 0.55);
  s12.addShape(pptx.ShapeType.roundRect, { x: 0.55, y: y + 0.07, w: 0.8, h: 0.4, fill: { color }, rectRadius: 0.04 });
  s12.addText(weight, { x: 0.55, y: y + 0.07, w: 0.8, h: 0.4, fontSize: 12, color: C.white, align: 'center', valign: 'middle', bold: true });
  s12.addText(factor, { x: 1.5, y, w: 2.0, h: 0.55, fontSize: 11, color: C.primary, bold: true, valign: 'middle' });
  s12.addText(desc, { x: 3.5, y, w: 5.8, h: 0.55, fontSize: 10, color: C.gray, valign: 'middle' });
});

// ============================================================
// SLIDE 13: CV Builder
// ============================================================
const s13 = titleBar(pptx.addSlide(), 'AI CV Builder', 13);

const cvFeatures = [
  ['Professional Templates', 'Multiple ATS-friendly templates optimized for different industries'],
  ['AI Content Generation', 'Auto-generate bullet points, summaries, and skill descriptions'],
  ['Job-Specific Optimization', 'Tailor CV content to match specific job descriptions'],
  ['PDF Export', 'High-quality PDF output with consistent formatting'],
  ['Version Management', 'Track and manage multiple CV versions for different roles'],
  ['ATS Score Check', 'Analyze how well the CV will perform with applicant tracking systems'],
  ['Keyword Optimization', 'Suggest missing keywords based on job market analysis'],
  ['Multi-Language', 'Create CVs in both English and Bengali'],
];
cvFeatures.forEach(([title, desc], i) => {
  const row = i % 4;
  const col = Math.floor(i / 4);
  const x = 0.4 + col * 4.7;
  const y = 0.95 + row * 1.2;
  card(s13, x, y, 4.4, 1.05);
  s13.addShape(pptx.ShapeType.roundRect, { x: x + 0.12, y: y + 0.1, w: 0.4, h: 0.4, fill: { color: col === 0 ? C.accent1 : C.accent2 }, rectRadius: 0.05 });
  s13.addText(String(i + 1), { x: x + 0.12, y: y + 0.1, w: 0.4, h: 0.4, fontSize: 12, color: C.white, align: 'center', valign: 'middle', bold: true });
  s13.addText(title, { x: x + 0.65, y: y + 0.1, w: 3.6, h: 0.4, fontSize: 11, color: C.primary, bold: true, valign: 'middle' });
  s13.addText(desc, { x: x + 0.12, y: y + 0.55, w: 4.1, h: 0.4, fontSize: 9, color: C.gray });
});

// ============================================================
// SLIDE 14: Mock Interviews
// ============================================================
const s14 = titleBar(pptx.addSlide(), 'AI Mock Interviews', 14);
s14.addText('Practice interviews with AI evaluation. Supports voice, video, and text modes with real-time scoring and feedback.', {
  x: 0.4, y: 0.9, w: 9.2, h: 0.45, fontSize: 11, color: C.dark,
});

const interviewModes = [
  ['Text Interview', 'Type answers to AI-generated questions. Best for preparation.', 'Answers evaluated for content, relevance, structure'],
  ['Voice Interview', 'Speak answers using microphone. AI transcribes and evaluates.', 'Analyzes fluency, vocabulary, confidence markers'],
  ['Video Interview', 'Record video responses. AI evaluates body language cues.', 'Eye contact, facial expressions, posture analysis'],
];
interviewModes.forEach(([title, desc, eval_], i) => {
  const x = 0.4 + i * 3.1;
  card(s14, x, 1.5, 2.85, 2.8);
  s14.addText(title, { x: x + 0.15, y: 1.6, w: 2.55, h: 0.4, fontSize: 12, color: C.primary, bold: true });
  s14.addText(desc, { x: x + 0.15, y: 2.05, w: 2.55, h: 0.7, fontSize: 9, color: C.dark, lineSpacing: 1.3 });
  pill(s14, 'Evaluation', x + 0.15, 2.85, 1.2, 0.28, C.accent1, 8);
  s14.addText(eval_, { x: x + 0.15, y: 3.2, w: 2.55, h: 0.8, fontSize: 8, color: C.gray, lineSpacing: 1.2 });
});

s14.addText('Scoring Criteria', { x: 0.4, y: 4.6, w: 9, h: 0.35, fontSize: 13, color: C.primary, bold: true });
const scoringCriteria = [
  ['Content Accuracy', 'Correctness and relevance of answers'],
  ['Communication', 'Clarity, structure, and persuasiveness'],
  ['Confidence', 'Speech pace, filler words, decisiveness'],
  ['Technical Depth', 'Domain-specific knowledge demonstration'],
  ['Cultural Fit', 'Alignment with Bangladeshi work culture'],
];
scoringCriteria.forEach(([criteria, desc], i) => {
  const x = 0.4 + i * 1.85;
  s14.addText(criteria, { x, y: 5.0, w: 1.7, h: 0.3, fontSize: 9, color: C.accent1, bold: true });
  s14.addText(desc, { x, y: 5.3, w: 1.7, h: 0.45, fontSize: 8, color: C.gray, lineSpacing: 1.2 });
});

// ============================================================
// SLIDE 15: Section
// ============================================================
sectionSlide('Technical Architecture', 'System Design & Infrastructure', 15);

// ============================================================
// SLIDE 16: Architecture
// ============================================================
const s16 = titleBar(pptx.addSlide(), 'System Architecture', 16);

// Client layer
card(s16, 0.5, 1.1, 4.0, 0.9, C.accent1);
s16.addText('Next.js Web App', { x: 0.5, y: 1.15, w: 4.0, h: 0.4, fontSize: 13, color: C.white, align: 'center', bold: true });
s16.addText('React 19 | Tailwind CSS | TypeScript', { x: 0.5, y: 1.55, w: 4.0, h: 0.35, fontSize: 9, color: C.white, align: 'center' });

card(s16, 5.5, 1.1, 4.0, 0.9, C.accent2);
s16.addText('Flutter Mobile App', { x: 5.5, y: 1.15, w: 4.0, h: 0.4, fontSize: 13, color: C.white, align: 'center', bold: true });
s16.addText('Dart | Riverpod | Material 3', { x: 5.5, y: 1.55, w: 4.0, h: 0.35, fontSize: 9, color: C.white, align: 'center' });

s16.addText('v', { x: 4.4, y: 2.1, w: 1.2, h: 0.35, fontSize: 20, color: C.primary, align: 'center', bold: true });

// API layer
card(s16, 1.5, 2.5, 7.0, 0.75, C.primary);
s16.addText('Hono API Gateway (TypeScript)', { x: 1.5, y: 2.5, w: 7.0, h: 0.35, fontSize: 14, color: C.white, align: 'center', bold: true });
s16.addText('Auth | Validation | Rate Limiting | CORS | Logging', { x: 1.5, y: 2.85, w: 7.0, h: 0.35, fontSize: 9, color: C.white, align: 'center' });

s16.addText('v', { x: 4.4, y: 3.3, w: 1.2, h: 0.35, fontSize: 20, color: C.primary, align: 'center', bold: true });

// Data layer
const dataServices = [
  ['PostgreSQL + PostGIS', 'Primary Database\nSpatial queries', C.accent1],
  ['Redis + BullMQ', 'Cache & Job Queues\nSession storage', C.accent2],
  ['Cloudflare R2', 'Object Storage\nFile uploads', C.primary],
  ['Google Maps API', 'Geocoding\nDistance calc', C.accent1],
];
dataServices.forEach(([name, desc, color], i) => {
  const x = 0.5 + i * 2.35;
  card(s16, x, 3.75, 2.15, 1.1, color);
  s16.addText(name, { x, y: 3.8, w: 2.15, h: 0.4, fontSize: 10, color: C.white, align: 'center', bold: true });
  s16.addText(desc, { x, y: 4.2, w: 2.15, h: 0.55, fontSize: 8, color: C.white, align: 'center', lineSpacing: 1.2 });
});

// Supporting
const supporting = [
  ['WebSocket Server', 'Real-time messaging'],
  ['Background Workers', 'Email, SMS, notifications'],
  ['SSLCommerz', 'Payment gateway'],
  ['Cloudflare', 'CDN & DDoS protection'],
];
supporting.forEach(([name, desc], i) => {
  const x = 0.5 + i * 2.35;
  card(s16, x, 5.1, 2.15, 0.8, C.light);
  s16.addText(name, { x, y: 5.15, w: 2.15, h: 0.35, fontSize: 10, color: C.dark, align: 'center', bold: true });
  s16.addText(desc, { x, y: 5.5, w: 2.15, h: 0.3, fontSize: 8, color: C.gray, align: 'center' });
});

// ============================================================
// SLIDE 17: Tech Stack
// ============================================================
const s17 = titleBar(pptx.addSlide(), 'Technology Stack', 17);

const techStack = [
  ['Frontend (Web)', 'Next.js 15, React 19, TypeScript, Tailwind CSS, Zustand, React Query', C.accent1],
  ['Frontend (Mobile)', 'Flutter 3.x, Dart, Riverpod, GoRouter, Material 3', C.accent2],
  ['Backend API', 'Hono (TypeScript), Node.js 20+, ts-node, tsx', C.primary],
  ['Database', 'PostgreSQL 15+, PostGIS 3.x for geospatial data', C.accent1],
  ['Cache & Queue', 'Redis 7.x (Upstash), BullMQ for background jobs', C.accent2],
  ['ORM', 'Prisma with auto-generated migrations and type safety', C.primary],
  ['Validation', 'Zod schemas shared between web, mobile, and API', C.accent1],
  ['Object Storage', 'Cloudflare R2 (S3-compatible, no egress fees)', C.accent2],
  ['Maps & Geocoding', 'Google Maps API, Geocoding, Directions, Places', C.primary],
  ['Payments', 'SSLCommerz (cards, mobile banking), bKash, Nagad, Rocket', C.accent1],
  ['CDN & Security', 'Cloudflare (CDN, DDoS, WAF, DNS)', C.accent2],
  ['AI Services', 'OpenAI API for career assistant, CV builder, matching', C.primary],
  ['Monitoring', 'Sentry for errors, custom analytics dashboard', C.accent1],
  ['Email/SMS', 'Nodemailer, Twilio SMS for OTP and notifications', C.accent2],
];
techStack.forEach(([layer, tech, color], i) => {
  const y = 0.95 + i * 0.4;
  pill(s17, layer, 0.4, y, 2.2, 0.33, color, 8);
  s17.addText(tech, { x: 2.8, y, w: 6.8, h: 0.33, fontSize: 9, color: C.dark, valign: 'middle' });
});

// ============================================================
// SLIDE 18: Section
// ============================================================
sectionSlide('Database Design', '77 Models | PostgreSQL + PostGIS', 18);

// ============================================================
// SLIDE 19: Database Overview
// ============================================================
const s19 = titleBar(pptx.addSlide(), 'Database Models Overview', 19);
card(s19, 0.4, 0.9, 9.2, 0.55, C.primary);
s19.addText('Total: 77 Database Models | 12 Categories | Full Audit Trail', { x: 0.4, y: 0.9, w: 9.2, h: 0.55, fontSize: 15, color: C.white, align: 'center', bold: true, valign: 'middle' });

const dbCats = [
  ['User & Auth', '4', 'User, Capability, Session, Verification'],
  ['Candidate System', '1', 'CandidateProfile'],
  ['Employer System', '2', 'Company, Job'],
  ['Job System', '2', 'Application, SavedJob'],
  ['Tutor System', '5', 'Profile, Booking, Class, Exam, Report'],
  ['Merchant System', '10', 'Staff, Student, Course, Attendance, Fee...'],
  ['LMS System', '10', 'Course, Module, Lesson, Enrollment, Quiz...'],
  ['Packages', '3', 'Package, Subscription, Coupon'],
  ['Payment System', '4', 'Transaction, Refund, Wallet, Invoice'],
  ['Admin System', '5', 'Role, User, Action, Flag, Maintenance'],
  ['Support System', '2', 'Ticket, Message'],
  ['Map System', '3', 'Pin, View, Bookmark'],
];
dbCats.forEach(([cat, count, models], i) => {
  const row = i % 4;
  const col = Math.floor(i / 4);
  const x = 0.4 + col * 3.15;
  const y = 1.65 + row * 1.15;
  card(s19, x, y, 2.95, 1.0);
  s19.addText(count, { x: x + 0.1, y: y + 0.05, w: 0.5, h: 0.5, fontSize: 22, color: C.accent1, bold: true });
  s19.addText(cat, { x: x + 0.6, y: y + 0.05, w: 2.2, h: 0.35, fontSize: 10, color: C.primary, bold: true, valign: 'middle' });
  s19.addText(models, { x: x + 0.1, y: y + 0.5, w: 2.7, h: 0.4, fontSize: 8, color: C.gray, lineSpacing: 1.2 });
});

// ============================================================
// SLIDE 20: Key Models Detail
// ============================================================
const s20 = titleBar(pptx.addSlide(), 'Key Database Models', 20);

const keyModels = [
  ['User', 'id, email, phone, name, role, status, preferences, careerScore, isVerified, createdAt'],
  ['Job', 'id, title, description, companyId, salary, location, type, status, skills, createdAt'],
  ['Company', 'id, name, description, logo, industry, size, location, website, createdAt'],
  ['Application', 'id, jobId, candidateId, status, coverLetter, appliedAt, updatedAt'],
  ['Package', 'id, name, type, price, features, limits, isActive, createdAt'],
  ['PaymentTransaction', 'id, userId, amount, method, status, reference, createdAt'],
  ['TutorBooking', 'id, tutorId, studentId, subject, date, time, status, amount'],
  ['LMSCourse', 'id, title, description, instructorId, price, category, status, rating'],
  ['Merchant', 'id, name, type, description, location, contact, status, createdAt'],
  ['SupportTicket', 'id, userId, subject, status, priority, category, createdAt'],
];
keyModels.forEach(([model, fields], i) => {
  const y = 0.95 + i * 0.55;
  card(s20, 0.4, y, 9.2, 0.48);
  pill(s20, model, 0.55, y + 0.07, 1.8, 0.33, i % 2 === 0 ? C.accent1 : C.accent2, 9);
  s20.addText(fields, { x: 2.5, y, w: 6.9, h: 0.48, fontSize: 8, color: C.gray, valign: 'middle' });
});

// ============================================================
// SLIDE 21: Section
// ============================================================
sectionSlide('API Reference', '102+ Endpoints | RESTful Architecture', 21);

// ============================================================
// SLIDE 22: API Endpoints
// ============================================================
const s22 = titleBar(pptx.addSlide(), 'API Endpoints by Module', 22);

const apiModules = [
  ['Auth', '4', 'register, login, logout, refresh-token'],
  ['Jobs', '3', 'list, detail, search'],
  ['Users', '2', 'profile, update'],
  ['Companies', '2', 'list, detail'],
  ['Admin', '15', 'users, roles, analytics, flags, settings'],
  ['Map', '9', 'pins, search, geocode, views, bookmarks'],
  ['Packages', '10', 'list, subscribe, manage, coupons, invoices'],
  ['Support', '7', 'tickets, messages, faq, feedback'],
  ['Merchant', '20', 'staff, students, courses, attendance, fees'],
  ['LMS', '16', 'courses, modules, lessons, enrollments, quizzes'],
  ['Analytics', '6', 'dashboard, users, jobs, revenue, reports'],
  ['Tutor', '8', 'profile, bookings, classes, earnings'],
];
apiModules.forEach(([mod, count, endpoints], i) => {
  const row = i % 4;
  const col = Math.floor(i / 4);
  const x = 0.4 + col * 3.15;
  const y = 0.95 + row * 1.35;
  card(s22, x, y, 2.95, 1.15);
  pill(s22, mod, x + 0.1, y + 0.08, 1.2, 0.28, C.accent1, 8);
  s22.addText(count, { x: x + 1.4, y: y + 0.08, w: 0.5, h: 0.28, fontSize: 10, color: C.accent2, bold: true, valign: 'middle' });
  s22.addText(endpoints, { x: x + 0.1, y: y + 0.45, w: 2.75, h: 0.6, fontSize: 8, color: C.gray, lineSpacing: 1.3 });
});

// ============================================================
// SLIDE 23: Section
// ============================================================
sectionSlide('Map & Location Features', 'Google Maps | PostGIS | Privacy Tiers', 23);

// ============================================================
// SLIDE 24: Location Rules
// ============================================================
const s24 = titleBar(pptx.addSlide(), 'Location Display Rules', 24);
s24.addText('TELND uses privacy-aware location display. Different user types show different levels of location detail.', {
  x: 0.4, y: 0.9, w: 9.2, h: 0.45, fontSize: 11, color: C.dark,
});

// Exact
card(s24, 0.4, 1.5, 4.4, 2.0);
pill(s24, 'EXACT LOCATION', 0.55, 1.6, 2.2, 0.3, C.accent1, 9);
s24.addText('Full address + precise coordinates displayed on map', { x: 0.55, y: 2.0, w: 4.1, h: 0.35, fontSize: 10, color: C.dark });
s24.addText('Used for:', { x: 0.55, y: 2.4, w: 4.1, h: 0.3, fontSize: 10, color: C.primary, bold: true });
s24.addText('Jobs — company office address\nCompanies — headquarters location\nMerchants — institution address', {
  x: 0.55, y: 2.7, w: 4.1, h: 0.65, fontSize: 9, color: C.gray, lineSpacing: 1.4,
});

// Approximate
card(s24, 5.2, 1.5, 4.4, 2.0);
pill(s24, 'APPROXIMATE LOCATION', 5.35, 1.6, 2.8, 0.3, C.accent2, 9);
s24.addText('Area name + coordinates with ±500m offset', { x: 5.35, y: 2.0, w: 4.1, h: 0.35, fontSize: 10, color: C.dark });
s24.addText('Used for:', { x: 5.35, y: 2.4, w: 4.1, h: 0.3, fontSize: 10, color: C.primary, bold: true });
s24.addText('Tutors — general area, not exact home\nFreelancers — district-level location\nCreators — city/area name only', {
  x: 5.35, y: 2.7, w: 4.1, h: 0.65, fontSize: 9, color: C.gray, lineSpacing: 1.4,
});

// Map Features
s24.addText('Map Features', { x: 0.4, y: 3.7, w: 9, h: 0.35, fontSize: 14, color: C.primary, bold: true });
const mapFeats = [
  'Interactive map with clustered markers for performance',
  'Filter by type: jobs, tutors, merchants, creators',
  'Search by location name or area',
  'Bookmark favorite locations for quick access',
  'Auto-sync map pins with listing database',
  'Geocoding results cached in Redis (24h TTL)',
  'PostGIS spatial queries for proximity search',
  'Mobile: Map view + list view toggle',
];
mapFeats.forEach((feat, i) => {
  const x = 0.4 + (i % 2) * 4.7;
  const y = 4.15 + Math.floor(i / 2) * 0.55;
  s24.addText('> ' + feat, { x, y, w: 4.5, h: 0.45, fontSize: 9, color: C.dark });
});

// ============================================================
// SLIDE 25: Section
// ============================================================
sectionSlide('Merchant & Institution System', 'Coaching Centers | Schools | Universities', 25);

// ============================================================
// SLIDE 26: Merchant Types
// ============================================================
const s26 = titleBar(pptx.addSlide(), 'Merchant Institution Types', 26);
const mTypes = [
  ['Coaching Centers', 'Tutoring and test prep centers', C.accent1],
  ['Schools', 'Primary and secondary schools', C.primary],
  ['Colleges', 'Higher secondary institutions', C.accent2],
  ['Universities', 'Degree-granting institutions', C.accent1],
  ['Training Institutes', 'Vocational and skill development', C.primary],
  ['Language Centers', 'English, Arabic, and other languages', C.accent2],
];
mTypes.forEach(([type, desc, color], i) => {
  const x = 0.4 + (i % 3) * 3.15;
  const y = 0.95 + Math.floor(i / 3) * 1.0;
  card(s26, x, y, 2.95, 0.85);
  pill(s26, type, x + 0.1, y + 0.08, 2.0, 0.28, color, 8);
  s26.addText(desc, { x: x + 0.1, y: y + 0.45, w: 2.7, h: 0.3, fontSize: 9, color: C.gray });
});

// Staff Roles
s26.addText('Staff Roles', { x: 0.4, y: 3.2, w: 9, h: 0.35, fontSize: 14, color: C.primary, bold: true });
const staffRoles = [
  ['Owner', 'Full control over institution, billing, and all features'],
  ['Admin', 'Manage staff, students, courses, and announcements'],
  ['Teacher', 'View assigned classes, mark attendance, upload results'],
  ['Accountant', 'Manage fees, payments, and financial reports'],
];
staffRoles.forEach(([role, desc], i) => {
  const x = 0.4 + (i % 2) * 4.7;
  const y = 3.7 + Math.floor(i / 2) * 0.8;
  card(s26, x, y, 4.4, 0.65);
  s26.addText(role, { x: x + 0.15, y, w: 1.5, h: 0.65, fontSize: 11, color: C.primary, bold: true, valign: 'middle' });
  s26.addText(desc, { x: x + 1.6, y, w: 2.7, h: 0.65, fontSize: 9, color: C.gray, valign: 'middle' });
});

// Core Features
s26.addText('Core Features', { x: 0.4, y: 5.2, w: 9, h: 0.35, fontSize: 14, color: C.primary, bold: true });
const mFeatures = ['Student Management', 'Course Management', 'Attendance Tracking', 'Exam & Results', 'Fee Collection', 'Announcements', 'Routine/Schedule', 'Reports & Analytics'];
mFeatures.forEach((feat, i) => {
  const x = 0.4 + (i % 4) * 2.3;
  const y = 5.65 + Math.floor(i / 4) * 0.45;
  s26.addText('> ' + feat, { x, y, w: 2.2, h: 0.35, fontSize: 9, color: C.dark });
});

// ============================================================
// SLIDE 27: Section
// ============================================================
sectionSlide('Learning Management System', 'Courses | Live Classes | Assessments', 27);

// ============================================================
// SLIDE 28: LMS Features
// ============================================================
const s28 = titleBar(pptx.addSlide(), 'LMS Core Features', 28);

const lmsSections = [
  ['Course Management', ['Modules & sections structure', 'Video, Text, Quiz lesson types', 'Categories and tags', 'Prerequisites and ordering', 'Draft/Published status'], C.accent1],
  ['Live Classes', ['WebRTC real-time video', 'Screen sharing capability', 'Chat during class', 'Session recording', 'Attendance tracking'], C.accent2],
  ['Assessments', ['Multiple choice quizzes', 'File upload assignments', 'Auto-grading system', 'Peer review option', 'Time-limited exams'], C.primary],
  ['Progress Tracking', ['Lesson completion %', 'Quiz scores and attempts', 'Certificate generation', 'Learning analytics', 'Instructor dashboard'], C.accent1],
];
lmsSections.forEach(([title, items, color], i) => {
  const x = 0.4 + i * 2.3;
  card(s28, x, 0.95, 2.1, 3.8);
  pill(s28, title, x + 0.08, 1.0, 1.94, 0.35, color, 8);
  items.forEach((item, j) => {
    s28.addText('> ' + item, { x: x + 0.12, y: 1.5 + j * 0.5, w: 1.85, h: 0.45, fontSize: 8, color: C.dark, lineSpacing: 1.2 });
  });
});

// Monetization
s28.addText('LMS Monetization', { x: 0.4, y: 4.9, w: 9, h: 0.35, fontSize: 14, color: C.primary, bold: true });
const lmsMonet = [
  ['Course Sales', 'Instructors sell courses, platform takes 20-30% commission'],
  ['Live Class Fees', 'Per-session or subscription-based live class access'],
  ['Certificates', 'Paid certificates for course completion'],
  ['Subscriptions', 'Monthly access to all courses in a category'],
];
lmsMonet.forEach(([title, desc], i) => {
  const x = 0.4 + i * 2.3;
  card(s28, x, 5.35, 2.1, 1.1);
  s28.addText(title, { x: x + 0.1, y: 5.4, w: 1.9, h: 0.35, fontSize: 10, color: C.accent1, bold: true });
  s28.addText(desc, { x: x + 0.1, y: 5.75, w: 1.9, h: 0.55, fontSize: 8, color: C.gray, lineSpacing: 1.3 });
});

// ============================================================
// SLIDE 29: Section
// ============================================================
sectionSlide('Packages & Monetization', 'User | Employer | Merchant Tiers', 29);

// ============================================================
// SLIDE 30: Package Tiers
// ============================================================
const s30 = titleBar(pptx.addSlide(), 'Subscription Packages', 30);

const pkgs = [
  ['User Packages', ['Free: Basic job search, limited CV', 'Pro: AI matching, unlimited CV, priority', 'Premium: All features, mock interviews, career coaching'], '0-500 BDT/mo', C.accent1],
  ['Standard Employer', ['৳500/job — Basic listing, analytics', '৳1,000/job — Featured, advanced analytics', '৳1,200/job — Sponsored, full analytics, boost'], 'Per Job Pricing', C.accent2],
  ['VIP Employer', ['Silver: ৳5K/mo (10 jobs)', 'Gold: ৳15K/mo (50 jobs)', 'Platinum: ৳40K/mo (Unlimited)', 'Enterprise: Custom pricing'], 'Monthly Plans', C.primary],
];
pkgs.forEach(([type, tiers, price, color], i) => {
  const x = 0.4 + i * 3.15;
  card(s30, x, 0.95, 2.95, 3.5);
  pill(s30, type, x + 0.1, 1.0, 2.75, 0.35, color, 10);
  tiers.forEach((tier, j) => {
    s30.addText('> ' + tier, { x: x + 0.12, y: 1.5 + j * 0.65, w: 2.7, h: 0.6, fontSize: 8, color: C.dark, lineSpacing: 1.2 });
  });
  s30.addText(price, { x: x + 0.1, y: 3.7, w: 2.75, h: 0.4, fontSize: 12, color: color, align: 'center', bold: true });
});

// Revenue Model
s30.addText('Revenue Streams', { x: 0.4, y: 4.65, w: 9, h: 0.35, fontSize: 14, color: C.primary, bold: true });
const revenue = [
  ['Subscriptions', 'Monthly/annual fees for premium features'],
  ['Transaction Fees', '3-5% on escrow payments'],
  ['Course Commissions', '20-30% on course sales'],
  ['Featured Listings', 'Promoted jobs and profiles'],
  ['API Access', 'Paid API access for enterprises'],
];
revenue.forEach(([stream, desc], i) => {
  const x = 0.4 + (i % 3) * 3.15;
  const y = 5.1 + Math.floor(i / 3) * 0.7;
  card(s30, x, y, 2.95, 0.55);
  s30.addText(stream, { x: x + 0.1, y, w: 1.5, h: 0.55, fontSize: 10, color: C.accent1, bold: true, valign: 'middle' });
  s30.addText(desc, { x: x + 1.5, y, w: 1.3, h: 0.55, fontSize: 8, color: C.gray, valign: 'middle' });
});

// ============================================================
// SLIDE 31: Section
// ============================================================
sectionSlide('VIP Employer Packages', 'Silver | Gold | Platinum | Enterprise', 31);

// ============================================================
// SLIDE 32: VIP Packages
// ============================================================
const s32 = titleBar(pptx.addSlide(), 'VIP Employer Packages', 32);

const vipPkgs = [
  ['Silver', '5,000 BDT/mo', ['10 job listings/month', 'Basic candidate search', 'Standard analytics', 'Email support', 'Basic company profile'], C.gray],
  ['Gold', '15,000 BDT/mo', ['50 job listings/month', 'Advanced candidate search', 'Priority support', 'Detailed analytics', 'Featured company profile', 'Candidate recommendations'], C.accent2],
  ['Platinum', '40,000 BDT/mo', ['Unlimited job listings', 'Dedicated account manager', 'API access', 'Custom branding', 'Advanced analytics', 'Bulk candidate outreach', 'Interview scheduling tools'], C.primary],
  ['Enterprise', 'Custom Pricing', ['Full platform access', 'Custom solutions', 'SLA guarantee', 'White-label options', 'Dedicated support team', 'Custom integrations', 'On-site training'], C.accent1],
];
vipPkgs.forEach(([name, price, features, color], i) => {
  const x = 0.4 + i * 2.35;
  card(s32, x, 0.95, 2.15, 5.2);
  pill(s32, name, x + 0.08, 1.0, 2.0, 0.35, color, 11);
  s32.addText(price, { x: x + 0.08, y: 1.45, w: 2.0, h: 0.3, fontSize: 11, color, align: 'center', bold: true });
  features.forEach((feat, j) => {
    s32.addText('> ' + feat, { x: x + 0.12, y: 1.9 + j * 0.42, w: 1.9, h: 0.38, fontSize: 8, color: C.dark, lineSpacing: 1.2 });
  });
});

// ============================================================
// SLIDE: Section - Pay Later Mode
// ============================================================
sectionSlide('Pay Later Mode', 'Use Now, Pay Later — On Any Package', 33);

// ============================================================
// SLIDE: Pay Later Details
// ============================================================
const sPayLater = titleBar(pptx.addSlide(), 'Pay Later Mode', 34);
sPayLater.addText('Employers can access ANY feature or package and pay later. Bills generated after usage with flexible payment terms.', {
  x: 0.4, y: 0.9, w: 9.2, h: 0.5, fontSize: 11, color: C.dark, lineSpacing: 1.3,
});

const payLaterFeatures = [
  ['How It Works', 'Employer uses features → Usage tracked → Bill generated → Pay later', C.accent1],
  ['Payment Terms', 'Net 15 or Net 30 days (admin configurable per company)', C.primary],
  ['Credit Limit', 'Set by admin based on company history and trust level', C.accent2],
  ['Late Penalties', 'Configurable by admin — percentage or flat fee', C.accent1],
  ['Auto Subscription', 'bKash API integration planned for automatic payments', C.primary],
  ['Any Package', 'Pay Later works with Standard, VIP, Boost, and Ads', C.accent2],
];
payLaterFeatures.forEach(([feat, desc, color], i) => {
  const x = 0.4 + (i % 2) * 4.7;
  const y = 1.55 + Math.floor(i / 2) * 1.35;
  card(sPayLater, x, y, 4.4, 1.15);
  pill(sPayLater, feat, x + 0.12, y + 0.1, 2.0, 0.3, color, 9);
  sPayLater.addText(desc, { x: x + 0.12, y: y + 0.5, w: 4.1, h: 0.55, fontSize: 9, color: C.gray, lineSpacing: 1.3 });
});

// ============================================================
// SLIDE: Section - Job Boost & Ads Manager
// ============================================================
sectionSlide('Job Boost & Ads Manager', 'Pay-As-You-Go Job Promotion', 35);

// ============================================================
// SLIDE: Job Boost Details
// ============================================================
const sBoost = titleBar(pptx.addSlide(), 'Job Boost System', 36);
sBoost.addText('Employers boost job posts to reach top matching candidates. Full ads manager with analytics, targeting, and budget controls.', {
  x: 0.4, y: 0.9, w: 9.2, h: 0.5, fontSize: 11, color: C.dark, lineSpacing: 1.3,
});

const boostSteps = [
  ['1', 'Deposit', 'Minimum wallet deposit (configurable)', C.accent1],
  ['2', 'Target', 'Set targeting: location, skills, experience', C.primary],
  ['3', 'Queue', 'Boost queue runs once daily', C.accent2],
  ['4', 'Report', 'Full analytics: impressions, clicks, applications', C.accent1],
];
boostSteps.forEach(([num, title, desc, color], i) => {
  const x = 0.4 + i * 2.35;
  card(sBoost, x, 1.55, 2.15, 1.4);
  sBoost.addShape(pptx.ShapeType.ellipse, { x: x + 0.7, y: 1.65, w: 0.6, h: 0.6, fill: { color } });
  sBoost.addText(num, { x: x + 0.7, y: 1.65, w: 0.6, h: 0.6, fontSize: 18, color: C.white, align: 'center', valign: 'middle', bold: true });
  sBoost.addText(title, { x: x + 0.1, y: 2.3, w: 1.95, h: 0.25, fontSize: 10, color, align: 'center', bold: true });
  sBoost.addText(desc, { x: x + 0.1, y: 2.55, w: 1.95, h: 0.35, fontSize: 8, color: C.gray, align: 'center', lineSpacing: 1.2 });
});

// Boost Analytics
sBoost.addText('Boost Analytics Dashboard', { x: 0.4, y: 3.2, w: 9, h: 0.35, fontSize: 14, color: C.primary, bold: true });
const boostAnalytics = [
  ['Impressions', 'How many users saw the boosted job'],
  ['Unique Views', 'Distinct users who viewed the listing'],
  ['Click Rate', 'Click-through rate percentage'],
  ['Applications', 'Number of applications received'],
  ['Cost Per Click', 'Average cost per click breakdown'],
  ['Daily Spend', 'Tracking daily budget consumption'],
];
boostAnalytics.forEach(([metric, desc], i) => {
  const x = 0.4 + (i % 3) * 3.15;
  const y = 3.65 + Math.floor(i / 3) * 0.75;
  card(sBoost, x, y, 2.95, 0.65);
  sBoost.addText(metric, { x: x + 0.1, y, w: 1.5, h: 0.65, fontSize: 10, color: C.accent1, bold: true, valign: 'middle' });
  sBoost.addText(desc, { x: x + 1.5, y, w: 1.35, h: 0.65, fontSize: 8, color: C.gray, valign: 'middle' });
});

// Targeting
sBoost.addText('Targeting Options', { x: 0.4, y: 5.25, w: 9, h: 0.35, fontSize: 14, color: C.primary, bold: true });
const targeting = [
  ['Location', 'District, division, nationwide'],
  ['Skills', 'Match specific skill sets'],
  ['Experience', 'Entry, mid, senior levels'],
  ['Education', 'Degree level, field of study'],
];
targeting.forEach(([type, opts], i) => {
  const x = 0.4 + i * 2.35;
  card(sBoost, x, 5.7, 2.15, 0.8);
  sBoost.addText(type, { x: x + 0.1, y: 5.75, w: 1.95, h: 0.3, fontSize: 10, color: C.accent2, bold: true });
  sBoost.addText(opts, { x: x + 0.1, y: 6.05, w: 1.95, h: 0.35, fontSize: 8, color: C.gray });
});

// ============================================================
// SLIDE: Section - Advertising System
// ============================================================
sectionSlide('Advertising System', 'Platform Ads | Google Ads | Ad-Free Users', 37);

// ============================================================
// SLIDE: Ads Details
// ============================================================
const sAds = titleBar(pptx.addSlide(), 'Advertising System', 38);
sAds.addText('TELND operates a dual advertising model: platform-sold ads and Google Ads integration, with ad-free experience for paid users.', {
  x: 0.4, y: 0.9, w: 9.2, h: 0.5, fontSize: 11, color: C.dark, lineSpacing: 1.3,
});

const adsTypes = [
  ['Platform Ads', 'Companies purchase banner ads, sponsored content, and featured placements directly from TELND', C.accent1],
  ['Google Ads', 'Google AdSense shown to free users only — generates revenue from free user traffic', C.primary],
  ['Ad-Free', 'Pro users: reduced ads. Premium users: completely ad-free — incentivizes upgrades', C.accent2],
];
adsTypes.forEach(([type, desc, color], i) => {
  const y = 1.55 + i * 1.25;
  card(sAds, 0.4, y, 9.2, 1.05);
  pill(sAds, type, 0.55, y + 0.1, 1.8, 0.3, color, 10);
  sAds.addText(desc, { x: 2.5, y, w: 6.8, h: 1.05, fontSize: 10, color: C.gray, valign: 'middle', lineSpacing: 1.3 });
});

// Ad Revenue Model
sAds.addText('Ad Revenue Model', { x: 0.4, y: 5.3, w: 9, h: 0.35, fontSize: 14, color: C.primary, bold: true });
const adRevenue = [
  ['Free Users', 'See Google Ads + Platform Ads'],
  ['Pro Users', 'Reduced Ads'],
  ['Premium Users', 'Completely Ad-Free'],
  ['Companies', 'Purchase Ad Placements'],
];
adRevenue.forEach(([user, ads], i) => {
  const x = 0.4 + i * 2.35;
  card(sAds, x, 5.75, 2.15, 0.8);
  sAds.addText(user, { x: x + 0.1, y: 5.8, w: 1.95, h: 0.3, fontSize: 10, color: C.accent1, bold: true });
  sAds.addText(ads, { x: x + 0.1, y: 6.1, w: 1.95, h: 0.35, fontSize: 9, color: C.gray });
});

// ============================================================
// SLIDE: Section - Wallet System
// ============================================================
sectionSlide('Wallet System', 'Employer Wallet | Deposits | Transactions', 39);

// ============================================================
// SLIDE: Wallet Details
// ============================================================
const sWallet = titleBar(pptx.addSlide(), 'Wallet System', 40);
sWallet.addText('Every employer gets a wallet. Top up via bKash, Nagad, Rocket, or card. Use balance for job posting, boost, ads, and premium features.', {
  x: 0.4, y: 0.9, w: 9.2, h: 0.5, fontSize: 11, color: C.dark, lineSpacing: 1.3,
});

const walletOps = [
  ['Deposit', 'Top up via SSLCommerz — bKash, Nagad, Rocket, card', C.accent1],
  ['Deduction', 'Automatic: per-job, per-boost, per-ad, per-feature', C.primary],
  ['Refund', 'If job removed or dispute won — funds returned to wallet', C.accent2],
  ['Transfer', 'Employer to employer (admin configurable)', C.accent1],
  ['Withdrawal', 'Request payout — admin approval required', C.primary],
];
walletOps.forEach(([op, desc, color], i) => {
  const y = 1.55 + i * 0.7;
  card(sWallet, 0.4, y, 9.2, 0.6);
  pill(sWallet, op, 0.55, y + 0.12, 1.3, 0.35, color, 9);
  sWallet.addText(desc, { x: 2.0, y, w: 7.4, h: 0.6, fontSize: 10, color: C.gray, valign: 'middle' });
});

// Billing
sWallet.addText('Billing & Invoices', { x: 0.4, y: 5.2, w: 9, h: 0.35, fontSize: 14, color: C.primary, bold: true });
const billing = [
  ['Monthly Invoice', 'Auto-generated with full breakdown'],
  ['PDF Download', 'For accounting and tax purposes'],
  ['Tax Calc', 'VAT, SD as applicable'],
  ['Min Deposit', 'Configurable by admin'],
];
billing.forEach(([item, desc], i) => {
  const x = 0.4 + i * 2.35;
  card(sWallet, x, 5.65, 2.15, 0.85);
  sWallet.addText(item, { x: x + 0.1, y: 5.7, w: 1.95, h: 0.3, fontSize: 10, color: C.accent1, bold: true });
  sWallet.addText(desc, { x: x + 0.1, y: 6.0, w: 1.95, h: 0.4, fontSize: 8, color: C.gray });
});

// ============================================================
// SLIDE: Section - CV Box
// ============================================================
sectionSlide('CV Box & Upload System', 'PDF/Image CV | Auto-Extract | Multiple CVs', 41);

// ============================================================
// SLIDE: CV Box Details
// ============================================================
const sCV = titleBar(pptx.addSlide(), 'CV Box System', 42);
sCV.addText('Upload PDF or image CVs. AI extracts all information automatically. Store multiple CVs for different job types.', {
  x: 0.4, y: 0.9, w: 9.2, h: 0.5, fontSize: 11, color: C.dark, lineSpacing: 1.3,
});

const cvBoxFeatures = [
  ['Upload', 'Upload existing CV as PDF or image (JPG/PNG)', C.accent1],
  ['AI Extract', 'OCR reads all info — education, experience, skills', C.primary],
  ['Auto-Populate', 'Profile fields filled automatically from CV', C.accent2],
  ['CV Box', 'Store multiple CVs for different job types', C.accent1],
  ['Smart Apply', 'Select CV when applying; auto-applies if only one', C.primary],
  ['Version Control', 'Track CV versions, preview before applying', C.accent2],
];
cvBoxFeatures.forEach(([feat, desc, color], i) => {
  const x = 0.4 + (i % 2) * 4.7;
  const y = 1.55 + Math.floor(i / 2) * 1.25;
  card(sCV, x, y, 4.4, 1.05);
  pill(sCV, feat, x + 0.12, y + 0.1, 1.3, 0.3, color, 9);
  sCV.addText(desc, { x: x + 1.5, y, w: 2.7, h: 1.05, fontSize: 10, color: C.gray, valign: 'middle', lineSpacing: 1.3 });
});

// CV Apply Flow
sCV.addText('Application Flow', { x: 0.4, y: 5.3, w: 9, h: 0.35, fontSize: 14, color: C.primary, bold: true });
const cvFlow = [
  ['1', 'Upload CV', C.accent1],
  ['2', 'AI Extracts', C.primary],
  ['3', 'Profile Set', C.accent2],
  ['4', 'Select CV', C.accent1],
  ['5', 'Apply', C.primary],
];
cvFlow.forEach(([num, step, color], i) => {
  const x = 0.4 + i * 1.85;
  card(sCV, x, 5.75, 1.65, 0.75);
  sCV.addShape(pptx.ShapeType.ellipse, { x: x + 0.55, y: 5.8, w: 0.5, h: 0.5, fill: { color } });
  sCV.addText(num, { x: x + 0.55, y: 5.8, w: 0.5, h: 0.5, fontSize: 14, color: C.white, align: 'center', valign: 'middle', bold: true });
  sCV.addText(step, { x: x + 0.1, y: 6.3, w: 1.45, h: 0.2, fontSize: 9, color: C.dark, align: 'center', bold: true });
});

// ============================================================
// SLIDE: Section - Verification Badges
// ============================================================
sectionSlide('Verification Badge System', 'Optional | Multi-Tier | Admin-Managed', 43);

// ============================================================
// SLIDE: Verification Details
// ============================================================
const sVerify = titleBar(pptx.addSlide(), 'Verification Badges', 44);
sVerify.addText('Both employers AND job seekers can optionally verify their accounts. Verified accounts display a badge on profile and listings.', {
  x: 0.4, y: 0.9, w: 9.2, h: 0.5, fontSize: 11, color: C.dark, lineSpacing: 1.3,
});

const badgeTiers = [
  ['Phone Verified', 'OTP confirmation', C.accent1],
  ['Email Verified', 'Email link confirmation', C.primary],
  ['Identity Verified', 'NID/Passport OCR + face match', C.accent2],
  ['Company Verified', 'Trade license + registration', C.accent1],
];
badgeTiers.forEach(([tier, desc, color], i) => {
  const x = 0.4 + i * 2.35;
  card(sVerify, x, 1.55, 2.15, 1.1);
  sVerify.addShape(pptx.ShapeType.ellipse, { x: x + 0.75, y: 1.65, w: 0.6, h: 0.6, fill: { color } });
  sVerify.addText('✓', { x: x + 0.75, y: 1.65, w: 0.6, h: 0.6, fontSize: 18, color: C.white, align: 'center', valign: 'middle', bold: true });
  sVerify.addText(tier, { x: x + 0.1, y: 2.3, w: 1.95, h: 0.25, fontSize: 10, color, align: 'center', bold: true });
  sVerify.addText(desc, { x: x + 0.1, y: 2.55, w: 1.95, h: 0.15, fontSize: 8, color: C.gray, align: 'center' });
});

// Admin Features
sVerify.addText('Admin Verification Features', { x: 0.4, y: 2.9, w: 9, h: 0.35, fontSize: 14, color: C.primary, bold: true });
const adminVerify = [
  ['Manual Verification', 'Admin can manually mark companies as verified'],
  ['New Companies', 'Admin can verify newly registered companies'],
  ['Known Companies', 'Admin can verify established/well-known companies'],
  ['Badge Display', 'Badge visible on profile, job posts, and search results'],
];
adminVerify.forEach(([feat, desc], i) => {
  const x = 0.4 + (i % 2) * 4.7;
  const y = 3.35 + Math.floor(i / 2) * 0.75;
  card(sVerify, x, y, 4.4, 0.65);
  sVerify.addText(feat, { x: x + 0.12, y, w: 2.0, h: 0.65, fontSize: 10, color: C.primary, bold: true, valign: 'middle' });
  sVerify.addText(desc, { x: x + 2.1, y, w: 2.2, h: 0.65, fontSize: 8, color: C.gray, valign: 'middle', lineSpacing: 1.2 });
});

// ============================================================
// SLIDE: Section - Tutor & Creator Pricing
// ============================================================
sectionSlide('Tutor & Creator Pricing', 'Free Search & Hiring | Pay Only for Premium', 45);

// ============================================================
// SLIDE: Tutor Creator Pricing
// ============================================================
const sTutor = titleBar(pptx.addSlide(), 'Tutor & Creator Pricing', 46);
sTutor.addText('Tutors and Creators enjoy completely free search, find, and hiring. They only pay for payment processing and advanced features.', {
  x: 0.4, y: 0.9, w: 9.2, h: 0.5, fontSize: 11, color: C.dark, lineSpacing: 1.3,
});

const tutorPricing = [
  ['FREE Services', ['Profile creation & listing', 'Search & discovery by students', 'Receiving inquiries', 'Hiring & project assignment', 'Basic analytics'], C.accent1],
  ['PAID Services', ['Payment processing fee', 'Premium profile features', 'Advanced analytics', 'Marketing/promotion tools', 'Withdrawal processing fee'], C.accent2],
];
tutorPricing.forEach(([type, features, color], i) => {
  const x = 0.4 + i * 4.7;
  card(sTutor, x, 1.55, 4.4, 3.5);
  pill(sTutor, type, x + 0.12, 1.6, 2.5, 0.35, color, 11);
  features.forEach((feat, j) => {
    sTutor.addText('> ' + feat, { x: x + 0.15, y: 2.15 + j * 0.5, w: 4.0, h: 0.45, fontSize: 10, color: C.dark, lineSpacing: 1.2 });
  });
});

// Revenue Model
sTutor.addText('TELND takes commission only on transactions processed through the platform', {
  x: 0.4, y: 5.3, w: 9.2, h: 0.4, fontSize: 11, color: C.primary, bold: true, align: 'center',
});

// ============================================================
// SLIDE: Section - Logo & Ad-Free Benefits
// ============================================================
sectionSlide('Pro/Premium Benefits', 'Logo Colors | Ad-Free | Priority', 47);

// ============================================================
// SLIDE: Logo & Ad-Free
// ============================================================
const sBenefits = titleBar(pptx.addSlide(), 'Subscriber Benefits', 48);

const benefits = [
  ['Logo Customization', [
    'Free: Default logo display',
    'Pro: Accent color treatment (theme-aware)',
    'Premium: Full brand color display',
  ], C.accent1],
  ['Ad-Free Experience', [
    'Free users: See Google Ads + Platform Ads',
    'Pro users: Reduced ads',
    'Premium users: Completely ad-free',
  ], C.primary],
  ['Priority Features', [
    'Priority in search results',
    'Faster customer support',
    'Early access to new features',
    'Advanced analytics & reporting',
  ], C.accent2],
];
benefits.forEach(([title, features, color], i) => {
  const x = 0.4 + i * 3.15;
  card(sBenefits, x, 0.95, 2.95, 4.5);
  pill(sBenefits, title, x + 0.1, 1.0, 2.75, 0.35, color, 10);
  features.forEach((feat, j) => {
    sBenefits.addText('> ' + feat, { x: x + 0.12, y: 1.55 + j * 0.55, w: 2.7, h: 0.5, fontSize: 9, color: C.dark, lineSpacing: 1.2 });
  });
});

// ============================================================
// SLIDE 34: Creator Tiers
// ============================================================
const s34 = titleBar(pptx.addSlide(), 'Premium Creator Tiers', 49);

const creatorTiers = [
  ['Standard', '70/30 Split', 'Creator keeps 70%', ['Self-managed content', 'Platform listing', 'Basic analytics', 'Standard support', 'Payment after 30 days'], C.accent1],
  ['Premium', '80/20 Split', 'Creator keeps 80%', ['TELND-handled deals', 'Contract management', 'Payment processing', 'QA support', 'Marketing assistance', 'Payment after 15 days'], C.accent2],
  ['Elite', '85/15 Split', 'Creator keeps 85%', ['Dedicated account manager', 'Co-marketing campaigns', 'Priority listing', 'Custom pricing', 'Direct client matching', 'Payment after 7 days'], C.primary],
];
creatorTiers.forEach(([tier, split, desc, features, color], i) => {
  const x = 0.4 + i * 3.15;
  card(s34, x, 0.95, 2.95, 4.5);
  pill(s34, tier, x + 0.1, 1.0, 2.0, 0.35, color, 11);
  s34.addText(split, { x: x + 0.1, y: 1.45, w: 2.75, h: 0.3, fontSize: 14, color, align: 'center', bold: true });
  s34.addText(desc, { x: x + 0.1, y: 1.8, w: 2.75, h: 0.3, fontSize: 10, color: C.gray, align: 'center' });
  features.forEach((feat, j) => {
    s34.addText('> ' + feat, { x: x + 0.12, y: 2.25 + j * 0.42, w: 2.7, h: 0.38, fontSize: 9, color: C.dark, lineSpacing: 1.2 });
  });
});

// TELND-Handled Deals
s34.addText('TELND-Handled Deals (Premium & Elite)', { x: 0.4, y: 5.6, w: 9, h: 0.35, fontSize: 12, color: C.primary, bold: true });
s34.addText('TELND negotiates contracts, manages payments, handles QA, provides marketing support, and resolves disputes. Platform takes 10-15% service fee on top of the revenue split.', {
  x: 0.4, y: 5.95, w: 9.2, h: 0.55, fontSize: 9, color: C.gray, lineSpacing: 1.3,
});

// ============================================================
// SLIDE 35: Section
// ============================================================
sectionSlide('Escrow Payment System', 'Secure Fund Holding | Milestone Releases', 50);

// ============================================================
// SLIDE 36: Escrow Flow
// ============================================================
const s36 = titleBar(pptx.addSlide(), 'Escrow Payment Flow', 51);

const escrowSteps = [
  ['1', 'Deposit', 'Client deposits funds into TELND escrow account', C.accent1],
  ['2', 'Work Phase', 'Creator/Freelancer completes the work or milestone', C.accent2],
  ['3', 'Review', 'Client reviews deliverables and approves/rejects', C.primary],
  ['4', 'Release', 'Funds released to creator minus platform fee (3-5%)', C.accent1],
];
escrowSteps.forEach(([num, title, desc, color], i) => {
  const x = 0.4 + i * 2.35;
  card(s36, x, 0.95, 2.15, 1.6);
  s36.addShape(pptx.ShapeType.ellipse, { x: x + 0.7, y: 1.05, w: 0.6, h: 0.6, fill: { color } });
  s36.addText(num, { x: x + 0.7, y: 1.05, w: 0.6, h: 0.6, fontSize: 18, color: C.white, align: 'center', valign: 'middle', bold: true });
  s36.addText(title, { x: x + 0.1, y: 1.7, w: 1.95, h: 0.3, fontSize: 11, color, align: 'center', bold: true });
  s36.addText(desc, { x: x + 0.1, y: 2.0, w: 1.95, h: 0.45, fontSize: 8, color: C.gray, align: 'center', lineSpacing: 1.2 });
});

// Features
s36.addText('Escrow Features', { x: 0.4, y: 2.8, w: 9, h: 0.35, fontSize: 14, color: C.primary, bold: true });
const escrowFeats = [
  ['Milestone Payments', 'Break projects into milestones with separate escrow for each'],
  ['Dispute Resolution', 'Mediation process if client and creator disagree on deliverables'],
  ['Auto-Release', 'Funds auto-released after review period if no dispute raised'],
  ['Partial Release', 'Release payment for approved milestones while others are disputed'],
  ['Refund Protection', 'Full refund to client if work is not delivered as specified'],
  ['Fee Structure', '3-5% platform fee deducted on release, transparent to both parties'],
];
escrowFeats.forEach(([feat, desc], i) => {
  const x = 0.4 + (i % 2) * 4.7;
  const y = 3.25 + Math.floor(i / 2) * 0.75;
  card(s36, x, y, 4.4, 0.65);
  s36.addText(feat, { x: x + 0.12, y, w: 2.0, h: 0.65, fontSize: 10, color: C.primary, bold: true, valign: 'middle' });
  s36.addText(desc, { x: x + 2.1, y, w: 2.2, h: 0.65, fontSize: 8, color: C.gray, valign: 'middle', lineSpacing: 1.2 });
});

// Fee Structure
s36.addText('Transaction Fees', { x: 0.4, y: 5.6, w: 9, h: 0.35, fontSize: 14, color: C.primary, bold: true });
const fees = [
  ['Premium Creator Deals', '5%'],
  ['Freelance Projects', '3-5%'],
  ['B2B Services', '2-4%'],
  ['Course Sales', '20-30%'],
];
fees.forEach(([type, fee], i) => {
  const x = 0.4 + i * 2.35;
  card(s36, x, 6.0, 2.15, 0.65);
  s36.addText(type, { x: x + 0.1, y: 6.05, w: 1.95, h: 0.3, fontSize: 9, color: C.gray });
  s36.addText(fee, { x: x + 0.1, y: 6.3, w: 1.95, h: 0.3, fontSize: 12, color: C.accent2, bold: true });
});

// ============================================================
// SLIDE 37: Section
// ============================================================
sectionSlide('Security & Compliance', 'Multi-Layer Protection | Data Privacy', 52);

// ============================================================
// SLIDE 38: Security Layers
// ============================================================
const s38 = titleBar(pptx.addSlide(), 'Security Architecture', 53);

const secLayers = [
  ['Layer 1: Input Validation', 'Zod schema validation on every API endpoint, reject invalid data early', C.accent1],
  ['Layer 2: Authentication', 'JWT with short-lived access tokens (15min), refresh token rotation', C.primary],
  ['Layer 3: Authorization', 'Role-based access control (RBAC) with permission per module/action', C.accent2],
  ['Layer 4: Rate Limiting', 'Redis-based rate limiting: 100 req/min general, 5 req/min for auth', C.accent1],
  ['Layer 5: SQL Injection', 'Prisma ORM parameterized queries, no raw SQL in production', C.primary],
  ['Layer 6: Encryption', 'AES-256 for data at rest, TLS 1.3 for data in transit', C.accent2],
  ['Layer 7: DDoS Protection', 'Cloudflare DDoS mitigation, WAF rules, bot detection', C.accent1],
  ['Layer 8: Document Security', 'Encrypted storage for sensitive documents, signed URLs for access', C.primary],
  ['Layer 9: Audit Logging', 'All admin actions logged with IP, timestamp, and user agent', C.accent2],
  ['Layer 10: Data Privacy', 'GDPR-compliant data handling, right to deletion, data export', C.accent1],
];
secLayers.forEach(([layer, desc, color], i) => {
  const y = 0.95 + i * 0.55;
  card(s38, 0.4, y, 9.2, 0.48);
  pill(s38, String(i + 1), 0.55, y + 0.07, 0.35, 0.33, color, 9);
  s38.addText(layer, { x: 1.05, y, w: 3.5, h: 0.48, fontSize: 10, color: C.primary, bold: true, valign: 'middle' });
  s38.addText(desc, { x: 4.6, y, w: 4.8, h: 0.48, fontSize: 9, color: C.gray, valign: 'middle' });
});

// ============================================================
// SLIDE 39: Section
// ============================================================
sectionSlide('Deployment & Scaling', 'Cloud Infrastructure | Auto-Scaling', 54);

// ============================================================
// SLIDE 40: Deployment
// ============================================================
const s40 = titleBar(pptx.addSlide(), 'Deployment Architecture', 55);

const deployStack = [
  ['PostgreSQL', 'AWS RDS / Supabase', 'Primary database with PostGIS extension', C.accent1],
  ['Redis', 'Upstash / Redis Cloud', 'Serverless Redis for cache and queues', C.accent2],
  ['Object Storage', 'Cloudflare R2', 'S3-compatible, zero egress fees', C.primary],
  ['CDN', 'Cloudflare', 'Global CDN with DDoS protection', C.accent1],
  ['Web Hosting', 'Vercel', 'Next.js optimized, edge functions', C.accent2],
  ['API Hosting', 'Railway', 'Auto-scaling Hono API containers', C.primary],
];
deployStack.forEach(([service, provider, desc, color], i) => {
  const row = i % 3;
  const col = Math.floor(i / 3);
  const x = 0.4 + col * 4.7;
  const y = 0.95 + row * 1.35;
  card(s40, x, y, 4.4, 1.15);
  pill(s40, service, x + 0.12, y + 0.1, 1.6, 0.3, color, 9);
  s40.addText(provider, { x: x + 1.8, y: y + 0.1, w: 2.4, h: 0.3, fontSize: 10, color: C.primary, bold: true });
  s40.addText(desc, { x: x + 0.12, y: y + 0.5, w: 4.1, h: 0.5, fontSize: 9, color: C.gray, lineSpacing: 1.3 });
});

// Scaling
s40.addText('Scaling Strategy', { x: 0.4, y: 5.1, w: 9, h: 0.35, fontSize: 14, color: C.primary, bold: true });
const scaling = [
  ['Horizontal', 'Multiple API instances, auto-scaling workers, load balancer'],
  ['Vertical', 'Database upgrade paths, Redis memory scaling, API resource increase'],
  ['Database', 'Read replicas for queries, connection pooling, query optimization'],
  ['Caching', 'Redis for sessions, API responses, geocoding, frequently accessed data'],
];
scaling.forEach(([type, desc], i) => {
  const x = 0.4 + i * 2.35;
  card(s40, x, 5.55, 2.15, 0.9);
  s40.addText(type, { x: x + 0.1, y: 5.6, w: 1.95, h: 0.3, fontSize: 10, color: C.accent1, bold: true });
  s40.addText(desc, { x: x + 0.1, y: 5.9, w: 1.95, h: 0.45, fontSize: 8, color: C.gray, lineSpacing: 1.2 });
});

// ============================================================
// SLIDE 41: Section
// ============================================================
sectionSlide('Implementation Timeline', '10 Phases | 42+ Weeks', 56);

// ============================================================
// SLIDE 42: Timeline
// ============================================================
const s42 = titleBar(pptx.addSlide(), 'Development Timeline', 57);

const timeline = [
  ['Phase 0', 'Planning', 'Weeks 1-2', 'Requirements, architecture, team setup', C.accent1],
  ['Phase 1', 'Foundation', 'Weeks 3-6', 'Auth, profiles, DB setup, API scaffolding', C.primary],
  ['Phase 2', 'MVP Jobs', 'Weeks 7-12', 'Job listings, search, applications, basic matching', C.accent2],
  ['Phase 3', 'Smart Matching', 'Weeks 13-16', 'AI matching, scoring, explainability', C.accent1],
  ['Phase 4', 'Recruitment', 'Weeks 17-21', 'Company profiles, hiring pipeline, messaging', C.primary],
  ['Phase 5', 'Assessment', 'Weeks 22-26', 'Mock interviews, quizzes, skill assessment', C.accent2],
  ['Phase 6', 'AI Career', 'Weeks 27-31', 'CV builder, career assistant, salary intel', C.accent1],
  ['Phase 7', 'Learning', 'Weeks 32-36', 'LMS, courses, live classes, certificates', C.primary],
  ['Phase 8', 'Workforce', 'Weeks 37-42', 'Outsourcing, B2B, merchant system', C.accent2],
  ['Phase 9', 'Scale', 'Ongoing', 'Performance, monitoring, new features', C.accent1],
];
timeline.forEach(([phase, name, weeks, desc, color], i) => {
  const y = 0.95 + i * 0.55;
  card(s42, 0.4, y, 9.2, 0.48);
  pill(s42, phase, 0.55, y + 0.07, 0.9, 0.33, color, 8);
  s42.addText(name, { x: 1.55, y, w: 1.5, h: 0.48, fontSize: 10, color: C.primary, bold: true, valign: 'middle' });
  pill(s42, weeks, 3.1, y + 0.07, 1.3, 0.33, C.ltGray, 8);
  s42.addText(weeks, { x: 3.1, y: y + 0.07, w: 1.3, h: 0.33, fontSize: 8, color: C.dark, align: 'center', valign: 'middle' });
  s42.addText(desc, { x: 4.5, y, w: 5.0, h: 0.48, fontSize: 9, color: C.gray, valign: 'middle' });
});

// ============================================================
// SLIDE 43: Closing
// ============================================================
const s43 = pptx.addSlide();
bg(s43, C.secondary);
s43.addShape(pptx.ShapeType.ellipse, { x: -1, y: -1, w: 4, h: 4, fill: { color: C.primary, transparency: 60 } });
s43.addShape(pptx.ShapeType.ellipse, { x: 7.5, y: 4.5, w: 4, h: 4, fill: { color: C.accent1, transparency: 70 } });
s43.addImage({ data: logo1, x: 3.2, y: 0.8, w: 3.5, h: 1.8 });
s43.addText('Thank You', { x: 0.5, y: 2.9, w: 9, h: 0.8, fontSize: 44, color: C.white, align: 'center', bold: true });
s43.addText('TELND — Career & Talent Platform', { x: 0.5, y: 3.7, w: 9, h: 0.5, fontSize: 18, color: C.accent1, align: 'center' });
s43.addShape(pptx.ShapeType.rect, { x: 3.5, y: 4.3, w: 3, h: 0.04, fill: { color: C.accent2 } });
s43.addText('Designed by Pranta Biswas', { x: 0.5, y: 4.6, w: 9, h: 0.4, fontSize: 16, color: C.white, align: 'center', bold: true });
s43.addText('biswaspranta@hotmail.com | 01316397072', { x: 0.5, y: 5.0, w: 9, h: 0.4, fontSize: 14, color: C.accent1, align: 'center' });
s43.addText('Founder of TELND', { x: 0.5, y: 5.4, w: 9, h: 0.4, fontSize: 13, color: C.gray, align: 'center', italic: true });
s43.addText('Proprietary — All rights reserved.', { x: 0.5, y: 6.5, w: 9, h: 0.3, fontSize: 10, color: C.gray, align: 'center' });

// Save
const out = path.resolve(__dirname, 'TELND_Complete_Documentation_v3.pptx');
pptx.writeFile({ fileName: out }).then(() => console.log('Done:', out)).catch(e => console.error(e));
