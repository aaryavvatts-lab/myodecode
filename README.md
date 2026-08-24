# MyoDecode — how fast can you read a hand?

Decoding five hand gestures from four channels of surface EMG, with the evaluation
done honestly.

**[Live site with the interactive results and an in-browser decoder →](https://myodecode.vercel.app)**

---

## The short version

The project started from a popular recipe: download EMG, stack the trials, run a CNN
to get a latent vector, feed that to a simple classifier. Running it against the data
first turned up two problems.

**1. The task is already solved by a method from 1993.** Hudgins time-domain features
into a linear discriminant reach **95.4%** leave-one-subject-out. The CNN encoder plus
logistic regression — the recipe's own architecture, faithfully implemented — reaches
**94.7%**. The deep model loses to twenty hand-computed numbers.

**2. The recipe's train/test split leaks badly.** Each file is one continuous ~20 s
recording of one gesture. Splitting those windows at random puts train and test
samples milliseconds apart, from the same session and the same electrode placement.

| Split | Accuracy | What it measures |
|---|---|---|
| Random, within one subject | **98.7%** | nothing — windows overlap in time |
| Random, pooled across subjects | 95.2% | still leaking, just diluted |
| Blocked in time | 93.3% | honest within-subject |
| Leave one subject out | **93.4%** | honest cross-subject |

Note that blocking in time recovers nearly the whole gap, and lands within 0.1 pp of
full subject holdout. The inflation is **not** mainly about person-to-person
variation, which is where the field usually points. It is about training and testing
on windows that overlap in time.

A 200-run label-permutation test puts the null at 19.9% (p = 0.005), so the honest
number is real — it is just five points lower than advertised.

## So the project asks better questions instead

**How fast can you decide?** Accuracy against window length, with the hop held fixed
so the curve is not confounded by training-set size. The knee sits well below the
250 ms most papers use.

**How few electrodes do you need?** All 15 channel subsets. Two electrodes reach
about 92%; the best single electrode alone reaches about 81%, against 20% chance.

**Should users do a calibration routine?** No. Standardising each wearer's features
against their own *unlabelled* signal — free, instant, no cooperation — is worth
**+2.0 pp**. Twelve seconds of *labelled* calibration on top of that is worth a
further **+0.2 pp**, well inside the confidence interval.

**Where are the errors?** Not spread out — **82.8%** of every mistake is one pair of
gestures being swapped for each other, and that pair is also the closest pair of class
centroids in the decoder's own feature space. Rest is never confused with anything
(100% recall): near-silence on four channels is not something an active gesture can
imitate. For a product this reframes the result — five gestures at 95.4% is really four
gestures at near-ceiling plus one ambiguous pair.

**Does it survive streaming?** A synthesised session where the held-out wearer cycles
gestures every two seconds, decoded causally. Online running normalisation costs only
0.5 pp against the offline statistics the headline number quietly assumes. The real
cost is elsewhere: windows straddling a gesture change score ~54%, and a per-window
average that pools them reports 92.5% rather than the 97.2% steady-state figure.

## Repository

```
data/            40 recordings, subject_{1..8}/{0..4}.txt  + PROVENANCE.md
src/
  config.py      FS, class signatures, paths — one source of truth
  data.py        loading, filtering, epoching, the four split schemes
  features.py    Hudgins time-domain features
  models.py      LDA/logreg baselines, the CNN encoder, augmentation
  evaluate.py    metrics, bootstrap CIs over folds
  train.py       LOSO training loop (MPS/CUDA/CPU)
  experiments/   one file per result, each writing results/*.json
  export.py      ONNX + linear-model export for the browser
  figures.py     static figures from results/
tests/           guardrails — see below
web/             Next.js site, deployed to Vercel
```

## Reproducing

```bash
uv venv --python 3.12 .venv
uv pip install --python .venv/bin/python -r requirements.txt
.venv/bin/python -m pytest tests/ -q
.venv/bin/python run_all.py            # ~2-3 h; --fast skips the CNN sweeps
.venv/bin/python sync_web.py && .venv/bin/python -m src.export
.venv/bin/python -m src.figures
cd web && npm install && npm run verify   # checks the browser decoder against Python
```

Seeds are fixed throughout. The web app refuses to build if any results file is still
a placeholder.

## The tests are the argument

`tests/test_pipeline.py` asserts the claims this project rests on, so they cannot
quietly rot:

- permuted labels score at chance (0.15–0.27)
- leave-one-subject-out folds share no subject, and each test fold is exactly one person
- the blocked split has a genuine temporal gap between train and test
- no window spans two recordings, and windows match the source signal sample-for-sample
- class 0 really is the quietest class, which is the entire basis for calling it Rest
- **the leaky split beats the honest split** — the thesis, as an assertion

`web/scripts/verify-decoder.mts` additionally replays the entire demo session through
the shipped TypeScript and ONNX decoders and fails the build if either drifts from the
Python pipeline. At last run: LDA 96.11% against Python's 96.09%, CNN 92.34%.

## Honest limitations

- **Eight subjects.** Every confidence interval here is wide. One- and two-point
  differences are unresolved.
- **The sampling rate is inferred** at 1 kHz from the power spectrum; the dataset
  shipped no metadata. Every millisecond figure scales with `src/config.py:FS`. No
  accuracy result depends on it.
- **The gestures have no names.** Classes are described by their measured activation
  signatures rather than given invented names. See `data/PROVENANCE.md`.
- **One session per person.** Electrodes were never removed and reapplied, so nothing
  here measures the across-session drift that breaks real devices.
- **Provenance unresolved.** The source publication was not available and searching
  did not identify it, so electrode placement is unknown.
