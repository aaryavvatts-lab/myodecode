# Dataset provenance

## What shipped with the data

Forty plain-text files, arranged as `subject_{1..8}/{0..4}.txt`. Each file is
tab-separated, four float columns, no header, no timestamps, no event markers.

That is the whole of it. There was no accompanying paper, README, or metadata,
and searching for a matching public dataset did not identify the source.

## What is known by direct measurement

| Property | Value |
|---|---|
| Subjects | 8 |
| Recordings per subject | 5 (one file per class) |
| Channels | 4 |
| Samples per recording | 18,989 – 27,463 (median ≈ 20,300) |
| Value range | roughly ±0.1, with excursions to ±1.7 in the highest-amplitude class |
| Per-channel mean | ≈ 0 in every recording (the data arrived DC-removed) |

## What is inferred, and how

**Sampling rate ≈ 1000 Hz.** Averaged periodogram of the active recordings peaks
at 0.092 cycles/sample and falls to the noise floor by ~0.45 cycles/sample.
Surface EMG has its power peak between 50 and 100 Hz and negligible content above
about 450 Hz, which places the sampling rate near 1 kHz. There is no visible mains
peak to corroborate it, so the data appears to have been notch-filtered already.
Spectral content below ~8 cycles/1000 samples is also absent, consistent with a
prior high-pass around 10–20 Hz.

*Consequence if wrong:* every millisecond figure in this project rescales
proportionally. No accuracy result changes. The value lives in `src/config.py:FS`.

**Class 0 is rest.** Its total RMS is 0.75× the subject's grand mean across
classes, against 2.99–6.76× for the other four, and it is the quietest class on
every channel in all eight subjects.

**Class identities are otherwise unknown.** The five classes are described by
their measured activation signatures rather than given invented gesture names:

| Class | Channel share (ch1–ch4) | Total activation | Dominant channel |
|---|---|---|---|
| 0 | 25% / 34% / 21% / 20% | 0.75× | — (rest) |
| 1 | 16% / 18% / 40% / 26% | 6.76× | ch3, in 8/8 subjects |
| 2 | 18% / 42% / 22% / 19% | 2.99× | ch2, in 8/8 subjects |
| 3 | 16% / 20% / 35% / 30% | 4.39× | ch3, in 6/8 subjects |
| 4 | 14% / 21% / 28% / 38% | 3.72× | ch4, in 8/8 subjects |

**Electrode placement is unknown.** Channels are referred to by number only.

**No trial structure.** The envelope of each recording shows sustained and
repeated contraction rather than discrete stimulus-locked trials, and there are no
event markers. Windows are therefore cut by sliding a fixed window over the
continuous recording — which is also why splitting those windows at random leaks
so badly, and why this project measures that leak rather than ignoring it.
