export interface CertDomain {
  name:   string;
  weight: number; // percentage of exam
}

export interface Certification {
  code:          string;
  name:          string;
  vendor:        string;
  category:      string;
  level:         'Foundational' | 'Associate' | 'Professional' | 'Expert' | 'Specialty';
  questionCount: number;
  timeMinutes:   number;
  passingScore:  string;     // e.g. "700/1000" or "750/900" or "72%"
  scoreScale:    string;     // e.g. "100–1000" or "0–900" or "percentage"
  domains:       CertDomain[];
  questionTypes: string[];
  examStyle:     string;     // LLM-facing format description
  studyTips:     string[];
}

export const CERTIFICATIONS: Certification[] = [
  // ─── MICROSOFT AZURE ────────────────────────────────────────────────────────
  {
    code: 'AZ-900',
    name: 'Microsoft Azure Fundamentals',
    vendor: 'Microsoft',
    category: 'Cloud',
    level: 'Foundational',
    questionCount: 40,
    timeMinutes: 45,
    passingScore: '700/1000',
    scoreScale: '100–1000',
    domains: [
      { name: 'Cloud concepts',                                           weight: 25 },
      { name: 'Azure architecture and services',                          weight: 35 },
      { name: 'Azure management and governance',                          weight: 30 },
      { name: 'Identity, access, and security fundamentals',              weight: 10 },
    ],
    questionTypes: ['Multiple choice (single answer)', 'Multiple choice (multiple answers)', 'True/False', 'Match the definition'],
    examStyle:
      'Microsoft AZ-900 style: scenario-light foundational questions. ' +
      'Test conceptual understanding — what is X, which Azure service does Y, ' +
      'what is the benefit of Z. Questions use simple scenarios like "A company wants to move their data warehouse to Azure — which service should they use?" ' +
      'Multiple-response questions say "Select all that apply" or "Select TWO." ' +
      'Avoid trick questions; focus on clear factual recall and basic cloud concepts.',
    studyTips: ['Microsoft Learn AZ-900 learning path', 'Azure portal free sandbox', 'Cloud concepts: CapEx vs OpEx, IaaS/PaaS/SaaS'],
  },

  {
    code: 'AZ-104',
    name: 'Microsoft Azure Administrator',
    vendor: 'Microsoft',
    category: 'Cloud',
    level: 'Associate',
    questionCount: 40,
    timeMinutes: 100,
    passingScore: '700/1000',
    scoreScale: '100–1000',
    domains: [
      { name: 'Manage Azure identities and governance',   weight: 20 },
      { name: 'Implement and manage storage',             weight: 15 },
      { name: 'Deploy and manage Azure compute resources', weight: 20 },
      { name: 'Implement and manage virtual networking',  weight: 25 },
      { name: 'Monitor and maintain Azure resources',     weight: 10 },
    ],
    questionTypes: [
      'Multiple choice (single/multiple answer)',
      'Drag and drop (match Azure CLI commands to outcomes)',
      'Case study with 4–6 sub-questions',
      'Yes/No hot area (given a config, will it meet the requirement?)',
      'Build list (correct order of steps)',
    ],
    examStyle:
      'Microsoft AZ-104 style: task-focused scenario questions. ' +
      'Each question presents a real-world IT scenario: "An administrator needs to ensure VMs in VNet A can reach storage account X without traversing the public internet — what should they configure?" ' +
      'Case studies describe a fictional company (Contoso Ltd) with requirements and constraints; then ask 4–6 linked questions. ' +
      'Hot-area questions show a configuration panel and ask "Yes: this meets the requirement / No: it does not." ' +
      'Drag-and-drop questions ask candidates to match CLI commands or policy assignments to their effect.',
    studyTips: ['Practice in Azure portal', 'AZ-104 Microsoft Learn path', 'John Savill Azure Master Class'],
  },

  {
    code: 'AZ-204',
    name: 'Developing Solutions for Microsoft Azure',
    vendor: 'Microsoft',
    category: 'Cloud',
    level: 'Associate',
    questionCount: 40,
    timeMinutes: 120,
    passingScore: '700/1000',
    scoreScale: '100–1000',
    domains: [
      { name: 'Develop Azure compute solutions',           weight: 25 },
      { name: 'Develop for Azure storage',                 weight: 15 },
      { name: 'Implement Azure security',                  weight: 20 },
      { name: 'Monitor, troubleshoot, and optimise Azure solutions', weight: 15 },
      { name: 'Connect to and consume Azure services and third-party services', weight: 15 },
    ],
    questionTypes: ['Multiple choice', 'Code snippet review', 'Case study', 'Drag and drop'],
    examStyle:
      'Microsoft AZ-204 style: developer-focused, code and configuration heavy. ' +
      'Questions show C# or Python code snippets with a blank and ask "Which code completes the solution?" ' +
      'Scenario: "A developer needs to store user session state in a distributed cache — which Azure SDK code fragment is correct?" ' +
      'Case studies describe an application architecture and ask about RBAC, Key Vault references, retry policies, or Event Grid subscriptions.',
    studyTips: ['Azure SDK docs', 'GitHub azure-samples repos', 'Scott Duffy AZ-204 course'],
  },

  {
    code: 'AZ-305',
    name: 'Designing Microsoft Azure Infrastructure Solutions',
    vendor: 'Microsoft',
    category: 'Cloud',
    level: 'Expert',
    questionCount: 40,
    timeMinutes: 120,
    passingScore: '700/1000',
    scoreScale: '100–1000',
    domains: [
      { name: 'Design identity, governance, and monitoring solutions', weight: 25 },
      { name: 'Design data storage solutions',                         weight: 25 },
      { name: 'Design business continuity solutions',                  weight: 15 },
      { name: 'Design infrastructure solutions',                       weight: 35 },
    ],
    questionTypes: ['Case study (extended, 5–8 questions)', 'Multiple choice', 'Drag and drop (architecture components)'],
    examStyle:
      'Microsoft AZ-305 style: architecture and design decisions. ' +
      'Most questions are case-study based. The case describes a company migrating workloads to Azure with specific requirements for ' +
      'availability (SLA), RPO/RTO, cost, compliance (GDPR, HIPAA), and scalability. ' +
      'Candidates must choose between multiple valid architectures (e.g. "Option A: Azure SQL with geo-replication vs Option B: Cosmos DB with multi-region writes") ' +
      'and justify which best meets ALL stated requirements. Questions test trade-offs, not just recall.',
    studyTips: ['Well-Architected Framework', 'Azure reference architectures', 'John Savill AZ-305 study cram'],
  },

  {
    code: 'AZ-400',
    name: 'Designing and Implementing Microsoft DevOps Solutions',
    vendor: 'Microsoft',
    category: 'DevOps',
    level: 'Expert',
    questionCount: 40,
    timeMinutes: 120,
    passingScore: '700/1000',
    scoreScale: '100–1000',
    domains: [
      { name: 'Configure processes and communications',          weight: 10 },
      { name: 'Design and implement source control',             weight: 15 },
      { name: 'Design and implement build and release pipelines', weight: 40 },
      { name: 'Develop a security and compliance plan',          weight: 15 },
      { name: 'Implement an instrumentation strategy',           weight: 10 },
      { name: 'Develop a site reliability engineering (SRE) strategy', weight: 10 },
    ],
    questionTypes: [
      'Multiple choice (single/multiple answer)',
      'Case study (Contoso DevOps scenario with 4–6 linked questions)',
      'Build list (order YAML pipeline stages correctly)',
      'Drag and drop (match pipeline task to its function)',
      'Hot area (review a YAML snippet — does it meet the requirement?)',
    ],
    examStyle:
      'Microsoft AZ-400 style: Azure DevOps and GitHub Actions focused, heavily YAML-based. ' +
      'Questions present Azure Pipelines YAML snippets and ask "The team needs zero-downtime deployments — which stage/gate configuration achieves this?" ' +
      'Case studies describe a company (e.g. Fabrikam Inc) running microservices in AKS with requirements for: ' +
      '  • Branch protection and PR policies in Azure Repos or GitHub ' +
      '  • Multi-stage pipelines with approval gates and environment checks ' +
      '  • Secrets management via Azure Key Vault references in pipelines ' +
      '  • Container image scanning and dependency vulnerability checks (Defender for DevOps) ' +
      '  • Infrastructure as Code validation (Bicep/Terraform linting, what-if) ' +
      '  • Monitoring via Application Insights, Log Analytics workspaces, and alert rules ' +
      'Build-list questions ask candidates to order YAML stages or Terraform workflow steps. ' +
      'Hot-area questions show a pipeline YAML and ask whether a specific requirement (e.g. "deployment only runs on main branch") is met.',
    studyTips: [
      'AZ-400 Microsoft Learn path (free)',
      'Azure DevOps Labs hands-on exercises',
      'GitHub Actions certification course',
      'Practice writing multi-stage YAML pipelines',
      'Review: branch policies, environment approvals, variable groups, service connections',
    ],
  },

  {
    code: 'SC-900',
    name: 'Microsoft Security, Compliance, and Identity Fundamentals',
    vendor: 'Microsoft',
    category: 'Security',
    level: 'Foundational',
    questionCount: 45,
    timeMinutes: 60,
    passingScore: '700/1000',
    scoreScale: '100–1000',
    domains: [
      { name: 'Security, compliance, and identity concepts', weight: 15 },
      { name: 'Microsoft Entra capabilities',                weight: 30 },
      { name: 'Microsoft security solutions capabilities',   weight: 35 },
      { name: 'Microsoft compliance solutions capabilities', weight: 20 },
    ],
    questionTypes: ['Multiple choice', 'Match the feature to the product', 'True/False'],
    examStyle:
      'Microsoft SC-900 style: conceptual, definition-heavy security fundamentals. ' +
      '"What does Zero Trust assume about network traffic?", "Which Microsoft service provides SIEM and SOAR capabilities?", ' +
      '"A company needs to enforce MFA for all admin accounts — which Entra feature should they configure?" ' +
      'Questions are accessible to non-technical learners; avoid deep technical configuration.',
    studyTips: ['SC-900 Microsoft Learn path', 'Microsoft Security documentation', 'Entra ID free tenant'],
  },

  // ─── AWS ─────────────────────────────────────────────────────────────────────
  {
    code: 'CLF-C02',
    name: 'AWS Certified Cloud Practitioner',
    vendor: 'Amazon Web Services',
    category: 'Cloud',
    level: 'Foundational',
    questionCount: 65,
    timeMinutes: 90,
    passingScore: '700/1000',
    scoreScale: '100–1000',
    domains: [
      { name: 'Cloud Concepts',               weight: 24 },
      { name: 'Security and Compliance',      weight: 30 },
      { name: 'Cloud Technology and Services', weight: 34 },
      { name: 'Billing, Pricing, and Support', weight: 12 },
    ],
    questionTypes: ['Multiple choice (single answer)', 'Multiple response (select TWO or THREE)'],
    examStyle:
      'AWS CLF-C02 style: conceptual cloud and AWS service knowledge. ' +
      '"A company needs object storage that scales automatically — which AWS service should they use?" ' +
      '"Which AWS support plan provides a Technical Account Manager (TAM)?" ' +
      'Multiple-response questions explicitly say "Select TWO." Distractors are plausible AWS service names. ' +
      'Focus on WHAT services do (not HOW to configure them).',
    studyTips: ['AWS Skill Builder CLF-C02 course', 'AWS free tier account', 'Stephane Maarek Udemy course'],
  },

  {
    code: 'SAA-C03',
    name: 'AWS Certified Solutions Architect – Associate',
    vendor: 'Amazon Web Services',
    category: 'Cloud',
    level: 'Associate',
    questionCount: 65,
    timeMinutes: 130,
    passingScore: '720/1000',
    scoreScale: '100–1000',
    domains: [
      { name: 'Design Secure Architectures',              weight: 30 },
      { name: 'Design Resilient Architectures',           weight: 26 },
      { name: 'Design High-Performing Architectures',     weight: 24 },
      { name: 'Design Cost-Optimised Architectures',      weight: 20 },
    ],
    questionTypes: ['Multiple choice (single answer)', 'Multiple response (select TWO)'],
    examStyle:
      'AWS SAA-C03 style: architecture scenario questions requiring the MOST appropriate solution. ' +
      'Every question is a scenario: "A company runs a web app on EC2 instances behind an ALB. The app experiences unpredictable traffic spikes. ' +
      'The company needs to minimise cost while maintaining availability. Which solution BEST meets these requirements?" ' +
      'All four options are plausible; one is MOST appropriate given the constraints (cost, performance, availability, security). ' +
      'Common patterns: EC2 Auto Scaling, S3 lifecycle, RDS Multi-AZ vs Read Replica, VPC design, IAM least-privilege, ' +
      'SQS/SNS decoupling, CloudFront, Route 53 routing policies.',
    studyTips: ['Stephane Maarek SAA course', 'Practice exams on TutorialsDojo', 'AWS Well-Architected Framework whitepaper'],
  },

  {
    code: 'DVA-C02',
    name: 'AWS Certified Developer – Associate',
    vendor: 'Amazon Web Services',
    category: 'Cloud',
    level: 'Associate',
    questionCount: 65,
    timeMinutes: 130,
    passingScore: '720/1000',
    scoreScale: '100–1000',
    domains: [
      { name: 'Development with AWS Services',    weight: 32 },
      { name: 'Security',                          weight: 26 },
      { name: 'Deployment',                        weight: 24 },
      { name: 'Troubleshooting and Optimisation',  weight: 18 },
    ],
    questionTypes: ['Multiple choice', 'Multiple response'],
    examStyle:
      'AWS DVA-C02 style: developer-centric SDK, API, and deployment questions. ' +
      '"A developer uses the AWS SDK to write to DynamoDB. The operation fails with ProvisionedThroughputExceededException — what should the developer implement?" ' +
      'Questions cover: Lambda (execution role, concurrency, layers), API Gateway, DynamoDB (partition key design, GSI, streams), ' +
      'CodeDeploy deployment strategies (blue/green, canary, linear), CloudFormation drift, X-Ray tracing, Cognito user pools, SQS visibility timeout.',
    studyTips: ['AWS DVA-C02 Skill Builder', 'Stephane Maarek DVA course', 'Hands-on: build a serverless app with Lambda + API Gateway + DynamoDB'],
  },

  // ─── GOOGLE CLOUD ────────────────────────────────────────────────────────────
  {
    code: 'GCP-ACE',
    name: 'Google Cloud Associate Cloud Engineer',
    vendor: 'Google Cloud',
    category: 'Cloud',
    level: 'Associate',
    questionCount: 50,
    timeMinutes: 120,
    passingScore: '70%',
    scoreScale: 'Percentage',
    domains: [
      { name: 'Setting up a cloud solution environment',          weight: 17 },
      { name: 'Planning and configuring a cloud solution',        weight: 17 },
      { name: 'Deploying and implementing a cloud solution',      weight: 25 },
      { name: 'Ensuring successful operation of a cloud solution', weight: 20 },
      { name: 'Configuring access and security',                   weight: 21 },
    ],
    questionTypes: ['Multiple choice (single answer)', 'Multiple response'],
    examStyle:
      'GCP ACE style: practical GKE, Compute Engine, and IAM task questions. ' +
      '"A developer needs to deploy a containerised application that scales to zero when idle — which GCP service and configuration should they use?" ' +
      '"An engineer needs to grant a service account the minimum permissions to read objects from a Cloud Storage bucket — which role should they assign?" ' +
      'Focus on gcloud CLI commands, IAM roles (predefined vs custom), GKE cluster management, and Cloud Load Balancing.',
    studyTips: ['GCP free tier + $300 credit', 'Google Cloud Skills Boost (Qwiklabs)', 'Dan Sullivan ACE book'],
  },

  // ─── COMPTIA ─────────────────────────────────────────────────────────────────
  {
    code: 'CompTIA-Security+',
    name: 'CompTIA Security+',
    vendor: 'CompTIA',
    category: 'Security',
    level: 'Associate',
    questionCount: 90,
    timeMinutes: 90,
    passingScore: '750/900',
    scoreScale: '100–900',
    domains: [
      { name: 'General Security Concepts',                    weight: 12 },
      { name: 'Threats, Vulnerabilities, and Mitigations',    weight: 22 },
      { name: 'Security Architecture',                         weight: 18 },
      { name: 'Security Operations',                           weight: 28 },
      { name: 'Security Program Management and Oversight',     weight: 20 },
    ],
    questionTypes: [
      'Multiple choice (single/multiple answer)',
      'Performance-based questions (PBQ): configure a firewall, read a network diagram, analyse a log file',
      'Drag and drop (match attack type to description)',
      'Exhibit-based (review a screenshot of a config)',
    ],
    examStyle:
      'CompTIA Security+ SY0-701 style: a mix of knowledge recall and performance-based practical questions. ' +
      'MCQs: "Which attack type involves sending unsolicited Bluetooth messages to nearby devices?" (Answer: Bluejacking) ' +
      '"A security analyst receives an alert that an employee\'s workstation is communicating with a known C2 server — which FIRST step should the analyst take?" ' +
      'PBQs appear first; they require configuring ACL rules, reading a Wireshark capture, or ordering incident response steps. ' +
      'Common topics: CIA triad, PKI/certificates, MFA types, zero trust, SIEM/SOAR, vulnerability scanning vs penetration testing, ' +
      'phishing/vishing/smishing, social engineering, ransomware response, cloud security shared responsibility.',
    studyTips: ['Professor Messer Security+ course (free)', 'Jason Dion practice exams', 'CompTIA CertMaster Labs'],
  },

  {
    code: 'CompTIA-Network+',
    name: 'CompTIA Network+',
    vendor: 'CompTIA',
    category: 'Networking',
    level: 'Associate',
    questionCount: 90,
    timeMinutes: 90,
    passingScore: '720/900',
    scoreScale: '100–900',
    domains: [
      { name: 'Networking Concepts',     weight: 23 },
      { name: 'Network Implementation',  weight: 19 },
      { name: 'Network Operations',      weight: 17 },
      { name: 'Network Security',        weight: 20 },
      { name: 'Network Troubleshooting', weight: 21 },
    ],
    questionTypes: ['Multiple choice', 'Performance-based (read packet captures, configure subnets, trace a route)'],
    examStyle:
      'CompTIA Network+ N10-009 style: networking fundamentals and troubleshooting. ' +
      '"A network technician needs to subnet 192.168.10.0 into 8 equal subnets — what is the correct subnet mask?" ' +
      '"A user can ping their default gateway but cannot reach external websites — which OSI layer should the technician investigate first?" ' +
      'PBQs include subnetting tasks and reading a topology diagram to identify a misconfigured VLAN. ' +
      'Topics: OSI/TCP-IP model, IPv4/IPv6 subnetting, VLANs, routing protocols (OSPF, BGP), NAT, VPN, DNS, DHCP, wireless standards, STP, port security.',
    studyTips: ['Professor Messer Network+ course', 'Subnetting practice (subnettingpractice.com)', 'GNS3 or Packet Tracer labs'],
  },

  {
    code: 'CompTIA-A+',
    name: 'CompTIA A+',
    vendor: 'CompTIA',
    category: 'IT Support',
    level: 'Foundational',
    questionCount: 90,
    timeMinutes: 90,
    passingScore: '675/900 (Core 1), 700/900 (Core 2)',
    scoreScale: '100–900',
    domains: [
      { name: 'Mobile Devices (Core 1)',        weight: 15 },
      { name: 'Networking (Core 1)',             weight: 20 },
      { name: 'Hardware (Core 1)',               weight: 25 },
      { name: 'Virtualization & Cloud (Core 1)', weight: 11 },
      { name: 'Operating Systems (Core 2)',      weight: 27 },
      { name: 'Security (Core 2)',               weight: 24 },
      { name: 'Software Troubleshooting (Core 2)', weight: 26 },
      { name: 'Operational Procedures (Core 2)',  weight: 23 },
    ],
    questionTypes: ['Multiple choice', 'Performance-based (install RAM, troubleshoot a boot issue)'],
    examStyle:
      'CompTIA A+ style: hardware and operating system troubleshooting scenarios. ' +
      '"A technician is installing a second DIMM in a laptop — which type of RAM slot is used in most laptops?" ' +
      '"A Windows 10 PC displays a BSOD with MEMORY_MANAGEMENT error after adding new RAM — what is the MOST likely cause?" ' +
      'Cover: laptop hardware components, TCP/IP basics, Windows OS tools (msconfig, Event Viewer, Device Manager), ' +
      'malware removal steps, printer troubleshooting, mobile OS features, and safety procedures (ESD, cable management).',
    studyTips: ['Professor Messer A+ course', 'Mike Meyers A+ book', 'Jason Dion A+ practice tests'],
  },

  // ─── KUBERNETES / CNCF ───────────────────────────────────────────────────────
  {
    code: 'CKA',
    name: 'Certified Kubernetes Administrator',
    vendor: 'CNCF / Linux Foundation',
    category: 'DevOps',
    level: 'Professional',
    questionCount: 15,
    timeMinutes: 120,
    passingScore: '66%',
    scoreScale: 'Percentage',
    domains: [
      { name: 'Cluster Architecture, Installation & Configuration', weight: 25 },
      { name: 'Workloads & Scheduling',                             weight: 15 },
      { name: 'Services & Networking',                              weight: 20 },
      { name: 'Storage',                                            weight: 10 },
      { name: 'Troubleshooting',                                    weight: 30 },
    ],
    questionTypes: [
      'Performance-based ONLY — all questions require running kubectl commands in a live cluster',
      'No multiple choice — candidates SSH into a pre-configured cluster and complete tasks',
    ],
    examStyle:
      'CKA style: 100% hands-on kubectl tasks in a live Kubernetes cluster. ' +
      'Simulate this as written tasks: "Task: Create a Pod named nginx-pod in the kube-system namespace using the nginx:1.25 image. ' +
      'The pod must have a CPU request of 100m and limit of 200m." ' +
      '"Task: A node called node03 is NotReady — investigate and fix the issue." ' +
      '"Task: Expose deployment webapp on port 80 using a NodePort service." ' +
      '"Task: Create a NetworkPolicy that allows only pods with label app=frontend to communicate with pods labelled app=backend on port 5432." ' +
      'Questions are practical command-line tasks. Ask the candidate to write the kubectl command or YAML manifest that solves the task.',
    studyTips: ['killer.sh CKA simulator', 'Mumshad Mannambeth CKA course (KodeKloud)', 'kubernetes.io docs (allowed during exam)'],
  },

  {
    code: 'CKAD',
    name: 'Certified Kubernetes Application Developer',
    vendor: 'CNCF / Linux Foundation',
    category: 'DevOps',
    level: 'Associate',
    questionCount: 15,
    timeMinutes: 120,
    passingScore: '66%',
    scoreScale: 'Percentage',
    domains: [
      { name: 'Application Design and Build',              weight: 20 },
      { name: 'Application Deployment',                    weight: 20 },
      { name: 'Application Observability and Maintenance', weight: 15 },
      { name: 'Application Environment, Configuration, and Security', weight: 25 },
      { name: 'Services and Networking',                   weight: 20 },
    ],
    questionTypes: ['Performance-based ONLY — live kubectl tasks (same format as CKA)'],
    examStyle:
      'CKAD style: developer-focused Kubernetes tasks. ' +
      '"Task: Update the deployment my-app to use image nginx:1.26 with zero downtime using RollingUpdate strategy. ' +
      'Set maxUnavailable=1 and maxSurge=1." ' +
      '"Task: Create a ConfigMap named app-config with key DB_HOST=postgres-svc, then mount it as an environment variable in the existing pod app-pod." ' +
      '"Task: Create a CronJob that runs every 5 minutes and executes: echo Hello from Kubernetes." ' +
      '"Task: A pod is in CrashLoopBackOff — investigate the logs and fix the liveness probe configuration." ' +
      'Ask the candidate to write the kubectl command or the corrected YAML snippet.',
    studyTips: ['KodeKloud CKAD course', 'killer.sh CKAD simulator', 'kubernetes.io/docs (open during exam)'],
  },

  // ─── HASHICORP ────────────────────────────────────────────────────────────────
  {
    code: 'HashiCorp-Terraform',
    name: 'HashiCorp Certified: Terraform Associate',
    vendor: 'HashiCorp',
    category: 'DevOps',
    level: 'Associate',
    questionCount: 57,
    timeMinutes: 60,
    passingScore: '70%',
    scoreScale: 'Percentage',
    domains: [
      { name: 'Understand IaC concepts',                       weight: 14 },
      { name: 'Understand Terraform purpose',                  weight: 8 },
      { name: 'Understand Terraform basics',                   weight: 12 },
      { name: 'Use Terraform outside core workflow',           weight: 8 },
      { name: 'Interact with Terraform modules',               weight: 10 },
      { name: 'Use the core Terraform workflow',               weight: 11 },
      { name: 'Implement and maintain state',                  weight: 16 },
      { name: 'Read, generate, and modify configuration',      weight: 11 },
      { name: 'Understand Terraform Cloud capabilities',        weight: 10 },
    ],
    questionTypes: ['Multiple choice', 'Multiple response', 'True/False'],
    examStyle:
      'HashiCorp Terraform Associate style: concept + HCL syntax questions. ' +
      '"What command is used to preview infrastructure changes before applying them?" (terraform plan) ' +
      '"Which backend type stores state locally?" (local) ' +
      '"A Terraform module in a Git repo needs to be called at version v1.2.0 — write the source argument." ' +
      '"True or False: terraform destroy removes all resources managed by the current configuration." ' +
      'Show HCL snippets with blanks: "Complete the resource block to create an AWS S3 bucket with versioning enabled." ' +
      'Topics: init/plan/apply/destroy lifecycle, workspace, remote state (S3+DynamoDB locking), data sources, locals, for_each, count, depends_on, providers.',
    studyTips: ['HashiCorp Learn Terraform tutorials', 'Zeal Vora Terraform course', 'Practice writing HCL from scratch'],
  },

  // ─── CISCO ───────────────────────────────────────────────────────────────────
  {
    code: 'CCNA',
    name: 'Cisco Certified Network Associate',
    vendor: 'Cisco',
    category: 'Networking',
    level: 'Associate',
    questionCount: 102,
    timeMinutes: 120,
    passingScore: '~825/1000',
    scoreScale: '300–1000',
    domains: [
      { name: 'Network Fundamentals',                     weight: 20 },
      { name: 'Network Access',                            weight: 20 },
      { name: 'IP Connectivity',                           weight: 25 },
      { name: 'IP Services',                               weight: 10 },
      { name: 'Security Fundamentals',                     weight: 15 },
      { name: 'Automation and Programmability',            weight: 10 },
    ],
    questionTypes: [
      'Multiple choice (single/multiple)',
      'Drag and drop (match routing protocol to characteristic)',
      'Simulation (use IOS CLI in a simulated router/switch)',
      'Testlet (exhibit with router config + multiple questions)',
    ],
    examStyle:
      'CCNA 200-301 style: Cisco IOS CLI and networking concepts. ' +
      '"A network administrator types show ip route on R1 and sees a route marked with O — what routing protocol is this?" ' +
      '"An access port in VLAN 10 is not passing traffic — which show command would FIRST help diagnose this?" ' +
      'Simulation questions ask candidates to type Cisco IOS commands: ' +
      '"Configure interface GigabitEthernet0/0 with IP 192.168.1.1/24 and enable it." ' +
      'Testlets show a running-config and ask multiple questions about the current configuration\'s behaviour. ' +
      'Topics: OSI model, Ethernet, VLANs, STP, EtherChannel, OSPF, EIGRP, BGP basics, ACLs, NAT, DHCP, SSH hardening, REST API, Ansible/Python basics.',
    studyTips: ['Jeremy\'s IT Lab free CCNA course (YouTube)', 'Cisco Packet Tracer (free)', 'CCNA 200-301 Official Cert Guide by Wendell Odom'],
  },

  // ─── SCRUM / AGILE ───────────────────────────────────────────────────────────
  {
    code: 'PSM-I',
    name: 'Professional Scrum Master™ I',
    vendor: 'Scrum.org',
    category: 'Agile',
    level: 'Associate',
    questionCount: 80,
    timeMinutes: 60,
    passingScore: '85%',
    scoreScale: 'Percentage',
    domains: [
      { name: 'Scrum Theory and Principles',        weight: 20 },
      { name: 'Scrum Team',                         weight: 20 },
      { name: 'Scrum Events',                       weight: 25 },
      { name: 'Scrum Artifacts',                    weight: 20 },
      { name: 'Done and Definition of Done',        weight: 15 },
    ],
    questionTypes: ['Multiple choice (single)', 'Multiple response', 'True/False'],
    examStyle:
      'PSM I style: Scrum Guide knowledge application. Questions test the 2020 Scrum Guide accurately. ' +
      '"Who is responsible for ordering the Product Backlog?" (Product Owner) ' +
      '"The Daily Scrum must be 15 minutes — True or False?" (True) ' +
      '"A stakeholder asks the Development Team to add an urgent bug fix mid-Sprint — what should happen?" ' +
      '(The Scrum Master can help the Product Owner negotiate with stakeholders; work can only be added if the Sprint Goal is not endangered) ' +
      'Questions are scenario-based: test whether the candidate understands empiricism, self-management, and the Scrum values.',
    studyTips: ['Read the 2020 Scrum Guide (scrum.org — free)', 'Mikhail Lapshin PSM practice questions', 'Open Assessments on Scrum.org'],
  },

  // ─── DATA / AI ───────────────────────────────────────────────────────────────
  {
    code: 'DP-900',
    name: 'Microsoft Azure Data Fundamentals',
    vendor: 'Microsoft',
    category: 'Data',
    level: 'Foundational',
    questionCount: 40,
    timeMinutes: 45,
    passingScore: '700/1000',
    scoreScale: '100–1000',
    domains: [
      { name: 'Core data concepts',                       weight: 25 },
      { name: 'Relational data in Azure',                 weight: 25 },
      { name: 'Non-relational data in Azure',             weight: 25 },
      { name: 'Analytics workloads in Azure',             weight: 25 },
    ],
    questionTypes: ['Multiple choice', 'Match the service to the scenario'],
    examStyle:
      'Microsoft DP-900 style: data concepts and Azure data service identification. ' +
      '"A company needs a fully managed relational database with automatic backups and high availability — which Azure service should they use?" ' +
      '"Which type of data processing handles data as it arrives, with sub-second latency?" (Stream processing) ' +
      'Match exercises: match Azure Synapse Analytics, Azure Cosmos DB, Azure Data Factory, and Azure Databricks to their primary use case.',
    studyTips: ['DP-900 Microsoft Learn path', 'Azure Data Fundamentals free sandbox'],
  },

  {
    code: 'AI-900',
    name: 'Microsoft Azure AI Fundamentals',
    vendor: 'Microsoft',
    category: 'AI',
    level: 'Foundational',
    questionCount: 40,
    timeMinutes: 45,
    passingScore: '700/1000',
    scoreScale: '100–1000',
    domains: [
      { name: 'AI workloads and considerations',          weight: 20 },
      { name: 'Machine learning concepts on Azure',       weight: 25 },
      { name: 'Computer Vision in Azure',                 weight: 15 },
      { name: 'NLP in Azure',                             weight: 15 },
      { name: 'Document intelligence and knowledge mining', weight: 15 },
      { name: 'Generative AI in Azure',                   weight: 10 },
    ],
    questionTypes: ['Multiple choice', 'Match AI service to scenario'],
    examStyle:
      'Microsoft AI-900 style: conceptual AI and Azure AI service identification. ' +
      '"A company wants to extract key phrases and sentiment from customer reviews — which Azure AI service should they use?" ' +
      '"Which machine learning technique is used when training labels are not available?" (Unsupervised learning) ' +
      '"What is the primary risk of training a model on biased historical data?" (The model perpetuates existing biases) ' +
      'Focus on responsible AI, Azure AI Services (Vision, Language, Document Intelligence), and Azure Machine Learning studio.',
    studyTips: ['AI-900 Microsoft Learn path', 'Azure AI Services free tier'],
  },

  // ─── ITIL ────────────────────────────────────────────────────────────────────
  {
    code: 'ITIL-4-Foundation',
    name: 'ITIL 4 Foundation',
    vendor: 'Axelos / PeopleCert',
    category: 'IT Service Management',
    level: 'Foundational',
    questionCount: 40,
    timeMinutes: 60,
    passingScore: '65% (26/40)',
    scoreScale: 'Percentage',
    domains: [
      { name: 'Key concepts of IT service management', weight: 20 },
      { name: 'Four dimensions of service management', weight: 15 },
      { name: 'Service value system',                  weight: 20 },
      { name: 'Service value chain activities',        weight: 15 },
      { name: 'ITIL management practices',             weight: 30 },
    ],
    questionTypes: ['Multiple choice (single answer only, 4 options)'],
    examStyle:
      'ITIL 4 Foundation style: closed-book, scenario-MCQ. ' +
      '"A service desk receives an unplanned interruption to the email service — how should this be classified?" (Incident) ' +
      '"Which ITIL practice is responsible for moving new or changed service components into live environments?" (Deployment Management) ' +
      '"A change that is pre-authorised, low risk, and follows a documented process is called a ___ change." (Standard) ' +
      'Every question has exactly 4 options labelled A–D. One is clearly correct per the ITIL 4 syllabus. ' +
      'No negative marking. Key concepts: service, value, outcome, cost, risk, utility, warranty, SVS, four dimensions, 34 practices.',
    studyTips: ['ITIL 4 Foundation official publication', 'Udemy ITIL 4 practice exams', 'TSO ITIL 4 exam prep book'],
  },

  // ─── LINUX ───────────────────────────────────────────────────────────────────
  {
    code: 'LFCS',
    name: 'Linux Foundation Certified System Administrator',
    vendor: 'Linux Foundation',
    category: 'Linux',
    level: 'Associate',
    questionCount: 25,
    timeMinutes: 120,
    passingScore: '66%',
    scoreScale: 'Percentage',
    domains: [
      { name: 'Essential commands',                           weight: 25 },
      { name: 'Operation of running systems',                 weight: 20 },
      { name: 'User and group management',                    weight: 10 },
      { name: 'Networking',                                   weight: 12 },
      { name: 'Service configuration',                        weight: 20 },
      { name: 'Storage management',                           weight: 13 },
    ],
    questionTypes: ['Performance-based ONLY — live Linux terminal tasks'],
    examStyle:
      'LFCS style: practical Linux command-line tasks in a live terminal. ' +
      'Simulate as written tasks: "Task: Create a user named devuser with UID 1050, primary group developers, and home directory /home/devuser." ' +
      '"Task: Schedule a cron job that runs /usr/local/bin/backup.sh every day at 2:30 AM for the root user." ' +
      '"Task: Configure a static IP address 192.168.1.100/24 with gateway 192.168.1.1 on interface eth0 using NetworkManager." ' +
      '"Task: Create a 2 GiB LVM logical volume named data-lv in volume group vg01 and format it with ext4." ' +
      'Ask the candidate to write the exact commands or configuration file content.',
    studyTips: ['KodeKloud Linux labs', 'Sander van Vugt LFCS course', 'man pages practice'],
  },
];

export function findCertification(input: string): Certification | null {
  const q = input.toLowerCase().replace(/[-\s]/g, '');
  return CERTIFICATIONS.find(c =>
    c.code.toLowerCase().replace(/[-\s]/g, '') === q ||
    c.name.toLowerCase().includes(input.toLowerCase()) ||
    c.code.toLowerCase().includes(q),
  ) ?? null;
}

export function detectCertInText(text: string): Certification | null {
  for (const cert of CERTIFICATIONS) {
    const code = cert.code.toLowerCase();
    const t    = text.toLowerCase();
    if (t.includes(code) || t.includes(code.replace(/-/g, ' '))) return cert;
  }
  // Also try name keywords
  for (const cert of CERTIFICATIONS) {
    if (text.toLowerCase().includes(cert.name.toLowerCase().split(' ').slice(0, 3).join(' ').toLowerCase())) return cert;
  }
  return null;
}
