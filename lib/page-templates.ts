export const pageTemplates = ["blank", "project-plan", "meeting-notes", "prd", "research-notes", "task-plan"] as const;
export type PageTemplate = typeof pageTemplates[number];

export const templateLabels: Record<PageTemplate, string> = {
  blank: "Blank Page",
  "project-plan": "Project Plan",
  "meeting-notes": "Meeting Notes",
  prd: "PRD",
  "research-notes": "Research Notes",
  "task-plan": "Task Plan",
};

const paragraph = (text = "") => ({ type: "paragraph", content: text ? [{ type: "text", text }] : undefined });
const heading = (text: string) => ({ type: "heading", attrs: { level: 2 }, content: [{ type: "text", text }] });

export function contentForTemplate(template: PageTemplate) {
  const sections: Record<PageTemplate, string[]> = {
    blank: [],
    "project-plan": ["Overview", "Goals", "Milestones", "Risks"],
    "meeting-notes": ["Attendees", "Agenda", "Discussion", "Action Items"],
    prd: ["Problem", "Goals", "Requirements", "Success Metrics"],
    "research-notes": ["Question", "Sources", "Findings", "Next Steps"],
    "task-plan": ["Outcome", "Tasks", "Dependencies", "Definition of Done"],
  };
  return { type: "doc", content: sections[template].flatMap((title) => [heading(title), paragraph()]).concat(sections[template].length ? [] : [paragraph()]) };
}
