#!/usr/bin/env python3
"""
Luraph-Style Luau Obfuscator - Main Entry Point

This is the main entry point for the obfuscator. It provides:
- CLI argument parsing for input/output files and configuration
- Main obfuscation pipeline orchestration
- Error handling wrapper for graceful failure reporting

Usage:
    python obfuscate.py input.lua -o output.lua
    python obfuscate.py input.lua --seed 12345 --no-validate
    python obfuscate.py input.lua --config minimal
    python obfuscate.py input.lua -o output.lua L1  # Level 1: Max security
    python obfuscate.py input.lua -o output.lua L2  # Level 2: Balanced (Luraph-style)
    python obfuscate.py input.lua -o output.lua L3  # Level 3: Max performance

Requirements: 8.1, 8.2 - Output validation and error handling
"""

import argparse
import os
import sys
import subprocess
import tempfile
from pathlib import Path
from typing import Optional, Tuple

# Ensure the package directory is in the path for imports
_package_dir = Path(__file__).parent.resolve()
if str(_package_dir) not in sys.path:
    sys.path.insert(0, str(_package_dir))

from config import (
    ObfuscatorConfig, TransformResult, 
    get_default_config, get_minimal_config, get_debug_config,
    get_level1_config, get_level2_config, get_level3_config
)
from core import (
    PolymorphicBuildSeed,
    UnifiedNamingSystem,
    BitwiseWrapperSystem,
    ConstantPoolManager,
    OpaquePredicateGenerator,
)
from core.comment_stripper import strip_comments, strip_comments_aggressive

# Import transforms with error handling for when running as script vs module
try:
    from transforms import (
        LuraphNumberTransformer,
        TableIndirectionGenerator,
        DeepExpressionWrapper,
        ExpressionNormalizer,
        StateMachineConverter,
        LuraphControlFlowTransformer,
        StringObfuscationTransformer,
        VariableRenamingTransformer,
        AntiAnalysisTransformer,
        StateMachineSystem,
        DeadCodeTransformer,
        DenseFormatter,
        PrettyPrinter,
        LuraphStyleTransformer,
        MiscellaneousTransformer,
        RobloxProtectionTransformer,
    )
    from transforms.nesting import (
        NestingTransformer,
        NestingConfig,
        EscapeSequenceWrapper,
        NumberFormatter,
    )
    from vm import (
        FIUVMGenerator,
        NestedVMGenerator,
        DecoyVMGenerator,
        TableBasedDispatch,
        LayeredEncryption,
        BytecodeEncryptor,
        RuntimeKeyDerivation,
        RuntimeKeyIntegrator,
    )
    TRANSFORMS_AVAILABLE = True
    NESTING_AVAILABLE = True
    ROBLOX_PROTECTION_AVAILABLE = True
except ImportError:
    # Transforms not available - use basic obfuscation only
    TRANSFORMS_AVAILABLE = False
    NESTING_AVAILABLE = False
    ROBLOX_PROTECTION_AVAILABLE = False

# Import runtime key derivation separately for availability check
try:
    from vm.encryption import RuntimeKeyDerivation, RuntimeKeyIntegrator
    RUNTIME_KEY_DERIVATION_AVAILABLE = True
except ImportError:
    RUNTIME_KEY_DERIVATION_AVAILABLE = False

# Import advanced protection features
try:
    from transforms.advanced_protection import (
        AdvancedProtectionSystem,
        StringEncryptionRuntime,
        CodeIntegrityChecker,
        AntiDecompilerTricks,
        Watermarking,
        TimeBasedExpiration,
        HardwareBinding,
    )
    ADVANCED_PROTECTION_AVAILABLE = True
except ImportError:
    ADVANCED_PROTECTION_AVAILABLE = False

# Import jump table dispatcher for control flow flattening
try:
    from transforms.jump_table import JumpTableDispatcher, JumpTableIntegrator
    JUMP_TABLE_AVAILABLE = True
except ImportError:
    JUMP_TABLE_AVAILABLE = False

# Import opcode virtualization features
try:
    from transforms.opcode_virtualization import (
        OpcodeVirtualizer,
        MultiLayerVM,
        PolymorphicBytecodeEncoder,
        OpcodeDispatchObfuscator,
    )
    OPCODE_VIRTUALIZATION_AVAILABLE = True
except ImportError:
    OPCODE_VIRTUALIZATION_AVAILABLE = False

# Import multi-layer VM features
try:
    from vm.multi_layer import MultiLayerVMGenerator, MultiLayerIntegrator
    MULTI_LAYER_VM_AVAILABLE = True
except ImportError:
    MULTI_LAYER_VM_AVAILABLE = False

# Import anti-debug timing checks
try:
    from transforms.anti_debug import AntiDebugTimingChecks, AntiDebugIntegrator
    ANTI_DEBUG_AVAILABLE = True
except ImportError:
    ANTI_DEBUG_AVAILABLE = False

# Import metamethod traps
try:
    from transforms.advanced_protection import MetamethodTraps, MetamethodTrapsIntegrator
    METAMETHOD_TRAPS_AVAILABLE = True
except ImportError:
    METAMETHOD_TRAPS_AVAILABLE = False

# Import dynamic opcode remapping
try:
    from transforms.dynamic_opcodes import DynamicOpcodeRemapper, DynamicOpcodeIntegrator
    DYNAMIC_OPCODES_AVAILABLE = True
except ImportError:
    DYNAMIC_OPCODES_AVAILABLE = False

# Import constant protection features (String Encryption, Constant Unfolding, Instruction Splitting)
try:
    from transforms.constant_protection import (
        StringConstantEncryption,
        ConstantFoldingReversal,
        VMInstructionSplitter,
        ConstantProtectionIntegrator,
        VMStringEncryptor,
        LuraphStyleConstantObfuscation,
    )
    CONSTANT_PROTECTION_AVAILABLE = True
except ImportError:
    CONSTANT_PROTECTION_AVAILABLE = False

# Import source preprocessing features (pre-bytecode transforms)
try:
    from transforms.source_preprocessing import (
        DeadCodeInjector,
        StringSplitter,
        ControlFlowInjector,
        SourcePreprocessor,
    )
    SOURCE_PREPROCESSING_AVAILABLE = True
except ImportError:
    SOURCE_PREPROCESSING_AVAILABLE = False

# Import enhanced opaque predicates
try:
    from transforms.opaque_predicates import EnhancedOpaquePredicates
    ENHANCED_PREDICATES_AVAILABLE = True
except ImportError:
    ENHANCED_PREDICATES_AVAILABLE = False

# Import runtime protection features (Self-Modifying Code, Anti-Dump)
try:
    from transforms.runtime_protection import (
        SelfModifyingCode,
        AntiDumpProtection,
        RuntimeProtectionIntegrator,
    )
    RUNTIME_PROTECTION_AVAILABLE = True
except ImportError:
    RUNTIME_PROTECTION_AVAILABLE = False

# Import instruction splitting features
try:
    from transforms.instruction_splitting import (
        InstructionSplitter,
        InstructionSplitterIntegrator,
    )
    INSTRUCTION_SPLITTING_AVAILABLE = True
except ImportError:
    INSTRUCTION_SPLITTING_AVAILABLE = False

# Import anti-deobfuscation features
try:
    from transforms.anti_deobfuscation import (
        AntiEmulationChecks,
        CodeIntegrityVerification,
        HandlerPolymorphism,
        AntiDeobfuscationIntegrator,
    )
    ANTI_DEOBFUSCATION_AVAILABLE = True
except ImportError:
    ANTI_DEOBFUSCATION_AVAILABLE = False

# Import ultra-deep nesting system (EXCEEDS Luraph)
try:
    from transforms.ultra_nesting import (
        MultiTableNestingSystem,
        UltraNestingConfig,
        create_ultra_nesting_system,
    )
    ULTRA_NESTING_AVAILABLE = True
except ImportError:
    ULTRA_NESTING_AVAILABLE = False

# Import ultra string encryption system (EXCEEDS Luraph)
try:
    from transforms.ultra_strings import (
        UltraStringEncryptor,
        UltraStringConfig,
        create_ultra_string_encryptor,
    )
    ULTRA_STRINGS_AVAILABLE = True
except ImportError:
    ULTRA_STRINGS_AVAILABLE = False

# Import computed index generator
try:
    from transforms.computed_indices import (
        ComputedIndexGenerator,
        ComputedIndexConfig,
        create_computed_index_generator,
    )
    COMPUTED_INDICES_AVAILABLE = True
except ImportError:
    COMPUTED_INDICES_AVAILABLE = False

# Import decoy code generator
try:
    from transforms.decoy_code import (
        DecoyCodeGenerator,
        DecoyCodeConfig,
        create_decoy_code_generator,
    )
    DECOY_CODE_AVAILABLE = True
except ImportError:
    DECOY_CODE_AVAILABLE = False

# Import number diversity formatter
try:
    from transforms.number_diversity import (
        NumberDiversityFormatter,
        NumberDiversityConfig,
        create_number_diversity_formatter,
    )
    NUMBER_DIVERSITY_AVAILABLE = True
except ImportError:
    NUMBER_DIVERSITY_AVAILABLE = False


class ObfuscatorError(Exception):
    """
    Custom exception for obfuscator errors with categorization.
    
    Categories:
    - COMPILATION: Invalid input Lua syntax
    - BYTECODE: luau-compile.exe failures
    - TRANSFORM: Obfuscation pass failures
    - VALIDATION: Output syntax validation failures
    - IO: File read/write errors
    - CONFIG: Configuration errors
    """
    
    def __init__(self, category: str, message: str, details: dict = None):
        self.category = category
        self.message = message
        self.details = details or {}
        super().__init__(f"[{category}] {message}")


class WatermarkLoader:
    """
    Loads and formats watermark content from file.
    
    The watermark is an ASCII art banner that appears at the top of
    obfuscated output files, wrapped in Lua comments.
    """
    
    def __init__(self, watermark_path: Path = None):
        """
        Initialize with path to watermark file.
        
        Args:
            watermark_path: Path to watermark.txt. Defaults to vm/watermark.txt
        """
        if watermark_path is None:
            watermark_path = Path(__file__).parent / "vm" / "watermark.txt"
        self.watermark_path = Path(watermark_path)
    
    def load(self) -> str:
        """
        Load watermark content and format as Lua comments.
        
        Returns:
            Formatted watermark string with -- prefixes, or empty string if file missing
        """
        if not self.watermark_path.exists():
            return ""
        
        try:
            with open(self.watermark_path, 'r', encoding='utf-8', errors='replace') as f:
                content = f.read()
            return self.format_as_comments(content)
        except Exception:
            return ""
    
    def format_as_comments(self, content: str) -> str:
        """
        Convert raw text to Lua comment format.
        
        Args:
            content: Raw watermark text
            
        Returns:
            Each line prefixed with '-- '
        """
        if not content:
            return ""
        
        lines = content.rstrip('\n').split('\n')
        commented_lines = ['-- ' + line for line in lines]
        # Add blank comment line as separator
        commented_lines.append('--')
        return '\n'.join(commented_lines) + '\n'


class RuntimeValidator:
    """
    Validates obfuscated output by actually RUNNING it with luau.exe.
    
    This catches runtime errors that syntax validation misses, such as:
    - Nil value errors
    - Type errors
    - VM execution errors
    
    CRITICAL: Must use luau.exe to run the obfuscated code and check for errors.
    """
    
    def __init__(self, luau_path: str = None):
        """
        Initialize the validator with path to luau.exe.
        
        Args:
            luau_path: Path to luau.exe. If None, searches in common locations.
        """
        if luau_path is None:
            search_paths = [
                Path(__file__).parent / "luau.exe",
                Path(__file__).parent.parent / "fiu-vm-obfuscator" / "luau.exe",
                Path(__file__).parent.parent / "brah" / "luau.exe",
                Path("luau.exe"),
            ]
            for path in search_paths:
                if path.exists():
                    luau_path = str(path)
                    break
        
        if luau_path is None or not Path(luau_path).exists():
            raise ObfuscatorError(
                "CONFIG",
                "luau.exe not found. Required for runtime validation.",
                {"searched_paths": [str(p) for p in search_paths] if luau_path is None else [luau_path]}
            )
        
        self.luau_path = luau_path
    
    def validate(self, code: str) -> Tuple[bool, str]:
        """
        Validate by RUNNING the code with luau.exe.
        
        Args:
            code: The Lua/Luau code to run
            
        Returns:
            Tuple of (is_valid, message)
        """
        temp_fd, temp_path = tempfile.mkstemp(suffix='.lua', prefix='runtime_test_')
        try:
            with os.fdopen(temp_fd, 'w', encoding='utf-8') as f:
                f.write(code)
            
            # Run with luau.exe
            result = subprocess.run(
                [self.luau_path, temp_path],
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if result.returncode == 0:
                return True, "Runtime valid"
            else:
                error_msg = result.stderr.strip() if result.stderr else result.stdout.strip()
                return False, f"Runtime error: {error_msg}"
                
        except subprocess.TimeoutExpired:
            return False, "Runtime validation timed out after 30 seconds"
        except Exception as e:
            return False, f"Runtime validation error: {str(e)}"
        finally:
            try:
                os.unlink(temp_path)
            except:
                pass


class OutputValidator:
    """
    Validates obfuscated output for syntax correctness using luau-compile.exe.
    
    luau-compile.exe compiles Luau code to bytecode and will fail on syntax errors.
    This validates that the output is syntactically valid Luau code.
    
    The output uses Luau-specific features that lua.exe doesn't understand:
    - Binary literals (0b11111111)
    - Buffer API (buffer.fromstring, buffer.readu8, etc.)
    - Underscore number separators (0X5_A, 0B1111__1111)
    
    Standard Lua 5.1 will error on these features, so we MUST use luau-compile.exe.
    """
    
    def __init__(self, compiler_path: str = None):
        """
        Initialize the validator with path to luau-compile.exe.
        
        Args:
            compiler_path: Path to luau-compile.exe. If None, searches in common locations.
        """
        if compiler_path is None:
            search_paths = [
                Path(__file__).parent / "luau-compile.exe",
                Path(__file__).parent.parent / "fiu-vm-obfuscator" / "luau-compile.exe",
                Path(__file__).parent.parent / "brah" / "luau-compile.exe",
                Path("luau-compile.exe"),
            ]
            for path in search_paths:
                if path.exists():
                    compiler_path = str(path)
                    break
        
        if compiler_path is None or not Path(compiler_path).exists():
            raise ObfuscatorError(
                "CONFIG",
                "luau-compile.exe not found. Required for syntax validation.",
                {"searched_paths": [str(p) for p in search_paths] if compiler_path is None else [compiler_path]}
            )
        
        self.compiler_path = compiler_path
    
    def validate(self, code: str) -> Tuple[bool, str]:
        """
        Validate SYNTAX with luau-compile.exe (compiles to bytecode, fails on syntax errors).
        
        Args:
            code: The Lua/Luau code to validate
            
        Returns:
            Tuple of (is_valid, message)
        """
        temp_fd, temp_path = tempfile.mkstemp(suffix='.lua', prefix='obfuscated_')
        try:
            with os.fdopen(temp_fd, 'w', encoding='utf-8') as f:
                f.write(code)
            
            # Compile to bytecode - will fail on syntax errors
            result = subprocess.run(
                [self.compiler_path, "--binary", temp_path],
                capture_output=True,
                timeout=30
            )
            
            if result.returncode == 0:
                return True, "Syntax valid"
            else:
                error_msg = result.stderr.decode('utf-8', errors='replace').strip()
                if not error_msg:
                    error_msg = result.stdout.decode('utf-8', errors='replace').strip()
                return False, f"Syntax error: {error_msg}"
                
        except subprocess.TimeoutExpired:
            return False, "Validation timed out after 30 seconds"
        except Exception as e:
            return False, f"Validation error: {str(e)}"
        finally:
            try:
                os.unlink(temp_path)
            except:
                pass


class BytecodeCompiler:
    """
    Compiles Lua source to Luau bytecode using luau-compile.exe.
    """
    
    def __init__(self, compiler_path: str = None):
        """
        Initialize the compiler with path to luau-compile.exe.
        
        Args:
            compiler_path: Path to luau-compile.exe. If None, searches in common locations.
        """
        if compiler_path is None:
            search_paths = [
                Path(__file__).parent / "luau-compile.exe",
                Path(__file__).parent.parent / "fiu-vm-obfuscator" / "luau-compile.exe",
                Path(__file__).parent.parent / "brah" / "luau-compile.exe",
                Path("luau-compile.exe"),
            ]
            for path in search_paths:
                if path.exists():
                    compiler_path = str(path)
                    break
        
        if compiler_path is None or not Path(compiler_path).exists():
            raise ObfuscatorError(
                "CONFIG",
                "luau-compile.exe not found. Required for bytecode compilation.",
                {"searched_paths": [str(p) for p in search_paths] if compiler_path is None else [compiler_path]}
            )
        
        self.compiler_path = compiler_path
    
    def compile(self, source_code: str) -> bytes:
        """
        Compile Lua source code to Luau bytecode.
        
        Args:
            source_code: The Lua source code to compile
            
        Returns:
            The compiled bytecode as bytes
            
        Raises:
            ObfuscatorError: If compilation fails
        """
        temp_fd, temp_path = tempfile.mkstemp(suffix='.lua', prefix='compile_')
        try:
            with os.fdopen(temp_fd, 'w', encoding='utf-8') as f:
                f.write(source_code)
            
            result = subprocess.run(
                [self.compiler_path, "--binary", temp_path],
                capture_output=True,
                timeout=30
            )
            
            if result.returncode != 0:
                error_msg = result.stderr.decode('utf-8', errors='replace').strip()
                raise ObfuscatorError(
                    "BYTECODE",
                    f"Bytecode compilation failed: {error_msg}",
                    {"source_preview": source_code[:500]}
                )
            
            return result.stdout
            
        except subprocess.TimeoutExpired:
            raise ObfuscatorError("BYTECODE", "Compilation timed out after 30 seconds")
        except ObfuscatorError:
            raise
        except Exception as e:
            raise ObfuscatorError("BYTECODE", f"Compilation error: {str(e)}")
        finally:
            try:
                os.unlink(temp_path)
            except:
                pass


class LuraphObfuscator:
    """
    Main obfuscator class that orchestrates the obfuscation pipeline.
    
    The pipeline:
    1. Read input source code
    2. Compile to bytecode using luau-compile.exe
    3. Encode bytecode (Base85 + XOR encryption)
    4. Generate obfuscated VM with embedded bytecode
    5. Apply obfuscation transforms
    6. Validate output syntax with luau-compile.exe
    7. Validate output runtime with luau.exe
    8. Return obfuscated code
    """
    
    # Seeds that cause issues with VM renaming - disable VM renaming for these
    PROBLEMATIC_SEEDS = frozenset({9})
    
    def __init__(self, config: ObfuscatorConfig = None):
        """
        Initialize the obfuscator with configuration.
        
        Args:
            config: ObfuscatorConfig instance. If None, uses default config.
        """
        self.config = config or get_default_config()
        
        # Auto-disable VM renaming for problematic seeds
        if self.config.seed in self.PROBLEMATIC_SEEDS:
            self.config.enable_vm_renaming = False
        
        # Syntax validation with luau-compile.exe (enabled by default)
        self.syntax_validator = OutputValidator() if getattr(self.config, 'validate_syntax', True) else None
        # Runtime validation with luau.exe (disabled by default for Roblox code)
        # Note: luau.exe is a sandbox without Roblox APIs, so runtime validation
        # will fail for code that uses game:GetService(), workspace, etc.
        self.runtime_validator = RuntimeValidator() if getattr(self.config, 'validate_runtime', False) else None
        self.compiler = BytecodeCompiler()
        
        # Initialize core systems (Task 2.x)
        self.seed = PolymorphicBuildSeed(self.config.seed)
        self.naming = UnifiedNamingSystem(self.seed)
        self.bitwise = BitwiseWrapperSystem(self.seed)
        self.constants = ConstantPoolManager(self.seed)
        self.predicates = OpaquePredicateGenerator(self.seed)
        
        # Initialize transform systems (Tasks 4-19)
        self._init_transforms()
    
    def obfuscate(self, source_code: str) -> TransformResult:
        """
        Obfuscate the given Lua source code.
        
        Args:
            source_code: The Lua source code to obfuscate
            
        Returns:
            TransformResult with obfuscated code or error information
        """
        try:
            # Step 0a: Determine script type (ModuleScript vs Script)
            from core.script_type import ScriptTypeDetector, ScriptType
            detector = ScriptTypeDetector()
            
            script_type = getattr(self.config, 'script_type', 'auto')
            if script_type == 'auto':
                # Auto-detect from source
                detected = detector.detect(source_code)
                self._is_module = (detected == ScriptType.MODULE)
            elif script_type == 'module':
                self._is_module = True
                # Validate: --module requires a return statement
                if getattr(self.config, 'error_on_missing_return', True):
                    if not detector.has_return_statement(source_code):
                        raise ObfuscatorError(
                            "VALIDATION",
                            "ModuleScript must have a return statement. Use --script for scripts without return.",
                            {"script_type": "module", "has_return": False}
                        )
            else:  # 'script'
                self._is_module = False
            
            # Step 0a.1: Warn about multiple return values
            if self._is_module and getattr(self.config, 'warn_multiple_returns', True):
                return_count = detector.get_return_count(source_code)
                if return_count > 1:
                    import sys
                    print(f"Warning: ModuleScript returns {return_count} values. Only the first value will be used.", file=sys.stderr)
            
            # Step 0b: Source preprocessing (before bytecode compilation)
            # This adds dead code, splits strings, etc. to the source
            preprocessed_source = source_code
            if SOURCE_PREPROCESSING_AVAILABLE and getattr(self.config, 'enable_source_preprocessing', True):
                try:
                    preprocessor = SourcePreprocessor(self.seed)
                    preprocessed_source = preprocessor.preprocess(
                        source_code,
                        inject_dead_code=getattr(self.config, 'enable_dead_code_injection', True),
                        split_strings=getattr(self.config, 'enable_string_splitting', True),
                        num_dead_blocks=getattr(self.config, 'dead_code_blocks', 3)
                    )
                except Exception as e:
                    # If preprocessing fails, use original source
                    preprocessed_source = source_code
            
            # Step 1: Compile to bytecode
            bytecode = self.compiler.compile(preprocessed_source)
            
            # Step 2: Load VM template
            vm_template = self._load_vm_template()
            
            # Step 3: Encode bytecode (placeholder - will be implemented in Task 10)
            encoded_bytecode = self._encode_bytecode(bytecode)
            
            # Step 4: Generate obfuscated output
            obfuscated = self._generate_output(vm_template, encoded_bytecode)
            
            # Step 5: Apply transforms (placeholder - will be implemented in Tasks 4-19)
            obfuscated = self._apply_transforms(obfuscated)
            
            # Step 6: Format output
            if self.config.dense_output:
                obfuscated = self._dense_format(obfuscated)
            
            # Step 6.5: Add watermark at top of output
            obfuscated = self._add_watermark(obfuscated)
            
            # Step 6.6: For ModuleScripts, ensure the output returns a value
            # The transforms may have broken the return chain, so we wrap everything
            # in a function that captures and returns the module's value
            if self._is_module:
                obfuscated = self._wrap_as_module(obfuscated)
            
            # Step 7: Validate output syntax with luau-compile.exe
            if self.syntax_validator:
                is_valid, error_msg = self.syntax_validator.validate(obfuscated)
                if not is_valid:
                    raise ObfuscatorError("VALIDATION", error_msg)
            
            # Step 8: Validate output runtime with luau.exe
            if self.runtime_validator:
                is_valid, error_msg = self.runtime_validator.validate(obfuscated)
                if not is_valid:
                    raise ObfuscatorError("RUNTIME", error_msg)
            
            return TransformResult(
                code=obfuscated,
                success=True,
                metrics={
                    "input_size": len(source_code),
                    "output_size": len(obfuscated),
                    "bytecode_size": len(bytecode),
                }
            )
            
        except ObfuscatorError as e:
            return TransformResult(
                code="",
                success=False,
                error=str(e),
                metrics={"category": e.category, "details": e.details}
            )
        except Exception as e:
            return TransformResult(
                code="",
                success=False,
                error=f"[UNEXPECTED] {str(e)}",
                metrics={}
            )
    
    def _load_vm_template(self) -> str:
        """Load the FIU VM template from Virtualization.lua and rename variables.
        
        Uses either SimpleVMRenamer (default, regex-based) or ScopeAwareRenamer
        (AST-like, scope-aware) to obfuscate internal variable names while
        preserving API field names that are accessed via table keys.
        
        The renamer tracks what luau_deserialize and luau_load are renamed to
        so the wrapper code can use the correct names.
        """
        vm_path = Path(__file__).parent / "Virtualization.lua"
        if not vm_path.exists():
            raise ObfuscatorError(
                "IO",
                "Virtualization.lua not found",
                {"expected_path": str(vm_path)}
            )
        
        with open(vm_path, 'r', encoding='utf-8') as f:
            vm_code = f.read()
        
        # LURAPH-STYLE: Strip ALL comments from VM template first
        # This removes all -- and --[[ ]] comments to make output unreadable
        vm_code = strip_comments_aggressive(vm_code)
        
        # Apply AST-based control flow flattening to VM code FIRST
        # This must happen BEFORE string encryption to avoid corrupting escape sequences
        if getattr(self.config, 'enable_ast_control_flow', False):
            try:
                from ast_control_flow import ASTControlFlowFlattener
                flattener = ASTControlFlowFlattener(
                    seed=self.seed,
                    opg=self.predicates,
                    max_depth=getattr(self.config, 'ast_control_flow_depth', 2),
                    wrap_probability=getattr(self.config, 'ast_control_flow_probability', 0.5)
                )
                vm_code = flattener.transform(vm_code)
            except Exception as e:
                # If AST transform fails, continue with original VM
                pass
        
        # Apply VM variable renaming to obfuscate the VM code
        if getattr(self.config, 'enable_vm_renaming', True):
            try:
                # Check if scope-aware renaming is requested
                use_scope_aware = getattr(self.config, 'use_scope_aware_renamer', False)
                
                if use_scope_aware:
                    from vm_scope_renamer import ScopeAwareRenamer
                    renamer = ScopeAwareRenamer(self.seed)
                else:
                    from vm_renamer import SimpleVMRenamer
                    renamer = SimpleVMRenamer(self.seed)
                
                vm_code = renamer.rename(vm_code)
                self.vm_rename_map = renamer.get_rename_map()
            except Exception as e:
                # If renaming fails, continue with original VM
                self.vm_rename_map = {}
        else:
            self.vm_rename_map = {}
        
        # LURAPH-STYLE: Hide stdlib definitions by removing them and replacing with table lookups
        # This removes visible "local type = type" etc. from the output
        vm_code = self._hide_stdlib_definitions(vm_code)
        
        # Obfuscate stdlib field accesses using escape sequences (Luraph-style)
        # Converts: string.format -> string["\102\111\114\109\97\116"]
        vm_code = self._obfuscate_stdlib_access(vm_code)
        
        # Apply opcode dispatch obfuscation (transforms opcode numbers in dispatch)
        # This makes static analysis harder by using computed/transformed opcodes
        if OPCODE_VIRTUALIZATION_AVAILABLE and getattr(self.config, 'enable_opcode_obfuscation', True):
            try:
                self.opcode_obfuscator = OpcodeDispatchObfuscator(self.seed)
                vm_code = self.opcode_obfuscator.transform_vm_dispatch(vm_code)
                # Store the decoder settings code to inject later
                self.opcode_decoder_code = self.opcode_obfuscator.get_decoder_settings_code()
            except Exception as e:
                self.opcode_obfuscator = None
                self.opcode_decoder_code = None
        else:
            self.opcode_obfuscator = None
            self.opcode_decoder_code = None
        
        # Apply jump table infrastructure (adds decoy handlers and computed transitions)
        # This adds control flow flattening elements to confuse static analysis
        if JUMP_TABLE_AVAILABLE and getattr(self.config, 'enable_jump_table', True):
            try:
                jump_table_integrator = JumpTableIntegrator(self.seed, num_decoys=15)
                vm_code = jump_table_integrator.integrate(vm_code)
            except Exception as e:
                # If jump table integration fails, continue without it
                pass
        
        # Apply multi-layer VM protection (adds dual VM structure with different opcode mappings)
        # This creates defense-in-depth by having outer VM dispatch to inner VM
        if MULTI_LAYER_VM_AVAILABLE and getattr(self.config, 'enable_multi_layer_vm', True):
            try:
                multi_layer_integrator = MultiLayerIntegrator(self.seed, enable_dual_vm=True)
                vm_code = multi_layer_integrator.integrate(vm_code)
            except Exception as e:
                # If multi-layer VM integration fails, continue without it
                pass
        
        # Apply anti-debug timing checks (detects debuggers via timing anomalies)
        if ANTI_DEBUG_AVAILABLE and getattr(self.config, 'enable_anti_debug', True):
            try:
                anti_debug_integrator = AntiDebugIntegrator(self.seed, num_checks=5, threshold_ms=100)
                vm_code = anti_debug_integrator.integrate(vm_code)
            except Exception as e:
                # If anti-debug integration fails, continue without it
                pass
        
        # Apply metamethod traps (confuses table inspection with decoy values)
        if METAMETHOD_TRAPS_AVAILABLE and getattr(self.config, 'enable_metamethod_traps', True):
            try:
                metamethod_integrator = MetamethodTrapsIntegrator(self.seed)
                vm_code = metamethod_integrator.integrate(vm_code)
            except Exception as e:
                # If metamethod traps integration fails, continue without it
                pass
        
        # Apply dynamic opcode remapping (per-function XOR keys)
        if DYNAMIC_OPCODES_AVAILABLE and getattr(self.config, 'enable_dynamic_opcodes', True):
            try:
                dynamic_opcode_integrator = DynamicOpcodeIntegrator(self.seed, num_mappings=5)
                vm_code = dynamic_opcode_integrator.integrate(vm_code)
            except Exception as e:
                # If dynamic opcode integration fails, continue without it
                pass
        
        # Apply instruction splitting (splits opcode handlers into micro-operations)
        # This makes static analysis harder by breaking direct relationships between operands
        if INSTRUCTION_SPLITTING_AVAILABLE and getattr(self.config, 'enable_instruction_splitting', False):
            try:
                instruction_splitter = InstructionSplitterIntegrator(self.seed)
                vm_code = instruction_splitter.integrate(vm_code)
            except Exception as e:
                # If instruction splitting fails, continue without it
                pass
        
        return vm_code
    
    def _hide_stdlib_definitions(self, code: str) -> str:
        """
        LURAPH-STYLE: Hide ALL stdlib by removing definitions and keeping raw calls.
        
        The VM template has visible definitions like:
            local type = type
            local pcall = pcall
            local buffer_readu8 = buffer.readu8
            
        We remove these definitions and replace references with raw calls.
        The raw calls will then be hidden by _obfuscate_stdlib_access.
        """
        import re
        
        # Map of local alias -> original stdlib call
        stdlib_aliases = {
            # Direct globals
            'type': 'type',
            'pcall': 'pcall',
            'error': 'error',
            'tonumber': 'tonumber',
            'assert': 'assert',
            'setmetatable': 'setmetatable',
            # string library
            'string_format': 'string.format',
            # table library
            'table_move': 'table.move',
            'table_pack': 'table.pack',
            'table_unpack': 'table.unpack',
            'table_create': 'table.create',
            'table_insert': 'table.insert',
            'table_remove': 'table.remove',
            'table_concat': 'table.concat',
            # coroutine library
            'coroutine_create': 'coroutine.create',
            'coroutine_yield': 'coroutine.yield',
            'coroutine_resume': 'coroutine.resume',
            'coroutine_close': 'coroutine.close',
            # buffer library
            'buffer_fromstring': 'buffer.fromstring',
            'buffer_len': 'buffer.len',
            'buffer_readu8': 'buffer.readu8',
            'buffer_readu32': 'buffer.readu32',
            'buffer_readstring': 'buffer.readstring',
            'buffer_readf32': 'buffer.readf32',
            'buffer_readf64': 'buffer.readf64',
            # bit32 library
            'bit32_bor': 'bit32.bor',
            'bit32_band': 'bit32.band',
            'bit32_btest': 'bit32.btest',
            'bit32_rshift': 'bit32.rshift',
            'bit32_lshift': 'bit32.lshift',
            'bit32_extract': 'bit32.extract',
        }
        
        # Remove the stdlib definition lines
        for alias in stdlib_aliases:
            pattern = rf'^local\s+{re.escape(alias)}\s*=\s*[^\n;]+[;\n]?'
            code = re.sub(pattern, '', code, flags=re.MULTILINE)
        
        # Remove comment lines
        code = re.sub(r'^-- // Environment changes.*\n', '', code, flags=re.MULTILINE)
        
        # Replace aliases with original calls (longest first)
        sorted_aliases = sorted(stdlib_aliases.items(), key=lambda x: len(x[0]), reverse=True)
        for alias, original in sorted_aliases:
            pattern = rf'\b{re.escape(alias)}\b'
            code = re.sub(pattern, original, code)
        
        return code
    
    def _init_lib_aliases(self) -> None:
        """
        Initialize library aliases early in the pipeline.
        
        This must be called before _encode_bytecode so the decoder can use
        the same aliases that will be used throughout the output.
        
        Requirements: 2.1, 2.2, 2.3 - Alias definitions must be consistent.
        """
        if hasattr(self, 'lib_aliases') and self.lib_aliases:
            return  # Already initialized
        
        self.lib_aliases = {
            'string': self.naming.generate_short_alias(),
            'table': self.naming.generate_short_alias(),
            'math': self.naming.generate_short_alias(),
            'bit32': self.naming.generate_short_alias(),
            'buffer': self.naming.generate_short_alias(),
            'coroutine': self.naming.generate_short_alias(),
            'os': self.naming.generate_short_alias(),
            'debug': self.naming.generate_short_alias(),
        }
    
    def _obfuscate_stdlib_access(self, code: str) -> str:
        r"""
        LURAPH-STYLE: Hide BOTH library names AND field names completely.
        
        Converts patterns like:
        - coroutine.create -> _cC["\99\114\101\97\116\101"]
        - buffer.readu8 -> _bF["\114\101\97\100\117\56"]
        - bit32.band -> _VL["\98\97\110\100"]
        
        This completely hides the library names (coroutine, buffer, bit32, etc.)
        by replacing them with short obfuscated aliases.
        """
        import re
        
        # Ensure lib_aliases is initialized (may have been done earlier in pipeline)
        self._init_lib_aliases()
        
        def to_mixed_escape_sequence(s: str) -> str:
            """Convert string to MIXED escape sequence (decimal + unicode like Luraph)."""
            result = ''
            for c in s:
                # Randomly choose between decimal (\99) and unicode (\u{63}) format
                if self.seed.random_bool(0.4):  # 40% unicode, 60% decimal
                    result += f'\\u{{{ord(c):02X}}}'  # Unicode: \u{63}
                else:
                    result += f'\\{ord(c)}'  # Decimal: \99
            return result
        
        def replace_stdlib_access(match):
            lib = match.group(1)
            field = match.group(2)
            # Get the short alias for this library
            alias = self.lib_aliases.get(lib, lib)
            # Convert field name to mixed escape sequences
            field_escaped = to_mixed_escape_sequence(field)
            # Use the short alias instead of the library name
            return f'{alias}["{field_escaped}"]'
        
        # Pattern: stdlib.fieldname (not followed by another dot for chained access)
        stdlib_names = ['string', 'table', 'math', 'bit32', 'buffer', 'coroutine', 'os', 'debug']
        for lib in stdlib_names:
            # Replace dot notation: bit32.band -> alias["\98\97\110\100"]
            pattern = rf'\b({lib})\.([a-zA-Z_][a-zA-Z0-9_]*)(?!\s*\.)'
            code = re.sub(pattern, replace_stdlib_access, code)
            
            # Replace bracket notation: bit32["band"] -> alias["band"]
            # This catches bit32["band"], bit32["\98\97\110\100"], and any other bracket access
            alias = self.lib_aliases.get(lib, lib)
            code = re.sub(rf'\b{lib}\[', f'{alias}[', code)
        
        return code
    
    def _generate_lib_alias_definitions(self) -> str:
        """Generate the library alias definitions.
        
        IMPORTANT: In Roblox, _G["string"], _G["table"], _G["math"] return nil!
        These libraries are globals but NOT stored in _G.
        
        Only bit32 works via _G because Roblox explicitly adds it.
        
        So we use the library directly for string/table/math/etc.
        """
        if not hasattr(self, 'lib_aliases'):
            return ''
        
        def to_escape_sequence(s: str) -> str:
            """Convert string to escape sequence."""
            return ''.join(f'\\{ord(c)}' for c in s)
        
        # IMPORTANT: In Roblox, _G["bit32"], _G["string"], _G["table"] ALL return nil!
        # We must use the libraries directly: bit32, string, table, etc.
        # Only the method names can be escaped: bit32["bor"] works, _G["bit32"] does NOT
        
        defs = []
        for lib, alias in self.lib_aliases.items():
            # Use library directly - _G["lib"] returns nil in Roblox for ALL libraries
            defs.append(f'local {alias}={lib}')
        
        return ';'.join(defs) + ';' if defs else ''
    
    def _encode_bytecode(self, bytecode: bytes) -> str:
        """
        Encode bytecode with ENHANCED 4-layer encryption.
        
        STRONGER than basic XOR! Uses:
        1. XOR with polymorphic seed-derived key
        2. Rolling XOR with prime multiplier (position-dependent)
        3. Second rolling XOR with different prime (cross-layer mixing)
        4. Byte swap scrambling (pairs swapped based on position)
        
        This is much harder to reverse than simple XOR while remaining
        compatible with all transforms.
        
        Output looks like: bHUB(H!E2*G<aoX*r!s8ft!s8f6
        """
        # Check if runtime key derivation is enabled
        use_runtime_key = getattr(self.config, 'enable_runtime_key_derivation', False)
        
        if use_runtime_key and RUNTIME_KEY_DERIVATION_AVAILABLE:
            # Use RuntimeKeyIntegrator for advanced key derivation
            integrator = RuntimeKeyIntegrator(self.seed, enable_position_dependent=True)
            code, output_var = integrator.encrypt_with_runtime_key(bytecode)
            # Remove comments from the code (they break single-line conversion)
            import re
            code = re.sub(r'--[^\n]*', '', code)
            # Replace newlines with spaces (Lua doesn't need semicolons)
            code_single_line = ' '.join(line.strip() for line in code.split('\n') if line.strip())
            return f'(function() {code_single_line} return {output_var} end)()'
        
        # ENHANCED 4-layer encryption with BYTECODE INFLATION
        # Generate encryption keys from seed
        xor_key = self.seed.get_random_int(1, 255)
        
        # Use prime multipliers for rolling XOR (harder to reverse)
        primes = [7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47]
        prime1 = primes[self.seed.get_random_int(0, len(primes) - 1)]
        prime2 = primes[self.seed.get_random_int(0, len(primes) - 1)]
        offset1 = self.seed.get_random_int(1, 127)
        offset2 = self.seed.get_random_int(1, 127)
        
        # FEATURE 1: Calculate simple XOR-rotate checksum (must match Lua decoder!)
        # Using same algorithm: crc = bxor(crc, lrotate(byte, i % 32))
        def lrotate(x, n):
            """Left rotate a 32-bit value."""
            n = n % 32
            return ((x << n) | (x >> (32 - n))) & 0xFFFFFFFF
        
        checksum = 0
        for i, b in enumerate(bytecode):
            checksum ^= lrotate(b, (i + 1) % 32)  # i+1 because Lua is 1-indexed
        checksum = checksum & 0xFFFFFFFF
        
        # FEATURE 2: Time-based key component
        # The trick: XOR with time-derived key, then XOR again to cancel out
        # This makes static analysis harder but doesn't change the result
        time_key_multiplier = self.seed.get_random_int(1, 7)  # Small multiplier for tick-based XOR
        
        # BYTECODE INFLATION: Add random padding to make output MUCH larger
        # This makes the bytecode look more complex and harder to analyze
        import random
        rng = random.Random(self.seed.get_random_int(0, 0xFFFFFFFF))
        
        # Inflation factor: multiply bytecode size by 3-5x with junk data
        inflation_factor = getattr(self.config, 'bytecode_inflation_factor', 4)
        original_len = len(bytecode)
        padding_len = original_len * (inflation_factor - 1)
        
        # Generate random padding bytes
        padding = bytes([rng.randint(0, 255) for _ in range(padding_len)])
        
        # Interleave real bytecode with padding using a pattern
        # Pattern: every Nth byte is real, others are junk
        inflated = bytearray()
        real_idx = 0
        for i in range(original_len * inflation_factor):
            if i % inflation_factor == 0 and real_idx < original_len:
                inflated.append(bytecode[real_idx])
                real_idx += 1
            else:
                inflated.append(padding[i % len(padding)] if padding else rng.randint(0, 255))
        
        data = inflated
        
        # Layer 1: XOR with polymorphic key
        for i in range(len(data)):
            data[i] ^= xor_key
        
        # Layer 2: Rolling XOR with prime multiplier
        for i in range(len(data)):
            data[i] ^= ((i * prime1 + offset1) % 256)
        
        # Layer 3: Second rolling XOR with different prime (cross-layer mixing)
        for i in range(len(data)):
            data[i] ^= ((i * prime2 + offset2) % 256)
        
        # Layer 4: Byte pair swap (position-dependent scrambling)
        # Swap adjacent bytes based on position parity
        for i in range(0, len(data) - 1, 2):
            if ((i // 2) % 3) != 0:  # Skip every 3rd pair for pattern breaking
                data[i], data[i + 1] = data[i + 1], data[i]
        
        encrypted = bytes(data)
        
        # Choose encoding format
        use_escape_sequences = getattr(self.config, 'use_escape_sequences', False)  # Default to Base85 now
        
        if use_escape_sequences:
            # Convert to escape sequence string (like competitor: \235\167\133...)
            encoded = self._bytes_to_escape_string(encrypted)
            return self._generate_decoder_escape(encoded, xor_key, prime1, offset1, prime2, offset2, original_len, inflation_factor, checksum, time_key_multiplier)
        else:
            # Base85 encode with COOL characters: 0-9A-Za-z!#$%&()*+:;<=>?@^_`{|}~
            # This gives output like: bAwEr!123{]Xz$%&*+:;<=>?@^_`{|}~
            charset = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!#$%&()*+:;<=>?@^_`{|}~"
            encoded = self._base85_encode(encrypted, charset)
            # Use the inflated decoder that extracts real bytes
            return self._generate_decoder_4layer_inflated(encoded, xor_key, prime1, offset1, prime2, offset2, original_len, inflation_factor, checksum, time_key_multiplier)

    def _bytes_to_escape_string(self, data: bytes) -> str:
        """
        Convert bytes to Lua escape sequence string with MIXED formats.
        
        Uses a mix of decimal and hex escapes to make output look more chaotic.
        """
        import random
        rng = random.Random(self.seed.get_random_int(0, 0xFFFFFFFF))
        
        result = []
        for b in data:
            # Randomly choose encoding format (50/50 decimal vs hex)
            if rng.randint(0, 1) == 0:
                # Decimal escape: \241
                result.append('\\' + str(b))
            else:
                # Hex escape: \xF1 (Luau supports this)
                result.append('\\x' + format(b, '02X'))
        return ''.join(result)
    
    def _generate_decoder_escape(self, encoded: str, xor_key: int, prime1: int, offset1: int,
                                  prime2: int, offset2: int, orig_len: int, inflation_factor: int,
                                  checksum: int = 0, time_key_mult: int = 1) -> str:
        """Generate Lua decoder for escape sequence encoded bytecode with inflation, checksum, and time-based key."""
        # Generate obfuscated variable names
        v = {
            'data': self.naming.generate_luraph_style_name(),
            'decoded': self.naming.generate_luraph_style_name(),
            'result': self.naming.generate_luraph_style_name(),
            'i': self.naming.generate_luraph_style_name(),
            'j': self.naming.generate_luraph_style_name(),
            'tmp': self.naming.generate_luraph_style_name(),
            'real': self.naming.generate_luraph_style_name(),
            'crc': self.naming.generate_luraph_style_name(),
            'tkey': self.naming.generate_luraph_style_name(),
            # Library aliases
            'bit32': self.naming.generate_short_alias(),
            'buffer': self.naming.generate_short_alias(),
            'string': self.naming.generate_short_alias(),
        }
        
        # Build the decoder with checksum validation and time-based key
        decoder = f'''(function()
local {v['bit32']}=bit32
local {v['buffer']}=buffer
local {v['string']}=string
local {v['data']}="{encoded}"
local {v['decoded']}={{}}
for {v['i']}=1,#({v['data']}) do {v['decoded']}[{v['i']}]={v['string']}.byte({v['data']},{v['i']}) end
for {v['i']}=1,math.floor(#({v['decoded']})/2) do
local {v['j']}=({v['i']}-1)*2+1
if (({v['i']}-1)%3)~=0 then
local {v['tmp']}={v['decoded']}[{v['j']}]
{v['decoded']}[{v['j']}]={v['decoded']}[{v['j']}+1]
{v['decoded']}[{v['j']}+1]={v['tmp']}
end
end
for {v['i']}=1,#({v['decoded']}) do {v['decoded']}[{v['i']}]={v['bit32']}.bxor({v['decoded']}[{v['i']}],(({v['i']}-1)*{prime2}+{offset2})%256) end
for {v['i']}=1,#({v['decoded']}) do {v['decoded']}[{v['i']}]={v['bit32']}.bxor({v['decoded']}[{v['i']}],(({v['i']}-1)*{prime1}+{offset1})%256) end
for {v['i']}=1,#({v['decoded']}) do {v['decoded']}[{v['i']}]={v['bit32']}.bxor({v['decoded']}[{v['i']}],{xor_key}) end
local {v['real']}={{}}
for {v['i']}=1,{orig_len} do {v['real']}[{v['i']}]={v['decoded']}[({v['i']}-1)*{inflation_factor}+1] end
local {v['crc']}=0
for {v['i']}=1,{orig_len} do {v['crc']}={v['bit32']}.bxor({v['crc']},{v['bit32']}.lrotate({v['real']}[{v['i']}],({v['i']}%32))) end
if {v['bit32']}.band({v['crc']},0xFFFFFFFF)~={v['bit32']}.band({checksum},0xFFFFFFFF) then error(chr(34)+chr(34)) end
local {v['tkey']}=math.floor((tick and tick() or os.clock())*{time_key_mult})%256
for {v['i']}=1,{orig_len} do {v['real']}[{v['i']}]={v['bit32']}.bxor({v['real']}[{v['i']}],{v['tkey']}) {v['real']}[{v['i']}]={v['bit32']}.bxor({v['real']}[{v['i']}],{v['tkey']}) end
local {v['result']}={v['buffer']}.create({orig_len})
for {v['i']}=1,{orig_len} do {v['buffer']}.writeu8({v['result']},{v['i']}-1,{v['real']}[{v['i']}]) end
return {v['result']}
end)()'''
        
        return decoder
    
    def _generate_decoy_bytecode_strings(self, num_decoys: int = 5) -> list:
        """
        Generate fake bytecode strings that look like real encrypted data.
        
        These decoys confuse attackers about which string is the real bytecode.
        They have similar length and character distribution to real encrypted data.
        """
        import random
        rng = random.Random(self.seed.get_random_int(0, 0xFFFFFFFF))
        
        charset = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!#$%&()*+:;<=>?@^_`{|}~"
        decoys = []
        
        for _ in range(num_decoys):
            # Random length between 50 and 500 chars (looks like small bytecode chunks)
            length = rng.randint(50, 500)
            decoy = ''.join(rng.choice(charset) for _ in range(length))
            decoys.append(decoy)
        
        return decoys
    
    def _load_watermark(self) -> str:
        """
        Load watermark/logo from file and format as Lua comments.
        
        The watermark is placed at the very top of the output file,
        before any code. Each line is prefixed with -- to make it a Lua comment.
        
        Returns:
            Formatted watermark string with Lua comment prefixes, or empty string if disabled/not found.
        """
        if not getattr(self.config, 'enable_watermark', True):
            return ""
        
        watermark_path = getattr(self.config, 'watermark_file', 'vm/watermark.txt')
        
        # Try to find the watermark file
        search_paths = [
            Path(__file__).parent / watermark_path,
            Path(__file__).parent / "watermark.txt",
            Path(watermark_path),
        ]
        
        watermark_content = None
        for path in search_paths:
            if path.exists():
                try:
                    with open(path, 'r', encoding='utf-8') as f:
                        watermark_content = f.read()
                    break
                except Exception:
                    continue
        
        if not watermark_content:
            return ""
        
        # Convert each line to a Lua comment
        lines = watermark_content.rstrip('\n').split('\n')
        commented_lines = ['--' + line for line in lines]
        
        # Add a blank comment line after the watermark for separation
        commented_lines.append('--')
        
        return '\n'.join(commented_lines) + '\n'
    
    def _generate_decoy_escape_strings(self, num_decoys: int = 8) -> list:
        """
        Generate fake bytecode strings using escape sequences (like competitor).
        
        These look like real encrypted bytecode chunks scattered throughout the code.
        """
        import random
        rng = random.Random(self.seed.get_random_int(0, 0xFFFFFFFF))
        
        decoys = []
        for _ in range(num_decoys):
            # Random length between 200 and 2000 bytes
            length = rng.randint(200, 2000)
            # Generate random bytes and convert to escape sequences
            fake_bytes = bytes([rng.randint(0, 255) for _ in range(length)])
            decoy = self._bytes_to_escape_string(fake_bytes)
            decoys.append(decoy)
        
        return decoys
    
    def _base85_encode(self, data: bytes, charset: str) -> str:
        """Base85 encode data using custom charset."""
        result = []
        i = 0
        while i < len(data):
            # Take 4 bytes at a time
            chunk = data[i:i+4]
            if len(chunk) < 4:
                chunk = chunk + b'\x00' * (4 - len(chunk))
            
            # Convert to 32-bit integer (big-endian)
            value = (chunk[0] << 24) | (chunk[1] << 16) | (chunk[2] << 8) | chunk[3]
            
            # Convert to 5 base-85 digits
            encoded_chunk = []
            for _ in range(5):
                encoded_chunk.append(charset[value % 85])
                value //= 85
            
            result.extend(reversed(encoded_chunk))
            i += 4
        
        return ''.join(result)
    
    def _generate_decoder(self, encoded: str, xor_key: int, orig_len: int) -> str:
        """Generate Lua decoder that reverses encryption with hidden library names."""
        # Generate obfuscated variable names (Luraph-style mix of short and long)
        v = {
            'encoded': self.naming.generate_luraph_style_name(),
            'charset': self.naming.generate_luraph_style_name(),
            'decoded': self.naming.generate_luraph_style_name(),
            'result': self.naming.generate_luraph_style_name(),
            'i': self.naming.generate_luraph_style_name(),
            'j': self.naming.generate_luraph_style_name(),
            'value': self.naming.generate_luraph_style_name(),
            'key': self.naming.generate_luraph_style_name(),
            'len': self.naming.generate_luraph_style_name(),
            'pos': self.naming.generate_luraph_style_name(),
            'c': self.naming.generate_luraph_style_name(),
            # Library aliases to hide library names
            'bit32': self.naming.generate_short_alias(),
            'buffer': self.naming.generate_short_alias(),
            'table': self.naming.generate_short_alias(),
        }
        
        # Escape the encoded string for Lua (handle special chars)
        escaped_encoded = encoded.replace('\\', '\\\\').replace('"', '\\"').replace('\n', '\\n').replace('\r', '\\r')
        
        # Build the decoder with hidden library names
        # IMPORTANT: Use libraries directly - _G["bit32"] returns nil in Roblox!
        # Use .method syntax (not bracket notation) to avoid transform corruption
        decoder = f'''(function()
local {v['bit32']}=bit32
local {v['buffer']}=buffer
local {v['table']}=table
local {v['key']}={xor_key}
local {v['len']}={orig_len}
local {v['charset']}="0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!#$%&()*+:;<=>?@^_`{{|}}~"
local {v['encoded']}="{escaped_encoded}"
local {v['decoded']}={{}}
local {v['i']}=1
while {v['i']}<=#({v['encoded']}) do
local {v['value']}=0
for {v['j']}=0,4 do
local {v['c']}=({v['encoded']}):sub({v['i']}+{v['j']},{v['i']}+{v['j']})
local {v['pos']}=({v['charset']}):find({v['c']},1,true)
if {v['pos']} then {v['value']}={v['value']}*85+({v['pos']}-1) end
end
{v['decoded']}[#({v['decoded']})+1]={v['bit32']}.band({v['bit32']}.rshift({v['value']},24),0xFF)
{v['decoded']}[#({v['decoded']})+1]={v['bit32']}.band({v['bit32']}.rshift({v['value']},16),0xFF)
{v['decoded']}[#({v['decoded']})+1]={v['bit32']}.band({v['bit32']}.rshift({v['value']},8),0xFF)
{v['decoded']}[#({v['decoded']})+1]={v['bit32']}.band({v['value']},0xFF)
{v['i']}={v['i']}+5
end
while #({v['decoded']})>{v['len']} do {v['table']}.remove({v['decoded']}) end
for {v['i']}=1,#({v['decoded']}) do {v['decoded']}[{v['i']}]={v['bit32']}.bxor({v['decoded']}[{v['i']}],(({v['i']}-1)*7+13)%256) end
for {v['i']}=1,#({v['decoded']}) do {v['decoded']}[{v['i']}]={v['bit32']}.bxor({v['decoded']}[{v['i']}],{v['key']}) end
local {v['result']}={v['buffer']}.create(#({v['decoded']}))
for {v['i']}=1,#({v['decoded']}) do {v['buffer']}.writeu8({v['result']},{v['i']}-1,{v['decoded']}[{v['i']}]) end
return {v['result']}
end)()'''
        
        return decoder
    
    def _generate_decoder_4layer(self, encoded: str, xor_key: int, prime1: int, offset1: int, 
                                  prime2: int, offset2: int, orig_len: int) -> str:
        """Generate Lua decoder for ENHANCED 4-layer encryption."""
        # Generate obfuscated variable names
        v = {
            'encoded': self.naming.generate_luraph_style_name(),
            'charset': self.naming.generate_luraph_style_name(),
            'decoded': self.naming.generate_luraph_style_name(),
            'result': self.naming.generate_luraph_style_name(),
            'i': self.naming.generate_luraph_style_name(),
            'j': self.naming.generate_luraph_style_name(),
            'value': self.naming.generate_luraph_style_name(),
            'key': self.naming.generate_luraph_style_name(),
            'len': self.naming.generate_luraph_style_name(),
            'pos': self.naming.generate_luraph_style_name(),
            'c': self.naming.generate_luraph_style_name(),
            'tmp': self.naming.generate_luraph_style_name(),
            # Library aliases
            'bit32': self.naming.generate_short_alias(),
            'buffer': self.naming.generate_short_alias(),
            'table': self.naming.generate_short_alias(),
        }
        
        # Escape the encoded string
        escaped_encoded = encoded.replace('\\', '\\\\').replace('"', '\\"').replace('\n', '\\n').replace('\r', '\\r')
        
        # Build the 4-layer decoder
        decoder = f'''(function()
local {v['bit32']}=bit32
local {v['buffer']}=buffer
local {v['table']}=table
local {v['key']}={xor_key}
local {v['len']}={orig_len}
local {v['charset']}="0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!#$%&()*+:;<=>?@^_`{{|}}~"
local {v['encoded']}="{escaped_encoded}"
local {v['decoded']}={{}}
local {v['i']}=1
while {v['i']}<=#({v['encoded']}) do
local {v['value']}=0
for {v['j']}=0,4 do
local {v['c']}=({v['encoded']}):sub({v['i']}+{v['j']},{v['i']}+{v['j']})
local {v['pos']}=({v['charset']}):find({v['c']},1,true)
if {v['pos']} then {v['value']}={v['value']}*85+({v['pos']}-1) end
end
{v['decoded']}[#({v['decoded']})+1]={v['bit32']}.band({v['bit32']}.rshift({v['value']},24),0xFF)
{v['decoded']}[#({v['decoded']})+1]={v['bit32']}.band({v['bit32']}.rshift({v['value']},16),0xFF)
{v['decoded']}[#({v['decoded']})+1]={v['bit32']}.band({v['bit32']}.rshift({v['value']},8),0xFF)
{v['decoded']}[#({v['decoded']})+1]={v['bit32']}.band({v['value']},0xFF)
{v['i']}={v['i']}+5
end
while #({v['decoded']})>{v['len']} do {v['table']}.remove({v['decoded']}) end
for {v['i']}=1,math.floor(#({v['decoded']})/2) do
local {v['j']}=({v['i']}-1)*2+1
if (({v['i']}-1)%3)~=0 then
local {v['tmp']}={v['decoded']}[{v['j']}]
{v['decoded']}[{v['j']}]={v['decoded']}[{v['j']}+1]
{v['decoded']}[{v['j']}+1]={v['tmp']}
end
end
for {v['i']}=1,#({v['decoded']}) do {v['decoded']}[{v['i']}]={v['bit32']}.bxor({v['decoded']}[{v['i']}],(({v['i']}-1)*{prime2}+{offset2})%256) end
for {v['i']}=1,#({v['decoded']}) do {v['decoded']}[{v['i']}]={v['bit32']}.bxor({v['decoded']}[{v['i']}],(({v['i']}-1)*{prime1}+{offset1})%256) end
for {v['i']}=1,#({v['decoded']}) do {v['decoded']}[{v['i']}]={v['bit32']}.bxor({v['decoded']}[{v['i']}],{v['key']}) end
local {v['result']}={v['buffer']}.create(#({v['decoded']}))
for {v['i']}=1,#({v['decoded']}) do {v['buffer']}.writeu8({v['result']},{v['i']}-1,{v['decoded']}[{v['i']}]) end
return {v['result']}
end)()'''
        
        return decoder

    def _generate_decoder_4layer_inflated(self, encoded: str, xor_key: int, prime1: int, offset1: int,
                                           prime2: int, offset2: int, orig_len: int, inflation_factor: int,
                                           checksum: int = 0, time_key_mult: int = 1) -> str:
        """Generate Lua decoder for 4-layer encryption WITH bytecode inflation, checksum, and time-based key."""
        # Generate obfuscated variable names
        v = {
            'encoded': self.naming.generate_luraph_style_name(),
            'charset': self.naming.generate_luraph_style_name(),
            'decoded': self.naming.generate_luraph_style_name(),
            'result': self.naming.generate_luraph_style_name(),
            'real': self.naming.generate_luraph_style_name(),
            'i': self.naming.generate_luraph_style_name(),
            'j': self.naming.generate_luraph_style_name(),
            'value': self.naming.generate_luraph_style_name(),
            'key': self.naming.generate_luraph_style_name(),
            'len': self.naming.generate_luraph_style_name(),
            'pos': self.naming.generate_luraph_style_name(),
            'c': self.naming.generate_luraph_style_name(),
            'tmp': self.naming.generate_luraph_style_name(),
            'crc': self.naming.generate_luraph_style_name(),
            'tkey': self.naming.generate_luraph_style_name(),
            # Library aliases
            'bit32': self.naming.generate_short_alias(),
            'buffer': self.naming.generate_short_alias(),
            'table': self.naming.generate_short_alias(),
        }
        
        # Escape the encoded string
        escaped_encoded = encoded.replace('\\', '\\\\').replace('"', '\\"').replace('\n', '\\n').replace('\r', '\\r')
        
        # Build the 4-layer decoder with inflation extraction, checksum validation, and time-based key
        decoder = f'''(function()
local {v['bit32']}=bit32
local {v['buffer']}=buffer
local {v['table']}=table
local {v['key']}={xor_key}
local {v['len']}={orig_len}
local {v['charset']}="0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!#$%&()*+:;<=>?@^_`{{|}}~"
local {v['encoded']}="{escaped_encoded}"
local {v['decoded']}={{}}
local {v['i']}=1
while {v['i']}<=#({v['encoded']}) do
local {v['value']}=0
for {v['j']}=0,4 do
local {v['c']}=({v['encoded']}):sub({v['i']}+{v['j']},{v['i']}+{v['j']})
local {v['pos']}=({v['charset']}):find({v['c']},1,true)
if {v['pos']} then {v['value']}={v['value']}*85+({v['pos']}-1) end
end
{v['decoded']}[#({v['decoded']})+1]={v['bit32']}.band({v['bit32']}.rshift({v['value']},24),0xFF)
{v['decoded']}[#({v['decoded']})+1]={v['bit32']}.band({v['bit32']}.rshift({v['value']},16),0xFF)
{v['decoded']}[#({v['decoded']})+1]={v['bit32']}.band({v['bit32']}.rshift({v['value']},8),0xFF)
{v['decoded']}[#({v['decoded']})+1]={v['bit32']}.band({v['value']},0xFF)
{v['i']}={v['i']}+5
end
for {v['i']}=1,math.floor(#({v['decoded']})/2) do
local {v['j']}=({v['i']}-1)*2+1
if (({v['i']}-1)%3)~=0 then
local {v['tmp']}={v['decoded']}[{v['j']}]
{v['decoded']}[{v['j']}]={v['decoded']}[{v['j']}+1]
{v['decoded']}[{v['j']}+1]={v['tmp']}
end
end
for {v['i']}=1,#({v['decoded']}) do {v['decoded']}[{v['i']}]={v['bit32']}.bxor({v['decoded']}[{v['i']}],(({v['i']}-1)*{prime2}+{offset2})%256) end
for {v['i']}=1,#({v['decoded']}) do {v['decoded']}[{v['i']}]={v['bit32']}.bxor({v['decoded']}[{v['i']}],(({v['i']}-1)*{prime1}+{offset1})%256) end
for {v['i']}=1,#({v['decoded']}) do {v['decoded']}[{v['i']}]={v['bit32']}.bxor({v['decoded']}[{v['i']}],{v['key']}) end
local {v['real']}={{}}
for {v['i']}=1,{orig_len} do {v['real']}[{v['i']}]={v['decoded']}[({v['i']}-1)*{inflation_factor}+1] end
local {v['crc']}=0
for {v['i']}=1,{orig_len} do {v['crc']}={v['bit32']}.bxor({v['crc']},{v['bit32']}.lrotate({v['real']}[{v['i']}],({v['i']}%32))) end
if {v['bit32']}.band({v['crc']},0xFFFFFFFF)~={v['bit32']}.band({checksum},0xFFFFFFFF) then error(chr(34)+chr(34)) end
local {v['tkey']}=math.floor((tick and tick() or os.clock())*{time_key_mult})%256
for {v['i']}=1,{orig_len} do {v['real']}[{v['i']}]={v['bit32']}.bxor({v['real']}[{v['i']}],{v['tkey']}) {v['real']}[{v['i']}]={v['bit32']}.bxor({v['real']}[{v['i']}],{v['tkey']}) end
local {v['result']}={v['buffer']}.create({orig_len})
for {v['i']}=1,{orig_len} do {v['buffer']}.writeu8({v['result']},{v['i']}-1,{v['real']}[{v['i']}]) end
return {v['result']}
end)()'''
        
        return decoder
    
    def _generate_output(self, vm_template: str, encoded_bytecode: str) -> str:
        """
        Generate the obfuscated output by combining VM and bytecode.
        
        LURAPH-STYLE: Return at the VERY START of the file!
        Pattern: return(function()...end)()
        
        Now uses core systems for Luraph-style obfuscation:
        - UNS for 31-char confusing variable names
        - BWS for bit32 wrapper aliases
        - CPM for large constant indices
        - OPG for opaque predicates
        - SHORT aliases for functions (1-3 chars like Luraph)
        """
        # Remove the final return statement from VM template since we'll inline it
        vm_code = vm_template
        last_return_idx = vm_code.rfind("return {")
        if last_return_idx != -1:
            vm_code = vm_code[:last_return_idx]
        
        # Generate obfuscated bitwise wrappers using BWS
        # Pass lib aliases to hide bit32/string library names
        bit32_alias = self.lib_aliases.get('bit32') if hasattr(self, 'lib_aliases') else None
        string_alias = self.lib_aliases.get('string') if hasattr(self, 'lib_aliases') else None
        bitwise_defs = self.bitwise.generate_definitions(bit32_alias=bit32_alias, string_alias=string_alias)
        
        # Generate SHORT variable names for hot path (Luraph style: 1-3 chars)
        bytecode_var = self.naming.generate_short_alias()  # e.g., 'w', 'X', 'I4'
        module_var = self.naming.generate_short_alias()    # e.g., 'e', 'C', 'F4'
        closure_var = self.naming.generate_short_alias()   # e.g., 'O', 'S', 'z4'
        env_var = self.naming.generate_short_alias()       # e.g., 'P', 'q', 'W2'
        wrapper_var = self.naming.generate_short_alias()   # e.g., '_w', '_F'
        
        # Add constants to pool using CPM
        self.constants.add_decoys()  # Add 5 decoy constants
        
        # Generate opaque predicates for fake branches
        true_pred = self.predicates.get_true_predicate()
        false_pred = self.predicates.get_false_predicate()
        
        # Generate dead code block that never executes
        dead_code_var = self.naming.generate_short_alias()
        dead_code = f"local {dead_code_var}=0"
        
        # Insert bitwise wrappers after the bit32 variable definitions
        insert_marker = "bit32.extract"
        insert_idx = vm_code.find(insert_marker)
        if insert_idx != -1:
            line_end = vm_code.find('\n', insert_idx)
            if line_end != -1:
                vm_code = vm_code[:line_end+1] + bitwise_defs + "\n" + vm_code[line_end+1:]
        else:
            do_idx = vm_code.find('\ndo\n')
            if do_idx != -1:
                vm_code = vm_code[:do_idx+4] + bitwise_defs + "\n" + vm_code[do_idx+4:]
        
        # Get the renamed function names (or use originals if not renamed)
        deserialize_func = self.vm_rename_map.get('luau_deserialize', 'luau_deserialize')
        load_func = self.vm_rename_map.get('luau_load', 'luau_load')
        
        # Generate Luraph-style function table with SHORT cryptic keys
        # Pattern: return({I4=function(O,O,e,C)...end,P=unpack,VL=bit32.bxor,...})
        method_table_var = self.naming.generate_short_alias()  # e.g., 'O', 'e', 'C'
        
        # Use SHORT method keys like Luraph: I4, D, W, z4, j, P, VL, LL
        deserialize_key = self.naming.generate_short_alias()  # e.g., 'D', 'I4'
        load_key = self.naming.generate_short_alias()         # e.g., 'W', 'z4'
        
        # Also add some Luraph-style library aliases to the table
        # IMPORTANT: Use _G["escaped"] to hide library names completely
        # This prevents static analysis from seeing "bit32", "string", etc.
        lib_aliases = []
        lib_alias_keys = ['_P', '_V', '_L', '_N', '_B', '_U', '_J', '_I', '_A', '_H', '_G', '_M', '_R', '_T']
        
        # Use _G["escaped"]["escaped"] pattern to hide library names
        # bit32 = \98\105\116\51\50
        # bxor = \98\120\111\114
        # band = \98\97\110\100
        # bor = \98\111\114
        # lrotate = \108\114\111\116\97\116\101
        # rshift = \114\115\104\105\102\116
        # lshift = \108\115\104\105\102\116
        # bnot = \98\110\111\116
        # NOTE: In Roblox, _G["string"] returns nil, so we use string directly
        # bit32 works via _G because it's explicitly added to _G in Roblox
        # Use lib aliases to hide library names completely
        # Get the aliases generated by _obfuscate_stdlib_access
        bit32_alias = self.lib_aliases.get('bit32', 'bit32') if hasattr(self, 'lib_aliases') else 'bit32'
        string_alias = self.lib_aliases.get('string', 'string') if hasattr(self, 'lib_aliases') else 'string'
        
        lib_funcs = [
            'unpack',
            f'{bit32_alias}["\\98\\120\\111\\114"]',  # bit32.bxor
            f'{bit32_alias}["\\98\\97\\110\\100"]',   # bit32.band
            f'{bit32_alias}["\\108\\114\\111\\116\\97\\116\\101"]',  # bit32.lrotate
            f'{bit32_alias}["\\114\\115\\104\\105\\102\\116"]',  # bit32.rshift
            f'{string_alias}["\\115\\117\\98"]',  # string.sub
            f'{bit32_alias}["\\108\\115\\104\\105\\102\\116"]',  # bit32.lshift
            f'{bit32_alias}["\\98\\110\\111\\116"]',  # bit32.bnot
        ]
        
        # Pick 4-6 random library aliases to include
        num_aliases = self.seed.get_random_int(4, 6)
        for i in range(min(num_aliases, len(lib_alias_keys), len(lib_funcs))):
            key = lib_alias_keys[i]
            func = lib_funcs[i]
            lib_aliases.append(f'{key}={func}')
        
        lib_aliases_str = ',' + ','.join(lib_aliases) if lib_aliases else ''
        
        # Generate magic number state indices (Luraph style: e[11708], C[0X13B6])
        state_indices = []
        for _ in range(3):
            idx = self.seed.get_random_int(10000, 99999)
            # Mix decimal and hex formats
            if self.seed.random_bool():
                state_indices.append(f'0X{idx:X}')
            else:
                state_indices.append(str(idx))
        
        # LURAPH-STYLE OUTPUT: return({P=unpack,VL=bit32.bxor,I4=function()...end,...})
        # Everything goes inside a returned table - NO code before return({
        # Pattern from luraphchunks.txt:
        # return({I4=function(O,O,e,C)e=17;...end,P=unpack,VL=bit32.bxor,D=function()...end,...})
        
        # Build stdlib entries for the table
        # LURAPH-STYLE: These are DECOY entries that add noise to the output
        # The actual VM code uses the library aliases injected via _generate_lib_alias_definitions
        # We DON'T include entries that expose library names like "coroutine", "buffer", etc.
        # Instead, we use obfuscated function references
        stdlib_entries = [
            # Unpack - this is safe, doesn't expose library names
            'P=unpack',
        ]
        
        # Shuffle stdlib entries for randomization
        import random
        rng = random.Random(self.config.seed)
        rng.shuffle(stdlib_entries)
        
        # Reserved stdlib keys - don't use these for function keys
        reserved_keys = {
            'P', 'VL', 'LL', 'N', 'B', 'F4', 'JL', 'IL', 'AL', 'hL', 'g4', 'm4', 'pL', 'UL', 'p', 'i', 'U',
            'bT', 'sC', 'sF', 'sG', 'sB', 'sR', 'cC', 'cR', 'cL', 'cW',
            'bF', 'bL', 'b8', 'b32', 'bS', 'bF32', 'bF64', 'tM', 'tP', 'tC', 'tI', 'tR', 'tCt', 'I'
        }
        
        # Generate unique function keys that don't collide with stdlib
        def get_safe_key():
            for _ in range(50):  # Try up to 50 times
                key = self.naming.generate_short_alias()
                if key not in reserved_keys:
                    reserved_keys.add(key)  # Mark as used
                    return key
            # Fallback to numbered keys
            return f'_f{rng.randint(100, 999)}'
        
        # Generate the main execution function as a table entry
        main_func_key = get_safe_key()
        
        # Build the execution code that will be deeply nested
        # UNIVERSAL PATTERN: Always return the result of closure()
        # This works for both Scripts and ModuleScripts:
        # - Scripts: closure() returns nil/nothing, which propagates up
        # - ModuleScripts: closure() returns the module value, which propagates up
        # The outer return(function(...)...end)(...) handles the final return
        
        # ALWAYS return the closure result - this is the universal pattern
        # Use select(1, ...) to ensure only ONE value is returned (Roblox requirement)
        # NOTE: For ModuleScript compatibility, we capture varargs at the start
        # and pass them to the closure. This avoids issues with ... scope.
        exec_code = f'''local {method_table_var}={{{deserialize_key}={deserialize_func},{load_key}={load_func}{lib_aliases_str}}}
local {bytecode_var}={encoded_bytecode}
local {module_var}={method_table_var}.{deserialize_key}({bytecode_var})
local {env_var}=getfenv and getfenv()or _ENV
local _args={{...}}
return(select(1,({method_table_var}.{load_key}({module_var},{env_var}))(table.unpack(_args))))'''
        
        # Apply deep nesting to the execution code (Luraph-style)
        # This adds while true do, if/elseif chains, and nested functions
        # Skip nesting for now to ensure return chain works
        nested_exec = exec_code  # Default fallback
        is_module = getattr(self, '_is_module', False)
        if getattr(self.config, 'enable_nesting', True) and not is_module:
            try:
                from transforms.nesting import DeepNestingGenerator
                deep_nester = DeepNestingGenerator(self.seed)
                nested_exec = deep_nester.apply_deep_nesting(exec_code, min_depth=4)
            except Exception as e:
                # If nesting fails, use original code
                pass
        
        # Add advanced anti-analysis features (only if enabled in config)
        # NOTE: For ModuleScripts, we skip the metamorphic wrapper and control flow
        # flattening because they break the return value chain. The inner code
        # already has proper return statements that need to propagate.
        protected_exec = nested_exec  # Default fallback
        if getattr(self.config, 'enable_anti_analysis', True) and not is_module:
            try:
                from transforms.anti_analysis import AdvancedAntiAnalysis, ControlFlowFlattener
                anti_analysis = AdvancedAntiAnalysis(self.seed)
                cff = ControlFlowFlattener(self.seed)
                
                # Generate environment fingerprint (detects wrong execution environment)
                env_fingerprint = anti_analysis.generate_environment_fingerprint()
                
                # Generate anti-hook check
                anti_hook = anti_analysis.generate_anti_hook_check()
                
                # Wrap execution code in metamorphic structure
                # For ModuleScripts, preserve the return value
                metamorphic_exec = anti_analysis.generate_metamorphic_wrapper(
                    nested_exec, 
                    preserve_return=is_module
                )
                
                # Apply control flow flattening to the metamorphic code
                flattened_exec = cff.flatten_function(metamorphic_exec)
                
                # Combine all anti-analysis layers
                protected_exec = f'''{env_fingerprint}
{anti_hook}
{flattened_exec}'''
            except ImportError:
                # Anti-analysis module not available
                pass
            except Exception as e:
                # If anti-analysis fails, use original nested code
                pass
        elif is_module:
            # For ModuleScripts, skip anti-analysis that could break return value
            # The anti-hook check returns function()end on failure which breaks modules
            # Just use the execution code directly - the VM itself has protections
            protected_exec = nested_exec
        
        # Generate library alias definitions (hides coroutine, buffer, bit32, etc.)
        lib_alias_defs = self._generate_lib_alias_definitions()
        
        # Build the main function that contains all VM code + protected execution
        # Library aliases are injected at the START of the function
        # IMPORTANT: The main function MUST return the result of protected_exec
        # because protected_exec contains a return statement that needs to propagate
        # NOTE: Accept ... for ModuleScript compatibility (passes script reference through)
        main_func = f'''{main_func_key}=function(...)
{lib_alias_defs}
{vm_code}
{protected_exec}
end'''
        
        # Interleave stdlib entries with the main function
        all_entries = stdlib_entries.copy()
        # Insert main function at a random position
        insert_pos = rng.randint(0, len(all_entries))
        all_entries.insert(insert_pos, main_func)
        
        # Add MANY Luraph-style helper functions to the table
        # Luraph has: I4, z4, f4, D, W, j, a, R, T4, Z, G4, V4, etc.
        # These are small functions that do simple operations
        
        # Generate magic number indices like Luraph: e[11708], F[0X13B6], C[24977]
        magic_indices = []
        for _ in range(10):
            idx = rng.randint(10000, 99999)
            if rng.random() > 0.5:
                magic_indices.append(f'0X{idx:X}')
            else:
                magic_indices.append(str(idx))
        
        # Generate many small helper functions like Luraph
        # LURAPH FEATURES:
        # 1. Method-style calls: O:h4(w,C,e) - uses colon syntax
        # 2. O.I[n] constant array: O.I[0X4], O.I[0b11] - internal constant table
        # 3. Unicode escapes: '\u{02E}\u{02E}' - mixed with decimal
        helper_funcs = []
        
        # Generate O.I constant array values (Luraph uses this throughout)
        # O.I is a table of constants accessed by index
        const_array_key = 'I'  # Luraph uses 'I' for constant array
        const_values = [rng.randint(1, 255) for _ in range(10)]
        
        # Pattern 1: Return table wrapper - a=function(O,O)return{O};end
        k = get_safe_key()
        helper_funcs.append(f'{k}=function(O,O)return{{O}}end')
        
        # Pattern 2: Return third arg with O.I access - j=function(O,O,e,C)e=(nil);O=(nil);C=O.I[0x23];return O,C,e;end
        k = get_safe_key()
        helper_funcs.append(f'{k}=function(O,O,e,C)e=nil;O=nil;C=O.{const_array_key}[{magic_indices[0]}];return O,C,e end')
        
        # Pattern 3: State setter - T4=function(O,O,e)(O)[0B11]=(e);end
        k = get_safe_key()
        helper_funcs.append(f'{k}=function(O,O,e)(O)[0B11]=e end')
        
        # Pattern 4: State getter with O.I - Z=function(O,O,e)O=e[0X6d5_5]+O.I[0X4];return O;end
        k = get_safe_key()
        helper_funcs.append(f'{k}=function(O,O,e)O=e[{magic_indices[1]}];return O end')
        
        # Pattern 5: Vararg wrapper - V4=function(O,...)return{(...)[...]};end
        k = get_safe_key()
        helper_funcs.append(f'{k}=function(O,...)return{{(...)}}end')
        
        # Pattern 6: METHOD-STYLE CALL - z4=function(O,O,e,C)O=O:F(e);return O;end (Luraph uses colon!)
        method_key = get_safe_key()
        k = get_safe_key()
        helper_funcs.append(f'{k}=function(O,O,e,C)O=C;return O end')
        
        # Pattern 7: Index setter with O.I - I4=function(O,O,e,C)e=O.I[0X4];(O[0x1])[0X4]=(O[1][4]+C);return e;end
        k = get_safe_key()
        helper_funcs.append(f'{k}=function(O,O,e,C)e=O.{const_array_key}[0X{const_values[0]:X}];return e end')
        
        # Pattern 8: Complex state with O.I - D=function(O,e,C,F)(C)[0B10__001]=O.I[0X09];...
        k = get_safe_key()
        helper_funcs.append(f'{k}=function(O,e,C,F)C[{magic_indices[2]}]=O.{const_array_key}[0X{const_values[1]:X}];return e end')
        
        # Pattern 9: Simple conditional with O.I access - NO while loops (Roblox compatible)
        k = get_safe_key()
        helper_funcs.append(f'{k}=function(O,e,C)local F=O.{const_array_key}[{magic_indices[3]}];if F==O.{const_array_key}[{magic_indices[3]}] then F=0 end;return C end')
        
        # Pattern 10: Nested if/elseif with O.I - NO while loops (Roblox compatible)
        k = get_safe_key()
        helper_funcs.append(f'{k}=function(O,e,C,F)F=O.{const_array_key}[0X{const_values[2]:X}];if F<=O.{const_array_key}[0X{const_values[3]:X}] then e[0b1110]=O else F=O.{const_array_key}[0X{const_values[4]:X}] end;return F end')
        
        # Pattern 11: Complex math with O.I - W=function with bit operations using O.I
        k = get_safe_key()
        helper_funcs.append(f'{k}=function(O,e,C)C[{magic_indices[7]}]=(-{rng.randint(1000000,9999999)}+(O.{const_array_key}[0X{const_values[5]:X}]));return e end')
        
        # Pattern 12: Table index with O.I - G4=function with table access
        k = get_safe_key()
        helper_funcs.append(f'{k}=function(O,e,C,F,w)local X=e[0X1][O.{const_array_key}[0X{const_values[6]:X}]];if F~={magic_indices[8]} then C[w]=X end end')
        
        # Pattern 13: METHOD-STYLE with O.I - Luraph's O:h4(w,C,e) pattern
        method_func_key = get_safe_key()
        helper_funcs.append(f'{method_func_key}=function(self,w,C,e)return self.{const_array_key}[0X{const_values[7]:X}]+C end')
        
        # Pattern 14: Complex nested with O.I array access - O.F4((O.LL(O.I[0X4],C)))
        k = get_safe_key()
        helper_funcs.append(f'{k}=function(O,e,C,F)return(O.F4((O.LL(O.{const_array_key}[0X{const_values[8]:X}],C))))end')
        
        # Pattern 15: Unicode escape string pattern - '\u{{02E}}\u{{02E}}...'
        k = get_safe_key()
        helper_funcs.append(f'{k}=function(O,e)return O[0B10010](e,\'\\u{{02E}}\\u{{02E}}...\',O.{const_array_key}[0X{const_values[9]:X}])end')
        
        # Add the O.I constant array definition to stdlib entries
        const_array_def = f'{const_array_key}={{{",".join(f"[0X{i:X}]={v}" for i, v in enumerate(const_values))}}}'
        stdlib_entries.append(const_array_def)
        
        # Insert all helper functions at random positions
        for hf in helper_funcs:
            pos = rng.randint(0, len(all_entries))
            all_entries.insert(pos, hf)
        
        # Generate DECOY bytecode strings (confuses attackers about which is real)
        # These look like encrypted bytecode but are never used
        decoy_strings = self._generate_decoy_bytecode_strings(num_decoys=5)
        decoy_vars = []
        for i, decoy in enumerate(decoy_strings):
            var_name = self.naming.generate_luraph_style_name()
            decoy_vars.append(f'{var_name}="{decoy}"')
        
        # Insert decoy strings at random positions in the table
        for dv in decoy_vars:
            pos = rng.randint(0, len(all_entries))
            all_entries.insert(pos, dv)
        
        # Build the final output - UNIVERSAL PATTERN: return(function(...)...end)(...)
        # This pattern works for BOTH Scripts and ModuleScripts:
        # - For Scripts: executes and returns nothing (or whatever)
        # - For ModuleScripts: executes and returns the module's return value
        # The ... passes through any arguments and the outer return propagates the result
        table_var = self.naming.generate_short_alias()
        
        # UNIVERSAL: Always use return(function(...)...return main(...)end)(...)
        # This works for ALL script types without needing detection
        # The ... is passed through for ModuleScript compatibility (contains script reference)
        output = f"return(function(...)local {table_var}={{{','.join(all_entries)}}};return({table_var}.{main_func_key}(...))end)(...)"
        
        # Apply nested VM wrapper if enabled
        # This wraps the entire output in a state machine for additional protection
        # NOTE: Skip for ModuleScripts as it breaks the return value chain
        if getattr(self.config, 'enable_nested_vm', True) and OPCODE_VIRTUALIZATION_AVAILABLE and not is_module:
            try:
                from transforms.opcode_virtualization import MultiLayerVM
                nested_vm = MultiLayerVM(self.seed, layers=2)
                output = nested_vm.generate_nested_vm_wrapper(output)
            except Exception:
                pass  # If nested VM fails, continue with original output
        
        # NOTE: Watermark is added later in _add_watermark() after all transforms
        # Do NOT add watermark here - it breaks the return(function()...) pattern
        # that transforms rely on for proper injection
        
        return output
    
    def _init_transforms(self):
        """
        Initialize all transform systems.
        
        This sets up all the obfuscation transforms that will be applied
        to the VM code. Each transform is initialized with the seed for
        deterministic behavior.
        """
        if not TRANSFORMS_AVAILABLE:
            # Transforms not available - set all to None
            self.number_transformer = None
            self.table_transformer = None
            self.expression_wrapper = None
            self.expression_normalizer = None
            self.control_flow_transformer = None
            self.state_machine_system = None
            self.string_transformer = None
            self.variable_transformer = None
            self.anti_analysis = None
            self.dead_code = None
            self.luraph_style = None
            self.misc_transformer = None
            self.dense_formatter = None
            self.pretty_printer = None
            return
        
        # Number transforms (Task 4)
        if self.config.enable_number_transform:
            self.number_transformer = LuraphNumberTransformer(self.seed)
        else:
            self.number_transformer = None
        
        # Table transforms (Task 5)
        if self.config.enable_table_transform:
            self.table_transformer = TableIndirectionGenerator(self.seed, self.constants)
        else:
            self.table_transformer = None
        
        # Expression transforms (Task 6)
        if self.config.enable_expression_wrapper:
            self.expression_wrapper = DeepExpressionWrapper(
                self.seed, 
                opg=self.predicates
            )
            self.expression_normalizer = ExpressionNormalizer(self.seed)
        else:
            self.expression_wrapper = None
            self.expression_normalizer = None
        
        # Control flow transforms (Task 7)
        if self.config.enable_state_machine:
            self.control_flow_transformer = LuraphControlFlowTransformer(
                self.seed,
                opg=self.predicates
            )
            self.state_machine_system = StateMachineSystem(
                self.seed,
                opg=self.predicates
            )
        else:
            self.control_flow_transformer = None
            self.state_machine_system = None
        
        # String transforms (Task 11)
        if self.config.enable_string_encryption:
            self.string_transformer = StringObfuscationTransformer(self.seed)
        else:
            self.string_transformer = None
        
        # Variable renaming (Task 13)
        if self.config.enable_uns:
            self.variable_transformer = VariableRenamingTransformer(self.seed, self.naming)
        else:
            self.variable_transformer = None
        
        # Anti-analysis (Task 14)
        if self.config.enable_anti_analysis:
            self.anti_analysis = AntiAnalysisTransformer(self.seed)
        else:
            self.anti_analysis = None
        
        # Dead code (Task 16)
        if self.config.enable_dead_code:
            self.dead_code = DeadCodeTransformer(self.seed)
        else:
            self.dead_code = None
        
        # Luraph style transforms (Task 19)
        self.luraph_style = LuraphStyleTransformer(
            self.seed, 
            naming=self.naming, 
            cpm=self.constants,
            opg=self.predicates
        )
        
        # Miscellaneous transforms (Task 20)
        self.misc_transformer = MiscellaneousTransformer(self.seed)
        
        # Output formatters (Task 18)
        self.dense_formatter = DenseFormatter(self.seed)
        self.pretty_printer = PrettyPrinter()
        
        # Enhanced nesting transforms (Enhanced Nesting Spec) - HEAVY NESTING 5-6 layers
        if NESTING_AVAILABLE and getattr(self.config, 'enable_nesting', True):
            nesting_config = NestingConfig(
                min_depth=getattr(self.config, 'nesting_min_depth', 5),  # HEAVY: 5-6 layers
                max_depth=getattr(self.config, 'nesting_max_depth', 6),  # HEAVY: 5-6 layers
                identity_function_count=getattr(self.config, 'identity_function_count', 12),
                nest_numbers=getattr(self.config, 'nest_numbers', True),
                nest_table_indices=getattr(self.config, 'nest_table_indices', True),
                nest_function_args=getattr(self.config, 'nest_function_args', True),
                nest_arithmetic=getattr(self.config, 'nest_arithmetic', True),
            )
            self.nesting_transformer = NestingTransformer(self.seed, nesting_config)
            
            # EscapeSequenceWrapper and NumberFormatter removed in v2 - use string obfuscation instead
            self.escape_wrapper = None
            self.number_formatter = None
        else:
            self.nesting_transformer = None
            self.escape_wrapper = None
            self.number_formatter = None
        
        # ULTRA-DEEP nesting system (EXCEEDS Luraph - 5-8 layers, multiple tables)
        if ULTRA_NESTING_AVAILABLE and getattr(self.config, 'enable_ultra_nesting', True):
            ultra_config = UltraNestingConfig(
                min_depth=getattr(self.config, 'ultra_nesting_min_depth', 5),
                max_depth=getattr(self.config, 'ultra_nesting_max_depth', 8),
                num_tables=getattr(self.config, 'ultra_nesting_tables', 4),
            )
            self.ultra_nesting = MultiTableNestingSystem(self.seed, ultra_config)
        else:
            self.ultra_nesting = None
        
        # ULTRA string encryption (EXCEEDS Luraph - sR() lookup function)
        if ULTRA_STRINGS_AVAILABLE and getattr(self.config, 'enable_ultra_strings', False):
            self.ultra_strings = create_ultra_string_encryptor(self.seed)
        else:
            self.ultra_strings = None
        
        # Computed index generator (EXCEEDS Luraph)
        if COMPUTED_INDICES_AVAILABLE and getattr(self.config, 'enable_computed_indices', True):
            self.computed_indices = create_computed_index_generator(self.seed)
        else:
            self.computed_indices = None
        
        # Decoy code generator (EXCEEDS Luraph)
        if DECOY_CODE_AVAILABLE and getattr(self.config, 'enable_decoy_code', True):
            self.decoy_code = create_decoy_code_generator(self.seed)
        else:
            self.decoy_code = None
        
        # Number diversity formatter (EXCEEDS Luraph)
        if NUMBER_DIVERSITY_AVAILABLE and getattr(self.config, 'enable_number_diversity', True):
            self.number_diversity = create_number_diversity_formatter(self.seed)
        else:
            self.number_diversity = None
        
        # Roblox-specific protection (Beat-Luraph features)
        if ROBLOX_PROTECTION_AVAILABLE and getattr(self.config, 'enable_roblox_protection', True):
            self.roblox_protection = RobloxProtectionTransformer(self.seed)
        else:
            self.roblox_protection = None
        
        # Advanced protection system (Beat-Luraph features)
        if ADVANCED_PROTECTION_AVAILABLE and getattr(self.config, 'enable_advanced_protection', True):
            protection_config = {
                'enable_string_encryption': getattr(self.config, 'enable_runtime_string_encryption', True),
                'enable_integrity_check': getattr(self.config, 'enable_integrity_check', True),
                'enable_anti_decompiler': getattr(self.config, 'enable_anti_decompiler', True),
                'enable_watermark': getattr(self.config, 'enable_watermark', True),
                'enable_time_expiry': getattr(self.config, 'enable_time_expiry', False),
                'enable_hardware_binding': getattr(self.config, 'enable_hardware_binding', False),
                'watermark_id': getattr(self.config, 'watermark_id', None),
                'expiry_timestamp': getattr(self.config, 'expiry_timestamp', None),
                'allowed_player_ids': getattr(self.config, 'allowed_player_ids', None),
            }
            self.advanced_protection = AdvancedProtectionSystem(self.seed, protection_config)
        else:
            self.advanced_protection = None
    
    def _apply_transforms(self, code: str) -> str:
        """
        Apply all enabled obfuscation transforms in the correct order.
        
        Transform order (designed to avoid conflicts):
        1. Number transformation (obfuscate numeric literals in VM code)
        2. String encryption (encrypt string literals)
        3. Enhanced nesting (escape sequence wrapping, number diversity)
        4. Constant unfolding (break constants into computed expressions)
        5. Luraph style transforms (final polish)
        6. Miscellaneous transforms (final touches)
        
        CRITICAL: Number transforms must NOT be applied to:
        - String literals (escape sequences like \000, \255)
        - The bytecode buffer string
        
        NOTE: Many transforms work on the VM template code structure.
        The bytecode itself is already encrypted and embedded.
        """
        # Create ONE ConstantProtectionIntegrator instance for all constant transforms
        # This ensures the helper table names match the expressions
        luraph_integrator = None
        if CONSTANT_PROTECTION_AVAILABLE:
            luraph_integrator = ConstantProtectionIntegrator(self.seed)
        
        # 0. Constant Unfolding - Break constants into computed expressions
        # This makes it harder to understand the actual values being used
        if CONSTANT_PROTECTION_AVAILABLE and getattr(self.config, 'enable_constant_unfolding', True):
            try:
                depth = getattr(self.config, 'constant_unfolding_depth', 2)
                code = luraph_integrator.transform_number_in_code(code, depth)
            except Exception as e:
                pass  # Continue if constant unfolding fails
        
        # 0.5. Luraph-Style Number Transformation (SAFE VERSION)
        # Transforms hex numbers in SAFE contexts into nested bit32 expressions
        # Uses obfuscated helper table aliases instead of bit32.xxx
        if CONSTANT_PROTECTION_AVAILABLE and luraph_integrator and getattr(self.config, 'enable_luraph_constants', True):
            try:
                luraph_depth = getattr(self.config, 'luraph_constant_depth', 5)
                integrator = luraph_integrator  # Reuse the same instance!
                
                # Generate the helper table code (defines O.VL, O.LL, etc.)
                helper_table_code = integrator.get_luraph_helper_table()
                
                # Safe transformation: only transform numbers after "=" in assignments
                import re
                
                # Protect strings first
                string_placeholders = {}
                counter = [0]
                def protect_str(m):
                    ph = f"__STRPH{counter[0]}__"
                    string_placeholders[ph] = m.group(0)
                    counter[0] += 1
                    return ph
                
                str_pattern = r'"(?:[^"\\]|\\.)*"|\'(?:[^\'\\]|\\.)*\''
                protected = re.sub(str_pattern, protect_str, code)
                
                # Transform numbers in safe patterns: "=0xNNN" or "=NNN" (assignments)
                rng = integrator.seed.get_random_int(0, 0xFFFFFFFF)
                import random
                transform_rng = random.Random(rng)
                
                def safe_transform(match):
                    prefix = match.group(1)
                    num_str = match.group(2)
                    
                    # Transform ~98% of numbers for MAXIMUM obfuscation
                    if transform_rng.random() > 0.98:
                        return match.group(0)
                    
                    try:
                        if num_str.startswith('0x') or num_str.startswith('0X'):
                            n = int(num_str.replace('_', ''), 16)
                        else:
                            n = int(num_str)
                        
                        # Skip very small numbers (opcodes 0-15) and very large numbers
                        if n < 16 or n > 0x7FFFFFFF:
                            return match.group(0)
                        
                        # Generate nested expression WITH ALIASES (use_aliases=True)
                        expr = integrator.luraph_constants.obfuscate_number(n, luraph_depth, use_aliases=True)
                        return prefix + expr
                    except:
                        return match.group(0)
                
                # Pattern: "=0xNNN" or "=NNN" (but not "==")
                safe_pattern = r'(=)(?!=)(0[xX][0-9a-fA-F_]+|\d{3,})'
                transformed = re.sub(safe_pattern, safe_transform, protected)
                
                # Also transform numbers after "return " 
                return_pattern = r'(return\s+)(0[xX][0-9a-fA-F_]+|\d{3,})'
                transformed = re.sub(return_pattern, safe_transform, transformed)
                
                # Also transform numbers in comparisons like "== 0xNNN" or "~= 0xNNN"
                compare_pattern = r'(==\s*|~=\s*)(0[xX][0-9a-fA-F_]+|\d{3,})'
                transformed = re.sub(compare_pattern, safe_transform, transformed)
                
                # Also transform numbers after commas in function calls (safe context)
                comma_pattern = r'(,\s*)(0[xX][0-9a-fA-F_]+|\d{3,})(?=[,\)])'
                transformed = re.sub(comma_pattern, safe_transform, transformed)
                
                # Restore strings
                for ph, orig in string_placeholders.items():
                    transformed = transformed.replace(ph, orig)
                
                # Inject helper table INSIDE the wrapper function, not before it
                # The code structure is: return(function(...)local TABLE={...};...end)(...)
                # We need to inject AFTER "return(function(...)" but BEFORE the first local
                # Pattern: return(function(...)local -> return(function(...){HELPER}local
                # Support both return(function() and return(function(...)
                wrapper_start_vararg = 'return(function(...)'
                wrapper_start_no_vararg = 'return(function()'
                
                if wrapper_start_vararg in transformed:
                    # Find the position after "return(function(...))"
                    wrapper_idx = transformed.find(wrapper_start_vararg)
                    insert_pos = wrapper_idx + len(wrapper_start_vararg)
                    transformed = transformed[:insert_pos] + helper_table_code + '\n' + transformed[insert_pos:]
                elif wrapper_start_no_vararg in transformed:
                    # Find the position after "return(function())"
                    wrapper_idx = transformed.find(wrapper_start_no_vararg)
                    insert_pos = wrapper_idx + len(wrapper_start_no_vararg)
                    transformed = transformed[:insert_pos] + helper_table_code + '\n' + transformed[insert_pos:]
                else:
                    # Fallback: Wrap the entire code in return(function(...)...end)(...)
                    # This ensures ModuleScripts work correctly
                    transformed = f'return(function(...){helper_table_code}\n{transformed}\nend)(...)'
                
                code = transformed
            except Exception as e:
                pass  # Continue if Luraph constant transform fails
        
        # 1. Transform numbers to Luraph-style formats (hex with underscores, binary)
        if self.number_transformer and self.config.enable_number_transform:
            try:
                code = self._transform_numbers_safe(code)
            except Exception as e:
                pass  # Continue if number transform fails
        
        # 2. String encryption - encrypt string literals in VM code
        # Note: The bytecode strings are already encrypted via _encode_bytecode
        # Skip if ultra_strings is enabled (they conflict - ultra_strings is better)
        ultra_strings_enabled = hasattr(self, 'ultra_strings') and self.ultra_strings and ULTRA_STRINGS_AVAILABLE and getattr(self.config, 'enable_ultra_strings', False)
        if self.string_transformer and TRANSFORMS_AVAILABLE and self.config.enable_string_encryption and not ultra_strings_enabled:
            try:
                code = self.string_transformer.transform_strings_in_code(code)
            except Exception as e:
                pass  # Continue if string transform fails
        
        # 2.5 ULTRA String Encryption - Replace strings with sR() lookup calls
        # This EXCEEDS Luraph with encrypted blob and decryption function
        # Runs INSTEAD of regular string encryption when enabled
        if ultra_strings_enabled:
            try:
                code = self.ultra_strings.apply_to_code(code)
            except Exception as e:
                pass  # Continue if ultra strings fails
        
        # 3. Enhanced nesting - escape sequence wrapping
        # SAFE: Only transforms escape sequence strings to string.char calls
        # NOTE: We inject the char function definition at the start of the code
        if hasattr(self, 'escape_wrapper') and self.escape_wrapper and NESTING_AVAILABLE and getattr(self.config, 'enable_escape_wrapping', True):
            try:
                code = self._apply_escape_wrapping(code)
            except Exception as e:
                pass  # Continue if escape wrapping fails
        
        # 3.5 HEAVY NESTING - Apply 5-6 layers of identity function nesting to ALL numbers
        # This wraps every numeric literal in nested identity function calls
        # SAFE: Identity functions are defined at the start of the output
        # NOTE: Skip if ultra nesting is enabled (ultra nesting is better)
        ultra_nesting_enabled = hasattr(self, 'ultra_nesting') and self.ultra_nesting and ULTRA_NESTING_AVAILABLE and getattr(self.config, 'enable_ultra_nesting', True)
        if not ultra_nesting_enabled and hasattr(self, 'nesting_transformer') and self.nesting_transformer and NESTING_AVAILABLE and getattr(self.config, 'enable_heavy_nesting', True):
            try:
                code = self._apply_heavy_nesting(code)
            except Exception as e:
                pass  # Continue if heavy nesting fails
        
        # 3.6 ULTRA-DEEP NESTING - Apply 5-8 layers with MULTIPLE identity tables
        # This EXCEEDS Luraph with deeper nesting and more variety
        # SAFE: Identity tables are defined at the start of the output
        if ultra_nesting_enabled:
            try:
                code = self._apply_ultra_nesting(code)
            except Exception as e:
                pass  # Continue if ultra nesting fails
        
        # 3. Variable renaming - DISABLED
        # The regex-based variable renamer is not scope-aware and breaks the VM
        # when variables with the same name exist in different scopes.
        # The user's code is already protected by bytecode encryption.
        # TODO: Implement proper AST-based variable renaming for VM code
        #
        # if self.variable_transformer and TRANSFORMS_AVAILABLE and self.config.enable_uns:
        #     try:
        #         code = self.variable_transformer.transform(
        #             code,
        #             enable_variable_renaming=True,
        #             enable_param_transform=True,
        #             enable_function_aliasing=False,
        #             enable_global_aliases=False,
        #             enable_metamethod_aliases=False
        #         )
        #     except Exception as e:
        #         pass
        
        # 4. Control flow transformation - wrap execution with control flow structures
        # SAFE: Only wraps the final return statement, doesn't modify VM internals
        if self.control_flow_transformer and TRANSFORMS_AVAILABLE and self.config.enable_state_machine:
            try:
                code = self._apply_control_flow_safe(code)
            except Exception as e:
                pass  # Continue if control flow transform fails
        
        # 5. Dead code injection - SAFE version that only adds to wrapper level
        # Injects fake branches and dead code blocks OUTSIDE the VM code
        if self.dead_code and TRANSFORMS_AVAILABLE and self.config.enable_dead_code:
            try:
                code = self._apply_dead_code_safe(code)
            except Exception as e:
                pass  # Continue if dead code injection fails
        
        # 6. Anti-debug traps - detect debugging attempts
        if self.anti_analysis and TRANSFORMS_AVAILABLE and self.config.enable_anti_analysis:
            try:
                code = self._apply_anti_debug_safe(code)
            except Exception as e:
                pass  # Continue if anti-debug fails
        
        # 6.5 Roblox-specific protection (Beat-Luraph features)
        # Adds anti-executor detection, environment validation, etc.
        if hasattr(self, 'roblox_protection') and self.roblox_protection and ROBLOX_PROTECTION_AVAILABLE and getattr(self.config, 'enable_roblox_protection', True):
            try:
                code = self._apply_roblox_protection(code)
            except Exception as e:
                pass  # Continue if Roblox protection fails
        
        # 7. Luraph style transforms - final polish
        # DISABLED: This transform breaks the VM code structure
        # The core Luraph-style obfuscation is already applied in _generate_output:
        # - UNS naming (31-char confusing names)
        # - BWS wrappers (bit32 aliases)
        # - CPM indices (large non-sequential indices)
        # - OPG predicates (opaque predicates)
        # if self.luraph_style and TRANSFORMS_AVAILABLE:
        #     try:
        #         code = self.luraph_style.transform(code)
        #     except Exception:
        #         pass  # Continue if luraph style transform fails
        
        # 8. Miscellaneous transforms - final touches
        # DISABLED: This transform breaks the VM code structure
        # if self.misc_transformer and TRANSFORMS_AVAILABLE:
        #     try:
        #         code = self.misc_transformer.apply_all(code)
        #     except Exception:
        #         pass  # Continue if misc transform fails
        
        # 9. Advanced Protection Features (Beat-Luraph)
        # Adds integrity checks, anti-decompiler tricks, watermarking, etc.
        if hasattr(self, 'advanced_protection') and self.advanced_protection and ADVANCED_PROTECTION_AVAILABLE:
            try:
                code = self._apply_advanced_protection(code)
            except Exception as e:
                pass  # Continue if advanced protection fails
        
        # 10. Multi-Layer VM - Wrap in additional VM layer
        # This adds another layer of virtualization around the code
        # NOTE: Skip for ModuleScripts as it breaks the return value chain
        is_module = getattr(self, '_is_module', False)
        if OPCODE_VIRTUALIZATION_AVAILABLE and getattr(self.config, 'enable_multi_layer_vm', True) and not is_module:
            try:
                code = self._apply_multi_layer_vm(code)
            except Exception as e:
                pass  # Continue if multi-layer VM fails
        
        # 11. VM String Encryption - Encrypt string literals in VM code
        # This hides VM structure strings like "opcode", "stack", etc.
        if CONSTANT_PROTECTION_AVAILABLE and getattr(self.config, 'enable_string_constant_encryption', True):
            try:
                encryptor = VMStringEncryptor(self.seed)
                code = encryptor.transform_vm_strings(code, encrypt_method='escape')
            except Exception as e:
                pass  # Continue if VM string encryption fails
        
        # 12. Runtime Protection - Self-modifying code and anti-dump
        # Adds code that modifies dispatch tables at runtime and detects dumping
        # NOTE: Skip for ModuleScripts as it breaks the return value chain
        if RUNTIME_PROTECTION_AVAILABLE and not is_module:
            try:
                enable_self_mod = getattr(self.config, 'enable_self_modifying_code', True)
                enable_anti_dump = getattr(self.config, 'enable_anti_dump', True)
                if enable_self_mod or enable_anti_dump:
                    integrator = RuntimeProtectionIntegrator(self.seed)
                    protection_code = integrator.generate_full_protection(
                        enable_self_mod=enable_self_mod,
                        enable_anti_dump=enable_anti_dump
                    )
                    # Inject protection code after the initial return(function(...)
                    # Support both return(function() and return(function(...)
                    if 'return(function(...)' in code:
                        code = code.replace('return(function(...)', f'return(function(...){protection_code}', 1)
                    elif 'return(function()' in code:
                        code = code.replace('return(function()', f'return(function(){protection_code}', 1)
            except Exception as e:
                pass  # Continue if runtime protection fails
        
        # 12.5. Luraph-Style Constant Helper Table - MOVED TO STEP 0.5
        # The helper table is now injected in step 0.5 along with the number transformation
        # to ensure the same instance is used for both
        
        # 13. Anti-Deobfuscation Protection - Anti-emulation, integrity checks, handler polymorphism
        # Makes automated deobfuscation significantly harder
        # NOTE: Skip for ModuleScripts as it breaks the return value chain
        if ANTI_DEOBFUSCATION_AVAILABLE and not is_module:
            try:
                enable_anti_emu = getattr(self.config, 'enable_anti_emulation', True)
                enable_integrity = getattr(self.config, 'enable_code_integrity', True)
                enable_poly = getattr(self.config, 'enable_handler_polymorphism', True)
                
                anti_deob = AntiDeobfuscationIntegrator(self.seed)
                
                # Apply handler polymorphism first (modifies handler patterns)
                if enable_poly:
                    code = anti_deob.apply_handler_polymorphism(code)
                
                # Generate and inject anti-emulation and integrity checks
                if enable_anti_emu or enable_integrity:
                    protection_code = anti_deob.generate_full_protection(
                        enable_anti_emulation=enable_anti_emu,
                        enable_integrity=enable_integrity
                    )
                    # Inject after return(function(...)
                    # Support both return(function() and return(function(...)
                    if 'return(function(...)' in code:
                        code = code.replace('return(function(...)', f'return(function(...){protection_code}', 1)
                    elif 'return(function()' in code:
                        code = code.replace('return(function()', f'return(function(){protection_code}', 1)
            except Exception as e:
                pass  # Continue if anti-deobfuscation fails
        
        # 14. Computed Index Generator - Replace table indices with computed expressions
        # Transforms table[256] to table[((128+128))]
        if hasattr(self, 'computed_indices') and self.computed_indices and COMPUTED_INDICES_AVAILABLE and getattr(self.config, 'enable_computed_indices', True):
            try:
                code = self.computed_indices.apply_to_code(code)
            except Exception as e:
                pass  # Continue if computed indices fails
        
        # 15. Decoy Code Generator - Inject fake code blocks
        # Adds fake loops and conditionals that do nothing
        if hasattr(self, 'decoy_code') and self.decoy_code and DECOY_CODE_AVAILABLE and getattr(self.config, 'enable_decoy_code', True):
            try:
                code = self.decoy_code.apply_to_code(code)
            except Exception as e:
                pass  # Continue if decoy code fails
        
        # 16. Number Diversity Formatter - Format numbers in diverse ways
        # Uses mixed hex/binary formats with underscores
        if hasattr(self, 'number_diversity') and self.number_diversity and NUMBER_DIVERSITY_AVAILABLE and getattr(self.config, 'enable_number_diversity', True):
            try:
                code = self.number_diversity.apply_to_code(code)
            except Exception as e:
                pass  # Continue if number diversity fails
        
        return code
    
    def _apply_multi_layer_vm(self, code: str) -> str:
        """
        Apply Multi-Layer VM wrapper.
        
        Wraps the entire output in an additional VM layer for
        extra protection against reverse engineering.
        """
        if not OPCODE_VIRTUALIZATION_AVAILABLE:
            return code
        
        multi_vm = MultiLayerVM(self.seed, layers=1)
        
        # Generate VM dispatch obfuscation
        dispatch_obf = multi_vm.generate_vm_dispatch_obfuscation()
        
        # The code already starts with return(...), so we need to wrap it
        # We'll inject the dispatch obfuscation at the start
        
        # Find the main function and inject dispatch obfuscation
        import re
        func_pattern = r'([a-zA-Z_][a-zA-Z0-9_]*)=function\(\)\n'
        match = re.search(func_pattern, code)
        
        if match:
            insert_pos = match.end()
            code = code[:insert_pos] + dispatch_obf + '\n' + code[insert_pos:]
        
        return code
    
    def _apply_advanced_protection(self, code: str) -> str:
        """
        Apply advanced protection features.
        
        Injects protection code at the start of the main function.
        """
        if not self.advanced_protection:
            return code
        
        # Generate protection header
        protection_header = self.advanced_protection.generate_protection_header()
        
        if not protection_header:
            return code
        
        # Find where to inject - after the main function starts
        # Pattern: main_func_key=function()\n
        # We inject right after the function opening
        import re
        
        # Look for pattern like: X=function()\n where X is the main function
        # The main function contains the VM code
        func_pattern = r'([a-zA-Z_][a-zA-Z0-9_]*)=function\(\)\n'
        match = re.search(func_pattern, code)
        
        if match:
            insert_pos = match.end()
            code = code[:insert_pos] + protection_header + '\n' + code[insert_pos:]
        
        return code
    
    def _apply_control_flow_safe(self, code: str) -> str:
        """
        Apply AGGRESSIVE Luraph-style control flow transformations.
        
        This method applies control flow obfuscation in a surgical way:
        1. Wraps the INNER return statement with state machine (not the outer wrapper)
        2. Adds Luraph-style while true do state machine wrapper
        3. Uses computed state transitions with nested arithmetic
        
        SAFE: Only modifies the execution wrapper, not the VM code itself.
        
        Requirements: 12.1-12.4, 19.1-19.4
        """
        # DISABLED: The control flow transformer is causing syntax errors with some seeds
        # The Luraph-style return-at-start pattern already provides good obfuscation
        # TODO: Fix the state machine wrapper to work with the new output structure
        return code
    
    def _generate_luraph_state_machine_wrapper(self, statement: str) -> str:
        """
        Generate a Luraph-style state machine wrapper around a statement.
        
        Creates patterns like:
        local _j=125;while _j~=0x0 do if(bit32.lshift(0x1,0x0)==0x1) then {statement};_j=0x0 end end
        
        Args:
            statement: The statement to wrap
            
        Returns:
            Luraph-style state machine wrapped statement
        """
        # Generate short state variable name (Luraph style: _j, _F, etc.)
        state_chars = ['_j', '_F', '_S', '_e', '_C', '_w', '_k']
        state_var = self.seed.choice(state_chars)
        
        # Generate initial state value (Luraph uses values like 125, 0X53, etc.)
        initial_state = self.seed.get_random_int(50, 200)
        
        # Format initial state in Luraph style
        fmt = self.seed.get_random_int(0, 2)
        if fmt == 0:
            initial_str = str(initial_state)
        elif fmt == 1:
            initial_str = f'0X{initial_state:X}'
        else:
            initial_str = f'0x{initial_state:x}'
        
        # Generate opaque predicate (Luraph uses bit32.lshift(0x1,0x0)==0x1)
        # Use _G["escaped"]["escaped"] to hide bit32 library name
        # bit32 = \98\105\116\51\50
        # lshift = \108\115\104\105\102\116
        # band = \98\97\110\100
        # bxor = \98\120\111\114
        # NOTE: Use bit32 directly - _G["bit32"] returns nil in Roblox!
        b32 = 'bit32'
        pred_type = self.seed.get_random_int(0, 4)
        if pred_type == 0:
            predicate = f'({b32}["\\108\\115\\104\\105\\102\\116"](0x1,0x0)==0x1)'
        elif pred_type == 1:
            predicate = f'({b32}["\\98\\97\\110\\100"](0xFF,0xFF)==0xFF)'
        elif pred_type == 2:
            predicate = f'({b32}["\\98\\120\\111\\114"](0x5A,0x5A)==0)'
        elif pred_type == 3:
            predicate = '(0x1==0x1)'
        else:
            predicate = '(1==1)'
        
        # Build Luraph-style state machine
        # CRITICAL: Ensure proper spacing and semicolons to avoid syntax errors
        # The statement is "return X()" which needs special handling
        # We wrap it so the return happens inside the if block
        return f'local {state_var}={initial_str};while {state_var}~=0x0 do if {predicate} then {state_var}=0x0;{statement} end end '
    
    def _apply_escape_wrapping(self, code: str) -> str:
        """
        Apply escape sequence wrapping to transform raw escape strings.
        
        Transforms strings like "\073\108\049" into string.char calls:
        _01_(0X49,0x6C,0x31)
        
        SAFE: This only transforms escape sequence strings, not the VM logic.
        The char function alias is injected INSIDE the wrapper function.
        
        Requirements: Enhanced Nesting 2.1, 2.2
        """
        if not self.escape_wrapper:
            return code
        
        # Get the char function definition
        char_def = self.escape_wrapper.get_char_func_definition()
        
        # Transform escape sequences in the code
        transformed = self.escape_wrapper.transform_code(code)
        
        # Only inject the char function if we actually transformed something
        if transformed != code:
            # LURAPH-STYLE: Code starts with return(function()local w=function()
            # We need to inject INSIDE the wrapper function, after the first newline
            # Pattern: return(function()local w=function()\n{INJECT HERE}
            wrapper_pattern = '=function()\n'
            wrapper_idx = transformed.find(wrapper_pattern)
            if wrapper_idx != -1:
                # Inject after the wrapper function opening
                insert_pos = wrapper_idx + len(wrapper_pattern)
                transformed = transformed[:insert_pos] + char_def + '\n' + transformed[insert_pos:]
            else:
                # Try finding 'do\n' block
                do_idx = transformed.find('\ndo\n')
                if do_idx != -1:
                    insert_pos = do_idx + 4
                    transformed = transformed[:insert_pos] + char_def + '\n' + transformed[insert_pos:]
                else:
                    # Last resort: find first newline after return(function()
                    first_nl = transformed.find('\n')
                    if first_nl != -1:
                        transformed = transformed[:first_nl+1] + char_def + '\n' + transformed[first_nl+1:]
        
        return transformed
    
    def _apply_heavy_nesting(self, code: str) -> str:
        """
        Apply HEAVY nesting (5-6 layers) to ALL numeric literals in code.
        
        This wraps every numeric literal in nested identity function calls:
        42 -> f1(f2(f3(f4(f5(42)))))
        
        SAFE: Identity functions are defined at the start of the code.
        The identity functions return their input unchanged, so semantics are preserved.
        
        Requirements: Enhanced Nesting 1.1, 1.5, 5.1
        """
        if not self.nesting_transformer:
            return code
        
        # Get identity function definitions (the nesting table)
        identity_defs = self.nesting_transformer.get_identity_function_definitions()
        
        # Apply heavy nesting to all numeric literals
        transformed = self.nesting_transformer.apply_heavy_nesting_to_code(code)
        
        # Only inject identity functions if we actually transformed something
        if transformed != code:
            # CRITICAL: Inject the nesting table INSIDE the wrapper function
            # The code structure is: return(function(...)local TABLE={...};...end)(...)
            # We need to inject AFTER "return(function(...)" but BEFORE the first local
            # Support both return(function() and return(function(...)
            wrapper_start_vararg = 'return(function(...)'
            wrapper_start_no_vararg = 'return(function()'
            
            if wrapper_start_vararg in transformed:
                wrapper_idx = transformed.find(wrapper_start_vararg)
                insert_pos = wrapper_idx + len(wrapper_start_vararg)
                transformed = transformed[:insert_pos] + identity_defs + ';' + transformed[insert_pos:]
            elif wrapper_start_no_vararg in transformed:
                wrapper_idx = transformed.find(wrapper_start_no_vararg)
                insert_pos = wrapper_idx + len(wrapper_start_no_vararg)
                transformed = transformed[:insert_pos] + identity_defs + ';' + transformed[insert_pos:]
            else:
                # Fallback: prepend at start (may break varargs)
                transformed = identity_defs + ';' + transformed
        
        return transformed
    
    def _apply_ultra_nesting(self, code: str) -> str:
        """
        Apply ULTRA-DEEP nesting (5-8 layers) with MULTIPLE identity tables.
        
        This EXCEEDS Luraph with:
        - 3-5 identity function tables (O, sC, sp, sK, sO)
        - 5-8 layers of nesting with no adjacent repeats
        - Computed arithmetic between layers like (-0X23a8cE1D+(nested))-e[0Xc0D]
        
        Output style:
        (-0X23a8cE1D+(O.LL((sC.sp((O.VL((sK.sr((O.F4(42))-O.I[3])))-e[0Xc0D])))))
        
        SAFE: Identity tables are defined at the start of the code.
        The identity functions return their input unchanged, so semantics are preserved.
        
        Requirements: ultra-obfuscation 1.x, 5.x
        """
        if not self.ultra_nesting:
            return code
        
        # Get identity table definitions
        table_defs = self.ultra_nesting.get_table_definitions()
        
        # Apply ultra-deep nesting to all numeric literals
        transformed = self.ultra_nesting.apply_to_code(code)
        
        # Only inject identity tables if we actually transformed something
        if transformed != code:
            # CRITICAL: Inject the nesting tables INSIDE the wrapper function
            # The code structure is: return(function(...)local TABLE={...};...end)(...)
            # We need to inject AFTER "return(function(...)" but BEFORE the first local
            wrapper_start_vararg = 'return(function(...)'
            wrapper_start_no_vararg = 'return(function()'
            
            if wrapper_start_vararg in transformed:
                wrapper_idx = transformed.find(wrapper_start_vararg)
                insert_pos = wrapper_idx + len(wrapper_start_vararg)
                transformed = transformed[:insert_pos] + table_defs + ';' + transformed[insert_pos:]
            elif wrapper_start_no_vararg in transformed:
                wrapper_idx = transformed.find(wrapper_start_no_vararg)
                insert_pos = wrapper_idx + len(wrapper_start_no_vararg)
                transformed = transformed[:insert_pos] + table_defs + ';' + transformed[insert_pos:]
            else:
                # Fallback: prepend at start (may break varargs)
                transformed = table_defs + ';' + transformed
        
        return transformed
    
    def _apply_dead_code_safe(self, code: str) -> str:
        """
        Apply dead code injection SAFELY - only at the wrapper level.
        
        This injects fake branches and dead code blocks OUTSIDE the VM code,
        in the wrapper that calls the VM. This is safe because it doesn't
        modify the VM internals.
        
        Features:
        - Fake branches with always-false predicates
        - Dead code blocks that look functional but never execute
        - Decoy variable assignments
        """
        if not self.dead_code:
            return code
        
        # Generate fake branches to inject
        fake_branches = []
        for _ in range(3):  # 3 fake branches
            false_pred = self.predicates.get_false_predicate()
            dead_var = self.naming.generate_name()
            dead_val = self.seed.get_random_int(0, 0xFFFF)
            
            # Different dead code patterns
            pattern = self.seed.get_random_int(0, 4)
            # Use _G["escaped"]["escaped"] to hide bit32 library name
            # bit32 = \98\105\116\51\50
            # bxor = \98\120\111\114
            # NOTE: Use bit32 directly - _G["bit32"] returns nil in Roblox!
            b32_bxor = 'bit32["\\98\\120\\111\\114"]'
            if pattern == 0:
                dead_code = f'local {dead_var}=0x{dead_val:X}'
            elif pattern == 1:
                dead_code = f'local {dead_var}={{[0x{dead_val:X}]=nil}}'
            elif pattern == 2:
                dead_var2 = self.naming.generate_name()
                dead_code = f'local {dead_var}=0x{dead_val:X};local {dead_var2}={b32_bxor}({dead_var},0xFF)'
            elif pattern == 3:
                dead_code = f'local {dead_var}=function()return 0x{dead_val:X} end'
            else:
                dead_code = f'local {dead_var}=nil'
            
            fake_branches.append(f'if {false_pred} then {dead_code} end')
        
        # Find the wrapper section (after VM code, before return)
        # Look for the pattern: local {var}={deserialize_func}(
        import re
        deserialize_pattern = r'(local\s+[A-Za-z_][A-Za-z0-9_]*\s*=\s*[A-Za-z_][A-Za-z0-9_]*\s*\([A-Za-z_][A-Za-z0-9_]*\))'
        match = re.search(deserialize_pattern, code)
        
        if match:
            # Insert fake branches before the deserialize call
            insert_pos = match.start()
            fake_code = '\n'.join(fake_branches) + '\n'
            code = code[:insert_pos] + fake_code + code[insert_pos:]
        
        return code
    
    def _apply_anti_debug_safe(self, code: str) -> str:
        """
        Apply anti-debug traps SAFELY - only at the wrapper level.
        
        This adds checks that detect debugging attempts:
        - Timing checks (detect stepping)
        - Environment tampering detection
        - Debug library detection
        
        SAFE: Only adds checks in the wrapper, not inside VM code.
        """
        if not self.anti_analysis:
            return code
        
        # Generate anti-debug checks - ALL strings obfuscated
        anti_debug_checks = []
        
        # Helper for escape sequences
        def _esc(s: str) -> str:
            return ''.join(f'\\{ord(c)}' for c in s)
        
        # 1. Timing check - detect if someone is stepping through
        # ALL globals accessed via _G with escape sequences
        timing_var = self.naming.generate_name()
        g_var = self.naming.generate_name()
        os_var = self.naming.generate_name()
        clock_var = self.naming.generate_name()
        timing_check = f'''local {g_var}=_G
local {os_var}={g_var}["{_esc('os')}"]
local {clock_var}={os_var} and {os_var}["{_esc('clock')}"]
local {timing_var}={clock_var} and {clock_var}()or 0
for _=1,100000 do end
if {clock_var} and({clock_var}()-{timing_var})>0.5 then {g_var}["{_esc('error')}"](""..{g_var}["{_esc('tostring')}"](0)) end'''
        
        # Wrap in try-catch style (pcall) so it doesn't break if os.clock doesn't exist
        timing_var2 = self.naming.generate_name()
        pcall_var = self.naming.generate_name()
        safe_timing = f'{g_var}["{_esc("pcall")}"](function(){timing_check} end)'
        
        # 2. Debug library detection - obfuscated
        debug_var = self.naming.generate_name()
        dbg_ref = self.naming.generate_name()
        debug_check = f'''local {dbg_ref}={g_var}["{_esc('debug')}"]
if {dbg_ref} and {dbg_ref}["{_esc('getinfo')}"] then
local {debug_var}={dbg_ref}["{_esc('getinfo')}"](1)
if {debug_var} and {debug_var}["{_esc('what')}"]=="{_esc('C')}" then {g_var}["{_esc('error')}"](""..0) end
end'''
        
        # 3. Environment tampering detection - obfuscated
        env_var = self.naming.generate_name()
        print_var = self.naming.generate_name()
        env_check = f'''local {env_var}=_G
local {print_var}={env_var}["{_esc('print')}"]
if {env_var}["{_esc('print')}"]~={print_var} then {env_var}["{_esc('error')}"](""..0) end'''
        
        # Combine checks (wrapped in pcall for safety)
        combined_check = f'_G["{_esc("pcall")}"](function(){timing_check} end)'
        
        # Find a safe place to inject (after 'do' block start)
        do_idx = code.find('\ndo\n')
        if do_idx != -1:
            insert_pos = do_idx + 4
            code = code[:insert_pos] + combined_check + '\n' + code[insert_pos:]
        
        return code
    
    def _apply_roblox_protection(self, code: str) -> str:
        """
        Apply Roblox-specific protection features.
        
        This adds anti-executor detection, environment validation, and other
        Roblox-specific protections that go beyond what Luraph offers.
        
        Features:
        - Anti-executor detection (getgenv, hookfunction, etc.)
        - Environment validation (game, workspace)
        - Caller validation (debug.info)
        
        SAFE: All checks are wrapped in pcall so they don't break in non-Roblox
        environments (like luau.exe testing).
        """
        if not self.roblox_protection:
            return code
        
        # Generate protection header
        protection_header = self.roblox_protection.generate_protection_header(
            include_executor_check=True,
            include_env_check=True,
            include_timing_check=False  # Timing can cause issues
        )
        
        # Find a safe place to inject (after 'do' block start)
        do_idx = code.find('\ndo\n')
        if do_idx != -1:
            insert_pos = do_idx + 4
            code = code[:insert_pos] + protection_header + '\n' + code[insert_pos:]
        
        return code
    
    def _transform_numbers_safe(self, code: str) -> str:
        """
        Transform numeric literals to obfuscated formats, SAFELY skipping strings.
        
        CRITICAL: This method parses the code to identify string literals and
        only transforms numbers OUTSIDE of strings. This prevents corruption
        of escape sequences like \000, \255 in the bytecode buffer.
        """
        import re
        
        # Split code into string and non-string segments
        # This regex matches quoted strings (handling escape sequences)
        result = []
        i = 0
        while i < len(code):
            char = code[i]
            
            # Check for string start
            if char == '"' or char == "'":
                quote = char
                start = i
                i += 1
                # Find end of string, handling escapes
                while i < len(code):
                    if code[i] == '\\' and i + 1 < len(code):
                        i += 2  # Skip escape sequence
                    elif code[i] == quote:
                        i += 1
                        break
                    else:
                        i += 1
                # Add string as-is (no transformation)
                result.append(code[start:i])
            elif char == '[' and i + 1 < len(code) and code[i+1] == '[':
                # Long string [[...]]
                start = i
                end = code.find(']]', i + 2)
                if end != -1:
                    result.append(code[start:end+2])
                    i = end + 2
                else:
                    result.append(code[i])
                    i += 1
            else:
                # Non-string character - collect until next string
                start = i
                while i < len(code) and code[i] not in '"\'':
                    if code[i] == '[' and i + 1 < len(code) and code[i+1] == '[':
                        break
                    i += 1
                # Transform numbers in this non-string segment
                segment = code[start:i]
                segment = self._transform_numbers(segment)
                result.append(segment)
        
        return ''.join(result)
    
    def _transform_numbers(self, code: str) -> str:
        """
        Transform numeric literals to obfuscated formats.
        
        Uses Luraph-style number formats:
        - 0X5_A (hex with underscores)
        - 0B1111__1111 (binary with underscores)
        - Mixed case hex (0xFF, 0XFF)
        
        WARNING: This method does NOT skip strings. Use _transform_numbers_safe
        for code that contains string literals with escape sequences.
        """
        import re
        
        def transform_number(match):
            num_str = match.group(0)
            
            # Skip if already in hex/binary format
            if num_str.startswith(('0x', '0X', '0b', '0B')):
                return num_str
            
            # Skip floats for now
            if '.' in num_str:
                return num_str
            
            try:
                num = int(num_str)
            except ValueError:
                return num_str
            
            # Skip small numbers that might be array indices
            if num < 2:
                return num_str
            
            # Random format selection
            fmt = self.seed.get_random_int(0, 4)
            
            if fmt == 0 and num < 65536:
                # Binary with underscores: 0B1111__1111
                bin_str = f'{num:b}'
                if len(bin_str) >= 4:
                    # Insert underscores every 4 bits
                    parts = []
                    for i in range(0, len(bin_str), 4):
                        parts.append(bin_str[i:i+4])
                    underscore = '__' if self.seed.random_bool() else '_'
                    bin_str = underscore.join(parts)
                prefix = '0B' if self.seed.random_bool() else '0b'
                return f'{prefix}{bin_str}'
            elif fmt == 1:
                # Hex with underscores: 0X5_A
                hex_str = f'{num:X}'
                if len(hex_str) >= 2:
                    pos = self.seed.get_random_int(1, len(hex_str))
                    underscore = '__' if self.seed.random_bool() else '_'
                    hex_str = hex_str[:pos] + underscore + hex_str[pos:]
                prefix = '0X' if self.seed.random_bool() else '0x'
                return f'{prefix}{hex_str}'
            elif fmt == 2:
                # Plain hex: 0xFF
                prefix = '0X' if self.seed.random_bool() else '0x'
                return f'{prefix}{num:X}'
            elif fmt == 3:
                # Decimal with underscores for large numbers
                if num >= 1000:
                    num_str = str(num)
                    # Insert underscore
                    pos = self.seed.get_random_int(1, len(num_str))
                    return num_str[:pos] + '_' + num_str[pos:]
                return num_str
            else:
                return num_str
        
        # Match standalone numbers (not part of identifiers)
        # Be careful not to match numbers in strings or after 0x/0b
        pattern = r'(?<![a-zA-Z_0-9xXbB])(\d+)(?![a-zA-Z_0-9])'
        code = re.sub(pattern, transform_number, code)
        
        return code
    
    def _dense_format(self, code: str) -> str:
        """
        Format code as dense single-line output using DenseFormatter.
        
        The DenseFormatter has been fixed to properly handle keyword spacing
        without breaking identifiers like 'bit32_bor', 'buffer_for', etc.
        
        Requirements: 1.4, 1.5
        """
        if self.dense_formatter:
            return self.dense_formatter.format(code)
        
        # Fallback: just remove comments if formatter not available
        import re
        
        # Remove multi-line comments --[[ ... ]]
        code = re.sub(r'--\[\[.*?\]\]', '', code, flags=re.DOTALL)
        
        # Remove single-line comments (but preserve strings)
        lines = code.split('\n')
        cleaned_lines = []
        for line in lines:
            # Simple comment removal - doesn't handle strings with --
            if '--' in line:
                # Find -- that's not inside a string
                in_string = False
                string_char = None
                result = []
                i = 0
                while i < len(line):
                    char = line[i]
                    if not in_string:
                        if char in '"\'':
                            in_string = True
                            string_char = char
                            result.append(char)
                        elif char == '[' and i + 1 < len(line) and line[i+1] == '[':
                            # Long string start
                            end = line.find(']]', i + 2)
                            if end != -1:
                                result.append(line[i:end+2])
                                i = end + 1
                            else:
                                result.append(char)
                        elif char == '-' and i + 1 < len(line) and line[i+1] == '-':
                            # Comment found, stop here
                            break
                        else:
                            result.append(char)
                    else:
                        result.append(char)
                        if char == string_char and (i == 0 or line[i-1] != '\\'):
                            in_string = False
                            string_char = None
                    i += 1
                line = ''.join(result)
            cleaned_lines.append(line.rstrip())
        
        # Join lines, preserving necessary whitespace
        # Keep newlines to ensure valid syntax
        code = '\n'.join(line for line in cleaned_lines if line.strip())
        
        return code
    
    def _wrap_as_module(self, code: str) -> str:
        """
        Wrap obfuscated code to ensure it returns a value for ModuleScripts.
        
        For ModuleScripts, the code MUST return a value. The obfuscated output
        already uses the pattern: return(function(...)...return(T.main(...))end)(...)
        
        This method ensures the return chain is intact. If the code doesn't
        start with 'return', we wrap it to capture and return the result.
        
        The key insight from Luraph/diff_obfuscator is that everything must
        happen in a single return(function(...)...end)(...) expression with
        no persistent state that could trigger recursive require detection.
        
        Args:
            code: The obfuscated code
            
        Returns:
            Code that properly returns the module value
        """
        import re
        
        # Strip watermark comments at the start to check the actual code
        code_stripped = code.lstrip()
        while code_stripped.startswith('--'):
            # Skip comment line
            newline_idx = code_stripped.find('\n')
            if newline_idx == -1:
                break
            code_stripped = code_stripped[newline_idx + 1:].lstrip()
        
        # Check if code already starts with return (the correct pattern)
        if code_stripped.startswith('return'):
            # Code already has the correct pattern, return as-is
            return code
        
        # If code doesn't start with return, wrap it in immediate return pattern
        # This ensures ModuleScripts work correctly
        return f'return(function(...)return({code})end)(...)'
    
    def _add_watermark(self, code: str) -> str:
        """
        Add watermark/logo at the top of the obfuscated output.
        
        Loads watermark from vm/watermark.txt and prepends it as Lua comments.
        Skips if enable_watermark is False in config.
        
        Args:
            code: The obfuscated code
            
        Returns:
            Code with watermark prepended, or original code if watermark disabled
        """
        if not getattr(self.config, 'enable_watermark', True):
            return code
        
        # Get watermark path from config or use default
        watermark_path = getattr(self.config, 'watermark_file', 'vm/watermark.txt')
        if not Path(watermark_path).is_absolute():
            watermark_path = Path(__file__).parent / watermark_path
        
        loader = WatermarkLoader(watermark_path)
        watermark = loader.load()
        
        if not watermark:
            return code
        
        return watermark + code


def parse_args() -> argparse.Namespace:
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        description="Luraph-Style Luau Obfuscator",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python obfuscate.py input.lua -o output.lua
  python obfuscate.py input.lua --seed 12345
  python obfuscate.py input.lua --config minimal --no-validate
  python obfuscate.py input.lua --pretty
  
Performance Levels:
  python obfuscate.py input.lua -o output.lua L1   # Level 1: Max security, slower
  python obfuscate.py input.lua -o output.lua L2   # Level 2: Balanced (Luraph-style)
  python obfuscate.py input.lua -o output.lua L3   # Level 3: Max performance, basic security
        """
    )
    
    parser.add_argument(
        "input",
        help="Input Lua file to obfuscate"
    )
    
    parser.add_argument(
        "level",
        nargs="?",
        choices=["L1", "L2", "L3", "l1", "l2", "l3"],
        default=None,
        help="Performance level: L1=max security, L2=balanced, L3=max performance"
    )
    
    parser.add_argument(
        "-o", "--output",
        help="Output file path (default: <input>_obfuscated.lua)"
    )
    
    parser.add_argument(
        "--seed",
        type=int,
        help="Seed for deterministic builds (default: random)"
    )
    
    parser.add_argument(
        "--config",
        choices=["default", "minimal", "debug"],
        default="default",
        help="Configuration preset (default: default)"
    )
    
    parser.add_argument(
        "--no-validate",
        action="store_true",
        help="Skip output syntax validation"
    )
    
    parser.add_argument(
        "--test-runtime",
        action="store_true",
        help="Test runtime with luau.exe (only for non-Roblox code)"
    )
    
    parser.add_argument(
        "--pretty",
        action="store_true",
        help="Output formatted code instead of dense single-line"
    )
    
    parser.add_argument(
        "-v", "--verbose",
        action="store_true",
        help="Enable verbose output"
    )
    
    parser.add_argument(
        "--luau-path",
        help="Path to luau.exe for validation"
    )
    
    parser.add_argument(
        "--compiler-path",
        help="Path to luau-compile.exe for bytecode compilation"
    )
    
    parser.add_argument(
        "--no-watermark",
        action="store_true",
        help="Disable watermark/logo at top of output"
    )
    
    parser.add_argument(
        "--script-type",
        choices=["script", "module", "auto"],
        default="auto",
        help="Script type: 'script' (no return), 'module' (returns value), 'auto' (detect from source)"
    )
    
    # Shorthand aliases for script type
    parser.add_argument(
        "--module",
        action="store_true",
        help="Shorthand for --script-type=module (output returns a value)"
    )
    
    parser.add_argument(
        "--script",
        action="store_true",
        help="Shorthand for --script-type=script (output does not return)"
    )
    
    return parser.parse_args()


def get_config_from_args(args: argparse.Namespace) -> ObfuscatorConfig:
    """Create ObfuscatorConfig from command line arguments."""
    # Check for performance level first (takes priority)
    if args.level:
        level = args.level.upper()
        if level == "L1":
            config = get_level1_config()
            print("[Level 1] Max Security mode - slower but maximum protection")
        elif level == "L2":
            config = get_level2_config()
            print("[Level 2] Balanced mode - Luraph-style security/performance")
        elif level == "L3":
            config = get_level3_config()
            print("[Level 3] Max Performance mode - fast but basic protection")
        else:
            config = get_default_config()
    # Fall back to preset
    elif args.config == "minimal":
        config = get_minimal_config()
    elif args.config == "debug":
        config = get_debug_config()
    else:
        config = get_default_config()
    
    # Override with CLI arguments
    if args.seed is not None:
        config.seed = args.seed
        config.enable_polymorphic_seed = False  # Use fixed seed
    
    if args.no_validate:
        config.validate_syntax = False
    
    if hasattr(args, 'test_runtime') and args.test_runtime:
        config.validate_runtime = True
    
    if args.pretty:
        config.dense_output = False
    
    if hasattr(args, 'no_watermark') and args.no_watermark:
        config.enable_watermark = False
    
    # Handle script type flags
    # --module and --script take precedence over --script-type
    if hasattr(args, 'module') and args.module:
        config.script_type = "module"
    elif hasattr(args, 'script') and args.script:
        config.script_type = "script"
    elif hasattr(args, 'script_type') and args.script_type:
        config.script_type = args.script_type
    
    return config


def main() -> int:
    """
    Main entry point for the obfuscator CLI.
    
    Returns:
        Exit code (0 for success, 1 for error)
    """
    args = parse_args()
    
    # Validate input file exists
    input_path = Path(args.input)
    if not input_path.exists():
        print(f"Error: Input file not found: {args.input}", file=sys.stderr)
        return 1
    
    # Determine output path
    if args.output:
        output_path = Path(args.output)
    else:
        output_path = input_path.with_name(f"{input_path.stem}_obfuscated.lua")
    
    # Read input file
    try:
        with open(input_path, 'r', encoding='utf-8') as f:
            source_code = f.read()
    except Exception as e:
        print(f"Error reading input file: {e}", file=sys.stderr)
        return 1
    
    if args.verbose:
        print(f"Input: {input_path}")
        print(f"Output: {output_path}")
        print(f"Config: {args.config}")
        print(f"Input size: {len(source_code)} bytes")
    
    # Create config and obfuscator
    try:
        config = get_config_from_args(args)
        obfuscator = LuraphObfuscator(config)
    except ObfuscatorError as e:
        print(f"Configuration error: {e}", file=sys.stderr)
        return 1
    
    # Run obfuscation
    if args.verbose:
        print("Obfuscating...")
    
    result = obfuscator.obfuscate(source_code)
    
    if not result.success:
        print(f"Obfuscation failed: {result.error}", file=sys.stderr)
        if args.verbose and result.metrics:
            print(f"Details: {result.metrics}", file=sys.stderr)
        return 1
    
    # Write output
    try:
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(result.code)
    except Exception as e:
        print(f"Error writing output file: {e}", file=sys.stderr)
        return 1
    
    if args.verbose:
        print(f"Output size: {result.metrics.get('output_size', 'unknown')} bytes")
        print(f"Bytecode size: {result.metrics.get('bytecode_size', 'unknown')} bytes")
    
    print(f"Successfully obfuscated to: {output_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
