"""
VM modules for the Luraph-style obfuscator.

This package contains:
- FIUVMGenerator: Generates obfuscated VM code from Virtualization.lua
- NestedVMGenerator: Creates VM inside VM with key rotation
- DecoyVMGenerator: Creates fake VM structures that are never executed
- TableBasedDispatch: Table lookup dispatch with metamorphic handlers
- LayeredEncryption: Multi-layer bytecode encryption
- UltraStrongEncryption: 4-layer Feistel cipher encryption (STRONGER than Luraph!)
- BytecodeEncryptor: High-level bytecode encryption interface
- RuntimeKeyDerivation: Runtime key derivation from environment sources
- RuntimeKeyIntegrator: Integrates runtime key derivation into encryption
- VM template manipulation utilities

Requirements: 20.x, 21.x, 22.x, 23.x, 24.x, 25.x, 4.x
"""

from .generator import FIUVMGenerator, DecoyVMGenerator
from .nested import NestedVMGenerator
from .dispatch import TableBasedDispatch
from .encryption import LayeredEncryption, BytecodeEncryptor, RuntimeKeyDerivation, RuntimeKeyIntegrator, UltraStrongEncryption

__all__ = [
    'FIUVMGenerator',
    'NestedVMGenerator',
    'DecoyVMGenerator',
    'TableBasedDispatch',
    'LayeredEncryption',
    'UltraStrongEncryption',
    'BytecodeEncryptor',
    'RuntimeKeyDerivation',
    'RuntimeKeyIntegrator',
]
