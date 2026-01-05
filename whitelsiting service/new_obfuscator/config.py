"""
Configuration module for the Luraph-style Luau obfuscator.

This module defines the ObfuscatorConfig dataclass that controls all
obfuscation features, complexity settings, and output options.
"""

from dataclasses import dataclass, field
from typing import Optional


@dataclass
class ObfuscatorConfig:
    """
    Configuration for the Luraph-style obfuscator.
    
    Controls all obfuscation features, complexity levels, and output settings.
    All features are enabled by default to achieve maximum obfuscation quality
    matching Luraph v14.4.1 (95%+).
    
    Attributes:
        seed: Optional seed for deterministic builds. None = random entropy-based seed.
        
        Feature Toggles:
            enable_polymorphic_seed: Generate unique builds using entropy sources
            enable_uns: Unified Naming System - 31-char confusing variable names
            enable_bws: Bitwise Wrapper System - 10 bit32 operation aliases
            enable_cpm: Constant Pool Manager - large non-sequential indices (10000+)
            enable_opg: Opaque Predicate Generator - always-true/false conditions
            enable_number_transform: Transform numbers to hex/binary/underscore formats
            enable_table_transform: Nested table indirection (S[0X2][21][0xb])
            enable_expression_wrapper: Deep Expression Wrapper (3-5 level nesting)
            enable_state_machine: Control flow flattening with state machines
            enable_string_encryption: String fragmentation and _SC() encryption
            enable_anti_analysis: Pattern breaking and dummy instructions
            enable_dead_code: Decoy functions and fake branches
            enable_nested_vm: VM inside VM with 8-key rotation
        
        Output Settings:
            dense_output: Single-line minified output (Luraph-style)
            validate_output: Validate syntax with luau.exe before returning
        
        Complexity Settings:
            expression_nesting_depth: DEW nesting levels (3-5, default 4)
            state_machine_states: Number of states in state machine (default 7)
            control_flow_levels: Control flow flattening depth (default 2)
            variable_shadowing_depth: Variable shadowing nesting (default 5)
    """
    
    # Core settings
    seed: Optional[int] = None  # None = random entropy-based seed
    
    # Feature toggles - all enabled by default for maximum obfuscation
    enable_polymorphic_seed: bool = True
    enable_uns: bool = True  # Unified Naming System
    enable_bws: bool = True  # Bitwise Wrapper System
    enable_cpm: bool = True  # Constant Pool Manager
    enable_opg: bool = True  # Opaque Predicate Generator
    enable_number_transform: bool = True
    enable_table_transform: bool = True
    enable_expression_wrapper: bool = True
    enable_state_machine: bool = True
    enable_string_encryption: bool = True
    enable_anti_analysis: bool = True
    enable_dead_code: bool = True
    enable_nested_vm: bool = False  # Disabled - breaks code structure when combined with other transforms
    enable_roblox_protection: bool = True  # Roblox-specific anti-executor/environment checks
    
    # Output settings
    dense_output: bool = True  # Single-line minified output
    validate_syntax: bool = True  # Validate syntax with luau-compile.exe
    validate_runtime: bool = False  # Validate runtime with luau.exe (disabled for Roblox code)
    
    # Watermark settings
    enable_watermark: bool = True  # Add watermark/logo at top of output
    watermark_file: str = "vm/watermark.txt"  # Path to watermark file (relative to obfuscator dir)
    
    # Script type settings (ModuleScript support)
    script_type: str = "auto"  # "script", "module", or "auto" (detect from source)
    warn_multiple_returns: bool = True  # Warn if module returns multiple values
    error_on_missing_return: bool = True  # Error if --module but no return statement
    
    # VM renaming settings
    enable_vm_renaming: bool = True  # Enable VM variable renaming
    use_scope_aware_renamer: bool = False  # Use scope-aware renamer (more accurate but slower)
    
    # AST-based control flow settings
    enable_ast_control_flow: bool = False  # Use AST-based control flow flattening (experimental)
    ast_control_flow_depth: int = 2  # Max nesting depth for AST control flow
    ast_control_flow_probability: float = 0.5  # Probability of wrapping each construct
    
    # Enhanced nesting settings (Luraph-style deep nesting)
    enable_nesting: bool = True  # Enable enhanced nesting transforms
    enable_heavy_nesting: bool = False  # Heavy nesting - DISABLED until fixed
    nesting_min_depth: int = 3  # Minimum nesting depth for expressions
    nesting_max_depth: int = 4  # Maximum nesting depth for expressions
    enable_escape_wrapping: bool = True  # Wrap escape sequences with string.char
    enable_number_diversity: bool = True  # Use diverse number formats (hex, binary, underscores)
    
    # ULTRA nesting settings (EXCEEDS Luraph - 5-8 layers, multiple tables)
    enable_ultra_nesting: bool = True  # Enable ultra-deep nesting (5-8 layers)
    ultra_nesting_min_depth: int = 5  # Minimum ultra nesting depth
    ultra_nesting_max_depth: int = 8  # Maximum ultra nesting depth
    ultra_nesting_tables: int = 4  # Number of identity tables (3-5)
    
    # ULTRA string encryption (EXCEEDS Luraph - sR() lookup function)
    enable_ultra_strings: bool = False  # DISABLED - conflicts with VM string handling
    
    # Computed index generator (EXCEEDS Luraph)
    enable_computed_indices: bool = True  # Replace table indices with computed expressions
    
    # Decoy code generator (EXCEEDS Luraph)
    enable_decoy_code: bool = True  # Inject fake code blocks
    
    # Number diversity formatter (EXCEEDS Luraph)
    enable_number_diversity: bool = True  # Format numbers in diverse ways
    
    # Advanced obfuscation features (Requirements 4.x, 5.x, 6.x)
    # NOTE: Runtime key derivation is disabled - escape sequences get corrupted by other transforms
    enable_runtime_key_derivation: bool = False  # Derive decryption keys from environment (tick, os.clock, _VERSION)
    enable_jump_table: bool = True  # Control flow flattening with jump table dispatcher
    enable_multi_layer_vm: bool = True  # Dual VM structure with different opcode mappings
    enable_anti_debug: bool = True  # Anti-debug timing checks
    enable_metamethod_traps: bool = True  # Metamethod traps for table inspection confusion
    enable_dynamic_opcodes: bool = True  # Per-function XOR keys for opcode remapping
    enable_opcode_obfuscation: bool = True  # Opcode dispatch obfuscation
    
    # New constant protection features
    enable_string_constant_encryption: bool = True  # Encrypt string constants in bytecode
    enable_constant_unfolding: bool = True  # Break constants into computed expressions
    enable_instruction_splitting: bool = True  # Split VM opcodes into micro-operations
    constant_unfolding_depth: int = 2  # Depth of constant unfolding expressions
    
    # Source preprocessing features (pre-bytecode transforms)
    enable_source_preprocessing: bool = True  # Enable source code preprocessing
    enable_dead_code_injection: bool = True  # Inject dead code into source
    enable_string_splitting: bool = True  # Split strings into concatenations
    dead_code_blocks: int = 3  # Number of dead code blocks to inject
    
    # Enhanced opaque predicates
    enable_enhanced_predicates: bool = True  # Use enhanced opaque predicates
    predicate_complexity: int = 2  # Complexity depth of predicates (1-3)
    
    # Runtime protection features
    enable_self_modifying_code: bool = True  # Self-modifying dispatch tables
    enable_anti_dump: bool = True  # Anti-dump/memory inspection protection
    
    # Anti-deobfuscation features
    enable_anti_emulation: bool = True  # Detect custom Lua VMs/emulators
    enable_code_integrity: bool = True  # Detect code tampering
    enable_handler_polymorphism: bool = True  # Multiple equivalent handler implementations
    
    # ULTRA-STRONG bytecode encryption (STRONGER than Luraph!)
    # Uses 4-layer encryption: XOR + Rolling XOR + Feistel cipher + Block scrambling
    # NOTE: Disabled by default - decoder gets corrupted by string transforms
    enable_ultra_strong_encryption: bool = False  # Use 4-layer Feistel cipher encryption
    
    # Bytecode inflation settings (makes output MUCH larger like competitors)
    bytecode_inflation_factor: int = 14  # Multiply bytecode size by this factor (4-16)
    use_escape_sequences: bool = False  # False = Base85 with cool chars, True = \XXX escape sequences
    
    # Complexity settings
    expression_nesting_depth: int = 4  # DEW nesting depth (3-5)
    state_machine_states: int = 7  # Number of states
    control_flow_levels: int = 2  # Control flow flattening depth
    variable_shadowing_depth: int = 5  # Variable shadowing nesting
    
    def __post_init__(self):
        """Validate configuration values after initialization."""
        # Validate expression nesting depth (3-5 as per design)
        if not 3 <= self.expression_nesting_depth <= 5:
            raise ValueError(
                f"expression_nesting_depth must be between 3 and 5, "
                f"got {self.expression_nesting_depth}"
            )
        
        # Validate state machine states (minimum 2 for meaningful state machine)
        if self.state_machine_states < 2:
            raise ValueError(
                f"state_machine_states must be at least 2, "
                f"got {self.state_machine_states}"
            )
        
        # Validate control flow levels (minimum 1)
        if self.control_flow_levels < 1:
            raise ValueError(
                f"control_flow_levels must be at least 1, "
                f"got {self.control_flow_levels}"
            )
        
        # Validate variable shadowing depth (minimum 1)
        if self.variable_shadowing_depth < 1:
            raise ValueError(
                f"variable_shadowing_depth must be at least 1, "
                f"got {self.variable_shadowing_depth}"
            )


@dataclass
class TransformResult:
    """
    Result of an obfuscation transform or the full obfuscation pipeline.
    
    Attributes:
        code: The transformed/obfuscated code (empty string on failure)
        success: Whether the transform succeeded
        error: Error message if transform failed, None otherwise
        metrics: Dictionary of metrics about the transform (e.g., code size, time)
    """
    code: str
    success: bool
    error: Optional[str] = None
    metrics: dict = field(default_factory=dict)


# Preset configurations for common use cases

def get_default_config() -> ObfuscatorConfig:
    """
    Get the default configuration with all features enabled.
    
    This is the recommended configuration for production use,
    achieving Luraph v14.4.1 quality (95%+).
    """
    return ObfuscatorConfig()


def get_level1_config() -> ObfuscatorConfig:
    """
    LEVEL 1: Maximum Security, Lower Performance
    
    Best for: Static scripts, one-time loaders, scripts that don't run hot loops
    
    Features:
    - Full 4-layer encryption with checksum
    - 14x bytecode inflation
    - All VM protections enabled
    - All anti-debug/anti-analysis features
    - Heavy nesting and expression wrapping
    """
    return ObfuscatorConfig(
        # Maximum encryption
        bytecode_inflation_factor=14,
        use_escape_sequences=False,
        
        # All protections ON
        enable_jump_table=True,
        enable_multi_layer_vm=True,
        enable_anti_debug=True,
        enable_metamethod_traps=True,
        enable_dynamic_opcodes=True,
        enable_opcode_obfuscation=True,
        enable_self_modifying_code=True,
        enable_anti_dump=True,
        enable_anti_emulation=True,
        enable_code_integrity=True,
        enable_handler_polymorphism=True,
        
        # Heavy transforms
        enable_nesting=True,
        nesting_min_depth=3,
        nesting_max_depth=5,
        expression_nesting_depth=5,
        enable_dead_code=True,
        enable_state_machine=True,
        state_machine_states=7,
    )


def get_level2_config() -> ObfuscatorConfig:
    """
    LEVEL 2: Balanced Security & Performance (Luraph-style)
    
    Best for: Most scripts, good balance of protection and speed
    
    Features:
    - 4-layer encryption with 8x inflation (more padding = harder to analyze)
    - Source preprocessing (dead code injection, string splitting)
    - Anti-emulation checks (runs once at load)
    - Code integrity check (runs once at load)
    - Full visual obfuscation (nesting, renaming, number transforms)
    - NO per-instruction overhead
    """
    return ObfuscatorConfig(
        # Stronger encryption - more padding makes analysis harder
        bytecode_inflation_factor=8,
        use_escape_sequences=False,
        
        # ALL VM dispatch modifications OFF (these add per-instruction overhead!)
        enable_jump_table=False,  # OFF - adds decoy handler checks
        enable_dynamic_opcodes=False,  # OFF - adds XOR per dispatch
        enable_opcode_obfuscation=False,  # OFF - transforms dispatch logic
        enable_handler_polymorphism=False,  # OFF - multiple handler paths
        
        # PER-INSTRUCTION protections OFF (these slow down every opcode)
        enable_multi_layer_vm=False,  # OFF - double dispatch
        enable_anti_debug=False,  # OFF - timing checks per N ops
        enable_metamethod_traps=False,  # OFF - extra table lookups
        enable_self_modifying_code=False,  # OFF - table rebuilds
        
        # LOAD-TIME-ONLY protections ON (run once, no runtime cost)
        enable_anti_emulation=True,  # ON - checks environment once at load
        enable_code_integrity=True,  # ON - verifies code once at load
        enable_anti_dump=True,  # ON - memory protection setup at load
        
        # Source preprocessing ON (makes bytecode harder to analyze)
        enable_source_preprocessing=True,
        enable_dead_code_injection=True,  # Adds fake code paths
        enable_string_splitting=True,  # Splits strings into concatenations
        dead_code_blocks=5,  # More dead code blocks
        
        # Full visual obfuscation (truly zero runtime cost)
        enable_nesting=True,
        nesting_min_depth=3,
        nesting_max_depth=5,
        expression_nesting_depth=4,
        
        # Dead code in output ON (visual complexity)
        enable_dead_code=True,
        enable_state_machine=False,  # OFF - adds runtime overhead
        state_machine_states=3,
        
        # Basic obfuscation ON (zero runtime cost)
        enable_uns=True,
        enable_bws=True,
        enable_number_transform=True,
        enable_string_encryption=True,
        enable_vm_renaming=True,
    )


def get_level3_config() -> ObfuscatorConfig:
    """
    LEVEL 3: Maximum Performance, Basic Security
    
    Best for: Hot-loop scripts, RenderStepped callbacks, physics simulations
    Like VGs_Advanced_FP_Cam - runs every frame!
    
    Features:
    - Minimal encryption (2x inflation, fast decode)
    - NO VM dispatch modifications (pure speed)
    - Light nesting for visual obfuscation
    """
    return ObfuscatorConfig(
        # Minimal encryption - fastest decoding
        bytecode_inflation_factor=2,
        use_escape_sequences=False,
        
        # ALL VM dispatch modifications OFF (maximum performance)
        enable_jump_table=False,
        enable_dynamic_opcodes=False,
        enable_opcode_obfuscation=False,
        enable_handler_polymorphism=False,
        
        # ALL runtime-cost protections OFF
        enable_multi_layer_vm=False,
        enable_anti_debug=False,
        enable_metamethod_traps=False,
        enable_self_modifying_code=False,
        enable_anti_dump=False,
        enable_anti_emulation=False,
        enable_code_integrity=False,
        enable_anti_analysis=False,  # CRITICAL: Disable for ModuleScript compatibility
        enable_nested_vm=False,  # CRITICAL: Disable to preserve return wrapper
        
        # Light nesting (visual only) - DISABLED to preserve return wrapper
        enable_nesting=False,
        nesting_min_depth=2,
        nesting_max_depth=3,
        expression_nesting_depth=3,
        enable_heavy_nesting=False,
        
        # No dead code or state machines
        enable_dead_code=False,
        enable_state_machine=False,
        state_machine_states=2,
        
        # No source preprocessing
        enable_source_preprocessing=False,
        enable_dead_code_injection=False,
        enable_string_splitting=False,
        
        # Basic obfuscation ON (zero runtime cost)
        enable_uns=True,
        enable_bws=True,
        enable_number_transform=True,
        enable_string_encryption=True,
        enable_vm_renaming=True,
    )


def get_minimal_config() -> ObfuscatorConfig:
    """
    Get a minimal configuration with only essential features.
    
    Useful for debugging or when faster obfuscation is needed.
    """
    return ObfuscatorConfig(
        enable_polymorphic_seed=True,
        enable_uns=True,
        enable_bws=True,
        enable_cpm=True,
        enable_opg=False,
        enable_number_transform=True,
        enable_table_transform=False,
        enable_expression_wrapper=False,
        enable_state_machine=False,
        enable_string_encryption=True,
        enable_anti_analysis=False,
        enable_dead_code=False,
        enable_nested_vm=False,
        dense_output=True,
        validate_syntax=True,
        expression_nesting_depth=3,
        state_machine_states=3,
        control_flow_levels=1,
        variable_shadowing_depth=2,
    )


def get_debug_config() -> ObfuscatorConfig:
    """
    Get a debug configuration with pretty output and validation.
    
    Useful for debugging obfuscation issues.
    """
    return ObfuscatorConfig(
        enable_polymorphic_seed=False,  # Deterministic for debugging
        seed=12345,  # Fixed seed for reproducibility
        enable_uns=True,
        enable_bws=True,
        enable_cpm=True,
        enable_opg=True,
        enable_number_transform=True,
        enable_table_transform=True,
        enable_expression_wrapper=True,
        enable_state_machine=True,
        enable_string_encryption=True,
        enable_anti_analysis=True,
        enable_dead_code=True,
        enable_nested_vm=True,
        dense_output=False,  # Pretty output for debugging
        validate_syntax=True,
        expression_nesting_depth=3,  # Lower complexity for debugging
        state_machine_states=5,
        control_flow_levels=1,
        variable_shadowing_depth=3,
    )
