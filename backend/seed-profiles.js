#!/usr/bin/env node
/**
 * Seed 50 realistic test profiles + activities.
 * Password for every profile: Profile@123
 * Run from backend/:  node seed-profiles.js
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const fs     = require('fs');
const path   = require('path');
const db     = require('./src/db');

/* ── date helper ─────────────────────────────────────────────── */
const BASE = new Date('2026-05-19');
function ago(days) {
  const d = new Date(BASE);
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

/* ── activity pool ───────────────────────────────────────────── */
const A = {
  learning: [
    { t:'Completed Prompt Engineering Fundamentals on Coursera',    tool:'Claude',          domain:'Internal Tools' },
    { t:'Studied RAG patterns and vector database architecture',     tool:'Claude',          domain:'Agents' },
    { t:'Explored LangChain framework — chains and agents',         tool:'ChatGPT',         domain:'Agents' },
    { t:'Completed AI For Everyone by Andrew Ng',                    tool:'ChatGPT',         domain:'Internal Tools' },
    { t:'Learned about LLM fine-tuning and RLHF concepts',         tool:'ChatGPT',         domain:'Internal Tools' },
    { t:'Explored multimodal AI — vision + language models',        tool:'Gemini',          domain:'Internal Tools' },
    { t:'Studied function calling and tool use in LLMs',            tool:'Claude',          domain:'Automation' },
    { t:'Completed fast.ai Practical Deep Learning course',         tool:'ChatGPT',         domain:'Internal Tools' },
    { t:'Learned AI ethics, bias detection, and responsible AI',    tool:'ChatGPT',         domain:'Internal Tools' },
    { t:'Explored embeddings, semantic search, and vector stores',  tool:'Claude',          domain:'ERP' },
    { t:'Studied transformer architecture internals',                tool:'ChatGPT',         domain:'Internal Tools' },
    { t:'Learned about Claude API — tools, vision, caching',        tool:'Claude',          domain:'Agents' },
    { t:'Explored AI-assisted testing patterns',                    tool:'GitHub Copilot',  domain:'Internal Tools' },
    { t:'Completed Deeplearning.ai short course on Agents',         tool:'Claude',          domain:'Agents' },
    { t:'Learned about Model Context Protocol (MCP)',               tool:'Claude',          domain:'Automation' },
  ],
  practice_project: [
    { t:'Built RAG chatbot for internal documentation search',      tool:'Claude',          domain:'Internal Tools' },
    { t:'Created AI-powered SQL query generator from natural lang', tool:'ChatGPT',         domain:'ERP' },
    { t:'Developed smart resume parser and ranker using Claude',    tool:'Claude',          domain:'Automation' },
    { t:'Built sentiment analyser for customer support tickets',    tool:'ChatGPT',         domain:'CRM' },
    { t:'Created automated release-notes generator from git diff',  tool:'GitHub Copilot',  domain:'Internal Tools' },
    { t:'Built AI-assisted code smell detector for Java services',  tool:'Claude',          domain:'Internal Tools' },
    { t:'Developed intelligent log analyser with anomaly alerts',   tool:'Gemini',          domain:'Automation' },
    { t:'Built AI-powered e-commerce product description writer',   tool:'ChatGPT',         domain:'E-commerce' },
    { t:'Created automated API documentation generator',            tool:'GitHub Copilot',  domain:'Internal Tools' },
    { t:'Built AI-driven test-case generator for REST endpoints',   tool:'Claude',          domain:'Internal Tools' },
    { t:'Developed CRM lead-scoring model with GPT-4',             tool:'ChatGPT',         domain:'CRM' },
    { t:'Built AI-powered invoice extraction from PDF',             tool:'Gemini',          domain:'ERP' },
    { t:'Created Slack bot for standup summarisation',             tool:'Claude',          domain:'Automation' },
    { t:'Built AI code reviewer integrated with GitHub Actions',    tool:'GitHub Copilot',  domain:'Internal Tools' },
    { t:'Developed AI-driven A/B test copy generator',             tool:'ChatGPT',         domain:'E-commerce' },
  ],
  agent_built: [
    { t:'Built autonomous code documentation agent using Claude',   tool:'Claude',          domain:'Agents' },
    { t:'Created multi-step data validation and cleaning agent',    tool:'Claude',          domain:'ERP' },
    { t:'Developed AI agent for automated PR review and approval',  tool:'Claude',          domain:'Automation' },
    { t:'Built customer support triage and routing agent',          tool:'ChatGPT',         domain:'CRM' },
    { t:'Created intelligent task scheduling agent for Jira',      tool:'Claude',          domain:'Internal Tools' },
    { t:'Built multi-agent research pipeline for market analysis',  tool:'Claude',          domain:'Agents' },
    { t:'Developed AI agent for automated dependency updates',      tool:'GitHub Copilot',  domain:'Automation' },
    { t:'Created AI agent for database schema migration review',    tool:'Claude',          domain:'ERP' },
    { t:'Built AI-powered search and summarisation agent',          tool:'Gemini',          domain:'Agents' },
    { t:'Developed agent for automated performance regression tests',tool:'Claude',         domain:'Automation' },
  ],
  code_review: [
    { t:'AI-assisted review of payment gateway integration',        tool:'GitHub Copilot',  domain:'E-commerce' },
    { t:'Claude-powered security review of auth service',           tool:'Claude',          domain:'Internal Tools' },
    { t:'AI review of database ORM layer for N+1 issues',          tool:'ChatGPT',         domain:'ERP' },
    { t:'Copilot-assisted review of React component library',       tool:'GitHub Copilot',  domain:'Internal Tools' },
    { t:'AI-driven review for API rate-limiting module',            tool:'Claude',          domain:'CRM' },
    { t:'Automated vulnerability scan on Node.js microservices',    tool:'GitHub Copilot',  domain:'Automation' },
    { t:'Claude review of data pipeline ETL jobs',                  tool:'Claude',          domain:'ERP' },
    { t:'AI-assisted mobile API optimisation review',               tool:'Gemini',          domain:'E-commerce' },
  ],
  certification: [
    { t:'AWS Certified Cloud Practitioner',                         tool:'ChatGPT',         domain:'Internal Tools' },
    { t:'AWS AI Practitioner (Beta)',                               tool:'Claude',          domain:'Agents' },
    { t:'Google Cloud Professional ML Engineer',                    tool:'Gemini',          domain:'Internal Tools' },
    { t:'Microsoft Azure AI Fundamentals (AI-900)',                 tool:'ChatGPT',         domain:'Internal Tools' },
    { t:'Coursera Deep Learning Specialization — all 5 courses',   tool:'ChatGPT',         domain:'Internal Tools' },
    { t:'Databricks Generative AI Fundamentals badge',             tool:'Claude',          domain:'Agents' },
    { t:'Anthropic API Developer certification',                    tool:'Claude',          domain:'Agents' },
    { t:'LangChain Certified Developer',                            tool:'Claude',          domain:'Agents' },
    { t:'Hugging Face NLP Course completion certificate',           tool:'ChatGPT',         domain:'Internal Tools' },
  ],
};

function pick(arr, n) {
  const out = [];
  const copy = [...arr];
  for (let i = 0; i < Math.min(n, copy.length); i++) {
    const idx = Math.floor(Math.random() * copy.length);
    out.push(copy.splice(idx, 1)[0]);
  }
  return out;
}

function buildActivities(counts, dayRange = 300) {
  const acts = [];
  for (const [type, n] of Object.entries(counts)) {
    for (const item of pick(A[type], n)) {
      const daysBack = Math.floor(Math.random() * dayRange) + 1;
      acts.push({
        activity_type: type,
        title:         item.t,
        tool_used:     item.tool,
        domain:        item.domain,
        status:        Math.random() > 0.12 ? 'completed' : 'in_progress',
        activity_date: ago(daysBack),
        notes:         null,
      });
    }
  }
  return acts;
}

/* ── 50 profiles ─────────────────────────────────────────────── */
const USERS = [
  // ── Engineering / Frontend ──
  {
    email:'rahul.sharma@successive.tech', first_name:'Rahul',   last_name:'Sharma',
    mobile:'9800000001', department:'Engineering', team_id:1, role:'developer',
    tech_stack:['React','TypeScript','Node'],        ai_tools:['GitHub Copilot','Claude'],
    bio:'Frontend developer building delightful UIs with AI superpowers.',
    acts: buildActivities({ learning:4, practice_project:3, code_review:2, certification:1 }),
  },
  {
    email:'priya.patel@successive.tech',  first_name:'Priya',   last_name:'Patel',
    mobile:'9800000002', department:'Engineering', team_id:1, role:'developer',
    tech_stack:['React','Vue','TypeScript'],         ai_tools:['ChatGPT','Cursor'],
    bio:'Loves crafting accessible, performant React applications.',
    acts: buildActivities({ learning:3, practice_project:2, agent_built:1 }),
  },
  {
    email:'rohan.joshi@successive.tech',  first_name:'Rohan',   last_name:'Joshi',
    mobile:'9800000003', department:'Engineering', team_id:1, role:'lead',
    tech_stack:['React','Angular','TypeScript'],     ai_tools:['Claude','GitHub Copilot'],
    bio:'Frontend lead driving AI adoption across the UI guild.',
    acts: buildActivities({ learning:5, practice_project:4, agent_built:2, code_review:3, certification:2 }),
  },
  {
    email:'kavya.iyer@successive.tech',   first_name:'Kavya',   last_name:'Iyer',
    mobile:'9800000004', department:'Engineering', team_id:1, role:'developer',
    tech_stack:['Vue','TypeScript'],                 ai_tools:['Gemini'],
    bio:'Vue specialist exploring AI-driven component generation.',
    acts: buildActivities({ learning:2, practice_project:2 }),
  },
  {
    email:'vivek.sinha@successive.tech',  first_name:'Vivek',   last_name:'Sinha',
    mobile:'9800000005', department:'Engineering', team_id:1, role:'developer',
    tech_stack:['React','Node','TypeScript'],        ai_tools:['GitHub Copilot','ChatGPT'],
    bio:'Full-stack developer with a React-first mindset.',
    acts: buildActivities({ learning:3, practice_project:3, certification:1 }),
  },
  {
    email:'varsha.gaikwad@successive.tech', first_name:'Varsha', last_name:'Gaikwad',
    mobile:'9800000006', department:'Engineering', team_id:1, role:'developer',
    tech_stack:['React','TypeScript'],              ai_tools:['Codeium'],
    bio:'Passionate about design systems and micro-interactions.',
    acts: buildActivities({ learning:2, practice_project:1 }),
  },
  // ── Engineering / Backend ──
  {
    email:'sanjana.bhatt@successive.tech', first_name:'Sanjana', last_name:'Bhatt',
    mobile:'9800000007', department:'Engineering', team_id:2, role:'developer',
    tech_stack:['Node','Python','TypeScript'],       ai_tools:['Claude','ChatGPT'],
    bio:'Backend engineer passionate about scalable microservices.',
    acts: buildActivities({ learning:4, practice_project:3, agent_built:1, code_review:2 }),
  },
  {
    email:'tushar.kapoor@successive.tech', first_name:'Tushar', last_name:'Kapoor',
    mobile:'9800000008', department:'Engineering', team_id:2, role:'lead',
    tech_stack:['Node','Go','Python'],              ai_tools:['Claude','GitHub Copilot'],
    bio:'Backend lead focused on event-driven architectures and AI tooling.',
    acts: buildActivities({ learning:5, practice_project:4, agent_built:3, code_review:4, certification:2 }),
  },
  {
    email:'amol.pawar@successive.tech',   first_name:'Amol',    last_name:'Pawar',
    mobile:'9800000009', department:'Engineering', team_id:2, role:'developer',
    tech_stack:['Node','TypeScript'],               ai_tools:['ChatGPT'],
    bio:'Node.js specialist building high-throughput APIs.',
    acts: buildActivities({ learning:2, practice_project:2, code_review:1 }),
  },
  {
    email:'abhishek.mukherjee@successive.tech', first_name:'Abhishek', last_name:'Mukherjee',
    mobile:'9800000010', department:'Engineering', team_id:2, role:'developer',
    tech_stack:['Node','Python','Go'],              ai_tools:['Claude','Cursor'],
    bio:'Backend developer interested in distributed systems and AI agents.',
    acts: buildActivities({ learning:3, practice_project:2, agent_built:2 }),
  },
  {
    email:'shubham.tiwari@successive.tech', first_name:'Shubham', last_name:'Tiwari',
    mobile:'9800000011', department:'Engineering', team_id:2, role:'developer',
    tech_stack:['Node','TypeScript'],               ai_tools:['GitHub Copilot'],
    bio:'REST API craftsman who recently started exploring LLM integrations.',
    acts: buildActivities({ learning:1, practice_project:1 }),
  },
  // ── Engineering / Java ──
  {
    email:'arjun.kumar@successive.tech',  first_name:'Arjun',   last_name:'Kumar',
    mobile:'9800000012', department:'Engineering', team_id:3, role:'lead',
    tech_stack:['Java','.NET','Python'],             ai_tools:['Claude','GitHub Copilot'],
    bio:'Java lead championing AI-first development in enterprise systems.',
    acts: buildActivities({ learning:6, practice_project:4, agent_built:2, code_review:4, certification:3 }),
  },
  {
    email:'shreya.desai@successive.tech', first_name:'Shreya',  last_name:'Desai',
    mobile:'9800000013', department:'Engineering', team_id:3, role:'developer',
    tech_stack:['Java','TypeScript'],               ai_tools:['ChatGPT','Claude'],
    bio:'Java developer building microservices for ERP modernisation.',
    acts: buildActivities({ learning:3, practice_project:3, code_review:2 }),
  },
  {
    email:'manish.yadav@successive.tech', first_name:'Manish',  last_name:'Yadav',
    mobile:'9800000014', department:'Engineering', team_id:3, role:'developer',
    tech_stack:['Java','Python'],                   ai_tools:['ChatGPT'],
    bio:'Spring Boot developer exploring AI-augmented Java tooling.',
    acts: buildActivities({ learning:2, practice_project:1 }),
  },
  {
    email:'hemant.shinde@successive.tech', first_name:'Hemant', last_name:'Shinde',
    mobile:'9800000015', department:'Engineering', team_id:3, role:'lead',
    tech_stack:['Java','.NET'],                     ai_tools:['GitHub Copilot','Claude'],
    bio:'Java lead with 8 years of enterprise experience, now AI-first.',
    acts: buildActivities({ learning:4, practice_project:3, code_review:3, certification:1 }),
  },
  // ── Engineering / PHP ──
  {
    email:'neha.singh@successive.tech',   first_name:'Neha',    last_name:'Singh',
    mobile:'9800000016', department:'Engineering', team_id:4, role:'developer',
    tech_stack:['PHP','TypeScript','React'],         ai_tools:['GitHub Copilot','Codeium'],
    bio:'PHP developer modernising legacy systems with AI-generated scaffolding.',
    acts: buildActivities({ learning:3, practice_project:2, code_review:1 }),
  },
  {
    email:'akash.pandey@successive.tech', first_name:'Akash',   last_name:'Pandey',
    mobile:'9800000017', department:'Engineering', team_id:4, role:'developer',
    tech_stack:['PHP','Vue'],                        ai_tools:['ChatGPT'],
    bio:'Laravel specialist using AI to speed up feature delivery.',
    acts: buildActivities({ learning:2, practice_project:1 }),
  },
  {
    email:'nikhil.dubey@successive.tech', first_name:'Nikhil',  last_name:'Dubey',
    mobile:'9800000018', department:'Engineering', team_id:4, role:'developer',
    tech_stack:['PHP','React','TypeScript'],         ai_tools:['Cursor','Claude'],
    bio:'Full-stack PHP developer bridging legacy and modern stacks with AI.',
    acts: buildActivities({ learning:3, practice_project:2, certification:1 }),
  },
  {
    email:'santosh.deshpande@successive.tech', first_name:'Santosh', last_name:'Deshpande',
    mobile:'9800000019', department:'Engineering', team_id:4, role:'developer',
    tech_stack:['PHP'],                              ai_tools:['GitHub Copilot'],
    bio:'PHP developer and open-source contributor.',
    acts: buildActivities({ learning:1 }),
  },
  // ── Engineering / .NET ──
  {
    email:'vikram.mehta@successive.tech', first_name:'Vikram',  last_name:'Mehta',
    mobile:'9800000020', department:'Engineering', team_id:5, role:'manager',
    tech_stack:['.NET','React','Azure'],             ai_tools:['Claude','GitHub Copilot'],
    bio:'Engineering manager driving AI skills uplift across .NET teams.',
    acts: buildActivities({ learning:5, practice_project:3, agent_built:2, code_review:3, certification:2 }),
  },
  {
    email:'poorva.chitnis@successive.tech', first_name:'Poorva', last_name:'Chitnis',
    mobile:'9800000021', department:'Finance', team_id:5, role:'developer',
    tech_stack:['.NET','TypeScript'],               ai_tools:['ChatGPT'],
    bio:'Finance-domain .NET developer exploring AI for ERP automation.',
    acts: buildActivities({ learning:2, practice_project:2 }),
  },
  // ── Engineering / Node.js ──
  {
    email:'ananya.gupta@successive.tech', first_name:'Ananya',  last_name:'Gupta',
    mobile:'9800000022', department:'Engineering', team_id:6, role:'developer',
    tech_stack:['Node','TypeScript','React'],        ai_tools:['Claude','Cursor'],
    bio:'Node developer building real-time AI-powered features.',
    acts: buildActivities({ learning:4, practice_project:3, agent_built:1 }),
  },
  {
    email:'rajesh.pillai@successive.tech', first_name:'Rajesh', last_name:'Pillai',
    mobile:'9800000023', department:'Engineering', team_id:6, role:'developer',
    tech_stack:['Node','Python'],                   ai_tools:['ChatGPT','Codeium'],
    bio:'Node developer transitioning to AI-backend architectures.',
    acts: buildActivities({ learning:3, practice_project:2, code_review:1 }),
  },
  {
    email:'ankita.patil@successive.tech', first_name:'Ankita',  last_name:'Patil',
    mobile:'9800000024', department:'Engineering', team_id:6, role:'lead',
    tech_stack:['Node','TypeScript','Go'],           ai_tools:['Claude','GitHub Copilot'],
    bio:'Node.js lead running internal AI hackathons and knowledge transfers.',
    acts: buildActivities({ learning:5, practice_project:4, agent_built:3, code_review:2, certification:2 }),
  },
  {
    email:'pratik.kulkarni@successive.tech', first_name:'Pratik', last_name:'Kulkarni',
    mobile:'9800000025', department:'Engineering', team_id:6, role:'developer',
    tech_stack:['Node','TypeScript'],               ai_tools:['GitHub Copilot'],
    bio:'Backend developer working on APIs for consumer-facing products.',
    acts: buildActivities({ learning:2, practice_project:1 }),
  },
  // ── Engineering / DevOps ──
  {
    email:'karan.verma@successive.tech',  first_name:'Karan',   last_name:'Verma',
    mobile:'9800000026', department:'Engineering', team_id:7, role:'lead',
    tech_stack:['Python','Go','TypeScript'],         ai_tools:['Claude','ChatGPT'],
    bio:'DevOps lead automating everything — now including AI-assisted pipelines.',
    acts: buildActivities({ learning:5, practice_project:4, agent_built:2, code_review:2, certification:2 }),
  },
  {
    email:'pallavi.shah@successive.tech', first_name:'Pallavi', last_name:'Shah',
    mobile:'9800000027', department:'Engineering', team_id:7, role:'developer',
    tech_stack:['Python','Go'],                     ai_tools:['ChatGPT'],
    bio:'DevOps engineer exploring AI-driven infrastructure optimisation.',
    acts: buildActivities({ learning:2, practice_project:2, code_review:1 }),
  },
  {
    email:'harish.nambiar@successive.tech', first_name:'Harish', last_name:'Nambiar',
    mobile:'9800000028', department:'Engineering', team_id:7, role:'developer',
    tech_stack:['Python','Go','TypeScript'],         ai_tools:['Claude','Cursor'],
    bio:'SRE focused on observability and AI-powered alerting.',
    acts: buildActivities({ learning:3, practice_project:2, certification:1 }),
  },
  {
    email:'nitin.salunkhe@successive.tech', first_name:'Nitin', last_name:'Salunkhe',
    mobile:'9800000029', department:'Engineering', team_id:7, role:'developer',
    tech_stack:['Python'],                           ai_tools:['GitHub Copilot'],
    bio:'Cloud engineer automating deployments with AI assistance.',
    acts: buildActivities({ learning:1, practice_project:1 }),
  },
  // ── Engineering / QA ──
  {
    email:'pooja.nair@successive.tech',   first_name:'Pooja',   last_name:'Nair',
    mobile:'9800000030', department:'Engineering', team_id:8, role:'developer',
    tech_stack:['TypeScript','Python','React'],      ai_tools:['Claude','ChatGPT'],
    bio:'QA engineer leveraging AI to build smarter automated test suites.',
    acts: buildActivities({ learning:4, practice_project:3, code_review:2 }),
  },
  {
    email:'suresh.rao@successive.tech',   first_name:'Suresh',  last_name:'Rao',
    mobile:'9800000031', department:'Engineering', team_id:8, role:'developer',
    tech_stack:['Python','TypeScript'],             ai_tools:['ChatGPT'],
    bio:'SDET writing AI-generated test scenarios at scale.',
    acts: buildActivities({ learning:3, practice_project:2 }),
  },
  {
    email:'prachi.wankhede@successive.tech', first_name:'Prachi', last_name:'Wankhede',
    mobile:'9800000032', department:'Engineering', team_id:8, role:'developer',
    tech_stack:['Python','TypeScript'],             ai_tools:['Gemini'],
    bio:'QA automation engineer passionate about AI-first test strategies.',
    acts: buildActivities({ learning:2, practice_project:2, certification:1 }),
  },
  {
    email:'rupali.jadhav@successive.tech', first_name:'Rupali', last_name:'Jadhav',
    mobile:'9800000033', department:'Engineering', team_id:8, role:'developer',
    tech_stack:['Python'],                          ai_tools:['Codeium'],
    bio:'Manual-to-automation QA specialist currently learning AI testing.',
    acts: buildActivities({ learning:1 }),
  },
  // ── Engineering / Data ──
  {
    email:'deepika.reddy@successive.tech', first_name:'Deepika', last_name:'Reddy',
    mobile:'9800000034', department:'Engineering', team_id:9, role:'developer',
    tech_stack:['Python','TypeScript'],             ai_tools:['Claude','ChatGPT'],
    bio:'Data engineer building AI-augmented ETL pipelines.',
    acts: buildActivities({ learning:4, practice_project:3, agent_built:1, code_review:1 }),
  },
  {
    email:'preeti.bose@successive.tech',  first_name:'Preeti',  last_name:'Bose',
    mobile:'9800000035', department:'Engineering', team_id:9, role:'developer',
    tech_stack:['Python','React'],                  ai_tools:['Gemini','Claude'],
    bio:'Data analyst creating AI-powered BI dashboards.',
    acts: buildActivities({ learning:3, practice_project:2 }),
  },
  {
    email:'divya.krishnan@successive.tech', first_name:'Divya', last_name:'Krishnan',
    mobile:'9800000036', department:'Engineering', team_id:9, role:'manager',
    tech_stack:['Python','TypeScript'],             ai_tools:['Claude','ChatGPT'],
    bio:'Data platform manager accelerating AI feature delivery.',
    acts: buildActivities({ learning:5, practice_project:3, agent_built:2, code_review:2, certification:2 }),
  },
  {
    email:'yogesh.sonawane@successive.tech', first_name:'Yogesh', last_name:'Sonawane',
    mobile:'9800000037', department:'Engineering', team_id:9, role:'developer',
    tech_stack:['Python'],                          ai_tools:['ChatGPT'],
    bio:'Data warehouse developer exploring LLM-powered analytics.',
    acts: buildActivities({ learning:2, practice_project:1 }),
  },
  // ── Engineering / AI/ML ──
  {
    email:'aditya.mishra@successive.tech', first_name:'Aditya', last_name:'Mishra',
    mobile:'9800000038', department:'Engineering', team_id:10, role:'developer',
    tech_stack:['Python','TypeScript','React'],      ai_tools:['Claude','ChatGPT','Gemini'],
    bio:'ML engineer building production-grade AI features end to end.',
    acts: buildActivities({ learning:6, practice_project:5, agent_built:4, code_review:2, certification:3 }),
  },
  {
    email:'gaurav.thakur@successive.tech', first_name:'Gaurav', last_name:'Thakur',
    mobile:'9800000039', department:'Engineering', team_id:10, role:'developer',
    tech_stack:['Python','Go'],                     ai_tools:['Claude','Cursor'],
    bio:'AI researcher turned product engineer, passionate about agents.',
    acts: buildActivities({ learning:5, practice_project:4, agent_built:3, certification:2 }),
  },
  {
    email:'sameer.sheikh@successive.tech', first_name:'Sameer', last_name:'Sheikh',
    mobile:'9800000040', department:'Engineering', team_id:10, role:'developer',
    tech_stack:['Python','TypeScript'],             ai_tools:['ChatGPT','Claude'],
    bio:'NLP specialist building conversational AI products.',
    acts: buildActivities({ learning:4, practice_project:3, agent_built:2, certification:1 }),
  },
  {
    email:'sneha.patole@successive.tech', first_name:'Sneha',   last_name:'Patole',
    mobile:'9800000041', department:'Engineering', team_id:10, role:'developer',
    tech_stack:['Python','React'],                  ai_tools:['Gemini','Claude'],
    bio:'Computer vision engineer experimenting with multimodal LLMs.',
    acts: buildActivities({ learning:3, practice_project:2 }),
  },
  // ── Product ──
  {
    email:'mohit.agarwal@successive.tech', first_name:'Mohit',  last_name:'Agarwal',
    mobile:'9800000042', department:'Product', team_id:null, role:'manager',
    tech_stack:['TypeScript','React'],              ai_tools:['ChatGPT','Claude'],
    bio:'Product manager using AI for roadmap prioritisation and user research.',
    acts: buildActivities({ learning:4, practice_project:2, certification:1 }),
  },
  {
    email:'madhuri.waghmare@successive.tech', first_name:'Madhuri', last_name:'Waghmare',
    mobile:'9800000043', department:'Product', team_id:null, role:'manager',
    tech_stack:['TypeScript'],                      ai_tools:['ChatGPT'],
    bio:'Senior PM driving AI integration into product discovery workflows.',
    acts: buildActivities({ learning:3, practice_project:2 }),
  },
  // ── Marketing ──
  {
    email:'meera.chavan@successive.tech',  first_name:'Meera',  last_name:'Chavan',
    mobile:'9800000044', department:'Marketing', team_id:null, role:'manager',
    tech_stack:['TypeScript'],                      ai_tools:['ChatGPT','Gemini'],
    bio:'Marketing manager leveraging AI for content and campaign automation.',
    acts: buildActivities({ learning:4, practice_project:3, certification:1 }),
  },
  {
    email:'swati.jain@successive.tech',   first_name:'Swati',   last_name:'Jain',
    mobile:'9800000045', department:'Marketing', team_id:null, role:'developer',
    tech_stack:['TypeScript','React'],              ai_tools:['ChatGPT'],
    bio:'Growth marketer using AI to personalise campaigns at scale.',
    acts: buildActivities({ learning:2, practice_project:1 }),
  },
  // ── Sales ──
  {
    email:'kajal.menon@successive.tech',  first_name:'Kajal',   last_name:'Menon',
    mobile:'9800000046', department:'Sales', team_id:null, role:'developer',
    tech_stack:['TypeScript'],                      ai_tools:['ChatGPT'],
    bio:'Sales engineer using AI to automate demo prep and proposal drafting.',
    acts: buildActivities({ learning:2, practice_project:1 }),
  },
  {
    email:'sunita.goyal@successive.tech', first_name:'Sunita',  last_name:'Goyal',
    mobile:'9800000047', department:'Sales', team_id:null, role:'manager',
    tech_stack:[],                                  ai_tools:['ChatGPT','Claude'],
    bio:'Sales leader piloting AI tools for deal velocity and forecasting.',
    acts: buildActivities({ learning:3, certification:1 }),
  },
  // ── HR ──
  {
    email:'nisha.malhotra@successive.tech', first_name:'Nisha', last_name:'Malhotra',
    mobile:'9800000048', department:'HR', team_id:null, role:'developer',
    tech_stack:['TypeScript'],                      ai_tools:['ChatGPT'],
    bio:'HR specialist using AI to streamline hiring and onboarding.',
    acts: buildActivities({ learning:2, practice_project:1 }),
  },
  {
    email:'lalita.bhattacharya@successive.tech', first_name:'Lalita', last_name:'Bhattacharya',
    mobile:'9800000049', department:'HR', team_id:null, role:'developer',
    tech_stack:[],                                  ai_tools:['ChatGPT'],
    bio:'L&D specialist designing AI literacy programs for non-technical staff.',
    acts: buildActivities({ learning:3, certification:1 }),
  },
  // ── Finance ──
  {
    email:'ritu.saxena@successive.tech',  first_name:'Ritu',    last_name:'Saxena',
    mobile:'9800000050', department:'Finance', team_id:null, role:'developer',
    tech_stack:['.NET','TypeScript'],               ai_tools:['ChatGPT','Gemini'],
    bio:'Finance analyst automating ERP reporting with AI-assisted SQL.',
    acts: buildActivities({ learning:2, practice_project:2 }),
  },
];

/* ── runner ───────────────────────────────────────────────────── */
async function main() {
  console.log('\n🌱  Seeding 50 profiles — password: Profile@123\n');
  const hash = await bcrypt.hash('Profile@123', 10);

  let usersInserted = 0, usersSkipped = 0, actsInserted = 0;

  for (const u of USERS) {
    const existing = db.get('SELECT id FROM users WHERE email = ?', [u.email]);
    if (existing) {
      u._id = existing.id;
      usersSkipped++;
      continue;
    }

    const r = db.run(
      `INSERT INTO users
         (email, password_hash, first_name, last_name, mobile, department,
          team_id, role, tech_stack, ai_tools, bio)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        u.email, hash, u.first_name, u.last_name, u.mobile,
        u.department, u.team_id ?? null, u.role,
        JSON.stringify(u.tech_stack), JSON.stringify(u.ai_tools), u.bio,
      ]
    );
    u._id = r.lastInsertRowid;
    usersInserted++;
  }

  console.log(`  ✅  Users   — ${usersInserted} inserted, ${usersSkipped} already existed`);

  for (const u of USERS) {
    if (!u._id) continue;
    // check existing activities for this user to avoid double-seeding
    const existing = db.get('SELECT COUNT(*) as c FROM activities WHERE user_id = ?', [u._id]).c;
    if (existing > 0) continue;

    for (const a of (u.acts || [])) {
      db.run(
        `INSERT INTO activities
           (user_id, activity_type, title, tool_used, domain, status, notes, activity_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [u._id, a.activity_type, a.title, a.tool_used, a.domain, a.status, a.notes, a.activity_date]
      );
      actsInserted++;
    }
  }

  console.log(`  ✅  Activities — ${actsInserted} inserted`);

  /* ── generate MD file ─────────────────────────────────────── */
  const roleEmoji = { admin:'🔴', manager:'🟠', lead:'🟡', developer:'🟢' };

  const rows = USERS.map((u, i) =>
    `| ${String(i + 1).padStart(2)} | ${u.first_name} ${u.last_name} | ${u.email} | ${roleEmoji[u.role] ?? ''} ${u.role} | ${u.department} | ${u.team_id ? teamName(u.team_id) : '—'} | ${u.ai_tools.join(', ') || '—'} | ${u.tech_stack.join(', ') || '—'} | ${(u.acts||[]).length} |`
  ).join('\n');

  const totalActs = USERS.reduce((s, u) => s + (u.acts||[]).length, 0);

  const actTypeBreakdown = (() => {
    const c = {};
    USERS.forEach(u => (u.acts||[]).forEach(a => { c[a.activity_type] = (c[a.activity_type]||0)+1; }));
    return Object.entries(c).map(([k,v]) => `| ${k.replace(/_/g,' ')} | ${v} |`).join('\n');
  })();

  const deptBreakdown = (() => {
    const c = {};
    USERS.forEach(u => { c[u.department] = (c[u.department]||0)+1; });
    return Object.entries(c).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`| ${k} | ${v} |`).join('\n');
  })();

  const roleBreakdown = (() => {
    const c = {};
    USERS.forEach(u => { c[u.role] = (c[u.role]||0)+1; });
    return Object.entries(c).map(([k,v])=>`| ${roleEmoji[k]||''} ${k} | ${v} |`).join('\n');
  })();

  const md = `# Seed Profiles — AI Skills Portal

> **50 test users** seeded into the portal for demo and testing purposes.
> All passwords: \`Profile@123\`
> Seed date: 2026-05-19

---

## Summary

| Metric | Count |
|--------|-------|
| Total profiles seeded | 50 |
| Total activities seeded | ${totalActs} |
| Departments covered | ${new Set(USERS.map(u=>u.department)).size} |
| Teams covered | ${new Set(USERS.filter(u=>u.team_id).map(u=>u.team_id)).size} |

---

## By Role

| Role | Count |
|------|-------|
${roleBreakdown}

---

## By Department

| Department | Count |
|------------|-------|
${deptBreakdown}

---

## By Activity Type

| Type | Count |
|------|-------|
${actTypeBreakdown}

---

## Full Profile List

| # | Name | Email | Role | Department | Team | AI Tools | Tech Stack | Activities |
|---|------|-------|------|------------|------|----------|------------|------------|
${rows}

---

## Login Instructions

| Field | Value |
|-------|-------|
| Password | \`Profile@123\` |
| Email format | \`firstname.lastname@successive.tech\` |

### Sample logins

| Name | Email | Role |
|------|-------|------|
| Arjun Kumar | arjun.kumar@successive.tech | Lead |
| Tushar Kapoor | tushar.kapoor@successive.tech | Lead |
| Vikram Mehta | vikram.mehta@successive.tech | Manager |
| Divya Krishnan | divya.krishnan@successive.tech | Manager |
| Aditya Mishra | aditya.mishra@successive.tech | Developer (most active) |
| Santosh Deshpande | santosh.deshpande@successive.tech | Developer (minimal) |

---

## Notes

- Activities are seeded with realistic titles, tools, and domains.
- Dates are distributed across the past 300 days for varied chart data.
- Some users have high activity counts (leads/managers) and some are new joiners (1-2 activities).
- A few users across non-engineering departments (HR, Finance, Marketing, Sales) reflect real enterprise AI adoption patterns.
`;

  try {
    const mdPath = path.join(__dirname, '..', 'SEED_PROFILES.md');
    fs.writeFileSync(mdPath, md, 'utf8');
    console.log(`\n  📄  Docs written → SEED_PROFILES.md`);
  } catch { /* non-critical — skip on read-only filesystems (e.g. Render) */ }

  const stats = db.get('SELECT COUNT(*) as u FROM users');
  const astats = db.get('SELECT COUNT(*) as a FROM activities');
  console.log(`\n  📊  Database totals — ${stats.u} users · ${astats.a} activities`);
  console.log('\n  ✨  Done!\n');
}

function teamName(id) {
  const map = {1:'Frontend',2:'Backend',3:'Java',4:'PHP',5:'.NET',6:'Node.js',7:'DevOps',8:'QA',9:'Data',10:'AI/ML'};
  return map[id] || '?';
}

main().catch(err => { console.error(err); process.exit(1); });
