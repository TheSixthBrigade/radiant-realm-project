"""
VM Instruction Splitting Transform

This module implements instruction splitting for the VM opcode handlers.
Instead of simple operations like:
    stack[inst.A] = stack[inst.B] + stack[inst.C]

We split them into micro-operations:
    local _t1 = inst.B
    local _t2 = stack[_t1]
    local _t3 = inst.C
    local _t4 = stack[_t3]
    local _t5 = _t2 + _t4
    local _t6 = inst.A
    stack[_t6] = _t5

This makes static analysis significantly harder by:
1. Breaking the direct relationship between operands
2. Adding intermediate variables that obscure data flow
3. Making pattern matching on opcode handlers fail
"""

import re
import random
from typing import List, Tuple, Dict, Optional
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent.parent))
from core import PolymorphicBuildSeed


class InstructionSplitter:
    """
    Splits VM opcode handlers into micro-operations.
    
    This transform works on the VM template code, finding opcode handlers
    and splitting their operations into multiple steps with intermediate
    variables.
    """
    
    def __init__(self, seed: PolymorphicBuildSeed = None):
        self.seed = seed or PolymorphicBuildSeed()
        self.rng = random.Random(self.seed.get_random_int(0, 0xFFFFFFFF))
        self.temp_counter = 0
    
    def _gen_temp(self) -> str:
        """Generate a unique temporary variable name."""
        first_chars = 'lIO_'
        rest_chars = 'lIO01_'
        name = self.rng.choice(first_chars) + ''.join(
            self.rng.choice(rest_chars) for _ in range(12)
        )
        self.temp_counter += 1
        return f"{name}{self.temp_counter}"
    
    def split_arithmetic_handler(self, match: re.Match) -> str:
        """
        Split arithmetic operations like:
            stack[inst.A] = stack[inst.B] + stack[inst.C]
        
        Into micro-operations with intermediate variables.
        """
        indent = match.group(1)
        dest_idx = match.group(2)  # inst.A
        src1_idx = match.group(3)  # inst.B
        operator = match.group(4)  # +, -, *, /, %, ^
        src2_idx = match.group(5)  # inst.C
        
        # Generate temp variable names
        t_src1_idx = self._gen_temp()
        t_src1_val = self._gen_temp()
        t_src2_idx = self._gen_temp()
        t_src2_val = self._gen_temp()
        t_result = self._gen_temp()
        t_dest_idx = self._gen_temp()
        
        # Build split operations
        lines = [
            f"{indent}local {t_src1_idx}={src1_idx}",
            f"{indent}local {t_src1_val}=stack[{t_src1_idx}]",
            f"{indent}local {t_src2_idx}={src2_idx}",
            f"{indent}local {t_src2_val}=stack[{t_src2_idx}]",
            f"{indent}local {t_result}={t_src1_val}{operator}{t_src2_val}",
            f"{indent}local {t_dest_idx}={dest_idx}",
            f"{indent}stack[{t_dest_idx}]={t_result}",
        ]
        
        return '\n'.join(lines)
    
    def split_arithmetick_handler(self, match: re.Match) -> str:
        """
        Split arithmetic with constant operations like:
            stack[inst.A] = stack[inst.B] + inst.K
        
        Into micro-operations.
        """
        indent = match.group(1)
        dest_idx = match.group(2)  # inst.A
        src_idx = match.group(3)   # inst.B
        operator = match.group(4)  # +, -, *, /, %, ^
        const = match.group(5)     # inst.K
        
        t_src_idx = self._gen_temp()
        t_src_val = self._gen_temp()
        t_const = self._gen_temp()
        t_result = self._gen_temp()
        t_dest_idx = self._gen_temp()
        
        lines = [
            f"{indent}local {t_src_idx}={src_idx}",
            f"{indent}local {t_src_val}=stack[{t_src_idx}]",
            f"{indent}local {t_const}={const}",
            f"{indent}local {t_result}={t_src_val}{operator}{t_const}",
            f"{indent}local {t_dest_idx}={dest_idx}",
            f"{indent}stack[{t_dest_idx}]={t_result}",
        ]
        
        return '\n'.join(lines)
    
    def split_move_handler(self, match: re.Match) -> str:
        """
        Split MOVE operations like:
            stack[inst.A] = stack[inst.B]
        
        Into micro-operations.
        """
        indent = match.group(1)
        dest_idx = match.group(2)  # inst.A
        src_idx = match.group(3)   # inst.B
        
        t_src_idx = self._gen_temp()
        t_src_val = self._gen_temp()
        t_dest_idx = self._gen_temp()
        
        lines = [
            f"{indent}local {t_src_idx}={src_idx}",
            f"{indent}local {t_src_val}=stack[{t_src_idx}]",
            f"{indent}local {t_dest_idx}={dest_idx}",
            f"{indent}stack[{t_dest_idx}]={t_src_val}",
        ]
        
        return '\n'.join(lines)
    
    def split_loadk_handler(self, match: re.Match) -> str:
        """
        Split LOADK operations like:
            stack[inst.A] = inst.K
        
        Into micro-operations.
        """
        indent = match.group(1)
        dest_idx = match.group(2)  # inst.A
        const = match.group(3)     # inst.K or inst.D
        
        t_const = self._gen_temp()
        t_dest_idx = self._gen_temp()
        
        lines = [
            f"{indent}local {t_const}={const}",
            f"{indent}local {t_dest_idx}={dest_idx}",
            f"{indent}stack[{t_dest_idx}]={t_const}",
        ]
        
        return '\n'.join(lines)
    
    def split_gettable_handler(self, match: re.Match) -> str:
        """
        Split GETTABLE operations like:
            stack[inst.A] = stack[inst.B][stack[inst.C]]
        
        Into micro-operations.
        """
        indent = match.group(1)
        dest_idx = match.group(2)  # inst.A
        tbl_idx = match.group(3)   # inst.B
        key_idx = match.group(4)   # inst.C
        
        t_tbl_idx = self._gen_temp()
        t_tbl = self._gen_temp()
        t_key_idx = self._gen_temp()
        t_key = self._gen_temp()
        t_result = self._gen_temp()
        t_dest_idx = self._gen_temp()
        
        lines = [
            f"{indent}local {t_tbl_idx}={tbl_idx}",
            f"{indent}local {t_tbl}=stack[{t_tbl_idx}]",
            f"{indent}local {t_key_idx}={key_idx}",
            f"{indent}local {t_key}=stack[{t_key_idx}]",
            f"{indent}local {t_result}={t_tbl}[{t_key}]",
            f"{indent}local {t_dest_idx}={dest_idx}",
            f"{indent}stack[{t_dest_idx}]={t_result}",
        ]
        
        return '\n'.join(lines)
    
    def split_settable_handler(self, match: re.Match) -> str:
        """
        Split SETTABLE operations like:
            stack[inst.B][stack[inst.C]] = stack[inst.A]
        
        Into micro-operations.
        """
        indent = match.group(1)
        tbl_idx = match.group(2)   # inst.B
        key_idx = match.group(3)   # inst.C
        val_idx = match.group(4)   # inst.A
        
        t_tbl_idx = self._gen_temp()
        t_tbl = self._gen_temp()
        t_key_idx = self._gen_temp()
        t_key = self._gen_temp()
        t_val_idx = self._gen_temp()
        t_val = self._gen_temp()
        
        lines = [
            f"{indent}local {t_tbl_idx}={tbl_idx}",
            f"{indent}local {t_tbl}=stack[{t_tbl_idx}]",
            f"{indent}local {t_key_idx}={key_idx}",
            f"{indent}local {t_key}=stack[{t_key_idx}]",
            f"{indent}local {t_val_idx}={val_idx}",
            f"{indent}local {t_val}=stack[{t_val_idx}]",
            f"{indent}{t_tbl}[{t_key}]={t_val}",
        ]
        
        return '\n'.join(lines)
    
    def split_gettablen_handler(self, match: re.Match) -> str:
        """
        Split GETTABLEN operations like:
            stack[inst.A] = stack[inst.B][inst.C + 1]
        
        Into micro-operations.
        """
        indent = match.group(1)
        dest_idx = match.group(2)  # inst.A
        tbl_idx = match.group(3)   # inst.B
        num_idx = match.group(4)   # inst.C
        
        t_tbl_idx = self._gen_temp()
        t_tbl = self._gen_temp()
        t_num = self._gen_temp()
        t_key = self._gen_temp()
        t_result = self._gen_temp()
        t_dest_idx = self._gen_temp()
        
        lines = [
            f"{indent}local {t_tbl_idx}={tbl_idx}",
            f"{indent}local {t_tbl}=stack[{t_tbl_idx}]",
            f"{indent}local {t_num}={num_idx}",
            f"{indent}local {t_key}={t_num}+1",
            f"{indent}local {t_result}={t_tbl}[{t_key}]",
            f"{indent}local {t_dest_idx}={dest_idx}",
            f"{indent}stack[{t_dest_idx}]={t_result}",
        ]
        
        return '\n'.join(lines)
    
    def split_settablen_handler(self, match: re.Match) -> str:
        """
        Split SETTABLEN operations like:
            stack[inst.B][inst.C + 1] = stack[inst.A]
        
        Into micro-operations.
        """
        indent = match.group(1)
        tbl_idx = match.group(2)   # inst.B
        num_idx = match.group(3)   # inst.C
        val_idx = match.group(4)   # inst.A
        
        t_tbl_idx = self._gen_temp()
        t_tbl = self._gen_temp()
        t_num = self._gen_temp()
        t_key = self._gen_temp()
        t_val_idx = self._gen_temp()
        t_val = self._gen_temp()
        
        lines = [
            f"{indent}local {t_tbl_idx}={tbl_idx}",
            f"{indent}local {t_tbl}=stack[{t_tbl_idx}]",
            f"{indent}local {t_num}={num_idx}",
            f"{indent}local {t_key}={t_num}+1",
            f"{indent}local {t_val_idx}={val_idx}",
            f"{indent}local {t_val}=stack[{t_val_idx}]",
            f"{indent}{t_tbl}[{t_key}]={t_val}",
        ]
        
        return '\n'.join(lines)
    
    def split_not_handler(self, match: re.Match) -> str:
        """
        Split NOT operations like:
            stack[inst.A] = not stack[inst.B]
        
        Into micro-operations.
        """
        indent = match.group(1)
        dest_idx = match.group(2)  # inst.A
        src_idx = match.group(3)   # inst.B
        
        t_src_idx = self._gen_temp()
        t_src_val = self._gen_temp()
        t_result = self._gen_temp()
        t_dest_idx = self._gen_temp()
        
        lines = [
            f"{indent}local {t_src_idx}={src_idx}",
            f"{indent}local {t_src_val}=stack[{t_src_idx}]",
            f"{indent}local {t_result}=not {t_src_val}",
            f"{indent}local {t_dest_idx}={dest_idx}",
            f"{indent}stack[{t_dest_idx}]={t_result}",
        ]
        
        return '\n'.join(lines)
    
    def split_minus_handler(self, match: re.Match) -> str:
        """
        Split MINUS (unary negation) operations like:
            stack[inst.A] = -stack[inst.B]
        
        Into micro-operations.
        """
        indent = match.group(1)
        dest_idx = match.group(2)  # inst.A
        src_idx = match.group(3)   # inst.B
        
        t_src_idx = self._gen_temp()
        t_src_val = self._gen_temp()
        t_result = self._gen_temp()
        t_dest_idx = self._gen_temp()
        
        lines = [
            f"{indent}local {t_src_idx}={src_idx}",
            f"{indent}local {t_src_val}=stack[{t_src_idx}]",
            f"{indent}local {t_result}=-{t_src_val}",
            f"{indent}local {t_dest_idx}={dest_idx}",
            f"{indent}stack[{t_dest_idx}]={t_result}",
        ]
        
        return '\n'.join(lines)
    
    def split_length_handler(self, match: re.Match) -> str:
        """
        Split LENGTH operations like:
            stack[inst.A] = #stack[inst.B]
        
        Into micro-operations.
        """
        indent = match.group(1)
        dest_idx = match.group(2)  # inst.A
        src_idx = match.group(3)   # inst.B
        
        t_src_idx = self._gen_temp()
        t_src_val = self._gen_temp()
        t_result = self._gen_temp()
        t_dest_idx = self._gen_temp()
        
        lines = [
            f"{indent}local {t_src_idx}={src_idx}",
            f"{indent}local {t_src_val}=stack[{t_src_idx}]",
            f"{indent}local {t_result}=#{t_src_val}",
            f"{indent}local {t_dest_idx}={dest_idx}",
            f"{indent}stack[{t_dest_idx}]={t_result}",
        ]
        
        return '\n'.join(lines)
    
    def transform(self, code: str) -> str:
        """
        Apply instruction splitting to VM code.
        
        This finds opcode handlers and splits their operations into
        micro-operations with intermediate variables.
        
        Args:
            code: The VM template code
            
        Returns:
            Transformed code with split instructions
        """
        # Reset temp counter for each transform
        self.temp_counter = 0
        
        # Pattern for arithmetic operations: stack[inst.A] = stack[inst.B] op stack[inst.C]
        # Matches: ADD, SUB, MUL, DIV, MOD, POW
        arith_pattern = r'(\s*)stack\[(inst\.A)\]\s*=\s*stack\[(inst\.B)\]\s*([+\-*/%^])\s*stack\[(inst\.C)\]'
        code = re.sub(arith_pattern, self.split_arithmetic_handler, code)
        
        # Pattern for arithmetic with constant: stack[inst.A] = stack[inst.B] op inst.K
        # Matches: ADDK, SUBK, MULK, DIVK, MODK, POWK
        arithk_pattern = r'(\s*)stack\[(inst\.A)\]\s*=\s*stack\[(inst\.B)\]\s*([+\-*/%^])\s*(inst\.K)'
        code = re.sub(arithk_pattern, self.split_arithmetick_handler, code)
        
        # Pattern for MOVE: stack[inst.A] = stack[inst.B]
        # Must NOT match arithmetic patterns (no operator after stack[inst.B])
        move_pattern = r'(\s*)stack\[(inst\.A)\]\s*=\s*stack\[(inst\.B)\](?!\s*[+\-*/%^])'
        code = re.sub(move_pattern, self.split_move_handler, code)
        
        # Pattern for LOADK/LOADN: stack[inst.A] = inst.K or inst.D
        loadk_pattern = r'(\s*)stack\[(inst\.A)\]\s*=\s*(inst\.[KD])(?!\[)'
        code = re.sub(loadk_pattern, self.split_loadk_handler, code)
        
        # Pattern for GETTABLE: stack[inst.A] = stack[inst.B][stack[inst.C]]
        gettable_pattern = r'(\s*)stack\[(inst\.A)\]\s*=\s*stack\[(inst\.B)\]\[stack\[(inst\.C)\]\]'
        code = re.sub(gettable_pattern, self.split_gettable_handler, code)
        
        # Pattern for SETTABLE: stack[inst.B][stack[inst.C]] = stack[inst.A]
        settable_pattern = r'(\s*)stack\[(inst\.B)\]\[stack\[(inst\.C)\]\]\s*=\s*stack\[(inst\.A)\]'
        code = re.sub(settable_pattern, self.split_settable_handler, code)
        
        # Pattern for GETTABLEN: stack[inst.A] = stack[inst.B][inst.C + 1]
        gettablen_pattern = r'(\s*)stack\[(inst\.A)\]\s*=\s*stack\[(inst\.B)\]\[(inst\.C)\s*\+\s*1\]'
        code = re.sub(gettablen_pattern, self.split_gettablen_handler, code)
        
        # Pattern for SETTABLEN: stack[inst.B][inst.C + 1] = stack[inst.A]
        settablen_pattern = r'(\s*)stack\[(inst\.B)\]\[(inst\.C)\s*\+\s*1\]\s*=\s*stack\[(inst\.A)\]'
        code = re.sub(settablen_pattern, self.split_settablen_handler, code)
        
        # Pattern for NOT: stack[inst.A] = not stack[inst.B]
        not_pattern = r'(\s*)stack\[(inst\.A)\]\s*=\s*not\s+stack\[(inst\.B)\]'
        code = re.sub(not_pattern, self.split_not_handler, code)
        
        # Pattern for MINUS: stack[inst.A] = -stack[inst.B]
        minus_pattern = r'(\s*)stack\[(inst\.A)\]\s*=\s*-stack\[(inst\.B)\]'
        code = re.sub(minus_pattern, self.split_minus_handler, code)
        
        # Pattern for LENGTH: stack[inst.A] = #stack[inst.B]
        length_pattern = r'(\s*)stack\[(inst\.A)\]\s*=\s*#stack\[(inst\.B)\]'
        code = re.sub(length_pattern, self.split_length_handler, code)
        
        return code


class InstructionSplitterIntegrator:
    """
    Integrates instruction splitting into the obfuscation pipeline.
    """
    
    def __init__(self, seed: PolymorphicBuildSeed = None):
        self.seed = seed or PolymorphicBuildSeed()
        self.splitter = InstructionSplitter(self.seed)
    
    def integrate(self, code: str) -> str:
        """
        Apply instruction splitting to the VM code.
        
        Args:
            code: The VM template code
            
        Returns:
            Transformed code with split instructions
        """
        return self.splitter.transform(code)
