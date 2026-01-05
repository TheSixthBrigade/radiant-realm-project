"""
Output Validator for the Luraph-style obfuscator.

This module validates obfuscated Lua/Luau code for syntax correctness
using luau-compile.exe (for syntax validation) and optionally luau.exe
(for runtime validation of non-Roblox code).

CRITICAL: Must use luau.exe/luau-compile.exe, NOT lua.exe!
The output uses Luau-specific features:
- Binary literals (0b11111111)
- Underscore separators (0X5_A, 0B1111__1111)
- Buffer API (buffer.fromstring, buffer.readu8)
- continue statement

Requirements: 8.1, 8.2
"""

import os
import subprocess
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Optional, Tuple


@dataclass
class ValidationResult:
    """
    Result of code validation.
    
    Attributes:
        valid: Whether the code passed validation
        error_message: Error message if validation failed
        error_line: Line number where error occurred (if available)
        error_column: Column number where error occurred (if available)
    """
    valid: bool
    error_message: Optional[str] = None
    error_line: Optional[int] = None
    error_column: Optional[int] = None
    
    def __bool__(self) -> bool:
        return self.valid


class OutputValidator:
    """
    Output Validator for Luau code syntax validation.
    
    Uses luau-compile.exe to validate that obfuscated code is
    syntactically valid Luau. This is a SYNTAX CHECK ONLY - it
    does not execute the code.
    
    IMPORTANT: The obfuscated output uses Luau-specific features
    that standard Lua (lua.exe) does not support:
    - Binary literals: 0b11111111, 0B1010
    - Underscore separators: 0X5_A, 0B1111__1111
    - Buffer API: buffer.fromstring, buffer.readu8
    - continue statement
    
    Therefore, validation MUST use luau-compile.exe, NOT lua.exe.
    
    Example:
        >>> validator = OutputValidator()
        >>> result = validator.validate("local x = 1 + 2")
        >>> result.valid
        True
        >>> result = validator.validate("local x = ")
        >>> result.valid
        False
        >>> result.error_message
        'Syntax error: ...'
    """
    
    def __init__(
        self,
        compiler_path: str = 'luau-compile.exe',
        luau_path: str = 'luau.exe',
        working_dir: Optional[str] = None
    ):
        """
        Initialize the Output Validator.
        
        Args:
            compiler_path: Path to luau-compile.exe for syntax validation
            luau_path: Path to luau.exe for runtime validation
            working_dir: Working directory for finding executables
        """
        self.working_dir = working_dir or os.path.dirname(os.path.dirname(__file__))
        
        # Resolve paths relative to working directory
        self.compiler_path = self._resolve_path(compiler_path)
        self.luau_path = self._resolve_path(luau_path)
    
    def _resolve_path(self, path: str) -> str:
        """
        Resolve executable path, checking working directory first.
        
        Args:
            path: Path to resolve
        
        Returns:
            Resolved absolute path
        """
        # Check if already absolute
        if os.path.isabs(path):
            return path
        
        # Check working directory
        working_path = os.path.join(self.working_dir, path)
        if os.path.exists(working_path):
            return working_path
        
        # Return as-is (will use PATH)
        return path
    
    def validate(self, code: str) -> ValidationResult:
        """
        Validate Luau code syntax using luau-compile.exe.
        
        This is a SYNTAX CHECK ONLY - it compiles the code to bytecode
        and checks for syntax errors. It does NOT execute the code.
        
        Args:
            code: Luau code to validate
        
        Returns:
            ValidationResult with validation status and any errors
        
        Example:
            >>> validator = OutputValidator()
            >>> result = validator.validate("local x = 0b11111111")
            >>> result.valid
            True
        """
        # Create temporary file
        fd, temp_path = tempfile.mkstemp(suffix='.lua')
        try:
            # Write code to temp file
            with os.fdopen(fd, 'w', encoding='utf-8') as f:
                f.write(code)
            
            # Run luau-compile.exe for syntax validation
            result = subprocess.run(
                [self.compiler_path, '--binary', temp_path],
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if result.returncode == 0:
                return ValidationResult(valid=True)
            
            # Parse error message
            error_msg = result.stderr.strip() or result.stdout.strip()
            line, col = self._parse_error_location(error_msg)
            
            return ValidationResult(
                valid=False,
                error_message=f"Syntax error: {error_msg}",
                error_line=line,
                error_column=col
            )
            
        except subprocess.TimeoutExpired:
            return ValidationResult(
                valid=False,
                error_message="Validation timed out after 30 seconds"
            )
        except FileNotFoundError:
            return ValidationResult(
                valid=False,
                error_message=f"Compiler not found: {self.compiler_path}"
            )
        except Exception as e:
            return ValidationResult(
                valid=False,
                error_message=f"Validation error: {str(e)}"
            )
        finally:
            # Clean up temp file
            try:
                os.unlink(temp_path)
            except:
                pass
    
    def validate_runtime(self, code: str) -> ValidationResult:
        """
        Validate Luau code by executing it with luau.exe.
        
        WARNING: luau.exe is a SANDBOX environment without Roblox APIs.
        Runtime validation will FAIL for code that uses:
        - game:GetService()
        - workspace
        - Players, HttpService, etc.
        
        Only use this for non-Roblox code validation.
        For Roblox code, use validate() (syntax only).
        
        Args:
            code: Luau code to execute
        
        Returns:
            ValidationResult with execution status and any errors
        """
        # Create temporary file
        fd, temp_path = tempfile.mkstemp(suffix='.lua')
        try:
            # Write code to temp file
            with os.fdopen(fd, 'w', encoding='utf-8') as f:
                f.write(code)
            
            # Run luau.exe for runtime validation
            result = subprocess.run(
                [self.luau_path, temp_path],
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if result.returncode == 0:
                return ValidationResult(valid=True)
            
            # Parse error message
            error_msg = result.stderr.strip() or result.stdout.strip()
            line, col = self._parse_error_location(error_msg)
            
            return ValidationResult(
                valid=False,
                error_message=f"Runtime error: {error_msg}",
                error_line=line,
                error_column=col
            )
            
        except subprocess.TimeoutExpired:
            return ValidationResult(
                valid=False,
                error_message="Execution timed out after 30 seconds"
            )
        except FileNotFoundError:
            return ValidationResult(
                valid=False,
                error_message=f"Luau interpreter not found: {self.luau_path}"
            )
        except Exception as e:
            return ValidationResult(
                valid=False,
                error_message=f"Runtime error: {str(e)}"
            )
        finally:
            # Clean up temp file
            try:
                os.unlink(temp_path)
            except:
                pass
    
    def _parse_error_location(self, error_msg: str) -> Tuple[Optional[int], Optional[int]]:
        """
        Parse line and column from error message.
        
        Args:
            error_msg: Error message from compiler/interpreter
        
        Returns:
            Tuple of (line_number, column_number) or (None, None)
        """
        import re
        
        # Try to match patterns like "file.lua:10:5:" or "(10,5)"
        patterns = [
            r':(\d+):(\d+):',  # file.lua:10:5:
            r'\((\d+),(\d+)\)',  # (10,5)
            r'line (\d+)',  # line 10
        ]
        
        for pattern in patterns:
            match = re.search(pattern, error_msg)
            if match:
                groups = match.groups()
                if len(groups) >= 2:
                    return int(groups[0]), int(groups[1])
                elif len(groups) == 1:
                    return int(groups[0]), None
        
        return None, None
    
    def validate_file(self, file_path: str) -> ValidationResult:
        """
        Validate a Luau file for syntax correctness.
        
        Args:
            file_path: Path to the Luau file
        
        Returns:
            ValidationResult with validation status
        """
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                code = f.read()
            return self.validate(code)
        except FileNotFoundError:
            return ValidationResult(
                valid=False,
                error_message=f"File not found: {file_path}"
            )
        except Exception as e:
            return ValidationResult(
                valid=False,
                error_message=f"Error reading file: {str(e)}"
            )
    
    def is_compiler_available(self) -> bool:
        """
        Check if luau-compile.exe is available.
        
        Returns:
            True if compiler is available
        """
        try:
            result = subprocess.run(
                [self.compiler_path, '--help'],
                capture_output=True,
                timeout=5
            )
            return True
        except:
            return False
    
    def is_luau_available(self) -> bool:
        """
        Check if luau.exe is available.
        
        Returns:
            True if Luau interpreter is available
        """
        try:
            result = subprocess.run(
                [self.luau_path, '--help'],
                capture_output=True,
                timeout=5
            )
            return True
        except:
            return False
    
    def get_compiler_version(self) -> Optional[str]:
        """
        Get the version of luau-compile.exe.
        
        Returns:
            Version string or None if unavailable
        """
        try:
            result = subprocess.run(
                [self.compiler_path, '--help'],
                capture_output=True,
                text=True,
                timeout=5
            )
            # Parse version from output
            output = result.stdout + result.stderr
            if 'version' in output.lower():
                import re
                match = re.search(r'version[:\s]+(\S+)', output, re.IGNORECASE)
                if match:
                    return match.group(1)
            return "unknown"
        except:
            return None
    
    def __repr__(self) -> str:
        return (
            f"OutputValidator("
            f"compiler={self.compiler_path}, "
            f"luau={self.luau_path})"
        )
