"""
Transform modules for the Luraph-style obfuscator.

This package contains code transformation passes:
- LuraphNumberTransformer: Number obfuscation (hex, binary, computed)
- TableIndirectionGenerator: Nested table access patterns
- ComputedIndexGenerator: Computed index expressions
- DeepExpressionWrapper: Expression nesting (3-5 levels)
- ArithmeticExpressionWrapper: Bit32 operation wrapping
- WrapperObjectGenerator: Wrapper table generation
- ExpressionNormalizer: Uniform complexity wrapping
- StateMachineConverter: Control flow flattening (7 states, 15 patterns)
- WhileLoopWrapper: While loop wrapping
- IfElseChainExpander: If-else chain expansion
- AnonymousFunctionWrapper: Anonymous function wrapping
- RepeatUntilInjector: Repeat-until injection
- ForLoopEnhancer: For loop enhancement
- ContinueBreakNester: Continue/break nesting
- LuraphControlFlowTransformer: Universal deep nesting (4-6 levels)
- StringEncryptionHelper: String encryption (_SC function)
- StringFragmenter: Delayed string assembly
- StringTableEncryptor: String table encryption
- TypeStringEncoder: ttisXXX string encoding
- FieldNameObfuscator: Field name obfuscation
- BytecodeStringSplitter: 4-part string splitting
- UnicodeEscapeGenerator: Unicode escape sequences
- StringObfuscationTransformer: Main string obfuscation interface
- UltraAggressiveVariableRenamer: 7-pass variable renaming
- LuraphParameterTransformer: 10-character parameter names
- FunctionNameAliaser: Single-letter function names
- GlobalAliasesGenerator: Global reference aliases
- MetamethodStringAliaser: Metamethod string aliases
- VariableRenamingTransformer: Main variable renaming interface
- AntiAnalysisInjector: Anti-analysis features
- DeadCodeInjector: Dead code insertion
- DenseFormatter: Single-line minification
"""

from .numbers import LuraphNumberTransformer
from .tables import TableIndirectionGenerator, ComputedIndexGenerator
from .expressions import (
    DeepExpressionWrapper,
    ArithmeticExpressionWrapper,
    WrapperObjectGenerator,
    ExpressionNormalizer,
)
from .control_flow import (
    StateMachineConverter,
    WhileLoopWrapper,
    IfElseChainExpander,
    AnonymousFunctionWrapper,
    RepeatUntilInjector,
    ForLoopEnhancer,
    ContinueBreakNester,
    LuraphControlFlowTransformer,
)
from .strings import (
    StringEncryptionHelper,
    StringFragmenter,
    StringTableEncryptor,
    TypeStringEncoder,
    FieldNameObfuscator,
    BytecodeStringSplitter,
    UnicodeEscapeGenerator,
    StringObfuscationTransformer,
)
from .variables import (
    UltraAggressiveVariableRenamer,
    LuraphParameterTransformer,
    FunctionNameAliaser,
    GlobalAliasesGenerator,
    MetamethodStringAliaser,
    VariableRenamingTransformer,
)
# Anti-analysis is imported directly in obfuscate.py from transforms.anti_analysis
# Placeholder for backward compatibility
class AntiAnalysisTransformer:
    def __init__(self, seed):
        pass
from .state_machines import (
    SevenStateMachine,
    ControlFlowFlattener,
    InterProceduralFlattener,
    ComputedStateTransitions,
    StateMachineWrappers,
    StateMachineSystem,
)
from .dead_code import (
    DeadCodeInjector,
    FakeBranchGenerator,
    FakeControlFlowGenerator,
    DecoyFunctionGenerator,
    DecoyConstantGenerator,
    DeadCodeTransformer,
)
from .formatter import (
    DenseFormatter,
    DensityNormalizer,
    PrettyPrinter,
    dense_format,
    pretty_print,
    normalize_density,
)
from .luraph_style import (
    LuraphFunctionTransformer,
    LuraphStatementFormatter,
    LargeIndexGenerator,
    LuraphPatternLibrary,
    VMTemplateTransformer,
    HandlerBodyDensifier,
    ConstantPoolReferenceInjector,
    LuraphExpressionGenerator,
    LuraphStyleTransformer,
)
from .miscellaneous import (
    PolymorphicConstants,
    ExecutionRandomization,
    MetatableTraps,
    VariableShadowing,
    NestedTernaryExpressions,
    DotToBracketConverter,
    BooleanLiteralObfuscation,
    MiscellaneousTransformer,
)
from .roblox_protection import (
    AntiExecutorDetection,
    EnvironmentValidation,
    CallerValidation,
    HeartbeatTiming,
    DeferredExecution,
    MetatableTraps as RobloxMetatableTraps,
    RobloxProtectionTransformer,
)
from .vm_template import (
    VMStdlibTransformer,
    transform_vm_stdlib,
)
from .constant_protection import (
    StringConstantEncryption,
    ConstantFoldingReversal,
    VMInstructionSplitter,
    ConstantProtectionIntegrator,
    VMStringEncryptor,
)
from .source_preprocessing import (
    DeadCodeInjector,
    StringSplitter,
    ControlFlowInjector,
    VariableMutator,
    SourcePreprocessor,
)
from .opaque_predicates import EnhancedOpaquePredicates
from .runtime_protection import (
    SelfModifyingCode,
    AntiDumpProtection,
    RuntimeProtectionIntegrator,
)
from .instruction_splitting import (
    InstructionSplitter,
    InstructionSplitterIntegrator,
)
from .anti_deobfuscation import (
    AntiEmulationChecks,
    CodeIntegrityVerification,
    HandlerPolymorphism,
    AntiDeobfuscationIntegrator,
)

# Ultra-deep nesting system (EXCEEDS Luraph)
from .ultra_nesting import (
    MultiTableNestingSystem,
    UltraNestingConfig,
    create_ultra_nesting_system,
)

# Ultra string encryption (EXCEEDS Luraph)
from .ultra_strings import (
    UltraStringEncryptor,
    UltraStringConfig,
    create_ultra_string_encryptor,
)

# Computed index generator
from .computed_indices import (
    ComputedIndexGenerator as UltraComputedIndexGenerator,
    ComputedIndexConfig,
    create_computed_index_generator,
)

# Decoy code generator
from .decoy_code import (
    DecoyCodeGenerator,
    DecoyCodeConfig,
    create_decoy_code_generator,
)

# Number diversity formatter
from .number_diversity import (
    NumberDiversityFormatter,
    NumberDiversityConfig,
    create_number_diversity_formatter,
)

__all__ = [
    'LuraphNumberTransformer',
    'TableIndirectionGenerator',
    'ComputedIndexGenerator',
    'DeepExpressionWrapper',
    'ArithmeticExpressionWrapper',
    'WrapperObjectGenerator',
    'ExpressionNormalizer',
    'StateMachineConverter',
    'WhileLoopWrapper',
    'IfElseChainExpander',
    'AnonymousFunctionWrapper',
    'RepeatUntilInjector',
    'ForLoopEnhancer',
    'ContinueBreakNester',
    'LuraphControlFlowTransformer',
    'StringEncryptionHelper',
    'StringFragmenter',
    'StringTableEncryptor',
    'TypeStringEncoder',
    'FieldNameObfuscator',
    'BytecodeStringSplitter',
    'UnicodeEscapeGenerator',
    'StringObfuscationTransformer',
    'UltraAggressiveVariableRenamer',
    'LuraphParameterTransformer',
    'FunctionNameAliaser',
    'GlobalAliasesGenerator',
    'MetamethodStringAliaser',
    'VariableRenamingTransformer',
    'AdvancedAntiAnalysis',
    'ControlFlowFlattener',
    'AntiAnalysisTransformer',
    # State Machine components (Requirement 29)
    'SevenStateMachine',
    'ControlFlowFlattener',
    'InterProceduralFlattener',
    'ComputedStateTransitions',
    'StateMachineWrappers',
    'StateMachineSystem',
    # Dead Code and Decoys (Requirement 30)
    'DeadCodeInjector',
    'FakeBranchGenerator',
    'FakeControlFlowGenerator',
    'DecoyFunctionGenerator',
    'DecoyConstantGenerator',
    'DeadCodeTransformer',
    # Output Formatting (Requirements 7.2, 31.1-31.4)
    'DenseFormatter',
    'DensityNormalizer',
    'PrettyPrinter',
    'dense_format',
    'pretty_print',
    'normalize_density',
    # Luraph-Style Transforms (Requirement 32)
    'LuraphFunctionTransformer',
    'LuraphStatementFormatter',
    'LargeIndexGenerator',
    'LuraphPatternLibrary',
    'VMTemplateTransformer',
    'HandlerBodyDensifier',
    'ConstantPoolReferenceInjector',
    'LuraphExpressionGenerator',
    'LuraphStyleTransformer',
    # Miscellaneous Features (Requirement 33)
    'PolymorphicConstants',
    'ExecutionRandomization',
    'MetatableTraps',
    'VariableShadowing',
    'NestedTernaryExpressions',
    'DotToBracketConverter',
    'BooleanLiteralObfuscation',
    'MiscellaneousTransformer',
    # Roblox-Specific Protection (Beat-Luraph Requirements)
    'AntiExecutorDetection',
    'EnvironmentValidation',
    'CallerValidation',
    'HeartbeatTiming',
    'DeferredExecution',
    'RobloxMetatableTraps',
    'RobloxProtectionTransformer',
    # Constant Protection (String Encryption, Constant Unfolding, Instruction Splitting)
    'StringConstantEncryption',
    'ConstantFoldingReversal',
    'VMInstructionSplitter',
    'ConstantProtectionIntegrator',
    'VMStringEncryptor',
    # Source Preprocessing (Pre-bytecode transforms)
    'DeadCodeInjector',
    'StringSplitter',
    'ControlFlowInjector',
    'VariableMutator',
    'SourcePreprocessor',
    # Enhanced Opaque Predicates
    'EnhancedOpaquePredicates',
    # Runtime Protection (Self-Modifying Code, Anti-Dump)
    'SelfModifyingCode',
    'AntiDumpProtection',
    'RuntimeProtectionIntegrator',
    # Instruction Splitting
    'InstructionSplitter',
    'InstructionSplitterIntegrator',
    # Anti-Deobfuscation Protection
    'AntiEmulationChecks',
    'CodeIntegrityVerification',
    'HandlerPolymorphism',
    'AntiDeobfuscationIntegrator',
    # Ultra-Deep Nesting (EXCEEDS Luraph)
    'MultiTableNestingSystem',
    'UltraNestingConfig',
    'create_ultra_nesting_system',
    # Ultra String Encryption (EXCEEDS Luraph)
    'UltraStringEncryptor',
    'UltraStringConfig',
    'create_ultra_string_encryptor',
    # Computed Index Generator
    'UltraComputedIndexGenerator',
    'ComputedIndexConfig',
    'create_computed_index_generator',
    # Decoy Code Generator
    'DecoyCodeGenerator',
    'DecoyCodeConfig',
    'create_decoy_code_generator',
    # Number Diversity Formatter
    'NumberDiversityFormatter',
    'NumberDiversityConfig',
    'create_number_diversity_formatter',
]
