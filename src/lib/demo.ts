// Synthetic demo learner used for the live demo. Clearly labelled; not a real person.
import { emptyProfile, type LearnerProfile } from "./types";

export const DEMO_PROFILE: LearnerProfile = {
  ...emptyProfile(),
  name: "Lina (synthetic demo student)",
  education_level: "tawjihi-graduate",
  subjects: ["math", "computing", "english"],
  hobbies: ["robotics club", "drawing"],
  industries: ["technology"],
  priorities: ["affordability", "career-fit", "location"],
  saved_programs: [],
  tawjihi_avg: 86.4,
  stream: "scientific",
  interests: ["computer-science", "software-engineering"],
  dream_careers: ["web developer", "build apps that help people"],
  career_tags: ["developer", "web", "software"],
  budget_jod_per_year: 2500,
  financial_need: true,
  preferred_cities: ["Irbid", "Amman"],
  open_to_relocate: true,
  university_type: "any",
  accessibility_needs: [],
  strengths: ["self-taught coding", "volunteering"],
  achievements: [
    { id: "a-demo-1", kind: "project", title: "Personal portfolio website", description: "I built my personal website with HTML and CSS, and made it responsive for phones. I added a small quiz game using JavaScript.", links: ["https://example.org/synthetic-portfolio"] },
  ],
  skills: [
    { skill_id: "html", level: 2, status: "evidence-attached", evidence: [{ kind: "quote", value: "I built my personal website with HTML and CSS", achievement_id: "a-demo-1" }, { kind: "link", value: "https://example.org/synthetic-portfolio" }] },
    { skill_id: "css", level: 2, status: "evidence-attached", evidence: [{ kind: "quote", value: "made it responsive for phones", achievement_id: "a-demo-1" }] },
    { skill_id: "javascript", level: 1, status: "evidence-attached", evidence: [{ kind: "quote", value: "I added a small quiz game using JavaScript", achievement_id: "a-demo-1" }] },
  ],
};
