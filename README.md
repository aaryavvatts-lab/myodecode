# MyoDecode

Reading hand gestures from four muscle sensors on a forearm, and checking how much of
the accuracy people report for this task is actually real.

**[Live site with the interactive results and a decoder you can run in your browser](https://emg-gesture-decoder.vercel.app)**

---

## What this is

There is a popular project idea that goes around: download some muscle signal data,
chop it into windows, train a neural network to squeeze each window into a vector, then
feed that vector to a simple classifier and predict the hand gesture. I built it. Then I
ran some checks before writing anything up, and two things came out that changed what
the project is about.

**The neural network loses to a method from 1993.** Five simple measurements per sensor
fed into a linear classifier gets 95.4% on a person it has never seen. The neural
network version, built exactly as described, gets 94.7%. On streaming data the gap is
bigger: 96.1% against 92.3%.

**The way the data usually gets split inflates the score by five points.** Each file is
one continuous recording of one gesture, about twenty seconds long. If you cut it into
windows and shuffle them before splitting, your test windows end up a few milliseconds
away from your training windows, recorded in the same sitting with the sensors in the
same spot. The model has basically already seen the answer.

| How the data is split | Accuracy | What it actually measures |
|---|---|---|
| Shuffle one person's windows | **98.7%** | Nothing useful. Test windows sit next to training ones. |
| Shuffle everyone together | 95.2% | Same problem, watered down |
| Split each recording by time | 93.3% | Honest, same people |
| Hold out a whole person | **93.4%** | Honest, new person |

The interesting part is the last two rows. Splitting by time recovers nearly all of the
gap on its own, and lands within 0.1 points of never showing the model that person at
all. So the problem was not that bodies are different, which is where people usually
point. It was that the windows overlapped in time.

To make sure 93.4% is real and not an artifact of something else, I scrambled the labels
200 times and re-ran the whole thing. With meaningless labels the model scores 19.9%,
which is exactly what guessing between five options should give (p = 0.005).

## The questions I asked instead

**How fast can it decide?** Accuracy against how much signal it gets to see. I kept the
step between windows fixed across the sweep, otherwise short windows train on far more
data and the curve measures the wrong thing. It plateaus around 400 ms, but 100 ms
already gets 93.7% and 50 ms gets 90.8%, so a fast decoder is not far off a slow one.

**How few sensors do you need?** All fifteen combinations of the four sensors. The best
two (sensors 1 and 3) get 91.7% against 95.4% for all four. The best single sensor gets
80.6% on its own, against 20% for guessing.

**Should users do a setup routine?** No. Rescaling each person's measurements against
their own signal is free, needs no labels, and is worth 2.0 points. Twelve seconds of
the user holding poses on top of that is worth another 0.2 points, which is inside the
noise.

**Where are the mistakes?** Not spread out. 82.8% of every mistake is one pair of
gestures being swapped for each other, and that pair is also the closest pair in the
numbers the decoder looks at. Rest is never confused with anything at all. For anyone
building something with this, that reframes it: five gestures at 95.4% is really four
gestures that work almost perfectly plus one pair that does not.

**What did the network actually learn?** This was the surprise. I measured how tidily
each representation groups, and they came out opposite ways round. The twenty
hand-computed numbers group by gesture (0.210) and slightly less than randomly by
person (-0.015). The network's sixty-four learned numbers group weakly by gesture
(0.021) and more strongly by person (0.051).

Looking at the shape of it makes the reason obvious. The network's space is a scatter
of 33 small islands, and **every single island contains exactly one person** (purity
1.000). The hand-computed numbers form 4 big groups with person purity 0.141, which is
chance for eight people (0.125). So the network did not build a space of gestures that
happens to vary between people. It built a space of people, with the gestures tucked
inside each one. It still classifies fine, because the linear layer on top can pull the
gesture part out, but it explains why it never pulled ahead.

**Does it hold up on a live stream?** I spliced a fake session where a held out person
switches gesture every two seconds, then decoded it causally. Estimating the rescaling
on the fly instead of from the whole recording costs only 0.5 points. But the decoder
needs about ten seconds of wear before it works at all: at two seconds it drops to 78%.
I have not seen anyone report that warm-up cost.

## Repository layout

```
data/            40 recordings, subject_{1..8}/{0..4}.txt, plus PROVENANCE.md
src/
  config.py      sampling rate, class descriptions, paths. One place to change things.
  data.py        loading, filtering, windowing, and the four ways of splitting
  features.py    the five 1993 measurements
  models.py      the linear baselines, the neural network, and the augmentation
  evaluate.py    scoring, confidence ranges
  train.py       the training loop
  experiments/   one file per result, each writing to results/
  export.py      exports the trained models for the browser
  figures.py     static charts
tests/           the checks that keep the claims honest
web/             the site, deployed on Vercel
```

## Running it yourself

```bash
uv venv --python 3.12 .venv
uv pip install --python .venv/bin/python -r requirements.txt
.venv/bin/python -m pytest tests/ -q
.venv/bin/python run_all.py            # a few hours. --fast skips the neural network sweeps
.venv/bin/python sync_web.py && .venv/bin/python -m src.export
.venv/bin/python -m src.figures
cd web && npm install && npm run verify
```

Random seeds are fixed, so you should get the numbers above. The site refuses to build
if any results file is still a placeholder.

## The tests are the argument

`tests/test_pipeline.py` checks the things this project depends on being true, so they
cannot quietly break:

- scrambled labels score at chance
- no person appears in both training and testing
- the time based split really has a gap in the middle
- no window spans two recordings, and windows match the source signal sample for sample
- class 0 really is the quietest class, which is the only reason I call it Rest
- the shuffled split really does beat the honest one

`web/scripts/verify-decoder.mts` replays the whole demo session through the decoder that
ships to the browser and fails the build if it drifts from the Python version. Last run:
96.11% against Python's 96.09% for the linear model, and 92.34% for the neural network.

## What I do not know

- **Eight people is not many.** Every uncertainty range here is wide because of it. If
  two numbers are within a point or two, treat them as tied.
- **I had to work out the sampling rate.** The files did not say. About 1000 samples a
  second, estimated from the frequency content. If that is wrong, every millisecond
  number scales by the same factor. No accuracy score depends on it.
- **The gestures have no names.** Five unlabelled recordings per person, with nothing
  saying what they were doing. I describe each one by which muscles fired instead of
  making up names.
- **One sitting per person.** The sensors were never peeled off and stuck back on, which
  is one of the main things that breaks real devices. Nothing here measures that.
- **I do not know where the data came from.** No paper came with it and searching did not
  turn one up, so I do not know where on the arm the sensors were placed. Everything I
  know and everything I had to guess is written down in `data/PROVENANCE.md`. If you
  recognise this dataset, please open an issue.

## Sources

Four papers, each looked up rather than cited from memory:

- Hudgins, B., Parker, P. and Scott, R. N. (1993). A new strategy for multifunction
  myoelectric control. *IEEE Transactions on Biomedical Engineering* 40(1), 82 to 94.
  [10.1109/10.204774](https://doi.org/10.1109/10.204774)
- Kapoor, S. and Narayanan, A. (2023). Leakage and the reproducibility crisis in
  machine-learning-based science. *Patterns* 4(9), 100804.
  [10.1016/j.patter.2023.100804](https://doi.org/10.1016/j.patter.2023.100804)
- Rosenblatt, M. and others (2024). Data leakage inflates prediction performance in
  connectome-based machine learning models. *Nature Communications* 15, 1829.
  [10.1038/s41467-024-46150-w](https://doi.org/10.1038/s41467-024-46150-w)
- Tkach, D., Huang, H. and Kuiken, T. A. (2010). Study of stability of time-domain
  features for electromyographic pattern recognition. *Journal of NeuroEngineering and
  Rehabilitation* 7, 21.
  [10.1186/1743-0003-7-21](https://doi.org/10.1186/1743-0003-7-21)

Worth reading the Kapoor and Narayanan one if you only read one. They surveyed 294
papers across 17 fields and found that once the leaks are fixed, complicated models stop
beating decades old simple ones. I hit the same thing here without knowing their paper
existed until afterwards.

The dataset itself has no citation, which is the one gap I could not close.

## Licence

Code under MIT. Writing and figures under CC BY 4.0. The recordings in `data/` are not
mine to license and I make no claim over them. See `LICENSE`.

Not medical advice. Do not use any of this to make decisions about a prosthetic or any
other device someone depends on.
