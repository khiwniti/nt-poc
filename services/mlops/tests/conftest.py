"""Pytest configuration"""
import sys
from pathlib import Path

# Add MLOps service root to Python path so `import src.*` works.
mlops_root = Path(__file__).parent.parent
sys.path.insert(0, str(mlops_root))
