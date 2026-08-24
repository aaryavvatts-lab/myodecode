import leakage from "@/results/leakage.json";
import latency from "@/results/latency.json";
import { Card, Inferred, Section } from "./ui";

const REPO = "https://github.com/aaryavvatts-lab/myodecode";

export default function Methods() {
  return (
    <Section
      id="methods"
      eyebrow="10 · Methods"
      title="What I did, and what I do not know"
      lede="Including the parts that make the result weaker. A number without its caveats is just advertising."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 text-[14px] font-medium">Pipeline</h3>
          <ol className="list-inside list-decimal space-y-2 text-[13px]" style={{ color: "var(--text-secondary)" }}>
            <li>Filter the signal to keep 20 to 450 Hz, and notch out mains hum at 60 Hz and its harmonics. The filter runs forwards and backwards so it does not shift anything in time.</li>
            <li>Cut the recordings into overlapping windows, each tagged with who it came from, which gesture, and where in the recording it sits. That last tag is what makes the time-based split possible.</li>
            <li>Take five measurements per sensor: mean absolute value, root mean square, waveform length, zero crossings, slope sign changes.</li>
            <li>Classify with linear discriminant analysis, with shrinkage picked automatically. Compare against a small neural network with about 53,000 weights.</li>
            <li>Test on every person in turn while holding them out of training. Get the uncertainty by resampling across people. Check the floor by scrambling the labels {leakage.permutation.n} times.</li>
            <li>For the speed sweep, keep the step between windows fixed at {latency.stride_samples} samples, so every setting trains on the same amount of data.</li>
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
              <strong style={{ color: "var(--text-primary)" }}>I had to work out the sampling rate.</strong>
              <Inferred /> The files did not say. I estimated about 1000 samples a second from
              the frequency content, which peaks near 92 Hz and fades out by 450 Hz. That is
              what muscle signal looks like at that rate. If the real rate is different, every
              millisecond number here scales by the same factor. No accuracy score depends on it.
            </li>
            <li>
              <strong style={{ color: "var(--text-primary)" }}>The gestures have no names.</strong>
              <Inferred /> The dataset ships five unlabelled recordings per subject. Classes are
              described by their measured activation signature instead of being given invented
              names like &ldquo;fist&rdquo; or &ldquo;pinch&rdquo;.
            </li>
            <li>
              <strong style={{ color: "var(--text-primary)" }}>One sitting per person.</strong>{" "}
              The sensors were never peeled off and stuck back on. In a real device that
              happens every day, and it is one of the main things that breaks them. Nothing
              here measures that, so expect worse in practice.
            </li>
            <li>
              <strong style={{ color: "var(--text-primary)" }}>I do not know where the data came from.</strong>{" "}
              There was no paper with it and searching did not turn one up. That means I do
              not know where on the arm the sensors were placed, which is why I only ever
              call them by number.
            </li>
          </ul>
        </Card>
      </div>

      <Card className="mt-4">
        <h3 className="mb-3 text-[14px] font-medium">Reproducing this</h3>
        <p className="mb-3 text-[13px]" style={{ color: "var(--text-secondary)" }}>
          Every number and chart on this site rebuilds from the raw text files, with the
          random seeds fixed so you get the same answers I did. The tests check the claims
          this project rests on: that scrambled labels score at chance, that no person
          appears in both training and testing, that the time-based split really has a gap
          in it, and that the shortcut split really does beat the honest one.
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
          Built from muscle recordings of 8 people, 5 gestures each, 4 sensors. Code and
          full results: <a href={REPO} className="underline underline-offset-4" style={{ color: "var(--accent)" }}>{REPO.replace("https://", "")}</a>
        </p>
      </Card>
    </Section>
  );
}
