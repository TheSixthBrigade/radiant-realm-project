"""
Polymorphic Build Seed System (PBS) for the Luraph-style obfuscator.

This module provides entropy-based seed generation and deterministic random
methods to ensure each obfuscation build produces unique output while
maintaining reproducibility when the same seed is used.

Requirements: 1.1, 1.2, 1.3
"""

import hashlib
import os
import random
import time
from typing import Any, List, Optional, TypeVar

T = TypeVar('T')


class PolymorphicBuildSeed:
    """
    Polymorphic Build Seed System for generating unique obfuscation builds.
    
    Each instance generates a unique seed from multiple entropy sources
    (timestamp, process ID, random bytes) to ensure every build produces
    structurally different output. When the same seed is provided, the
    output is deterministic and reproducible.
    
    Attributes:
        seed: The integer seed value used for all random operations
        rng: Random number generator seeded with the build seed
    
    Example:
        >>> pbs = PolymorphicBuildSeed()  # Random seed
        >>> pbs.get_random_int(0, 100)
        42
        
        >>> pbs2 = PolymorphicBuildSeed(seed=12345)  # Fixed seed
        >>> pbs2.get_random_int(0, 100)  # Always same result
        67
    """
    
    def __init__(self, seed: Optional[int] = None):
        """
        Initialize the Polymorphic Build Seed System.
        
        Args:
            seed: Optional seed value. If None, generates entropy-based seed.
        """
        if seed is not None:
            self.seed = seed
        else:
            self.seed = self._generate_entropy_seed()
        
        self.rng = random.Random(self.seed)
    
    def _generate_entropy_seed(self) -> int:
        """
        Generate a unique seed from multiple entropy sources.
        
        Combines:
        - Current timestamp (nanoseconds)
        - Process ID
        - Random bytes from OS
        - Memory address of this object
        
        Returns:
            A unique integer seed value
        """
        # Collect entropy from multiple sources
        entropy_parts = []
        
        # High-resolution timestamp
        timestamp = time.time_ns()
        entropy_parts.append(timestamp.to_bytes(8, 'big'))
        
        # Process ID
        pid = os.getpid()
        entropy_parts.append(pid.to_bytes(4, 'big'))
        
        # Random bytes from OS (cryptographically secure)
        random_bytes = os.urandom(16)
        entropy_parts.append(random_bytes)
        
        # Memory address of this object (adds uniqueness per instance)
        obj_id = id(self)
        entropy_parts.append(obj_id.to_bytes(8, 'big'))
        
        # Combine all entropy sources
        combined = b''.join(entropy_parts)
        
        # Hash to get uniform distribution
        hash_digest = hashlib.sha256(combined).digest()
        
        # Convert to integer (use first 8 bytes for reasonable size)
        seed = int.from_bytes(hash_digest[:8], 'big')
        
        return seed
    
    def get_random_int(self, min_val: int, max_val: int) -> int:
        """
        Get a deterministic random integer in the specified range.
        
        Args:
            min_val: Minimum value (inclusive)
            max_val: Maximum value (inclusive)
        
        Returns:
            Random integer between min_val and max_val
        
        Example:
            >>> pbs = PolymorphicBuildSeed(seed=42)
            >>> pbs.get_random_int(1, 10)
            2
        """
        return self.rng.randint(min_val, max_val)
    
    def get_random_float(self, min_val: float = 0.0, max_val: float = 1.0) -> float:
        """
        Get a deterministic random float in the specified range.
        
        Args:
            min_val: Minimum value (inclusive)
            max_val: Maximum value (exclusive)
        
        Returns:
            Random float between min_val and max_val
        """
        return self.rng.uniform(min_val, max_val)
    
    def shuffle(self, items: List[T]) -> List[T]:
        """
        Return a deterministically shuffled copy of the list.
        
        Args:
            items: List to shuffle
        
        Returns:
            New list with items in shuffled order
        
        Example:
            >>> pbs = PolymorphicBuildSeed(seed=42)
            >>> pbs.shuffle([1, 2, 3, 4, 5])
            [3, 1, 5, 2, 4]
        """
        result = items.copy()
        self.rng.shuffle(result)
        return result
    
    def choice(self, items: List[T]) -> T:
        """
        Return a deterministic random choice from the list.
        
        Args:
            items: List to choose from (must not be empty)
        
        Returns:
            Randomly selected item from the list
        
        Raises:
            IndexError: If items is empty
        
        Example:
            >>> pbs = PolymorphicBuildSeed(seed=42)
            >>> pbs.choice(['a', 'b', 'c'])
            'b'
        """
        return self.rng.choice(items)
    
    def choices(self, items: List[T], k: int) -> List[T]:
        """
        Return k deterministic random choices from the list (with replacement).
        
        Args:
            items: List to choose from (must not be empty)
            k: Number of items to choose
        
        Returns:
            List of k randomly selected items
        
        Example:
            >>> pbs = PolymorphicBuildSeed(seed=42)
            >>> pbs.choices(['a', 'b', 'c'], 5)
            ['b', 'a', 'c', 'b', 'a']
        """
        return self.rng.choices(items, k=k)
    
    def sample(self, items: List[T], k: int) -> List[T]:
        """
        Return k deterministic random choices from the list (without replacement).
        
        Args:
            items: List to choose from
            k: Number of items to choose (must be <= len(items))
        
        Returns:
            List of k unique randomly selected items
        
        Raises:
            ValueError: If k > len(items)
        
        Example:
            >>> pbs = PolymorphicBuildSeed(seed=42)
            >>> pbs.sample(['a', 'b', 'c', 'd'], 2)
            ['c', 'a']
        """
        return self.rng.sample(items, k)
    
    def random_bool(self, probability: float = 0.5) -> bool:
        """
        Return a deterministic random boolean.
        
        Args:
            probability: Probability of returning True (0.0 to 1.0)
        
        Returns:
            True with the specified probability, False otherwise
        
        Example:
            >>> pbs = PolymorphicBuildSeed(seed=42)
            >>> pbs.random_bool(0.7)
            True
        """
        return self.rng.random() < probability
    
    def get_seed(self) -> int:
        """
        Get the current seed value.
        
        Returns:
            The seed value used for this instance
        """
        return self.seed
    
    def __repr__(self) -> str:
        return f"PolymorphicBuildSeed(seed={self.seed})"
