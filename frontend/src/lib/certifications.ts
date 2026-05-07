/**
 * certifications.ts — curated database of globally recognised certifications
 * mapped to subject areas and knowledge levels.
 *
 * Sources: official certification bodies (CompTIA, AWS, Google, PMI, ACCA, etc.)
 * All URLs link to the official certification page.
 */

export type Level = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export interface Certification {
  id:        string;
  name:      string;
  body:      string;     // Issuing organization
  acronym?:  string;
  url:       string;
  level:     Level;
  cost?:     string;     // Approximate exam cost
  duration?: string;     // Study time estimate
  desc:      string;
}

export interface RoadmapStep {
  level:     Level;
  title:     string;
  goal:      string;
  skills:    string[];
  certs:     Certification[];
  resources: { name: string; url: string; free: boolean }[];
}

export interface SubjectRoadmap {
  subject:     string;
  icon:        string;
  description: string;
  steps:       RoadmapStep[];
}

// ── SUBJECT ROADMAPS ─────────────────────────────────────────────────────────

export const ROADMAPS: SubjectRoadmap[] = [

  // ── CLOUD & IT ────────────────────────────────────────────────────────────
  {
    subject: 'Cloud Computing & IT',
    icon: '☁️',
    description: 'From IT fundamentals to cloud architecture and security leadership.',
    steps: [
      {
        level: 'beginner', title: 'IT Foundations',
        goal: 'Understand hardware, software, networking basics and cloud concepts.',
        skills: ['Computer hardware', 'Operating systems', 'Basic networking', 'Cloud overview'],
        certs: [
          { id: 'itf', name: 'CompTIA IT Fundamentals+', body: 'CompTIA', acronym: 'ITF+', url: 'https://www.comptia.org/certifications/it-fundamentals', level: 'beginner', cost: '$123', duration: '40 hrs', desc: 'Entry-level IT certification covering infrastructure, applications, and security.' },
          { id: 'gits', name: 'Google IT Support Certificate', body: 'Google / Coursera', url: 'https://grow.google/certificates/it-support/', level: 'beginner', cost: 'Free (aid available)', duration: '6 months', desc: 'Hands-on IT support skills via Coursera. Widely recognised by employers.' },
          { id: 'awscp', name: 'AWS Cloud Practitioner', body: 'Amazon Web Services', acronym: 'CLF-C02', url: 'https://aws.amazon.com/certification/certified-cloud-practitioner/', level: 'beginner', cost: '$100', duration: '40 hrs', desc: 'Foundational AWS cloud services and business value understanding.' },
        ],
        resources: [
          { name: 'CompTIA Study Guide (free)', url: 'https://www.comptia.org/training/by-certification/itf', free: true },
          { name: 'AWS Skill Builder (free tier)', url: 'https://skillbuilder.aws', free: true },
          { name: 'Khan Academy — Computing', url: 'https://www.khanacademy.org/computing', free: true },
        ],
      },
      {
        level: 'intermediate', title: 'Systems & Networking',
        goal: 'Build hands-on skills in networking, hardware support, and core cloud services.',
        skills: ['TCP/IP networking', 'Active Directory', 'Virtualisation', 'AWS core services'],
        certs: [
          { id: 'aplus', name: 'CompTIA A+', body: 'CompTIA', url: 'https://www.comptia.org/certifications/a', level: 'intermediate', cost: '$239', duration: '80 hrs', desc: 'Industry standard for IT support technicians. Covers hardware, OS, and troubleshooting.' },
          { id: 'netplus', name: 'CompTIA Network+', body: 'CompTIA', acronym: 'N+', url: 'https://www.comptia.org/certifications/network', level: 'intermediate', cost: '$338', duration: '80 hrs', desc: 'Core networking skills including infrastructure, operations, and security.' },
          { id: 'awssaa', name: 'AWS Solutions Architect Associate', body: 'Amazon Web Services', acronym: 'SAA-C03', url: 'https://aws.amazon.com/certification/certified-solutions-architect-associate/', level: 'intermediate', cost: '$150', duration: '100 hrs', desc: 'Design resilient, cost-optimised cloud architectures on AWS.' },
          { id: 'az900', name: 'Microsoft Azure Fundamentals', body: 'Microsoft', acronym: 'AZ-900', url: 'https://learn.microsoft.com/en-us/certifications/azure-fundamentals/', level: 'intermediate', cost: '$165', duration: '40 hrs', desc: 'Core cloud services and Microsoft Azure fundamentals.' },
        ],
        resources: [
          { name: 'Professor Messer (free video course)', url: 'https://www.professormesser.com', free: true },
          { name: 'Microsoft Learn', url: 'https://learn.microsoft.com', free: true },
        ],
      },
      {
        level: 'advanced', title: 'Security & Cloud Architecture',
        goal: 'Specialise in cybersecurity, DevOps, or multi-cloud architecture.',
        skills: ['Security operations', 'Cloud architecture', 'Kubernetes', 'CI/CD'],
        certs: [
          { id: 'secplus', name: 'CompTIA Security+', body: 'CompTIA', acronym: 'SY0-701', url: 'https://www.comptia.org/certifications/security', level: 'advanced', cost: '$392', duration: '100 hrs', desc: 'Globally recognised baseline security certification. DoD 8570 approved.' },
          { id: 'awssap', name: 'AWS Solutions Architect Professional', body: 'Amazon Web Services', acronym: 'SAP-C02', url: 'https://aws.amazon.com/certification/certified-solutions-architect-professional/', level: 'advanced', cost: '$300', duration: '200 hrs', desc: 'Advanced AWS architecture for complex, multi-account enterprise environments.' },
          { id: 'gcppca', name: 'Google Cloud Professional Cloud Architect', body: 'Google Cloud', url: 'https://cloud.google.com/learn/certification/cloud-architect', level: 'advanced', cost: '$200', duration: '150 hrs', desc: 'Design, manage, and migrate Google Cloud infrastructure.' },
          { id: 'cka', name: 'Certified Kubernetes Administrator', body: 'CNCF / Linux Foundation', acronym: 'CKA', url: 'https://training.linuxfoundation.org/certification/certified-kubernetes-administrator-cka/', level: 'advanced', cost: '$395', duration: '120 hrs', desc: 'Industry standard for Kubernetes cluster administration.' },
        ],
        resources: [
          { name: 'Linux Foundation Training', url: 'https://training.linuxfoundation.org', free: false },
          { name: 'A Cloud Guru', url: 'https://acloudguru.com', free: false },
        ],
      },
      {
        level: 'expert', title: 'Enterprise Security Leadership',
        goal: 'Lead security strategy, governance, and complex cloud transformations.',
        skills: ['Security architecture', 'Risk management', 'Governance', 'Cloud strategy'],
        certs: [
          { id: 'cissp', name: 'Certified Information Systems Security Professional', body: 'ISC²', acronym: 'CISSP', url: 'https://www.isc2.org/certifications/cissp', level: 'expert', cost: '$699', duration: '300+ hrs', desc: 'Gold standard for senior security professionals. Requires 5 years experience.' },
          { id: 'cism', name: 'Certified Information Security Manager', body: 'ISACA', acronym: 'CISM', url: 'https://www.isaca.org/credentialing/cism', level: 'expert', cost: '$575', duration: '250 hrs', desc: 'Management-focused cybersecurity certification for senior IT managers.' },
          { id: 'togaf', name: 'TOGAF Enterprise Architecture', body: 'The Open Group', acronym: 'TOGAF 10', url: 'https://www.opengroup.org/togaf', level: 'expert', cost: '$495', duration: '150 hrs', desc: 'Framework for enterprise architecture used by 80% of Fortune 500.' },
        ],
        resources: [
          { name: 'ISC² Official Study Guide', url: 'https://www.isc2.org/Training', free: false },
          { name: 'ISACA Learning', url: 'https://www.isaca.org/training', free: false },
        ],
      },
    ],
  },

  // ── DATA SCIENCE & AI ────────────────────────────────────────────────────
  {
    subject: 'Data Science & AI',
    icon: '🤖',
    description: 'From data literacy to machine learning engineering and AI research.',
    steps: [
      {
        level: 'beginner', title: 'Data Literacy',
        goal: 'Understand data, statistics, and introductory Python/SQL.',
        skills: ['Basic statistics', 'Python fundamentals', 'SQL basics', 'Data visualization'],
        certs: [
          { id: 'gdac', name: 'Google Data Analytics Certificate', body: 'Google / Coursera', url: 'https://grow.google/certificates/data-analytics/', level: 'beginner', cost: 'Free (aid)', duration: '6 months', desc: 'Hands-on data analytics foundations using spreadsheets, SQL, R, and Tableau.' },
          { id: 'ibmds', name: 'IBM Data Science Professional Certificate', body: 'IBM / Coursera', url: 'https://www.coursera.org/professional-certificates/ibm-data-science', level: 'beginner', cost: 'Free (audit)', duration: '11 months', desc: 'Python, SQL, ML fundamentals from IBM. Includes 10 applied projects.' },
          { id: 'sqlassc', name: 'DP-900: Azure Data Fundamentals', body: 'Microsoft', acronym: 'DP-900', url: 'https://learn.microsoft.com/en-us/certifications/azure-data-fundamentals/', level: 'beginner', cost: '$165', duration: '30 hrs', desc: 'Core data concepts and cloud data services on Microsoft Azure.' },
        ],
        resources: [
          { name: 'Kaggle — Free Data Science Courses', url: 'https://www.kaggle.com/learn', free: true },
          { name: 'Khan Academy — Statistics & Probability', url: 'https://www.khanacademy.org/math/statistics-probability', free: true },
          { name: 'fast.ai Practical Deep Learning', url: 'https://www.fast.ai', free: true },
        ],
      },
      {
        level: 'intermediate', title: 'Machine Learning Practitioner',
        goal: 'Build and deploy ML models; work with real datasets end-to-end.',
        skills: ['Scikit-learn', 'TensorFlow/PyTorch', 'Feature engineering', 'Model evaluation'],
        certs: [
          { id: 'tfdc', name: 'TensorFlow Developer Certificate', body: 'Google', url: 'https://www.tensorflow.org/certificate', level: 'intermediate', cost: '$100', duration: '150 hrs', desc: 'Validates TensorFlow skills in computer vision, NLP, and time-series.' },
          { id: 'awsmlspc', name: 'AWS Certified Machine Learning Specialty', body: 'Amazon Web Services', acronym: 'MLS-C01', url: 'https://aws.amazon.com/certification/certified-machine-learning-specialty/', level: 'intermediate', cost: '$300', duration: '200 hrs', desc: 'Design, implement, deploy and maintain ML solutions on AWS.' },
          { id: 'azureai', name: 'Azure AI Engineer Associate', body: 'Microsoft', acronym: 'AI-102', url: 'https://learn.microsoft.com/en-us/certifications/azure-ai-engineer/', level: 'intermediate', cost: '$165', duration: '120 hrs', desc: 'Build AI solutions using Azure Cognitive Services and OpenAI.' },
        ],
        resources: [
          { name: 'DeepLearning.AI Specializations', url: 'https://www.deeplearning.ai', free: false },
          { name: 'fast.ai', url: 'https://www.fast.ai', free: true },
          { name: 'Papers With Code', url: 'https://paperswithcode.com', free: true },
        ],
      },
      {
        level: 'advanced', title: 'ML Engineer',
        goal: 'Build production ML systems, MLOps pipelines, and LLM applications.',
        skills: ['MLOps', 'Feature stores', 'LLMs', 'Distributed training'],
        certs: [
          { id: 'gcppml', name: 'Google Professional ML Engineer', body: 'Google Cloud', url: 'https://cloud.google.com/learn/certification/machine-learning-engineer', level: 'advanced', cost: '$200', duration: '200 hrs', desc: 'Design and build ML models in production using Google Cloud tools.' },
          { id: 'dba', name: 'Databricks Certified Associate Developer', body: 'Databricks', url: 'https://www.databricks.com/learn/certification/apache-spark-developer-associate', level: 'advanced', cost: '$200', duration: '100 hrs', desc: 'Apache Spark and Databricks for large-scale data engineering and ML.' },
        ],
        resources: [
          { name: 'MLflow Documentation', url: 'https://mlflow.org/docs/latest/index.html', free: true },
          { name: 'Hugging Face Course', url: 'https://huggingface.co/course', free: true },
        ],
      },
      {
        level: 'expert', title: 'AI Research & Leadership',
        goal: 'Lead AI strategy, publish research, architect large-scale AI systems.',
        skills: ['AI safety', 'Transformer architecture', 'Distributed systems', 'Research methods'],
        certs: [
          { id: 'dbp', name: 'Databricks Certified Professional Data Scientist', body: 'Databricks', url: 'https://www.databricks.com/learn/certification/data-scientist-professional', level: 'expert', cost: '$400', duration: '200 hrs', desc: 'Advanced data science with Databricks for enterprise ML systems.' },
          { id: 'aioptix', name: 'AI Product Management Certificate', body: 'Product School', url: 'https://productschool.com/ai-certifications', level: 'expert', cost: '$4,500', duration: '60 hrs', desc: 'Lead AI product strategy with technical depth and business alignment.' },
        ],
        resources: [
          { name: 'arXiv (pre-prints)', url: 'https://arxiv.org/list/cs.AI/recent', free: true },
          { name: 'Stanford CS229 (free)', url: 'https://cs229.stanford.edu', free: true },
        ],
      },
    ],
  },

  // ── BUSINESS & FINANCE ───────────────────────────────────────────────────
  {
    subject: 'Business & Finance',
    icon: '💼',
    description: 'From financial literacy to CFA, CPA, and executive leadership.',
    steps: [
      {
        level: 'beginner', title: 'Financial Literacy',
        goal: 'Understand accounting basics, business fundamentals, and personal finance.',
        skills: ['Bookkeeping', 'Financial statements', 'Business models', 'Budgeting'],
        certs: [
          { id: 'qbo', name: 'QuickBooks Certified User', body: 'Intuit', url: 'https://quickbooks.intuit.com/accountants/resources/quickbooks-certification/', level: 'beginner', cost: '$150', duration: '20 hrs', desc: 'Practical accounting skills using the world\'s most popular SME accounting software.' },
          { id: 'hubspot', name: 'HubSpot Business Foundations', body: 'HubSpot Academy', url: 'https://academy.hubspot.com', level: 'beginner', cost: 'Free', duration: '15 hrs', desc: 'Free certifications in marketing, sales, and customer service fundamentals.' },
          { id: 'googledm', name: 'Google Digital Marketing & E-commerce', body: 'Google / Coursera', url: 'https://grow.google/certificates/digital-marketing-ecommerce/', level: 'beginner', cost: 'Free (aid)', duration: '6 months', desc: 'Digital marketing, e-commerce, and business analytics for beginners.' },
        ],
        resources: [
          { name: 'Khan Academy — Finance & Economics', url: 'https://www.khanacademy.org/economics-finance-domain', free: true },
          { name: 'edX — Intro to Financial Accounting (Wharton)', url: 'https://www.edx.org/learn/accounting', free: true },
        ],
      },
      {
        level: 'intermediate', title: 'Professional Accounting',
        goal: 'Achieve a recognised accounting qualification and management skills.',
        skills: ['Management accounting', 'Financial reporting', 'Taxation', 'Audit'],
        certs: [
          { id: 'acca-f', name: 'ACCA Applied Knowledge', body: 'ACCA (Association of Chartered Certified Accountants)', url: 'https://www.accaglobal.com/gb/en/qualifications/glance/acca.html', level: 'intermediate', cost: '£89–£129/paper', duration: '12–18 months', desc: 'First stage of the ACCA qualification. Covers accountancy, management accounting, and tax basics.' },
          { id: 'cfa1', name: 'CFA Level I', body: 'CFA Institute', url: 'https://www.cfainstitute.org/en/programs/cfa', level: 'intermediate', cost: '$900–$1,200', duration: '300 hrs', desc: 'Globally recognised investment analysis foundation covering ethics, economics, and portfolio theory.' },
          { id: 'cpaexam', name: 'CPA Exam (US)', body: 'AICPA', url: 'https://www.aicpa-cima.com/certifications/cpa', level: 'intermediate', cost: '$200–$350/section', duration: '400 hrs', desc: '4-section exam for US Certified Public Accountants. Top accounting credential in North America.' },
        ],
        resources: [
          { name: 'ACCA Study Hub (free resources)', url: 'https://www.accaglobal.com/gb/en/student/study-support-resources.html', free: true },
          { name: 'CFA Institute Learning Ecosystem', url: 'https://www.cfainstitute.org/en/membership/professional-development', free: false },
        ],
      },
      {
        level: 'advanced', title: 'Strategic Finance',
        goal: 'Lead financial analysis, investment strategy, and corporate finance.',
        skills: ['Portfolio management', 'Corporate finance', 'Risk management', 'Strategic planning'],
        certs: [
          { id: 'cfa3', name: 'CFA Charter (Levels II & III)', body: 'CFA Institute', url: 'https://www.cfainstitute.org/en/programs/cfa', level: 'advanced', cost: '$1,000–$1,500/level', duration: '600+ hrs total', desc: 'The world\'s most respected investment credential. Required for senior investment roles globally.' },
          { id: 'accap', name: 'ACCA Professional Level', body: 'ACCA', url: 'https://www.accaglobal.com/gb/en/qualifications/glance/acca.html', level: 'advanced', cost: '£129–£195/paper', duration: '24 months', desc: 'Advanced papers including Advanced Financial Management and Advanced Performance Management.' },
          { id: 'frm', name: 'Financial Risk Manager', body: 'GARP', acronym: 'FRM', url: 'https://www.garp.org/frm', level: 'advanced', cost: '$825–$1,275', duration: '400 hrs', desc: 'Top global certification for risk management professionals in banking and finance.' },
        ],
        resources: [
          { name: 'Schweser CFA Prep', url: 'https://www.schweser.com', free: false },
          { name: 'GARP Study Materials', url: 'https://www.garp.org/frm/study-materials', free: false },
        ],
      },
      {
        level: 'expert', title: 'Executive & Board Level',
        goal: 'Lead organisations, set financial strategy, and sit on audit committees.',
        skills: ['Board governance', 'M&A strategy', 'IPO readiness', 'ESG reporting'],
        certs: [
          { id: 'accaf', name: 'ACCA Fellow (FCCA)', body: 'ACCA', url: 'https://www.accaglobal.com/gb/en/member/fellowship.html', level: 'expert', cost: 'Annual membership', duration: 'Ongoing CPD', desc: 'Highest ACCA designation. Awarded after 5 years of post-qualification experience.' },
          { id: 'iod', name: 'IoD Certificate in Company Direction', body: 'Institute of Directors (UK)', url: 'https://www.iod.com/professional-development/professional-qualifications/', level: 'expert', cost: '£3,500', duration: '5 days', desc: 'Board-level governance and strategic leadership for directors.' },
        ],
        resources: [
          { name: 'ICAEW Knowledge Guide', url: 'https://www.icaew.com/learning-and-development', free: false },
          { name: 'Harvard ManageMentor (HBR)', url: 'https://hbr.org/learning', free: false },
        ],
      },
    ],
  },

  // ── PROJECT MANAGEMENT ───────────────────────────────────────────────────
  {
    subject: 'Project Management',
    icon: '📋',
    description: 'From CAPM to PMP, Agile, and programme management leadership.',
    steps: [
      {
        level: 'beginner', title: 'PM Foundations',
        goal: 'Understand project lifecycle, basic scheduling, and team coordination.',
        skills: ['Project lifecycle', 'Gantt charts', 'Stakeholder management', 'Risk basics'],
        certs: [
          { id: 'gpm', name: 'Google Project Management Certificate', body: 'Google / Coursera', url: 'https://grow.google/certificates/project-management/', level: 'beginner', cost: 'Free (aid)', duration: '6 months', desc: 'Entry-level project management across Waterfall and Agile approaches.' },
          { id: 'capm', name: 'Certified Associate in Project Management', body: 'PMI', acronym: 'CAPM', url: 'https://www.pmi.org/certifications/certified-associate-capm', level: 'beginner', cost: '$225', duration: '150 hrs', desc: 'PMI\'s entry certification. No experience required. Based on PMBOK Guide.' },
        ],
        resources: [
          { name: 'PMI Free Resources', url: 'https://www.pmi.org/learning', free: true },
          { name: 'PRINCE2 Official Foundation Guide', url: 'https://www.axelos.com/certifications/propath/prince2', free: false },
        ],
      },
      {
        level: 'intermediate', title: 'Certified PM',
        goal: 'Lead projects independently across Waterfall and Agile methodologies.',
        skills: ['PMP methodology', 'Agile/Scrum', 'Budget management', 'Risk registers'],
        certs: [
          { id: 'pmp', name: 'Project Management Professional', body: 'PMI', acronym: 'PMP', url: 'https://www.pmi.org/certifications/project-management-pmp', level: 'intermediate', cost: '$405–$555', duration: '300 hrs', desc: 'Gold standard for project managers globally. Requires 36 months of experience.' },
          { id: 'prince2f', name: 'PRINCE2 Foundation', body: 'AXELOS', url: 'https://www.axelos.com/certifications/propath/prince2-project-management', level: 'intermediate', cost: '£295', duration: '40 hrs', desc: 'Structured project management method used by UK government and 150+ countries.' },
          { id: 'psm1', name: 'Professional Scrum Master I', body: 'Scrum.org', acronym: 'PSM I', url: 'https://www.scrum.org/assessments/professional-scrum-master-i-certification', level: 'intermediate', cost: '$150', duration: '20 hrs', desc: 'Scrum framework mastery for Agile teams. One of the most respected Scrum certs.' },
        ],
        resources: [
          { name: 'PMI PMBOK Guide (member free)', url: 'https://www.pmi.org/pmbok-guide-standards', free: false },
          { name: 'Scrum Guide (official, free)', url: 'https://www.scrumguides.org', free: true },
        ],
      },
      {
        level: 'advanced', title: 'Agile Leader',
        goal: 'Scale Agile across organisations and lead complex multi-team programmes.',
        skills: ['SAFe framework', 'OKRs', 'Portfolio management', 'DevOps integration'],
        certs: [
          { id: 'pmiacp', name: 'PMI Agile Certified Practitioner', body: 'PMI', acronym: 'PMI-ACP', url: 'https://www.pmi.org/certifications/agile-acp', level: 'advanced', cost: '$435–$495', duration: '200 hrs', desc: 'Combines agile techniques including Scrum, Kanban, XP, and lean.' },
          { id: 'safesa', name: 'SAFe® Scrum Master', body: 'Scaled Agile, Inc.', acronym: 'SSM', url: 'https://scaledagile.com/training/certified-safe-scrum-master/', level: 'advanced', cost: '$995', duration: '16 hrs', desc: 'Lead Agile release trains in large organisations using the SAFe framework.' },
          { id: 'prince2p', name: 'PRINCE2 Practitioner', body: 'AXELOS', url: 'https://www.axelos.com/certifications/propath/prince2-project-management', level: 'advanced', cost: '£495', duration: '60 hrs', desc: 'Apply PRINCE2 to real projects. Required for many UK public sector PM roles.' },
        ],
        resources: [
          { name: 'SAFe Community', url: 'https://scaledagile.com/resources/', free: true },
          { name: 'PMI Agile Community', url: 'https://www.pmi.org/learning/communities/agile', free: false },
        ],
      },
      {
        level: 'expert', title: 'Programme & Portfolio Director',
        goal: 'Govern enterprise portfolios, lead strategic change, and mentor PMs.',
        skills: ['Portfolio governance', 'Benefits realisation', 'Organisational change', 'Executive sponsorship'],
        certs: [
          { id: 'pgmp', name: 'Program Management Professional', body: 'PMI', acronym: 'PgMP', url: 'https://www.pmi.org/certifications/program-management-pgmp', level: 'expert', cost: '$800', duration: '400+ hrs', desc: 'Top-tier PMI certification for strategic programme managers. Requires 4 years experience.' },
          { id: 'msp', name: 'Managing Successful Programmes', body: 'AXELOS', acronym: 'MSP', url: 'https://www.axelos.com/certifications/propath/msp-programme-management', level: 'expert', cost: '£795', duration: '80 hrs', desc: 'Government-grade programme management framework used in major transformations.' },
        ],
        resources: [
          { name: 'AXELOS Best Practice Library', url: 'https://www.axelos.com/resource-hub', free: false },
        ],
      },
    ],
  },

  // ── CYBERSECURITY ────────────────────────────────────────────────────────
  {
    subject: 'Cybersecurity',
    icon: '🔒',
    description: 'From security awareness to CISSP and ethical hacking mastery.',
    steps: [
      {
        level: 'beginner', title: 'Security Awareness',
        goal: 'Understand threats, safe computing, and basic security controls.',
        skills: ['Phishing awareness', 'Password security', 'Social engineering', 'Basic networking'],
        certs: [
          { id: 'gfact', name: 'GIAC Foundational Cybersecurity Technologies', body: 'GIAC / SANS', acronym: 'GFACT', url: 'https://www.giac.org/certifications/foundational-cybersecurity-technologies-gfact/', level: 'beginner', cost: '$479', duration: '60 hrs', desc: 'SANS entry-level certification covering essential security concepts and practices.' },
          { id: 'cc', name: 'Certified in Cybersecurity', body: 'ISC²', acronym: 'CC', url: 'https://www.isc2.org/certifications/cc', level: 'beginner', cost: 'Free (limited)', duration: '40 hrs', desc: 'ISC² entry-level certification. Free exam for 1M candidates through their initiative.' },
        ],
        resources: [
          { name: 'ISC² Free CC Course', url: 'https://www.isc2.org/certifications/cc', free: true },
          { name: 'Cybrary (free tier)', url: 'https://www.cybrary.it', free: true },
          { name: 'SANS Cyber Aces (free)', url: 'https://www.cyberaces.org', free: true },
        ],
      },
      {
        level: 'intermediate', title: 'Security Analyst',
        goal: 'Detect, analyse, and respond to security incidents in a SOC environment.',
        skills: ['SIEM tools', 'Incident response', 'Vulnerability scanning', 'Log analysis'],
        certs: [
          { id: 'secplus2', name: 'CompTIA Security+', body: 'CompTIA', acronym: 'SY0-701', url: 'https://www.comptia.org/certifications/security', level: 'intermediate', cost: '$392', duration: '100 hrs', desc: 'Industry baseline certification for security roles. DoD 8140 approved.' },
          { id: 'csa', name: 'CompTIA CySA+', body: 'CompTIA', acronym: 'CS0-003', url: 'https://www.comptia.org/certifications/cybersecurity-analyst', level: 'intermediate', cost: '$392', duration: '120 hrs', desc: 'Cybersecurity analyst skills: threat detection, SIEM, incident response.' },
          { id: 'ejptv2', name: 'eJPT v2', body: 'eLearnSecurity / INE', acronym: 'eJPT', url: 'https://ine.com/learning/certifications/internal/elearnsecurity-junior-penetration-tester-cert', level: 'intermediate', cost: '$200', duration: '80 hrs', desc: 'Hands-on penetration testing fundamentals. Practical exam on a lab network.' },
        ],
        resources: [
          { name: 'TryHackMe (free/paid)', url: 'https://tryhackme.com', free: true },
          { name: 'HackTheBox Academy', url: 'https://academy.hackthebox.com', free: true },
          { name: 'OWASP (free resources)', url: 'https://owasp.org', free: true },
        ],
      },
      {
        level: 'advanced', title: 'Penetration Tester / Security Engineer',
        goal: 'Conduct authorised security assessments and build security architecture.',
        skills: ['Penetration testing', 'Red team ops', 'Exploit development', 'Security engineering'],
        certs: [
          { id: 'oscp', name: 'Offensive Security Certified Professional', body: 'Offensive Security', acronym: 'OSCP', url: 'https://www.offsec.com/courses/pen-200/', level: 'advanced', cost: '$1,499', duration: '300+ hrs', desc: 'Industry gold standard for ethical hackers. Requires 24-hour practical exam.' },
          { id: 'ceh', name: 'Certified Ethical Hacker', body: 'EC-Council', acronym: 'CEH', url: 'https://www.eccouncil.org/train-certify/certified-ethical-hacker-ceh/', level: 'advanced', cost: '$950', duration: '150 hrs', desc: 'Recognised ethical hacking certification used in government and corporate security.' },
          { id: 'casp', name: 'CompTIA CASP+', body: 'CompTIA', acronym: 'CAS-004', url: 'https://www.comptia.org/certifications/comptia-advanced-security-practitioner', level: 'advanced', cost: '$480', duration: '200 hrs', desc: 'Advanced security architecture and technical leadership. DoD 8140 Level 3.' },
        ],
        resources: [
          { name: 'Offensive Security Labs', url: 'https://www.offsec.com', free: false },
          { name: 'PentesterLab (free/pro)', url: 'https://pentesterlab.com', free: true },
        ],
      },
      {
        level: 'expert', title: 'Chief Information Security Officer',
        goal: 'Lead enterprise security strategy, GRC, and board-level risk governance.',
        skills: ['GRC', 'Zero trust architecture', 'Threat intelligence', 'Board communication'],
        certs: [
          { id: 'cissp2', name: 'CISSP', body: 'ISC²', url: 'https://www.isc2.org/certifications/cissp', level: 'expert', cost: '$699', duration: '350+ hrs', desc: 'Top global certification for senior security professionals and CISOs. Requires 5 years.' },
          { id: 'cism2', name: 'CISM', body: 'ISACA', url: 'https://www.isaca.org/credentialing/cism', level: 'expert', cost: '$575', duration: '250 hrs', desc: 'Strategic security management. Preferred certification for CISOs worldwide.' },
          { id: 'ciso', name: 'Certified CISO', body: 'EC-Council', acronym: 'C|CISO', url: 'https://www.eccouncil.org/train-certify/certified-chief-information-security-officer-cciso/', level: 'expert', cost: '$500', duration: '150 hrs', desc: 'Executive-level CISO certification covering strategy, finance, and governance.' },
        ],
        resources: [
          { name: 'ISC² CISO Resources', url: 'https://www.isc2.org/Insights/2023/07/CISO-Resources', free: false },
        ],
      },
    ],
  },

  // ── HEALTHCARE ───────────────────────────────────────────────────────────
  {
    subject: 'Healthcare & Medicine',
    icon: '🏥',
    description: 'From first aid to clinical leadership and specialist credentials.',
    steps: [
      {
        level: 'beginner', title: 'Healthcare Foundations',
        goal: 'Understand anatomy basics, first aid, and patient care fundamentals.',
        skills: ['Anatomy & physiology', 'First aid', 'Medical terminology', 'Patient safety'],
        certs: [
          { id: 'fa', name: 'Emergency First Aid at Work', body: 'Red Cross / St John Ambulance', url: 'https://www.redcross.org.uk/first-aid/workplace-first-aid-training', level: 'beginner', cost: '£75–£150', duration: '1 day', desc: 'Essential workplace first aid. Recognised across all industries in the UK.' },
          { id: 'bls', name: 'Basic Life Support', body: 'American Heart Association', acronym: 'BLS', url: 'https://cpr.heart.org/en/courses/basic-life-support-course-options', level: 'beginner', cost: '$30–$60', duration: '4 hrs', desc: 'CPR and AED skills for healthcare and community responders.' },
          { id: 'hie', name: 'Healthcare Essentials Certificate', body: 'NHS / FutureLearn', url: 'https://www.futurelearn.com/subjects/healthcare-and-medicine-courses', level: 'beginner', cost: 'Free (audit)', duration: '6 weeks', desc: 'Free NHS-linked courses on health literacy, patient care, and clinical basics.' },
        ],
        resources: [
          { name: 'NHS Learning Hub (free)', url: 'https://learninghub.nhs.uk', free: true },
          { name: 'OpenLearn Healthcare (free)', url: 'https://www.open.edu/openlearn/health-sports-psychology', free: true },
          { name: 'MedlinePlus (US gov, free)', url: 'https://medlineplus.gov', free: true },
        ],
      },
      {
        level: 'intermediate', title: 'Allied Health Professional',
        goal: 'Qualify as a healthcare support worker or start clinical training.',
        skills: ['Clinical skills', 'Patient assessment', 'Medication administration', 'Documentation'],
        certs: [
          { id: 'cma', name: 'Certified Medical Assistant', body: 'AAMA', acronym: 'CMA', url: 'https://www.aama-ntl.org/cma-aama-exam', level: 'intermediate', cost: '$125', duration: '200 hrs', desc: 'US clinical and administrative credential for medical assistants. Accreditation by CAAHEP.' },
          { id: 'cphq', name: 'Certified Professional in Healthcare Quality', body: 'NAHQ', acronym: 'CPHQ', url: 'https://nahq.org/certify', level: 'intermediate', cost: '$350', duration: '150 hrs', desc: 'Quality management and patient safety in healthcare settings.' },
          { id: 'rn', name: 'Registered Nurse Licensing (NCLEX-RN)', body: 'NCSBN (US)', acronym: 'NCLEX', url: 'https://www.ncsbn.org/nclex.htm', level: 'intermediate', cost: '$200', duration: '3+ years BSN', desc: 'US nursing licensure exam. Required to practise as a registered nurse in the US.' },
        ],
        resources: [
          { name: 'AAMA Study Guide', url: 'https://www.aama-ntl.org/cma-aama-exam/study-resources', free: false },
          { name: 'Khan Academy — MCAT prep (free)', url: 'https://www.khanacademy.org/test-prep/mcat', free: true },
        ],
      },
      {
        level: 'advanced', title: 'Clinical Specialist',
        goal: 'Lead specialist clinical practice or start postgraduate medical training.',
        skills: ['Clinical leadership', 'Evidence-based practice', 'Research methodology', 'Specialist assessment'],
        certs: [
          { id: 'cnl', name: 'Clinical Nurse Leader', body: 'AACN', acronym: 'CNL', url: 'https://www.aacnnursing.org/CNL', level: 'advanced', cost: '$300', duration: 'MSN required', desc: 'Advanced nursing role overseeing clinical microsystems and patient outcomes.' },
          { id: 'usmle', name: 'USMLE Step 1–3', body: 'USMLE (US Medical Licensing)', url: 'https://www.usmle.org', level: 'advanced', cost: '$645–$920/step', duration: 'MD/DO required', desc: 'Three-step US medical licensing examination for MDs to practise medicine.' },
          { id: 'mrcgp', name: 'MRCGP', body: 'Royal College of General Practitioners (UK)', url: 'https://www.rcgp.org.uk/mrcgp', level: 'advanced', cost: '£1,705', duration: '3 years GP training', desc: 'Membership of the Royal College of GPs. Required to practise as a GP in the UK.' },
        ],
        resources: [
          { name: 'BMJ Learning (free CPD)', url: 'https://new.bmj.com/learning', free: true },
          { name: 'USMLE Prep Resources', url: 'https://www.usmle.org/preparation-resources', free: false },
        ],
      },
      {
        level: 'expert', title: 'Consultant / Medical Director',
        goal: 'Lead clinical departments, shape healthcare policy, and mentor junior clinicians.',
        skills: ['Healthcare leadership', 'Clinical governance', 'Research leadership', 'Policy development'],
        certs: [
          { id: 'fellow', name: 'Royal College Fellowship (FRCS / FRCP)', body: 'Royal Colleges (UK)', url: 'https://www.rcseng.ac.uk/education-and-exams/', level: 'expert', cost: '£1,000–£3,000', duration: 'Specialist training (5–8 yrs)', desc: 'Fellowship of the Royal College of Surgeons/Physicians. Top UK medical credential.' },
          { id: 'mba-health', name: 'Executive MBA Healthcare Management', body: 'Various (Kings / Manchester / Warwick)', url: 'https://www.kcl.ac.uk/study/postgraduate-taught/courses/healthcare-management-mba', level: 'expert', cost: '£25,000–£45,000', duration: '18–24 months', desc: 'Business leadership skills for clinical directors and medical managers.' },
        ],
        resources: [
          { name: 'NHS Leadership Academy', url: 'https://www.leadershipacademy.nhs.uk', free: true },
          { name: 'WHO Learning Portal', url: 'https://extranet.who.int/agora/', free: true },
        ],
      },
    ],
  },

  // ── LANGUAGES ────────────────────────────────────────────────────────────
  {
    subject: 'Languages & Communication',
    icon: '🌍',
    description: 'From A1 basics to C2 mastery with globally recognised language certifications.',
    steps: [
      {
        level: 'beginner', title: 'A1–A2 Foundation',
        goal: 'Build core vocabulary, basic grammar, and simple conversation skills.',
        skills: ['Basic greetings', 'Numbers & time', 'Simple sentences', 'Everyday vocabulary'],
        certs: [
          { id: 'delf-a', name: 'DELF A1/A2 (French)', body: 'France Éducation International', url: 'https://www.france-education-international.fr/diplome/delf-tout-public', level: 'beginner', cost: '€70–€100', duration: '3–6 months', desc: 'Official French language certificate recognised by French universities and employers.' },
          { id: 'dele-a', name: 'DELE A1/A2 (Spanish)', body: 'Instituto Cervantes', url: 'https://examenes.cervantes.es/en/dele/que-es', level: 'beginner', cost: '€80–€120', duration: '3–6 months', desc: 'Official Spanish diploma from the Spanish government. Lifelong validity.' },
          { id: 'goethe-a', name: 'Goethe-Zertifikat A1/A2 (German)', body: 'Goethe-Institut', url: 'https://www.goethe.de/en/spr/kue/prf.html', level: 'beginner', cost: '€60–€80', duration: '3–6 months', desc: 'Official German language certificate from the Goethe Institute. Globally recognised.' },
        ],
        resources: [
          { name: 'Duolingo (free)', url: 'https://www.duolingo.com', free: true },
          { name: 'BBC Languages (free)', url: 'https://www.bbc.co.uk/languages', free: true },
          { name: 'Alliance Française Online', url: 'https://www.alliancefrancaise.org.uk/online-courses/', free: false },
        ],
      },
      {
        level: 'intermediate', title: 'B1–B2 Independent',
        goal: 'Hold fluent conversations, understand media, and write coherent texts.',
        skills: ['Complex grammar', 'Academic vocabulary', 'Listening comprehension', 'Essay writing'],
        certs: [
          { id: 'ielts', name: 'IELTS Academic', body: 'British Council / IDP / Cambridge', url: 'https://www.ielts.org', level: 'intermediate', cost: '£180–£200', duration: '3–6 months', desc: 'World\'s most popular English test for university admission and immigration. Score 5.5–7.0.' },
          { id: 'toefl', name: 'TOEFL iBT', body: 'ETS', url: 'https://www.ets.org/toefl', level: 'intermediate', cost: '$200–$300', duration: '3–6 months', desc: 'Accepted by 11,500+ universities in 160+ countries. Most popular for US universities.' },
          { id: 'delf-b', name: 'DELF B1/B2 (French)', body: 'France Éducation International', url: 'https://www.france-education-international.fr/diplome/delf-tout-public', level: 'intermediate', cost: '€115–€130', duration: '6–12 months', desc: 'Mid-level French proficiency. Required for some French university programmes.' },
        ],
        resources: [
          { name: 'IELTS.org Official Prep (free)', url: 'https://www.ielts.org/study-and-prepare', free: true },
          { name: 'Anki (free spaced repetition)', url: 'https://apps.ankiweb.net', free: true },
          { name: 'Italki (tutor marketplace)', url: 'https://www.italki.com', free: false },
        ],
      },
      {
        level: 'advanced', title: 'C1 Proficiency',
        goal: 'Achieve near-native fluency. Access academic and professional environments.',
        skills: ['Academic writing', 'Idiomatic expression', 'Professional vocabulary', 'Complex argumentation'],
        certs: [
          { id: 'cam-c1', name: 'Cambridge C1 Advanced (CAE)', body: 'Cambridge Assessment English', url: 'https://www.cambridgeenglish.org/exams-and-tests/advanced/', level: 'advanced', cost: '£160–£200', duration: '6–12 months', desc: 'Highly regarded English qualification for professional and academic use. Lifetime validity.' },
          { id: 'dalf-c1', name: 'DALF C1 (French)', body: 'France Éducation International', url: 'https://www.france-education-international.fr/diplome/dalf', level: 'advanced', cost: '£175–£200', duration: '12+ months', desc: 'Advanced French diploma. Grants access to French universities without further tests.' },
          { id: 'ielts75', name: 'IELTS Band 7.5+ (English)', body: 'British Council / IDP / Cambridge', url: 'https://www.ielts.org', level: 'advanced', cost: '£180–£200', duration: '6–12 months', desc: 'IELTS 7.5+ is required by most top UK universities and professional bodies.' },
        ],
        resources: [
          { name: 'Cambridge English Exam Practice', url: 'https://www.cambridgeenglish.org/learning-english/', free: true },
          { name: 'FluentU (video-based learning)', url: 'https://www.fluentu.com', free: false },
        ],
      },
      {
        level: 'expert', title: 'C2 Mastery',
        goal: 'Achieve certified mastery. Qualify as translator, interpreter, or academic.',
        skills: ['Translation theory', 'Simultaneous interpretation', 'Academic discourse', 'Cultural nuance'],
        certs: [
          { id: 'cam-c2', name: 'Cambridge C2 Proficiency (CPE)', body: 'Cambridge Assessment English', url: 'https://www.cambridgeenglish.org/exams-and-tests/proficiency/', level: 'expert', cost: '£175–£220', duration: 'Years of study', desc: 'Highest Cambridge English certificate. Widely accepted for employment and study worldwide.' },
          { id: 'dalf-c2', name: 'DALF C2 (French)', body: 'France Éducation International', url: 'https://www.france-education-international.fr/diplome/dalf', level: 'expert', cost: '£200+', duration: 'Years of study', desc: 'Top French language diploma. Equivalent to native speaker for academic purposes.' },
          { id: 'dip-trans', name: 'Diploma in Translation', body: 'Chartered Institute of Linguists (CIOL)', url: 'https://www.ciol.org.uk/diptrans', level: 'expert', cost: '£425', duration: '2+ years', desc: 'Professional translation qualification. Required to become a chartered linguist in the UK.' },
        ],
        resources: [
          { name: 'CIOL (Chartered Institute of Linguists)', url: 'https://www.ciol.org.uk/learning', free: false },
          { name: 'ProZ.com (translator community)', url: 'https://www.proz.com', free: true },
        ],
      },
    ],
  },
];

// ── Helper: find roadmap by subject keyword ───────────────────────────────────
export function findRoadmap(subjectQuery: string): SubjectRoadmap | null {
  const q = subjectQuery.toLowerCase();
  return ROADMAPS.find(r =>
    r.subject.toLowerCase().includes(q) ||
    q.includes(r.subject.toLowerCase().split(' ')[0].toLowerCase())
  ) ?? null;
}

// ── All available subjects ────────────────────────────────────────────────────
export const ALL_SUBJECTS = ROADMAPS.map(r => ({ subject: r.subject, icon: r.icon }));
