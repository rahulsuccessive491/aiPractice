const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// ---------------------------------------------------------------------------
// Skills taxonomy — keyed by category
// ---------------------------------------------------------------------------

const TAXONOMY = {
  Frontend: [
    'HTML', 'CSS', 'JavaScript', 'TypeScript', 'React', 'Vue.js', 'Angular',
    'Next.js', 'Nuxt.js', 'Svelte', 'Tailwind CSS', 'Bootstrap', 'Sass/SCSS',
    'Webpack', 'Vite', 'Redux', 'Zustand', 'GraphQL (client)', 'REST API integration',
    'Responsive Design', 'Accessibility (a11y)', 'Web Performance', 'PWA',
    'Storybook', 'Jest', 'Cypress', 'Playwright', 'Figma (handoff)',
  ],
  Backend: [
    'Node.js', 'Express.js', 'Fastify', 'NestJS', 'Python', 'Django', 'FastAPI',
    'Flask', 'Ruby on Rails', 'Java', 'Spring Boot', 'Go', 'Rust',
    'REST API Design', 'GraphQL (server)', 'gRPC', 'WebSockets',
    'SQL', 'PostgreSQL', 'MySQL', 'SQLite', 'MongoDB', 'Redis',
    'Authentication / JWT', 'OAuth 2.0', 'Microservices', 'Message Queues',
  ],
  'AI/ML': [
    'Python', 'NumPy', 'Pandas', 'Scikit-learn', 'TensorFlow', 'PyTorch', 'Keras',
    'Hugging Face', 'LangChain', 'LlamaIndex', 'OpenAI API', 'Anthropic Claude API',
    'Prompt Engineering', 'RAG (Retrieval-Augmented Generation)', 'Fine-tuning LLMs',
    'Computer Vision', 'NLP', 'Reinforcement Learning', 'MLOps', 'Feature Engineering',
    'Model Evaluation', 'Vector Databases', 'Embeddings', 'Jupyter Notebooks',
  ],
  DevOps: [
    'Linux', 'Bash scripting', 'Docker', 'Kubernetes', 'Helm', 'Terraform',
    'Ansible', 'CI/CD', 'GitHub Actions', 'GitLab CI', 'Jenkins',
    'AWS', 'Azure', 'Google Cloud', 'Nginx', 'Monitoring (Prometheus/Grafana)',
    'Logging (ELK Stack)', 'Infrastructure as Code', 'Service Mesh',
    'Security hardening', 'Load balancing',
  ],
  Data: [
    'SQL', 'Python', 'Pandas', 'NumPy', 'Apache Spark', 'Kafka',
    'dbt', 'Airflow', 'Power BI', 'Tableau', 'Looker', 'Metabase',
    'Data Warehousing', 'ETL/ELT Pipelines', 'BigQuery', 'Snowflake', 'Redshift',
    'Data Modeling', 'Statistics', 'A/B Testing', 'Excel / Google Sheets',
  ],
  Cloud: [
    'AWS EC2', 'AWS S3', 'AWS Lambda', 'AWS RDS', 'AWS EKS', 'AWS CloudFormation',
    'Azure App Service', 'Azure Functions', 'Azure DevOps', 'Azure AKS',
    'GCP Compute Engine', 'GCP Cloud Run', 'GCP BigQuery', 'GCP Pub/Sub',
    'Cloud Networking', 'Cloud Security', 'Cost Optimisation', 'Serverless',
    'Multi-cloud strategy', 'Cloud migration',
  ],
  Mobile: [
    'React Native', 'Flutter', 'Swift', 'SwiftUI', 'Objective-C',
    'Kotlin', 'Java (Android)', 'Ionic', 'Capacitor', 'Expo',
    'Mobile UI/UX', 'Push Notifications', 'App Store deployment',
    'Google Play deployment', 'Offline-first architecture', 'Mobile performance',
  ],
  QA: [
    'Manual Testing', 'Test Case Design', 'Selenium', 'Playwright', 'Cypress',
    'Jest', 'Mocha', 'API Testing (Postman)', 'Performance Testing (JMeter)',
    'Load Testing', 'Security Testing', 'BDD (Cucumber)', 'TDD',
    'Test Automation Frameworks', 'Bug Tracking', 'Regression Testing',
  ],
  '.NET': [
    'C#', '.NET Core', '.NET 6/7/8', 'ASP.NET Core', 'Entity Framework Core',
    'Blazor', 'SignalR', 'WPF', 'MAUI', 'Azure Functions (.NET)',
    'Dependency Injection', 'LINQ', 'NUnit', 'xUnit', 'Moq',
  ],
  Java: [
    'Java 11+', 'Spring Boot', 'Spring MVC', 'Spring Security', 'Spring Data',
    'Hibernate / JPA', 'Maven', 'Gradle', 'JUnit', 'Mockito',
    'Kafka (Java)', 'gRPC (Java)', 'Microservices (Java)', 'Jakarta EE',
  ],
  PHP: [
    'PHP 8+', 'Laravel', 'Symfony', 'WordPress', 'Magento',
    'Composer', 'PHPUnit', 'REST API (PHP)', 'MySQL', 'Twig',
  ],
  Soft: [
    'Communication', 'Technical Writing', 'Code Review', 'Mentoring',
    'Agile / Scrum', 'Kanban', 'Project Management', 'Problem Solving',
    'System Design', 'Architecture Design', 'Team Leadership',
  ],
};

const CATEGORIES = Object.keys(TAXONOMY);

// ---------------------------------------------------------------------------
// GET /api/skills/categories
// ---------------------------------------------------------------------------

router.get('/categories', requireAuth, (_req, res) => {
  res.json({ categories: CATEGORIES });
});

// ---------------------------------------------------------------------------
// GET /api/skills/suggestions?category=Frontend[&department=Engineering]
// Returns the taxonomy list for the category, optionally enriched by department.
// The "AI suggestion" logic: if user's department matches a category we bubble
// those skills to the top of the response, simulating AI prioritisation.
// ---------------------------------------------------------------------------

router.get('/suggestions', requireAuth, (req, res) => {
  const { category, department } = req.query;

  if (!category || !TAXONOMY[category]) {
    return res.status(400).json({ error: `Unknown category. Valid: ${CATEGORIES.join(', ')}` });
  }

  const base = TAXONOMY[category];

  // Fetch skills the user already has so the UI can mark them pre-selected.
  const existing = db.all(
    'SELECT name FROM user_skills WHERE user_id = ?',
    [req.user.id]
  ).map(r => r.name);

  // "AI enrichment": if the user's department string hints at a related category,
  // append a few cross-category skills as suggestions.
  const extras = [];
  if (department) {
    const dept = department.toLowerCase();
    if (dept.includes('ai') || dept.includes('ml') || dept.includes('data')) {
      extras.push(...(TAXONOMY['AI/ML'] || []).slice(0, 5));
    }
    if (dept.includes('frontend') || dept.includes('ui')) {
      extras.push(...(TAXONOMY.Frontend || []).slice(0, 3));
    }
  }

  const allSkills = [...new Set([...base, ...extras])];

  res.json({
    category,
    skills: allSkills,
    already_selected: existing,
  });
});

module.exports = router;
module.exports.TAXONOMY = TAXONOMY;
module.exports.CATEGORIES = CATEGORIES;
