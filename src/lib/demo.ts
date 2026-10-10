// Synthetic demo learner used for the live demo. Clearly labelled; not a real person.
import { emptyProfile, type LearnerProfile } from "./types";

export const DEMO_PROFILE: LearnerProfile = {
  ...emptyProfile(),
  name: "Lina (synthetic demo student)",
  education_level: "tawjihi-graduate",
  subjects: ["math", "computing", "english"],
  hobbies: ["robotics club", "drawing"],
  industries: ["technology"],
  priorities: ["career-fit", "affordability", "location"],
  // Pre-saved so Compare opens with four verified CS programs side by side.
  saved_programs: ["psut-cs", "htu-cs", "just-cs", "zuj-cs"],
  tawjihi_avg: 86.4,
  stream: "scientific",
  interests: ["computer-science", "software-engineering"],
  dream_careers: ["web developer", "build apps that help people"],
  career_tags: ["developer", "web", "software"],
  budget_jod_per_year: 4500,
  financial_need: true,
  preferred_cities: ["Amman", "Irbid"],
  open_to_relocate: true,
  university_type: "any",
  accessibility_needs: [],
  strengths: ["self-taught coding", "volunteering", "problem solving"],
  completed_courses: ["mdn-html", "mdn-css-basics", "mdn-version-control"],
  achievements: [
    { id: "a-demo-1", kind: "project", title: "Personal portfolio website", description: "I built my personal website with HTML and CSS, and made it responsive for phones. I added a small quiz game using JavaScript.", links: ["https://example.org/synthetic-portfolio"] },
    { id: "a-demo-2", kind: "project", title: "School robotics club: line-following robot", description: "Led a team of four that built a line-following robot for the school science fair. I planned the tasks and presented the robot to the judges.", links: [], date: "2025-04" },
    { id: "a-demo-3", kind: "project", title: "Python grade calculator for my class", description: "Wrote a small Python script that reads marks from a file and prints each student's average and the class average.", links: ["https://example.org/synthetic-grade-calculator"], date: "2025-11" },
    { id: "a-demo-4", kind: "activity", title: "Volunteer coding tutor, community centre in Irbid", description: "Taught basic HTML to younger students on Saturdays for three months and explained my code to them step by step.", links: [], date: "2026-02" },
    { id: "a-demo-5", kind: "project", title: "Published my code on GitHub", description: "Put my portfolio and quiz game code in a public Git repository with a README so others can see how it works.", links: ["https://example.org/synthetic-github"], date: "2026-03" },
  ],
  skills: [
    { skill_id: "html", level: 2, status: "evidence-attached", evidence: [{ kind: "quote", value: "I built my personal website with HTML and CSS", achievement_id: "a-demo-1" }, { kind: "link", value: "https://example.org/synthetic-portfolio" }, { kind: "quote", value: "Taught basic HTML to younger students", achievement_id: "a-demo-4" }] },
    { skill_id: "css", level: 2, status: "evidence-attached", evidence: [{ kind: "quote", value: "made it responsive for phones", achievement_id: "a-demo-1" }] },
    { skill_id: "javascript", level: 1, status: "evidence-attached", evidence: [{ kind: "quote", value: "I added a small quiz game using JavaScript", achievement_id: "a-demo-1" }] },
    { skill_id: "git", level: 1, status: "evidence-attached", evidence: [{ kind: "quote", value: "Put my portfolio and quiz game code in a public Git repository", achievement_id: "a-demo-5" }, { kind: "link", value: "https://example.org/synthetic-github" }] },
    { skill_id: "python", level: 1, status: "evidence-attached", evidence: [{ kind: "quote", value: "Wrote a small Python script that reads marks from a file", achievement_id: "a-demo-3" }, { kind: "link", value: "https://example.org/synthetic-grade-calculator" }] },
    { skill_id: "communication", level: 2, status: "self-reported", evidence: [{ kind: "quote", value: "I planned the tasks and presented the robot to the judges", achievement_id: "a-demo-2" }, { kind: "quote", value: "explained my code to them step by step", achievement_id: "a-demo-4" }] },
    { skill_id: "english", level: 2, status: "self-reported", evidence: [] },
  ],
};
