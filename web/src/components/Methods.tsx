import leakage from "@/results/leakage.json";
import latency from "@/results/latency.json";
import { Card, Inferred, Section } from "./ui";

const REPO = "https://github.com/aaryavvatts-lab/myodecode";

export default function Methods() {
  return (
    <Section
      id="methods"
      eyebrow="07 — Methods"
      title="What was done, and what is not known"
      lede="Including the parts that weaken the result. A number without its caveats is advertising."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 text-[14px] font-medium">Pipeline</h3>
          <ol className="list-inside list-decimal space-y-2 text-[13px]" style={{ color: "var(--text-secondary)" }}>
            <li>Zero-phase Butterworth bandpass, 20–450 Hz, plus notches at 60 Hz and harmonics.</li>
            <li>Sliding windows tagged with subject, class and position in the recording, so splits can be blocked in time.</li>
            <li>Five time-domain features per channel: MAV, RMS, waveform length, zero crossings, slope sign changes.</li>
            <li>Linear discriminant analysis with automatic shrinkage; a 53k-parameter 1-D CNN encoder as the learned comparison.</li>
            <li>Leave-one-subject-out across all eight subjects; bootstrap 95% intervals over folds; {leakage.permutation.n}-run label permutation test for the null.</li>
            <li>The window-length sweep uses a fixed {latency.stride_samples}-sample hop so every setting trains on the same number of windows.</li>
          </ol>
        </Card>

        <Card>
          <h3 className="mb-3 text-[14px] font-medium">Limitations</h3>
          <ul className="space-y-2.5 text-[13px]" style={{ color: "var(--text-secondary)" }}>
            <li>
              <strong style={{ color: "var(--text-primary)" }}>Eight subjects.</strong> Every
              confidence interval on this page is wide for that reason. Treat differences of
              one or two points as unresolved.
            </li>
            <li>
              <strong style={{ color: "var(--text-primary)" }}>The sampling rate is inferred.</strong>
              <Inferred /> It was estimated at 1 kHz from the power spectrum — the EMG peak sits at
              ~92 Hz in normalised frequency and content dies by ~450 Hz. If the true rate differs,
              every millisecond figure rescales proportionally. No accuracy result depends on it.
            </li>
            <li>
              <strong style={{ color: "var(--text-primary)" }}>The gestures have no names.</strong>
              <Inferred /> The dataset ships five unlabelled recordings per subject. Classes are
              described by their measured activation signature instead of being given invented
              names like &ldquo;fist&rdquo; or &ldquo;pinch&rdquo;.
            </li>
            <li>
              <strong style={{ color: "var(--text-primary)" }}>One session per person.</strong>{" "}
              Electrodes were never removed and reapplied, so nothing here measures the
              across-session drift that breaks real devices. Expect worse.
            </li>
            <li>
              <strong style={{ color: "var(--text-primary)" }}>Provenance is unresolved.</strong>{" "}
              The source publication for this dataset was not available, and searching did not
              identify it. Electrode placement is therefore unknown; channels are referred to
              by number only.
            </li>
          </ul>
        </Card>
      </div>

      <Card className="mt-4">
        <h3 className="mb-3 text-[14px] font-medium">Reproducing this</h3>
        <p className="mb-3 text-[13px]" style={{ color: "var(--text-secondary)" }}>
          Every number and figure regenerates from the raw text files with fixed seeds. The
          test suite asserts the load-bearing claims directly: that permuted labels score at
          chance, that leave-one-subject-out folds share no subject, that the blocked split
          has a real temporal gap, and that the leaky split beats the honest one.
        </p>
        <pre className="scroll-x rounded-lg border p-3 font-[family-name:var(--font-mono)] text-[12px] leading-relaxed"
             style={{ background: "var(--surface-2)" }}>
{`git clone ${REPO}
uv venv --python 3.12 .venv
uv pip install --python .venv/bin/python -r requirements.txt
.venv/bin/python -m pytest tests/ -q
.venv/bin/python run_all.py`}
        </pre>
        <p className="mt-4 text-[12px]" style={{ color: "var(--text-muted)" }}>
          Built with an EMG dataset of 8 subjects × 5 gestures × 4 channels. Source and full
          results: <a href={REPO} className="underline underline-offset-4" style={{ color: "var(--accent)" }}>{REPO.replace("https://", "")}</a>
        </p>
      </Card>
    </Section>
  );
}
