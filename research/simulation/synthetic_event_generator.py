"""Synthetic Ground-Truth Event Generator for 1D ADE River Screening.

Generates reproducible controlled contamination episodes with unambiguous ground-truth
labels, injection parameters, and transparent train/calibration/test partition splits.

Observability Limitation Note:
Attempting to distinguish 12 candidate discharge points using only 3 downstream
sensor stations is inherently underdetermined. Two sources situated between the
same two stations with close river chainages will produce overlapping dispersion
profiles at downstream receptors. This generator documents spatial chainages and
provides ground truth against which selective abstention can be verified.
"""

from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from typing import Dict, List, Optional, Tuple

import numpy as np

from .river_ade_simulator import (
    CandidateSource,
    RiverADESimulator,
    SimulationConfig,
    SimulationResult,
    SpillInjection,
)


@dataclass
class GroundTruthEventMeta:
    event_id: str
    true_source_id: str
    source_name: str
    chainage_m: float
    start_time_sec: float
    duration_sec: float
    mass_rate_gps: float
    total_mass_grams: float
    is_background: bool
    seed: int


@dataclass
class EpisodeDataset:
    episodes: List[SimulationResult]
    metadata: List[GroundTruthEventMeta]

    def get_event_ids(self) -> List[str]:
        return [m.event_id for m in self.metadata]

    def get_by_id(self, event_id: str) -> Optional[Tuple[SimulationResult, GroundTruthEventMeta]]:
        for ep, meta in zip(self.episodes, self.metadata):
            if ep.event_id == event_id:
                return ep, meta
        return None


class SyntheticEventGenerator:
    """Generates parameterized synthetic release and clean background episodes."""

    def __init__(self, config: SimulationConfig) -> None:
        self.config = config
        self.simulator = RiverADESimulator(config)
        self.sources = {s.source_id: s for s in config.sources}

    def generate_single_event(
        self,
        event_id: str,
        source_id: str,
        seed: int,
        start_time_sec: Optional[float] = None,
        duration_sec: Optional[float] = None,
        mass_rate_gps: Optional[float] = None,
    ) -> Tuple[SimulationResult, GroundTruthEventMeta]:
        """Generates a single reproducible spill or background event."""
        rng = np.random.default_rng(seed)

        is_background = source_id in ("s0_background", "BACKGROUND", "NONE")

        if is_background:
            true_source_id = "s0_background"
            source_name = "Background River Flow (No Industrial Spill)"
            chainage_m = 0.0
            actual_start = 0.0
            actual_duration = 0.0
            actual_rate = 0.0
            total_mass = 0.0
            injections: List[SpillInjection] = []
        else:
            if source_id not in self.sources:
                raise ValueError(
                    f"Unknown source_id '{source_id}'. Must be one of: {list(self.sources.keys())} or 's0_background'"
                )
            src = self.sources[source_id]
            true_source_id = src.source_id
            source_name = src.name
            chainage_m = src.chainage_m

            # Default parameterized random ranges if not overridden
            # Spill start between 1h and 6h into the 24h day
            actual_start = start_time_sec if start_time_sec is not None else float(rng.uniform(3600.0, 21600.0))
            # Duration between 1h and 3h (3600s - 10800s)
            actual_duration = duration_sec if duration_sec is not None else float(rng.uniform(3600.0, 10800.0))
            # Mass rate around nominal with ±25% variation
            nominal_rate = src.nominal_mass_rate_gps
            actual_rate = mass_rate_gps if mass_rate_gps is not None else float(rng.uniform(0.75 * nominal_rate, 1.25 * nominal_rate))
            total_mass = actual_rate * actual_duration

            injections = [
                SpillInjection(
                    source_id=true_source_id,
                    chainage_m=chainage_m,
                    start_time_sec=actual_start,
                    duration_sec=actual_duration,
                    mass_rate_gps=actual_rate,
                )
            ]

        meta = GroundTruthEventMeta(
            event_id=event_id,
            true_source_id=true_source_id,
            source_name=source_name,
            chainage_m=chainage_m,
            start_time_sec=actual_start,
            duration_sec=actual_duration,
            mass_rate_gps=actual_rate,
            total_mass_grams=total_mass,
            is_background=is_background,
            seed=seed,
        )

        sim_result = self.simulator.run_simulation(
            event_id=event_id,
            injections=injections,
            true_source_id=true_source_id,
        )

        return sim_result, meta

    def generate_suite(
        self,
        n_events: int = 100,
        base_seed: int = 42,
        background_ratio: float = 0.10,
    ) -> EpisodeDataset:
        """Generates a balanced batch of synthetic episodes across all candidate sources."""
        if n_events <= 0:
            raise ValueError(f"n_events must be positive, got {n_events}")
        if not (0.0 <= background_ratio <= 1.0):
            raise ValueError(f"background_ratio must be between 0 and 1, got {background_ratio}")

        rng = np.random.default_rng(base_seed)
        source_keys = list(self.sources.keys())

        episodes: List[SimulationResult] = []
        metadata: List[GroundTruthEventMeta] = []

        n_bg = int(np.round(n_events * background_ratio))
        n_industrial = n_events - n_bg

        # Balanced assignment of industrial sources
        assigned_sources: List[str] = ["s0_background"] * n_bg
        for i in range(n_industrial):
            assigned_sources.append(source_keys[i % len(source_keys)])

        # Shuffle event order deterministically
        rng.shuffle(assigned_sources)

        for i, src_id in enumerate(assigned_sources):
            event_seed = int(rng.integers(1, 10_000_000))
            event_id = f"ev_{i+1:05d}_{src_id}"
            res, meta = self.generate_single_event(
                event_id=event_id,
                source_id=src_id,
                seed=event_seed,
            )
            episodes.append(res)
            metadata.append(meta)

        return EpisodeDataset(episodes=episodes, metadata=metadata)


def partition_dataset(
    dataset: EpisodeDataset,
    train_ratio: float = 0.60,
    val_ratio: float = 0.20,
    test_ratio: float = 0.20,
    seed: int = 42,
) -> Tuple[EpisodeDataset, EpisodeDataset, EpisodeDataset]:
    """Partitions an episode dataset into strictly disjoint Train, Validation, and Test splits."""
    total_ratio = train_ratio + val_ratio + test_ratio
    if not np.isclose(total_ratio, 1.0, atol=1e-5):
        raise ValueError(f"Split ratios must sum to 1.0, got {total_ratio}")

    n = len(dataset.metadata)
    if n < 3:
        raise ValueError("Dataset must contain at least 3 episodes to partition")

    rng = np.random.default_rng(seed)
    indices = np.arange(n)
    rng.shuffle(indices)

    n_train = int(np.round(n * train_ratio))
    n_val = int(np.round(n * val_ratio))

    train_idx = indices[:n_train]
    val_idx = indices[n_train : n_train + n_val]
    test_idx = indices[n_train + n_val :]

    # Ensure all splits have at least 1 element if possible
    if len(train_idx) == 0 or len(val_idx) == 0 or len(test_idx) == 0:
        raise ValueError(f"Partition produced empty split with n={n}. Increase n_events.")

    def _subset(sub_indices: np.ndarray) -> EpisodeDataset:
        return EpisodeDataset(
            episodes=[dataset.episodes[i] for i in sub_indices],
            metadata=[dataset.metadata[i] for i in sub_indices],
        )

    train_set = _subset(train_idx)
    val_set = _subset(val_idx)
    test_set = _subset(test_idx)

    # Integrity verification: Zero episode ID overlap
    train_ids = set(train_set.get_event_ids())
    val_ids = set(val_set.get_event_ids())
    test_ids = set(test_set.get_event_ids())

    assert len(train_ids.intersection(val_ids)) == 0, "Train and Val splits share episode IDs!"
    assert len(train_ids.intersection(test_ids)) == 0, "Train and Test splits share episode IDs!"
    assert len(val_ids.intersection(test_ids)) == 0, "Val and Test splits share episode IDs!"

    return train_set, val_set, test_set


def partition_dataset_four_way(
    dataset: EpisodeDataset,
    train_ratio: float = 0.50,
    cal_ratio: float = 0.20,
    val_ratio: float = 0.15,
    test_ratio: float = 0.15,
    seed: int = 42,
) -> Tuple[EpisodeDataset, EpisodeDataset, EpisodeDataset, EpisodeDataset]:
    """Partitions an episode dataset into strictly disjoint Train, Calibration, Validation, and Test splits.

    Guarantees zero episode ID overlap across all splits to prevent data leakage in selective attribution
    and probability calibration pipelines.
    """
    total_ratio = train_ratio + cal_ratio + val_ratio + test_ratio
    if not np.isclose(total_ratio, 1.0, atol=1e-5):
        raise ValueError(f"Split ratios must sum to 1.0, got {total_ratio}")

    n = len(dataset.metadata)
    if n < 4:
        raise ValueError("Dataset must contain at least 4 episodes to partition four ways")

    rng = np.random.default_rng(seed)
    indices = np.arange(n)
    rng.shuffle(indices)

    n_train = int(np.round(n * train_ratio))
    n_cal = int(np.round(n * cal_ratio))
    n_val = int(np.round(n * val_ratio))

    train_idx = indices[:n_train]
    cal_idx = indices[n_train : n_train + n_cal]
    val_idx = indices[n_train + n_cal : n_train + n_cal + n_val]
    test_idx = indices[n_train + n_cal + n_val :]

    if len(train_idx) == 0 or len(cal_idx) == 0 or len(val_idx) == 0 or len(test_idx) == 0:
        raise ValueError(f"Partition produced empty split with n={n}. Increase n_events.")

    def _subset(sub_indices: np.ndarray) -> EpisodeDataset:
        return EpisodeDataset(
            episodes=[dataset.episodes[i] for i in sub_indices],
            metadata=[dataset.metadata[i] for i in sub_indices],
        )

    train_set = _subset(train_idx)
    cal_set = _subset(cal_idx)
    val_set = _subset(val_idx)
    test_set = _subset(test_idx)

    # Disjointness checks across all split pairs
    train_ids = set(train_set.get_event_ids())
    cal_ids = set(cal_set.get_event_ids())
    val_ids = set(val_set.get_event_ids())
    test_ids = set(test_set.get_event_ids())

    all_pairs = [
        ("Train", "Calibration", train_ids, cal_ids),
        ("Train", "Validation", train_ids, val_ids),
        ("Train", "Test", train_ids, test_ids),
        ("Calibration", "Validation", cal_ids, val_ids),
        ("Calibration", "Test", cal_ids, test_ids),
        ("Validation", "Test", val_ids, test_ids),
    ]

    for name_a, name_b, set_a, set_b in all_pairs:
        overlap = set_a.intersection(set_b)
        assert len(overlap) == 0, f"{name_a} and {name_b} splits share episode IDs: {overlap}"

    return train_set, cal_set, val_set, test_set
