"""Simulated sensor implementation with LRU caching for production scale.

This module provides a realistic battery sensor simulator with:
- Temporal drift (SoC/SoH degradation over time)
- Correlated values (voltage depends on SoC, temperature on current)
- Configurable noise for testing robustness
- Deterministic behavior when seeded (for testing)
- LRU caching for efficient memory management at scale (1,944+ batteries)
"""

import logging
from datetime import datetime, timedelta
from typing import Any, Dict, Optional

import numpy as np
from cachetools import LRUCache

from app.interfaces.sensor_interface import SensorInterface
from app.models.sensor_data import BatteryMetrics, BatteryState, SensorReading

logger = logging.getLogger(__name__)


class SimulatorSensor(SensorInterface):
    """Simulated sensor backend for testing and development.

    Features:
    - Realistic battery behavior (Li-ion discharge curves)
    - Temporal drift (SoC decreases, SoH degrades)
    - Correlated parameters (V-SoC, T-I relationships)
    - Configurable noise and drift
    - Deterministic with seed for testing
    - LRU cache for memory-efficient handling of 1,944+ batteries
    """

    def __init__(
        self,
        seed: Optional[int] = None,
        noise_level: float = 0.02,
        drift_enabled: bool = True,
        update_interval_ms: int = 1000,
        soc_decay_rate: float = 0.1,
        cache_size: int = 500,
    ):
        """Initialize simulator.

        Args:
            seed: Random seed for deterministic behavior (None = random)
            noise_level: Gaussian noise level (0.0-1.0)
            drift_enabled: Enable temporal drift
            update_interval_ms: Min interval between state updates
            soc_decay_rate: SoC decay per minute
            soh_decay_rate: SoH decay per charge cycle
            cache_size: Maximum number of battery states to cache (LRU eviction)
        """
        # Use LRU cache for memory efficiency at production scale
        self._battery_states: LRUCache[str, BatteryState] = LRUCache(maxsize=cache_size)
        self._rng = np.random.default_rng(seed)
        self._noise_level = noise_level
        self._drift_enabled = drift_enabled
        self._update_interval = timedelta(milliseconds=update_interval_ms)
        self._soc_decay_rate = soc_decay_rate
        self._soh_decay_rate = soh_decay_rate
        self._cache_size = cache_size
        self._initialized = False
        self._cache_hits = 0
        self._cache_misses = 0

        logger.info(
            f"Simulator initialized: seed={seed}, noise={noise_level}, "
            f"drift={drift_enabled}, cache_size={cache_size}"
        )

    async def initialize(self) -> None:
        """Initialize simulator."""
        self._initialized = True
        logger.info(f"Simulator ready with LRU cache (size={self._cache_size})")

    async def get_reading(self, battery_system_id: str) -> Dict[str, Any]:
        """Get sensor reading with realistic battery behavior.

        Args:
            battery_system_id: Battery system identifier

        Returns:
            Dict with voltage, current, temperature, soc, soh, power, timestamp
        """
        if not self._initialized:
            raise RuntimeError("Simulator not initialized")

        # Get or create battery state (LRU cached)
        state = self._get_or_create_state(battery_system_id)

        # Apply temporal drift if enabled
        if self._drift_enabled:
            self._apply_drift(state)

        # Generate correlated sensor values
        voltage = self._generate_voltage(state)
        current = self._generate_current(state)
        temperature = self._generate_temperature(state, current)
        soc = state.soc
        soh = state.soh
        power = voltage * current

        # Create reading
        reading = SensorReading(
            battery_system_id=battery_system_id,
            voltage=voltage,
            current=current,
            temperature=temperature,
            soc=soc,
            soh=soh,
            power=power,
            timestamp=datetime.utcnow(),
            metadata={"cycle_count": state.cycle_count},
        )

        return reading.model_dump()

    async def get_metrics(self, battery_system_id: str) -> Dict[str, Any]:
        """Get aggregated metrics."""
        current_reading_dict = await self.get_reading(battery_system_id)
        current_reading = SensorReading(**current_reading_dict)

        state = self._battery_states.get(battery_system_id)

        metrics = BatteryMetrics(
            battery_system_id=battery_system_id,
            current_reading=current_reading,
            statistics={
                "voltage_nominal": 3.7,
                "capacity_ah": 100.0,
                "cycles_total": state.cycle_count if state else 0,
            },
            health_indicators={
                "degradation_rate": self._soh_decay_rate,
                "estimated_eol_cycles": int((state.soh - 70) / self._soh_decay_rate)
                if state and self._soh_decay_rate > 0
                else 0,
            },
        )

        return metrics.model_dump()

    async def health_check(self) -> Dict[str, Any]:
        """Check simulator health."""
        cache_hit_rate = (
            self._cache_hits / (self._cache_hits + self._cache_misses)
            if (self._cache_hits + self._cache_misses) > 0
            else 0.0
        )

        return {
            "backend_type": "simulator",
            "status": "healthy" if self._initialized else "unhealthy",
            "details": {
                "batteries_tracked": len(self._battery_states),
                "cache_size": self._cache_size,
                "cache_utilization": len(self._battery_states) / self._cache_size,
                "cache_hit_rate": round(cache_hit_rate, 3),
                "cache_hits": self._cache_hits,
                "cache_misses": self._cache_misses,
                "drift_enabled": self._drift_enabled,
                "noise_level": self._noise_level,
            },
            "timestamp": datetime.utcnow().isoformat(),
        }

    async def shutdown(self) -> None:
        """Clean shutdown."""
        logger.info(
            f"Simulator shutdown - Cache stats: hits={self._cache_hits}, "
            f"misses={self._cache_misses}, size={len(self._battery_states)}"
        )
        self._battery_states.clear()
        self._initialized = False
        logger.info("Simulator shutdown complete")

    def _get_or_create_state(self, battery_system_id: str) -> BatteryState:
        """Get existing state or create new one (LRU cached)."""
        if battery_system_id in self._battery_states:
            self._cache_hits += 1
            return self._battery_states[battery_system_id]

        self._cache_misses += 1

        # Initialize with realistic starting values
        new_state = BatteryState(
            battery_system_id=battery_system_id,
            soc=self._rng.uniform(70.0, 95.0),  # Start partially charged
            soh=self._rng.uniform(90.0, 98.0),  # Start with good health
            temperature=self._rng.uniform(20.0, 28.0),  # Room temperature
            cycle_count=int(self._rng.uniform(0, 200)),
            last_updated=datetime.utcnow(),
            discharge_rate=self._rng.uniform(-15.0, -5.0),  # Typical discharge
        )

        # Store in LRU cache
        self._battery_states[battery_system_id] = new_state

        if self._cache_misses % 100 == 0:
            logger.debug(
                f"Cache stats: size={len(self._battery_states)}/{self._cache_size}, "
                f"hits={self._cache_hits}, misses={self._cache_misses}"
            )

        return new_state

    def _apply_drift(self, state: BatteryState) -> None:
        """Apply temporal drift to battery state."""
        now = datetime.utcnow()
        elapsed = (now - state.last_updated).total_seconds()

        # Only update if enough time has passed
        if elapsed < self._update_interval.total_seconds():
            return

        # SoC decreases over time (discharge)
        minutes_elapsed = elapsed / 60.0
        soc_decrease = self._soc_decay_rate * minutes_elapsed
        state.soc = max(0.0, state.soc - soc_decrease)

        # Increment cycle count probabilistically
        cycle_probability = elapsed / 3600.0  # ~1 cycle per hour
        if self._rng.random() < cycle_probability:
            state.cycle_count += 1
            # SoH degrades with cycles
            state.soh = max(70.0, state.soh - self._soh_decay_rate)

        state.last_updated = now

    def _generate_voltage(self, state: BatteryState) -> float:
        """Generate voltage correlated with SoC (Li-ion discharge curve)."""
        # Typical Li-ion voltage range: 3.0V (empty) to 4.2V (full)
        # Relationship is non-linear but simplified here
        base_voltage = 3.0 + (state.soc / 100.0) * 1.2

        # Add noise
        noise = self._rng.normal(0, self._noise_level * 0.1)
        voltage = base_voltage + noise

        # Clamp to realistic range
        return float(np.clip(voltage, 2.8, 4.3))

    def _generate_current(self, state: BatteryState) -> float:
        """Generate current (negative = discharge, positive = charge)."""
        # Use state's discharge rate as base
        base_current = state.discharge_rate

        # Add noise
        noise = self._rng.normal(0, self._noise_level * 2.0)
        current = base_current + noise

        # Clamp to realistic range
        return float(np.clip(current, -50.0, 50.0))

    def _generate_temperature(self, state: BatteryState, current: float) -> float:
        """Generate temperature affected by current flow (I²R heating)."""
        # Base temperature from state
        base_temp = state.temperature

        # Heat generation proportional to current squared
        heat_factor = 0.05  # Calibration factor
        heat = heat_factor * (current**2)

        # Ambient cooling
        ambient_temp = 25.0
        cooling_rate = 0.1
        cooling = cooling_rate * (base_temp - ambient_temp)

        # Update state temperature with thermal dynamics
        new_temp = base_temp + heat - cooling

        # Add noise
        noise = self._rng.normal(0, self._noise_level * 0.5)
        temperature = new_temp + noise

        # Clamp to realistic range
        temperature = float(np.clip(temperature, 15.0, 45.0))

        # Update state for next reading
        state.temperature = temperature

        return temperature