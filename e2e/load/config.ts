/**
 * Load test configuration — mirrors real-life production traffic patterns.
 *
 * PROFILES
 *  baseline   1 user  — smoke test, confirms app responds
 *  light      5 users — quiet morning traffic (~06:00–08:00)
 *  normal    20 users — daytime steady state
 *  peak      50 users — lunch / evening rush
 *  spike     80 users — sudden burst (viral share, push notification)
 *
 * THINK TIMES (ms) model real users reading / typing between actions.
 */

export const BASE_URL = process.env.LOAD_TEST_URL || 'https://ai-tutor-agent-ten.vercel.app';

export type Profile = 'baseline' | 'light' | 'normal' | 'peak' | 'spike';

export interface LoadProfile {
  name:        Profile;
  virtualUsers: number;
  rampUpMs:    number;   // time to reach full concurrency
  steadyMs:    number;   // time to hold at full concurrency
  description: string;
}

export const PROFILES: Record<Profile, LoadProfile> = {
  baseline: { name: 'baseline', virtualUsers:  1, rampUpMs:     0, steadyMs: 30_000, description: 'Single user smoke test'                 },
  light:    { name: 'light',    virtualUsers:  5, rampUpMs: 10_000, steadyMs: 60_000, description: 'Quiet morning — 5 concurrent learners'  },
  normal:   { name: 'normal',   virtualUsers: 20, rampUpMs: 30_000, steadyMs: 90_000, description: 'Daytime steady — 20 concurrent sessions' },
  peak:     { name: 'peak',     virtualUsers: 50, rampUpMs: 60_000, steadyMs: 120_000,description: 'Lunch rush — 50 concurrent learners'    },
  spike:    { name: 'spike',    virtualUsers: 80, rampUpMs:  5_000, steadyMs:  30_000,description: 'Traffic spike — 80 users in 5 s'        },
};

/** Realistic human think times in ms */
export const THINK = {
  readResponse:   () => 2_000 + Math.random() * 3_000,  // 2–5 s reading AI reply
  typeShortMsg:   () =>   800 + Math.random() * 1_200,  // 0.8–2 s typing
  typeLongMsg:    () =>  3_000 + Math.random() * 4_000, // 3–7 s typing essay
  pageLoad:       () =>   500 + Math.random() * 1_000,  // 0.5–1.5 s after page load
  modeSwitch:     () =>   300 + Math.random() *   500,  // quick click
  examAnswer:     () =>  8_000 + Math.random() * 12_000,// 8–20 s answering each Q
};

/** Realistic message content by learning domain */
export const MESSAGES = {
  cloud: [
    'What is the difference between IaaS, PaaS, and SaaS?',
    'Explain Azure Virtual Machines and when I should use them',
    'What is the CAP theorem and how does it apply to distributed systems?',
    'How does auto-scaling work in cloud environments?',
    'What are the key differences between AWS S3 and Azure Blob Storage?',
  ],
  devops: [
    'What is CI/CD and why is it important?',
    'Explain the difference between Docker containers and VMs',
    'How does Kubernetes manage container orchestration?',
    'What is infrastructure as code and what tools are used?',
    'Explain blue-green deployments',
  ],
  security: [
    'What is zero-trust security architecture?',
    'Explain common OWASP Top 10 vulnerabilities',
    'What is the difference between authentication and authorisation?',
    'How does OAuth 2.0 work?',
    'What is penetration testing and how is it conducted?',
  ],
  programming: [
    'Explain async/await in JavaScript',
    'What is the difference between SQL and NoSQL databases?',
    'How does garbage collection work in Python?',
    'What are design patterns and when should I use them?',
    'Explain RESTful API design principles',
  ],
  exam: [
    'test me on AZ-900',
    'give me a practice exam on AWS Cloud Practitioner',
    'quiz me on CompTIA Security+',
  ],
};

/** User personas with realistic behaviour patterns */
export interface Persona {
  name:     string;
  domain:   keyof typeof MESSAGES;
  mode:     'explain' | 'quiz' | 'chat' | 'exam';
  sessions: number;  // messages per session
}

export const PERSONAS: Persona[] = [
  { name: 'Cloud Student',    domain: 'cloud',       mode: 'explain', sessions: 3 },
  { name: 'DevOps Engineer',  domain: 'devops',      mode: 'chat',    sessions: 4 },
  { name: 'Security Learner', domain: 'security',    mode: 'quiz',    sessions: 3 },
  { name: 'Dev Bootcamper',   domain: 'programming', mode: 'explain', sessions: 5 },
  { name: 'Exam Candidate',   domain: 'exam',        mode: 'exam',    sessions: 1 },
];
