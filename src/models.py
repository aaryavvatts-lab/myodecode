"""Models under test.

Three tiers, all evaluated through the same harness in evaluate.py:

  1. Hudgins time-domain features -> LDA / logistic regression   (the 1993 baseline)
  2. 1D CNN encoder -> 64-d latent -> logistic regression        (the reel's recipe)
  3. 1D CNN encoder -> softmax head, end to end                  (reference point)

The encoder is deliberately small (~60k params). It has to run in a browser.
"""
from __future__ import annotations

import numpy as np
import torch
import torch.nn as nn
from sklearn.discriminant_analysis import LinearDiscriminantAnalysis
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

from .config import LATENT_DIM, N_CLASSES


# ------------------------------------------------------------------- baselines
def make_lda():
    return make_pipeline(StandardScaler(),
                         LinearDiscriminantAnalysis(solver="lsqr", shrinkage="auto"))


def make_logreg(C: float = 1.0):
    return make_pipeline(StandardScaler(),
                         LogisticRegression(C=C, max_iter=2000))


# --------------------------------------------------------------------- encoder
class ConvBlock(nn.Module):
    def __init__(self, cin: int, cout: int, k: int, pool: int, dropout: float):
        super().__init__()
        self.conv = nn.Conv1d(cin, cout, k, padding=k // 2, bias=False)
        self.bn = nn.BatchNorm1d(cout)
        self.act = nn.GELU()
        self.pool = nn.MaxPool1d(pool) if pool > 1 else nn.Identity()
        self.drop = nn.Dropout(dropout)

    def forward(self, x):
        return self.drop(self.pool(self.act(self.bn(self.conv(x)))))


class EMGEncoder(nn.Module):
    """Raw window (B, C, T) -> L2-normalised latent vector (B, latent_dim).

    Global average and max pooling are concatenated so the latent carries both
    sustained activation level and transient peaks. Pooling over time makes the
    encoder accept any window length, which is what lets one architecture serve
    the whole latency sweep.
    """

    def __init__(self, n_channels: int = 4, latent_dim: int = LATENT_DIM,
                 widths: tuple[int, ...] = (32, 48, 64, 64), dropout: float = 0.25):
        super().__init__()
        blocks, cin = [], n_channels
        for i, cout in enumerate(widths):
            blocks.append(ConvBlock(cin, cout, k=7 if i == 0 else 5,
                                    pool=2 if i < len(widths) - 1 else 1,
                                    dropout=dropout))
            cin = cout
        self.blocks = nn.Sequential(*blocks)
        self.proj = nn.Sequential(
            nn.Linear(cin * 2, latent_dim), nn.BatchNorm1d(latent_dim), nn.GELU())
        self.latent_dim = latent_dim

    def forward(self, x):
        h = self.blocks(x)
        h = torch.cat([h.mean(dim=2), h.amax(dim=2)], dim=1)
        return self.proj(h)


class EMGClassifier(nn.Module):
    """Encoder plus a linear head. The head is what end-to-end training optimises;
    the reel's variant throws the head away and refits a logistic regression on
    the latent instead."""

    def __init__(self, n_channels: int = 4, latent_dim: int = LATENT_DIM,
                 n_classes: int = N_CLASSES, dropout: float = 0.25):
        super().__init__()
        self.encoder = EMGEncoder(n_channels, latent_dim, dropout=dropout)
        self.head = nn.Linear(latent_dim, n_classes)

    def forward(self, x):
        return self.head(self.encoder(x))

    @torch.no_grad()
    def embed(self, x):
        return self.encoder(x)


def count_params(m: nn.Module) -> int:
    return sum(p.numel() for p in m.parameters() if p.requires_grad)


# ---------------------------------------------------------------- augmentation
class Augment:
    """Augmentations aimed squarely at the cross-subject gap.

    Amplitude jitter stands in for differences in skin impedance and electrode
    contact; channel dropout stands in for a badly placed or dead electrode;
    the rest is generic regularisation.
    """

    def __init__(self, amp_jitter=0.35, channel_dropout=0.15, noise_std=0.02,
                 time_shift=0.1, seed: int = 0):
        self.amp_jitter = amp_jitter
        self.channel_dropout = channel_dropout
        self.noise_std = noise_std
        self.time_shift = time_shift
        self.g = torch.Generator().manual_seed(seed)

    def __call__(self, x: torch.Tensor) -> torch.Tensor:
        B, C, T = x.shape
        if self.amp_jitter > 0:
            gain = torch.exp(torch.randn(B, C, 1, generator=self.g) * self.amp_jitter)
            x = x * gain
        if self.channel_dropout > 0:
            keep = (torch.rand(B, C, 1, generator=self.g) > self.channel_dropout).float()
            keep = torch.where(keep.sum(1, keepdim=True) == 0, torch.ones_like(keep), keep)
            x = x * keep
        if self.noise_std > 0:
            scale = x.abs().mean(dim=(1, 2), keepdim=True).clamp_min(1e-8)
            x = x + torch.randn(x.shape, generator=self.g) * self.noise_std * scale
        if self.time_shift > 0:
            k = int(T * self.time_shift)
            if k > 0:
                shift = int(torch.randint(-k, k + 1, (1,), generator=self.g).item())
                x = torch.roll(x, shifts=shift, dims=2)
        return x
