"""Battery usage pattern generators."""
import numpy as np

class UsagePatterns:
    """Common battery usage patterns for simulation."""

    @staticmethod
    def charge_discharge_cycle(
        num_cycles: int,
        points_per_cycle: int = 100
    ) -> np.ndarray:
        """Generate charge-discharge cycle pattern."""
        cycles = []
        for _ in range(num_cycles):
            discharge = np.linspace(100, 20, points_per_cycle // 2)
            charge = np.linspace(20, 100, points_per_cycle // 2)
            cycles.extend(discharge)
            cycles.extend(charge)
        return np.array(cycles)
