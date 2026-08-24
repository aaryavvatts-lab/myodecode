"""Guardrails. If any of these fail, every number downstream is suspect."""
import sys
from pathlib import Path

import numpy as np
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.config import FS, N_CHANNELS, N_CLASSES, SUBJECTS
from src.data import (SPLIT_SCHEMES, iter_splits, load_filtered, load_raw,
                      make_epochs)
from src.features import extract
from src.models import EMGClassifier, count_params, make_lda
from src.sk_runner import per_subject_znorm, run_sklearn


@pytest.fixture(scope="module")
def ep():
    return make_epochs(250, 0.5)


@pytest.fixture(scope="module")
def F(ep):
    return extract(ep.X)


def test_all_recordings_present():
    raw = load_raw()
    assert len(raw) == len(SUBJECTS) * N_CLASSES == 40
    for (s, c), a in raw.items():
        assert a.ndim == 2 and a.shape[1] == N_CHANNELS
        assert a.shape[0] > 10 * FS, f"subject {s} class {c} is under 10 s"


def test_filtering_is_finite_and_preserves_shape():
    raw, filt = load_raw(), load_filtered()
    for k in raw:
        assert filt[k].shape == raw[k].shape
        assert np.isfinite(filt[k]).all()


def test_epoch_shapes_and_tags(ep):
    assert ep.X.ndim == 3 and ep.X.shape[1] == N_CHANNELS
    assert ep.X.shape[2] == ep.window_len == int(250 * FS / 1000)
    assert len(ep.y) == len(ep.subject) == len(ep.start) == len(ep.X)
    assert set(ep.y.tolist()) == set(range(N_CLASSES))
    assert set(ep.subject.tolist()) == set(SUBJECTS)
    assert 0.0 <= ep.frac.min() and ep.frac.max() <= 1.0


def test_no_window_spans_two_recordings(ep):
    """Every window must sit entirely inside one (subject, class) recording."""
    raw = load_raw()
    for s in SUBJECTS:
        for c in range(N_CLASSES):
            m = (ep.subject == s) & (ep.y == c)
            n = len(raw[(s, c)])
            assert (ep.start[m] + ep.window_len <= n).all(), f"overrun at s{s} c{c}"


def test_windows_match_source_signal(ep):
    """Spot-check that a window really is the slice it claims to be."""
    filt = load_filtered()
    rng = np.random.default_rng(0)
    for i in rng.choice(len(ep), 25, replace=False):
        src = filt[(int(ep.subject[i]), int(ep.y[i]))]
        st = int(ep.start[i])
        np.testing.assert_allclose(ep.X[i], src[st:st + ep.window_len].T, rtol=1e-5)


@pytest.mark.parametrize("scheme", sorted(SPLIT_SCHEMES))
def test_splits_are_disjoint(ep, scheme):
    rng = np.random.default_rng(0)
    folds = list(iter_splits(ep, scheme, rng))
    assert folds
    for tr, te in folds:
        assert not (tr & te).any(), f"{scheme}: train and test overlap"
        assert tr.sum() > 0 and te.sum() > 0


def test_loso_folds_share_no_subject(ep):
    for i, (tr, te) in enumerate(iter_splits(ep, "loso")):
        assert set(ep.subject[tr].tolist()).isdisjoint(ep.subject[te].tolist())
        assert len(set(ep.subject[te].tolist())) == 1
    assert i + 1 == len(SUBJECTS)


def test_blocked_split_has_a_temporal_gap(ep):
    (tr, te), = list(iter_splits(ep, "blocked"))
    assert ep.frac[tr].max() < ep.frac[te].min(), "no gap between train and test"


def test_features_are_finite_and_shaped(ep, F):
    assert F.shape == (len(ep), N_CHANNELS * 5)
    assert np.isfinite(F).all()


def test_rest_class_has_lowest_amplitude(ep, F):
    """Class 0 is labelled Rest on the strength of this; assert it stays true."""
    log_rms = F[:, 1::5].mean(axis=1)
    means = [log_rms[ep.y == c].mean() for c in range(N_CLASSES)]
    assert np.argmin(means) == 0, f"class 0 is not the quietest: {means}"


def test_znorm_is_per_subject(ep, F):
    Z = per_subject_znorm(F, ep.subject)
    for s in SUBJECTS:
        m = ep.subject == s
        np.testing.assert_allclose(Z[m].mean(0), 0, atol=1e-4)
        np.testing.assert_allclose(Z[m].std(0), 1, atol=1e-3)


def test_permuted_labels_score_at_chance(ep, F):
    r = run_sklearn(make_lda, F, ep, "loso", "lda", permute=True, seed=7)
    assert 0.15 < r.accuracy < 0.27, f"null is not at chance: {r.accuracy}"


def test_leaky_split_beats_honest_split(ep, F):
    """The whole thesis of the project, as an assertion."""
    leaky = run_sklearn(make_lda, F, ep, "random_within", "lda").accuracy
    honest = run_sklearn(make_lda, F, ep, "loso", "lda").accuracy
    assert leaky > honest + 0.02, f"expected inflation, got {leaky:.3f} vs {honest:.3f}"
    assert leaky > 0.97 and 0.90 < honest < 0.96


def test_encoder_accepts_any_window_length():
    import torch
    m = EMGClassifier().eval()
    assert count_params(m) < 200_000, "model is too big to ship to a browser"
    for T in (25, 100, 250, 1000):
        assert m(torch.randn(2, N_CHANNELS, T)).shape == (2, N_CLASSES)
