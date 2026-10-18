import { Card, Section } from "./ui";

/** Every entry here was looked up and checked. No citation is from memory. */
const REFS = [
  {
    authors: "Hudgins, B., Parker, P. and Scott, R. N.",
    year: 1993,
    title: "A new strategy for multifunction myoelectric control",
    venue: "IEEE Transactions on Biomedical Engineering 40(1), 82 to 94",
    doi: "10.1109/10.204774",
    cites: 2155,
    why: "Where the five measurements come from. This is the paper that set the standard for reading gestures from muscle signal, and it is still the thing to beat.",
  },
  {
    authors: "Kapoor, S. and Narayanan, A.",
    year: 2023,
    title: "Leakage and the reproducibility crisis in machine-learning-based science",
    venue: "Patterns 4(9), 100804",
    doi: "10.1016/j.patter.2023.100804",
    cites: 874,
    why: "They surveyed 294 papers across 17 fields and found leakage everywhere. In their own case study, once they fixed the leak, the complicated models stopped beating a decades old logistic regression. That is the same thing I ran into here, on a different problem.",
  },
  {
    authors: "Rosenblatt, M., Tejavibulya, L., Jiang, R. and others",
    year: 2024,
    title: "Data leakage inflates prediction performance in connectome-based machine learning models",
    venue: "Nature Communications 15, 1829",
    doi: "10.1038/s41467-024-46150-w",
    cites: 180,
    why: "Measures how much different kinds of leakage inflate a score in brain imaging. They also find that small datasets make it worse, which is worth knowing when yours has eight people in it.",
  },
  {
    authors: "Tkach, D., Huang, H. and Kuiken, T. A.",
    year: 2010,
    title: "Study of stability of time-domain features for electromyographic pattern recognition",
    venue: "Journal of NeuroEngineering and Rehabilitation 7, 21",
    doi: "10.1186/1743-0003-7-21",
    cites: 589,
    why: "Shows what happens to these exact features when the sensor moves, the effort changes, or the muscle gets tired. It is the main reason I do not claim my numbers would survive a second sitting.",
  },
];

export default function References() {
  return (
    <Section
      id="references"
      eyebrow="11 · Sources"
      title="Papers I actually used"
      lede="Four of them. I looked each one up and read the abstract rather than citing from memory, and the citation counts are from the time of writing."
    >
      <Card>
        <ol className="space-y-6">
          {REFS.map((r) => (
            <li key={r.doi}>
              <p className="text-body leading-snug">
                {r.authors} ({r.year}).{" "}
                <a href={`https://doi.org/${r.doi}`} target="_blank" rel="noopener noreferrer"
                   className="focusable underline underline-offset-4" style={{ color: "var(--accent)" }}>
                  {r.title}
                </a>
                .
              </p>
              <p className="mt-1 text-body" style={{ color: "var(--text-muted)" }}>
                {r.venue}. Cited about {r.cites.toLocaleString()} times.
              </p>
              <p className="mt-2 text-body leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                {r.why}
              </p>
            </li>
          ))}
        </ol>
      </Card>

      <Card className="mt-4">
        <p className="text-body leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          The dataset itself has no citation, which is the one gap I could not close. It
          arrived as forty text files with no paper attached, and searching did not turn up
          a match. If you recognise it, please say so on the repository and I will credit
          it properly.
        </p>
      </Card>
    </Section>
  );
}
