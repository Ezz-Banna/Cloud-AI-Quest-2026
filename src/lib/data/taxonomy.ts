// Skill and field taxonomies. These are Bridgecom's own definitions (not external facts).

export interface SkillDef {
  id: string;
  name_en: string;
  name_ar: string;
  category: "technical" | "data" | "design" | "professional";
  prerequisites: string[];
  /** A practical task that demonstrates the skill; completing a course alone never proves competency. */
  practical_task_en: string;
  practical_task_ar: string;
  keywords: string[];
  objective_en?: string;
  objective_ar?: string;
  /** Arabic names and spellings used in postings and descriptions. */
  keywords_ar?: string[];
  /** Stricter keyword list for job postings (generic words like "team" or "design" are not requirements). Defaults to keywords. */
  job_keywords?: string[];
  /** Bridgecom's own rough estimate of the practical task's effort in hours (not a course duration). */
  task_hours?: number;
  /** Skills whose practical task output this task reuses, so those tasks must come first. */
  task_builds_on?: string[];
}

export const SKILLS: SkillDef[] = [
  { id: "html", objective_en: "Structure web content with semantic, accessible HTML.", objective_ar: "هيكلة محتوى الويب بلغة HTML دلالية وسهلة الوصول.", name_en: "HTML", name_ar: "HTML", category: "technical", prerequisites: [], keywords: ["html", "html5", "markup"], keywords_ar: ["إتش تي إم إل"], task_hours: 6,
    practical_task_en: "Build an accessible multi-section page that passes an automated accessibility check.",
    practical_task_ar: "ابنِ صفحة متعددة الأقسام سهلة الوصول تجتاز فحص الوصولية الآلي." },
  { id: "css", objective_en: "Lay out and style responsive pages with modern CSS.", objective_ar: "تنسيق صفحات متجاوبة وتخطيطها باستخدام CSS الحديثة.", name_en: "CSS", name_ar: "CSS", category: "technical", prerequisites: ["html"], keywords: ["css", "css3", "tailwind", "bootstrap", "flexbox", "sass", "responsive"], job_keywords: ["css", "css3", "tailwind", "bootstrap", "flexbox", "sass"], task_hours: 6, task_builds_on: ["html"],
    practical_task_en: "Make your HTML task page fully responsive from 320px to desktop using Flexbox and Grid.",
    practical_task_ar: "اجعل صفحة مهمة HTML متجاوبة بالكامل من 320 بكسل حتى شاشة الحاسوب باستخدام Flexbox وGrid." },
  { id: "javascript", objective_en: "Write JavaScript that manipulates data and the page (DOM, events, functions).", objective_ar: "كتابة جافاسكربت تتعامل مع البيانات والصفحة (DOM، الأحداث، الدوال).", name_en: "JavaScript", name_ar: "جافاسكربت", category: "technical", prerequisites: ["html"], keywords: ["javascript", "js", "es6", "dom"], keywords_ar: ["جافاسكربت", "جافا سكربت", "جافاسكريبت", "جافا سكريبت"], task_hours: 10,
    practical_task_en: "Build an interactive to-do app with filtering and local storage, without frameworks.",
    practical_task_ar: "ابنِ تطبيق مهام تفاعلي مع تصفية وتخزين محلي دون أطر عمل." },
  { id: "git", objective_en: "Track, branch and share code with Git and GitHub.", objective_ar: "تتبّع الشيفرة وتفريعها ومشاركتها باستخدام Git وGitHub.", name_en: "Git & GitHub", name_ar: "Git وGitHub", category: "technical", prerequisites: [], keywords: ["git", "github", "gitlab", "version control"], keywords_ar: ["جيت", "جت هب", "التحكم بالإصدارات"], task_hours: 4,
    practical_task_en: "Publish a project on GitHub with a clear README, branches and at least one merged pull request.",
    practical_task_ar: "انشر مشروعاً على GitHub مع ملف README واضح وفروع وطلب دمج واحد على الأقل." },
  { id: "rest-api", objective_en: "Fetch and send JSON data from web APIs and handle errors.", objective_ar: "جلب بيانات JSON وإرسالها عبر واجهات الويب ومعالجة الأخطاء.", name_en: "REST API integration", name_ar: "التكامل مع واجهات REST", category: "technical", prerequisites: ["javascript"], keywords: ["rest", "api", "fetch", "axios", "http", "json"], job_keywords: ["rest", "api", "apis", "restful", "axios"], keywords_ar: ["واجهات برمجية", "واجهة برمجية", "واجهات برمجة التطبيقات"], task_hours: 8,
    practical_task_en: "Build a page that fetches data from a public API with loading, empty and error states.",
    practical_task_ar: "ابنِ صفحة تجلب بيانات من واجهة برمجية عامة مع حالات التحميل والفراغ والخطأ." },
  { id: "react", objective_en: "Build interactive interfaces from React components with state.", objective_ar: "بناء واجهات تفاعلية من مكونات React مع إدارة الحالة.", name_en: "React", name_ar: "React", category: "technical", prerequisites: ["javascript", "html", "css"], keywords: ["react", "reactjs", "jsx", "next.js", "nextjs", "hooks"], job_keywords: ["react", "reactjs", "react.js", "jsx", "next.js", "nextjs"], keywords_ar: ["رياكت", "ريأكت"], task_hours: 12,
    practical_task_en: "Build a small React app (for example a reading list) with at least three components, shared state and a form with validation.",
    practical_task_ar: "ابنِ تطبيق React صغيراً (مثل قائمة قراءة) يضم ثلاثة مكونات على الأقل وحالة مشتركة ونموذجاً مع تحقق من المدخلات." },
  { id: "typescript", objective_en: "Add static types to JavaScript projects to prevent bugs.", objective_ar: "إضافة أنواع ثابتة لمشاريع جافاسكربت لمنع الأخطاء.", name_en: "TypeScript", name_ar: "TypeScript", category: "technical", prerequisites: ["javascript"], keywords: ["typescript", "ts"], job_keywords: ["typescript"], keywords_ar: ["تايب سكريبت", "تايبسكربت"], task_hours: 6,
    practical_task_en: "Convert a JavaScript project to TypeScript with strict mode and no `any`.",
    practical_task_ar: "حوّل مشروع جافاسكربت إلى TypeScript بالوضع الصارم ودون استخدام any." },
  { id: "nodejs", objective_en: "Build server-side JavaScript services and APIs.", objective_ar: "بناء خدمات وواجهات برمجية بجافاسكربت على الخادم.", name_en: "Node.js", name_ar: "Node.js", category: "technical", prerequisites: ["javascript"], keywords: ["node", "nodejs", "express"], job_keywords: ["node.js", "nodejs", "node", "express.js", "expressjs"], keywords_ar: ["نود جي اس"], task_hours: 10,
    practical_task_en: "Build a small REST API with validation and tests.",
    practical_task_ar: "ابنِ واجهة REST صغيرة مع تحقق واختبارات." },
  { id: "python", objective_en: "Write Python programs to automate tasks and process data.", objective_ar: "كتابة برامج بايثون لأتمتة المهام ومعالجة البيانات.", name_en: "Python", name_ar: "بايثون", category: "technical", prerequisites: [], keywords: ["python", "pandas", "django", "flask"], keywords_ar: ["بايثون", "بايثن", "بايثون"], task_hours: 6,
    practical_task_en: "Write a script that cleans a public CSV dataset and reports summary statistics.",
    practical_task_ar: "اكتب برنامجاً ينظف ملف بيانات CSV عاماً ويعرض إحصاءات ملخصة." },
  { id: "sql", objective_en: "Query and combine data in relational databases with SQL.", objective_ar: "الاستعلام عن البيانات ودمجها في قواعد البيانات العلائقية باستخدام SQL.", name_en: "SQL", name_ar: "SQL", category: "data", prerequisites: [], keywords: ["sql", "mysql", "postgres", "postgresql", "database", "sqlite"], job_keywords: ["sql", "mysql", "postgres", "postgresql", "sqlite", "sql server"], keywords_ar: ["إس كيو إل", "قواعد البيانات", "قاعدة بيانات"], task_hours: 6,
    practical_task_en: "Answer ten business questions on a sample database with joins and aggregates.",
    practical_task_ar: "أجب عن عشرة أسئلة عمل على قاعدة بيانات نموذجية باستخدام الربط والتجميع." },
  { id: "data-analysis", objective_en: "Clean, summarise and visualise data to answer questions.", objective_ar: "تنظيف البيانات وتلخيصها وتمثيلها بصرياً للإجابة عن الأسئلة.", name_en: "Data analysis", name_ar: "تحليل البيانات", category: "data", prerequisites: ["sql"], keywords: ["data analysis", "power bi", "tableau", "statistics", "dashboard"], job_keywords: ["data analysis", "analysing data", "analyzing data", "power bi", "tableau"], keywords_ar: ["تحليل البيانات", "باور بي آي"], task_hours: 10,
    practical_task_en: "Publish a short analysis of a Jordanian open dataset with three charts and conclusions.",
    practical_task_ar: "انشر تحليلاً قصيراً لمجموعة بيانات أردنية مفتوحة مع ثلاثة رسوم بيانية واستنتاجات." },
  { id: "machine-learning", objective_en: "Train, evaluate and explain basic machine learning models.", objective_ar: "تدريب نماذج تعلم الآلة الأساسية وتقييمها وشرحها.", name_en: "Machine learning", name_ar: "تعلم الآلة", category: "data", prerequisites: ["python", "data-analysis"], keywords: ["machine learning", "ml", "scikit", "tensorflow", "pytorch", "ai model"], keywords_ar: ["تعلم الآلة", "التعلم الآلي"], task_hours: 15,
    practical_task_en: "Train and evaluate a model on a public dataset and explain its errors.",
    practical_task_ar: "درّب نموذجاً وقيّمه على بيانات عامة واشرح أخطاءه." },
  { id: "ui-design", objective_en: "Design and test usable interfaces with real users.", objective_ar: "تصميم واجهات قابلة للاستخدام واختبارها مع مستخدمين حقيقيين.", name_en: "UI/UX design", name_ar: "تصميم واجهات وتجربة المستخدم", category: "design", prerequisites: [], keywords: ["figma", "ui", "ux", "design", "prototype", "wireframe"], job_keywords: ["figma", "ui/ux", "ux", "ui design", "user experience", "wireframing", "prototyping"], keywords_ar: ["تجربة المستخدم", "تصميم واجهات", "فيغما"], task_hours: 10,
    practical_task_en: "Design and usability-test a three-screen prototype with five people.",
    practical_task_ar: "صمّم نموذجاً أولياً من ثلاث شاشات واختبره مع خمسة أشخاص." },
  { id: "communication", objective_en: "Explain your work clearly and collaborate in a team.", objective_ar: "شرح عملك بوضوح والتعاون ضمن فريق.", name_en: "Communication & teamwork", name_ar: "التواصل والعمل الجماعي", category: "professional", prerequisites: [], keywords: ["team", "presentation", "volunteer", "lead", "club", "communication", "debate"], job_keywords: ["communication skills", "communication", "teamwork", "team player", "presentation skills"], keywords_ar: ["مهارات التواصل", "التواصل", "العمل الجماعي", "العمل ضمن فريق"], task_hours: 3,
    practical_task_en: "Present a project to an audience and collect written feedback.",
    practical_task_ar: "اعرض مشروعاً أمام جمهور واجمع ملاحظات مكتوبة." },
  { id: "excel", objective_en: "Organise, calculate and summarise data in spreadsheets.", objective_ar: "تنظيم البيانات وحسابها وتلخيصها في جداول البيانات.", name_en: "Excel / spreadsheets", name_ar: "إكسل / جداول البيانات", category: "data", prerequisites: [], keywords: ["excel", "spreadsheet", "spreadsheets", "google sheets"], keywords_ar: ["إكسل", "اكسل", "اكسيل", "جداول البيانات"], task_hours: 4,
    practical_task_en: "Turn a public dataset into a spreadsheet with formulas, a pivot table and one chart.",
    practical_task_ar: "حوّل مجموعة بيانات عامة إلى جدول بيانات فيه معادلات وجدول محوري ورسم بياني واحد." },
  { id: "r-lang", objective_en: "Analyse data and produce statistics with R.", objective_ar: "تحليل البيانات وإنتاج الإحصاءات باستخدام لغة R.", name_en: "R", name_ar: "لغة R", category: "data", prerequisites: [], keywords: ["r programming", "rstudio", "tidyverse"], job_keywords: ["R", "rstudio", "tidyverse"], keywords_ar: ["لغة آر"], task_hours: 6,
    practical_task_en: "Write an R script that summarises a public dataset and saves two charts.",
    practical_task_ar: "اكتب برنامجاً بلغة R يلخّص مجموعة بيانات عامة ويحفظ رسمين بيانيين." },
  { id: "english", objective_en: "Read and write professional English in your field.", objective_ar: "قراءة الإنجليزية المهنية وكتابتها في مجالك.", name_en: "Professional English", name_ar: "الإنجليزية المهنية", category: "professional", prerequisites: [], keywords: ["english", "ielts", "toefl"], keywords_ar: ["الإنجليزية", "الانجليزية", "اللغة الإنجليزية"], task_hours: 3,
    practical_task_en: "Write technical documentation for one of your projects in English.",
    practical_task_ar: "اكتب توثيقاً تقنياً لأحد مشاريعك باللغة الإنجليزية." },
];

export const SKILL_BY_ID = Object.fromEntries(SKILLS.map((s) => [s.id, s]));

export interface FieldDef {
  id: string;
  name_en: string;
  name_ar: string;
  careers: string[];
  /** Tawjihi streams that typically qualify. Shown as guidance only; the program record decides. */
  typical_streams: string[];
  nominal_years: number;
  /** Fields a student could consider as an alternative path (similar subjects or careers). Guidance only. */
  related: string[];
}

export const FIELDS: FieldDef[] = [
  { id: "computer-science", name_en: "Computer Science", name_ar: "علم الحاسوب", careers: ["software", "developer", "programmer", "ai", "data", "cybersecurity", "web"], typical_streams: ["scientific", "it"], nominal_years: 4, related: ["software-engineering", "ai-data-science"] },
  { id: "software-engineering", name_en: "Software Engineering", name_ar: "هندسة البرمجيات", careers: ["software", "developer", "web", "mobile", "programmer"], typical_streams: ["scientific", "it"], nominal_years: 4, related: ["computer-science", "ai-data-science"] },
  { id: "ai-data-science", name_en: "Artificial Intelligence / Data Science", name_ar: "الذكاء الاصطناعي / علم البيانات", careers: ["ai", "data", "machine learning", "research", "analyst"], typical_streams: ["scientific", "it"], nominal_years: 4, related: ["computer-science", "software-engineering"] },
  { id: "medicine", name_en: "Medicine", name_ar: "الطب", careers: ["doctor", "physician", "surgeon", "health", "medical"], typical_streams: ["scientific"], nominal_years: 6, related: ["pharmacy", "nursing"] },
  { id: "nursing", name_en: "Nursing", name_ar: "التمريض", careers: ["nurse", "health", "care", "hospital"], typical_streams: ["scientific", "health"], nominal_years: 4, related: ["pharmacy", "medicine"] },
  { id: "pharmacy", name_en: "Pharmacy", name_ar: "الصيدلة", careers: ["pharmacist", "health", "pharma", "medical"], typical_streams: ["scientific"], nominal_years: 5, related: ["nursing", "medicine"] },
  { id: "civil-engineering", name_en: "Civil Engineering", name_ar: "الهندسة المدنية", careers: ["engineer", "construction", "infrastructure", "architect"], typical_streams: ["scientific"], nominal_years: 5, related: [] },
  { id: "business-administration", name_en: "Business Administration", name_ar: "إدارة الأعمال", careers: ["business", "manager", "entrepreneur", "marketing", "finance", "startup"], typical_streams: ["scientific", "literary", "it", "other"], nominal_years: 4, related: [] },
];

export const FIELD_BY_ID = Object.fromEntries(FIELDS.map((f) => [f.id, f]));

export const CITIES = ["Amman", "Irbid", "Zarqa", "Salt", "Madaba", "Karak", "Mafraq", "Aqaba", "Tafilah", "Ma'an", "Jerash", "Ajloun"];

/** Curriculum topics used to compare a program's published study plan with what a student enjoys. */
export interface TopicDef { id: string; name_en: string; name_ar: string; keywords: string[] }
export const CURRICULUM_TOPICS: TopicDef[] = [
  { id: "programming", name_en: "Programming", name_ar: "البرمجة", keywords: ["programming", "coding", "code", "software", "app", "website", "برمجة", "تطبيق", "موقع"] },
  { id: "web-mobile", name_en: "Web and mobile development", name_ar: "تطوير الويب والتطبيقات", keywords: ["web", "website", "mobile", "app", "مواقع", "تطبيقات"] },
  { id: "mathematics", name_en: "Mathematics", name_ar: "الرياضيات", keywords: ["math", "mathematics", "calculus", "algebra", "رياضيات"] },
  { id: "statistics", name_en: "Statistics", name_ar: "الإحصاء", keywords: ["statistics", "probability", "إحصاء"] },
  { id: "data", name_en: "Data and databases", name_ar: "البيانات وقواعدها", keywords: ["data", "database", "analytics", "بيانات"] },
  { id: "ai", name_en: "Artificial intelligence", name_ar: "الذكاء الاصطناعي", keywords: ["ai", "artificial intelligence", "machine learning", "robot", "ذكاء اصطناعي", "روبوت"] },
  { id: "networks-security", name_en: "Networks and security", name_ar: "الشبكات والأمن", keywords: ["network", "security", "cyber", "hacking", "شبكات", "أمن"] },
  { id: "physics", name_en: "Physics", name_ar: "الفيزياء", keywords: ["physics", "فيزياء"] },
  { id: "chemistry", name_en: "Chemistry", name_ar: "الكيمياء", keywords: ["chemistry", "كيمياء"] },
  { id: "biology", name_en: "Biology", name_ar: "الأحياء", keywords: ["biology", "أحياء"] },
  { id: "human-body", name_en: "Anatomy and physiology", name_ar: "التشريح ووظائف الأعضاء", keywords: ["anatomy", "physiology", "human body", "تشريح"] },
  { id: "patient-care", name_en: "Patient care", name_ar: "رعاية المرضى", keywords: ["patient", "caring", "care", "hospital", "volunteer", "رعاية", "مستشفى", "تطوع"] },
  { id: "pharmacology", name_en: "Medicines and pharmacology", name_ar: "الأدوية وعلم الأدوية", keywords: ["medicine", "drugs", "pharma", "أدوية"] },
  { id: "design", name_en: "Design", name_ar: "التصميم", keywords: ["design", "drawing", "art", "ui", "تصميم", "رسم", "فن"] },
  { id: "structures", name_en: "Structures and construction", name_ar: "الإنشاءات", keywords: ["building", "construction", "bridge", "structure", "بناء", "إنشاء"] },
  { id: "management", name_en: "Management", name_ar: "الإدارة", keywords: ["management", "leadership", "organising", "إدارة", "قيادة"] },
  { id: "finance-accounting", name_en: "Finance and accounting", name_ar: "المالية والمحاسبة", keywords: ["finance", "accounting", "economics", "money", "مالية", "محاسبة", "اقتصاد"] },
  { id: "marketing", name_en: "Marketing", name_ar: "التسويق", keywords: ["marketing", "social media", "sales", "تسويق"] },
  { id: "entrepreneurship", name_en: "Entrepreneurship", name_ar: "ريادة الأعمال", keywords: ["startup", "entrepreneur", "business idea", "ريادة"] },
  { id: "communication", name_en: "Communication and languages", name_ar: "التواصل واللغات", keywords: ["communication", "english", "writing", "presenting", "تواصل", "كتابة"] },
  { id: "research", name_en: "Research methods", name_ar: "مناهج البحث", keywords: ["research", "experiment", "science fair", "بحث", "تجربة"] },
];
export const TOPIC_BY_ID = Object.fromEntries(CURRICULUM_TOPICS.map((t) => [t.id, t]));

/** Onboarding subject chips → curriculum topics they relate to. */
export const SUBJECT_TOPICS: Record<string, string[]> = {
  math: ["mathematics", "statistics"], physics: ["physics", "structures"], chemistry: ["chemistry", "pharmacology"],
  biology: ["biology", "human-body"], computing: ["programming", "web-mobile", "data"], english: ["communication"],
  arabic: ["communication"], business: ["management", "finance-accounting", "marketing", "entrepreneurship"], arts: ["design"],
};
/** Strength chips → topics. */
export const STRENGTH_TOPICS: Record<string, string[]> = {
  "problem solving": ["programming", "mathematics"], creativity: ["design"], "caring for others": ["patient-care"],
  leadership: ["management"], communication: ["communication"], "attention to detail": ["data"],
};
