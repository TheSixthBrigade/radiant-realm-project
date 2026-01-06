"""
Anti-Debug Timing Checks - Detect debuggers via timing anomalies.

This module implements timing-based anti-debugging that:
1. Captures baseline timing at VM init
2. Checks timing at critical points (dispatch, function calls, loops)
3. Detects anomalies that indicate single-stepping or breakpoints
4. Responds by corrupting state, infinite loop, or silent fail

ALL strings and global accesses are fully obfuscated.
"""

import random
from typing import List, Tuple


def _to_escape(s: str) -> str:
    """Convert string to escape sequence format (without quotes)."""
    return ''.join(f'\\{ord(c)}' for c in s)


class AntiDebugTimingChecks:
    """
    Generates timing-based anti-debug checks.
    ALL globals accessed via obfuscated table lookups.
    """
    
    def __init__(self, seed, threshold_ms: int = 100):
        if hasattr(seed, 'value'):
            self.rng = random.Random(seed.value)
        elif hasattr(seed, 'seed'):
            self.rng = random.Random(seed.seed)
        else:
            self.rng = random.Random(seed)
        
        self.threshold_ms = threshold_ms
        self.check_count = 0
    
    def _gen_name(self, length: int = 25) -> str:
        """Generate obfuscated variable name using l, I, O, 0, 1, _"""
        first_chars = 'lIO_'
        rest_chars = 'lIO01_'
        return self.rng.choice(first_chars) + ''.join(
            self.rng.choice(rest_chars) for _ in range(length - 1)
        )
    
    def generate_baseline_capture(self) -> str:
        """
        Generate code to capture baseline timing at VM init.
        ALL globals accessed via obfuscated table lookups.
        """
        baseline_var = self._gen_name()
        clock_var = self._gen_name()
        tick_var = self._gen_name()
        g_var = self._gen_name()
        os_ref = self._gen_name()
        
        code = f'''local {g_var}=_G
local {os_ref}={g_var}["{_to_escape('os')}"]
local {clock_var}={os_ref} and {os_ref}["{_to_escape('clock')}"]
local {tick_var}={g_var}["{_to_escape('tick')}"] or {clock_var}
local {baseline_var}={clock_var} and {clock_var}() or 0'''
        
        return code, baseline_var, clock_var
    
    def generate_timing_check(self, baseline_var: str, clock_var: str, 
                              response_type: str = "corrupt") -> str:
        """Generate a timing check that detects debugging."""
        self.check_count += 1
        
        current_var = self._gen_name()
        diff_var = self._gen_name()
        threshold = self.threshold_ms / 1000.0
        
        if response_type == "corrupt":
            response = self._generate_corrupt_response()
        elif response_type == "loop":
            response = self._generate_infinite_loop_response()
        else:
            response = self._generate_silent_fail_response()
        
        threshold_check = self._obfuscate_threshold_check(diff_var, threshold)
        
        code = f'''local {current_var}={clock_var} and {clock_var}() or 0
local {diff_var}={current_var}-{baseline_var}
if {threshold_check} then
{response}
end
{baseline_var}={current_var}'''
        
        return code
    
    def _obfuscate_threshold_check(self, diff_var: str, threshold: float) -> str:
        """Obfuscate the threshold comparison."""
        numerator = int(threshold * 1000)
        denominator = 1000
        
        style = self.rng.randint(0, 3)
        if style == 0:
            return f'{diff_var}>0X{int(threshold * 0x10000):X}/0X10000'
        elif style == 1:
            return f'{diff_var}>{numerator}/0X{denominator:X}'
        elif style == 2:
            return f'{diff_var}*0X{denominator:X}>0X{numerator:X}'
        else:
            return f'{diff_var}>{threshold}'
    
    def _generate_corrupt_response(self) -> str:
        """Generate response that corrupts VM state."""
        corrupt_var = self._gen_name()
        
        responses = [
            f'stack=nil',
            f'pc=-0X{self.rng.randint(0x1000, 0xFFFF):X}',
            f'constants={{}}',
            f'local {corrupt_var}=nil',
        ]
        
        return self.rng.choice(responses)
    
    def _generate_infinite_loop_response(self) -> str:
        """Generate response that enters infinite loop."""
        loop_var = self._gen_name()
        return f'''local {loop_var}=0
while true do {loop_var}={loop_var}+1 end'''
    
    def _generate_silent_fail_response(self) -> str:
        """Generate response that silently fails."""
        return 'return function()end'
    
    def generate_distributed_checks(self, num_checks: int = 5) -> List[Tuple[str, str]]:
        """Generate multiple timing checks for distribution throughout code."""
        baseline_code, baseline_var, clock_var = self.generate_baseline_capture()
        
        checks = [(baseline_code, "init")]
        
        response_types = ["corrupt", "loop", "silent", "corrupt", "silent"]
        locations = ["dispatch", "function_call", "loop_start", "return", "opcode_50"]
        
        for i in range(min(num_checks, len(locations))):
            response = response_types[i % len(response_types)]
            check = self.generate_timing_check(baseline_var, clock_var, response)
            checks.append((check, locations[i]))
        
        return checks
    
    def generate_all_in_one(self) -> str:
        """
        Generate a single block with baseline + check function.
        ALL globals accessed via obfuscated table lookups.
        """
        baseline_var = self._gen_name()
        clock_var = self._gen_name()
        check_func = self._gen_name()
        diff_var = self._gen_name()
        current_var = self._gen_name()
        g_var = self._gen_name()
        os_ref = self._gen_name()
        
        threshold = self.threshold_ms / 1000.0
        
        responses = []
        for i in range(3):
            resp_type = ["corrupt", "loop", "silent"][i]
            if resp_type == "corrupt":
                responses.append('stack=nil;pc=-1')
            elif resp_type == "loop":
                responses.append('while true do end')
            else:
                responses.append('return function()end')
        
        code = f'''local {g_var}=_G
local {os_ref}={g_var}["{_to_escape('os')}"]
local {clock_var}={os_ref} and {os_ref}["{_to_escape('clock')}"]
local {baseline_var}={clock_var} and {clock_var}() or 0
local {check_func}=function()
local {current_var}={clock_var} and {clock_var}() or 0
local {diff_var}={current_var}-{baseline_var}
{baseline_var}={current_var}
if {diff_var}>{threshold} then
{responses[0]}
end
end'''
        
        return code, check_func


class AntiDebugIntegrator:
    """Integrates anti-debug timing checks into VM code."""
    
    def __init__(self, seed, num_checks: int = 5, threshold_ms: int = 100):
        self.generator = AntiDebugTimingChecks(seed, threshold_ms)
        self.num_checks = num_checks
        
        if hasattr(seed, 'value'):
            self.rng = random.Random(seed.value)
        else:
            self.rng = random.Random(seed)
    
    def integrate(self, vm_code: str) -> str:
        """Integrate anti-debug checks into VM code."""
        import re
        
        infra_code, check_func = self.generator.generate_all_in_one()
        
        do_match = re.search(r'\bdo\b', vm_code)
        if do_match:
            insert_point = do_match.end()
            vm_code = vm_code[:insert_point] + '\n' + infra_code + '\n' + vm_code[insert_point:]
        
        while_match = re.search(r'while\s+true\s+do', vm_code)
        if while_match:
            insert_point = while_match.end()
            vm_code = vm_code[:insert_point] + f'\n{check_func}()' + vm_code[insert_point:]
        
        call_patterns = [
            r'(elseif\s+[a-zA-Z_][a-zA-Z0-9_]*\s*==\s*21\s+then)',
            r'(elseif\s+[a-zA-Z_][a-zA-Z0-9_]*\s*==\s*0X15\s+then)',
        ]
        for pattern in call_patterns:
            match = re.search(pattern, vm_code, re.IGNORECASE)
            if match:
                insert_point = match.end()
                vm_code = vm_code[:insert_point] + f'\n{check_func}()' + vm_code[insert_point:]
                break
        
        return vm_code
