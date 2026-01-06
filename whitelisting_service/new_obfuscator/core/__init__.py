"""
Core systems for the Luraph-style Luau obfuscator.

This package contains the fundamental building blocks:
- PolymorphicBuildSeed (PBS): Entropy-based seed generation
- UnifiedNamingSystem (UNS): 31-character confusing variable names
- BitwiseWrapperSystem (BWS): bit32 operation aliases
- ConstantPoolManager (CPM): Large non-sequential constant indices
- OpaquePredicateGenerator (OPG): Always-true/false conditions
- OutputValidator: Syntax validation using luau-compile.exe
- StdlibMapper: Maps stdlib functions to short keys for Luraph-style output
"""

from .seed import PolymorphicBuildSeed
from .naming import UnifiedNamingSystem, ROBLOX_GLOBALS
from .bitwise import BitwiseWrapperSystem
from .constants import ConstantPoolManager
from .predicates import OpaquePredicateGenerator
from .validator import OutputValidator, ValidationResult
from .stdlib_mapper import StdlibMapper
from .script_type import ScriptType, ScriptTypeDetector
from .module_wrapper import ModuleWrapper

__all__ = [
    'PolymorphicBuildSeed',
    'UnifiedNamingSystem',
    'ROBLOX_GLOBALS',
    'BitwiseWrapperSystem',
    'ConstantPoolManager',
    'OpaquePredicateGenerator',
    'OutputValidator',
    'ValidationResult',
    'StdlibMapper',
    'ScriptType',
    'ScriptTypeDetector',
    'ModuleWrapper',
]
