"""
Opcode Virtualization - Custom VM opcodes that don't match standard Luau.

This module shuffles/remaps the opcode table so that:
1. Standard Luau opcode numbers don't match our VM's opcode numbers
2. Each build has a different opcode mapping (polymorphic)
3. Decompilers expecting standard opcodes will fail

The FIU VM uses a dispatch table indexed by opcode number.
We shuffle this table and update the bytecode to match.
"""

import random
from typing import Dict, List, Tuple


class OpcodeVirtualizer:
    """
    Shuffles opcode mappings to create custom VM opcodes.
    
    Standard Luau has opcodes like:
    - 0x00 = NOP
    - 0x01 = BREAK
    - 0x02 = LOADNIL
    - etc.
    
    We create a random permutation so our VM uses:
    - 0x00 = CALL (was 0x44)
    - 0x01 = LOADNIL (was 0x02)
    - etc.
    
    This breaks any decompiler expecting standard opcodes.
    """
    
    # Standard Luau opcodes (from Luau bytecode spec)
    STANDARD_OPCODES = {
        0x00: 'NOP',
        0x01: 'BREAK',
        0x02: 'LOADNIL',
        0x03: 'LOADB',
        0x04: 'LOADN',
        0x05: 'LOADK',
        0x06: 'MOVE',
        0x07: 'GETGLOBAL',
        0x08: 'SETGLOBAL',
        0x09: 'GETUPVAL',
        0x0A: 'SETUPVAL',
        0x0B: 'CLOSEUPVALS',
        0x0C: 'GETIMPORT',
        0x0D: 'GETTABLE',
        0x0E: 'SETTABLE',
        0x0F: 'GETTABLEKS',
        0x10: 'SETTABLEKS',
        0x11: 'GETTABLEN',
        0x12: 'SETTABLEN',
        0x13: 'NEWCLOSURE',
        0x14: 'NAMECALL',
        0x15: 'CALL',
        0x16: 'RETURN',
        0x17: 'JUMP',
        0x18: 'JUMPBACK',
        0x19: 'JUMPIF',
        0x1A: 'JUMPIFNOT',
        0x1B: 'JUMPIFEQ',
        0x1C: 'JUMPIFLE',
        0x1D: 'JUMPIFLT',
        0x1E: 'JUMPIFNOTEQ',
        0x1F: 'JUMPIFNOTLE',
        0x20: 'JUMPIFNOTLT',
        0x21: 'ADD',
        0x22: 'SUB',
        0x23: 'MUL',
        0x24: 'DIV',
        0x25: 'MOD',
        0x26: 'POW',
        0x27: 'ADDK',
        0x28: 'SUBK',
        0x29: 'MULK',
        0x2A: 'DIVK',
        0x2B: 'MODK',
        0x2C: 'POWK',
        0x2D: 'AND',
        0x2E: 'OR',
        0x2F: 'ANDK',
        0x30: 'ORK',
        0x31: 'CONCAT',
        0x32: 'NOT',
        0x33: 'MINUS',
        0x34: 'LENGTH',
        0x35: 'NEWTABLE',
        0x36: 'DUPTABLE',
        0x37: 'SETLIST',
        0x38: 'FORNPREP',
        0x39: 'FORNLOOP',
        0x3A: 'FORGLOOP',
        0x3B: 'FORGPREP_INEXT',
        0x3C: 'DEP_FORGLOOP_INEXT',
        0x3D: 'FORGPREP_NEXT',
        0x3E: 'DEP_FORGLOOP_NEXT',
        0x3F: 'GETVARARGS',
        0x40: 'DUPCLOSURE',
        0x41: 'PREPVARARGS',
        0x42: 'LOADKX',
        0x43: 'JUMPX',
        0x44: 'FASTCALL',
        0x45: 'COVERAGE',
        0x46: 'CAPTURE',
        0x47: 'DEP_JUMPIFEQK',
        0x48: 'DEP_JUMPIFNOTEQK',
        0x49: 'FASTCALL1',
        0x4A: 'FASTCALL2',
        0x4B: 'FASTCALL2K',
        0x4C: 'FORGPREP',
        0x4D: 'JUMPXEQKNIL',
        0x4E: 'JUMPXEQKB',
        0x4F: 'JUMPXEQKN',
        0x50: 'JUMPXEQKS',
        0x51: 'IDIV',
        0x52: 'IDIVK',
    }
    
    def __init__(self, seed):
        self.seed = seed
        if hasattr(seed, 'value'):
            self.rng = random.Random(seed.value)
        elif hasattr(seed, 'seed'):
            self.rng = random.Random(seed.seed)
        else:
            self.rng = random.Random(seed)
        
        # Generate the opcode mapping
        self.opcode_map = self._generate_opcode_map()
        self.reverse_map = {v: k for k, v in self.opcode_map.items()}
    
    def _generate_opcode_map(self) -> Dict[int, int]:
        """
        Generate a random permutation of opcodes.
        
        Returns:
            Dict mapping original opcode -> new opcode
        """
        opcodes = list(self.STANDARD_OPCODES.keys())
        shuffled = opcodes.copy()
        self.rng.shuffle(shuffled)
        
        return {orig: new for orig, new in zip(opcodes, shuffled)}
    
    def remap_bytecode(self, bytecode: bytes) -> bytes:
        """
        Remap opcodes in bytecode to use our custom mapping.
        
        This modifies the bytecode so that opcode bytes are replaced
        with their shuffled equivalents.
        
        Args:
            bytecode: Original Luau bytecode
            
        Returns:
            Bytecode with remapped opcodes
        """
        # Luau bytecode format:
        # - Header (version, etc.)
        # - String table
        # - Proto table (functions)
        # Each instruction is 4 bytes, opcode is in bits 0-7
        
        data = bytearray(bytecode)
        
        # Skip header and find instruction sections
        # This is a simplified version - full implementation would parse bytecode properly
        # For now, we'll remap any byte that matches a known opcode
        # This is safe because we only remap within valid opcode range
        
        # Note: This is a placeholder - proper implementation requires
        # full bytecode parsing to identify instruction boundaries
        
        return bytes(data)
    
    def generate_dispatch_table_code(self) -> str:
        """
        Generate Lua code for the remapped dispatch table.
        
        Instead of:
            handlers[0x15] = call_handler  -- CALL
            
        We generate:
            handlers[0x{new_opcode}] = call_handler  -- CALL (was 0x15)
        """
        lines = []
        for orig, new in sorted(self.opcode_map.items()):
            name = self.STANDARD_OPCODES.get(orig, f'OP_{orig:02X}')
            lines.append(f'-- {name}: 0x{orig:02X} -> 0x{new:02X}')
        
        return '\n'.join(lines)
    
    def get_opcode_shuffle_table(self) -> str:
        """
        Generate a Lua table that maps standard opcodes to our custom ones.
        
        This table is used by the VM to look up the correct handler.
        """
        entries = []
        for orig, new in sorted(self.opcode_map.items()):
            entries.append(f'[0x{orig:02X}]=0x{new:02X}')
        
        return '{' + ','.join(entries) + '}'


class MultiLayerVM:
    """
    Multi-Layer VM - Nested VMs (VM inside VM).
    
    The idea is to have multiple layers of virtualization:
    1. Outer VM interprets inner VM's bytecode
    2. Inner VM interprets the actual user code
    
    This makes reverse engineering exponentially harder because
    you have to understand multiple VM layers.
    
    Implementation approach:
    1. Compile user code to bytecode
    2. Wrap bytecode in inner VM
    3. Compile inner VM to bytecode
    4. Wrap in outer VM
    """
    
    def __init__(self, seed, layers: int = 2):
        self.seed = seed
        if hasattr(seed, 'value'):
            self.rng = random.Random(seed.value)
        elif hasattr(seed, 'seed'):
            self.rng = random.Random(seed.seed)
        else:
            self.rng = random.Random(seed)
        
        self.layers = layers
    
    def _gen_name(self) -> str:
        first_chars = 'lIO_'
        rest_chars = 'lIO01_'
        return self.rng.choice(first_chars) + ''.join(self.rng.choice(rest_chars) for _ in range(24))
    
    def generate_nested_vm_wrapper(self, inner_code: str) -> str:
        """
        Wrap code in an additional VM layer.
        
        This creates a simple interpreter that executes the inner code
        through an additional layer of indirection.
        
        Args:
            inner_code: The code to wrap (already virtualized)
            
        Returns:
            Code wrapped in another VM layer
        """
        # Generate obfuscated names
        vm_var = self._gen_name()
        code_var = self._gen_name()
        state_var = self._gen_name()
        exec_var = self._gen_name()
        
        # Create a simple wrapper VM that adds another layer
        # This VM doesn't actually interpret bytecode - it just adds
        # control flow obfuscation around the inner VM
        
        wrapper = f'''local {vm_var}=function()
local {state_var}=0X{self.rng.randint(1000,9999):X}
local {exec_var}=function()
{inner_code}
end
while {state_var}~=0 do
if {state_var}==0X{self.rng.randint(1000,9999):X} then
{state_var}=0
elseif {state_var}>0 then
{exec_var}()
{state_var}=0
else
{state_var}=0X{self.rng.randint(1000,9999):X}
end
end
end
{vm_var}()'''
        
        return wrapper
    
    def generate_vm_dispatch_obfuscation(self) -> str:
        """
        Generate code that obfuscates the VM dispatch mechanism.
        
        Instead of a simple table lookup, we use computed indices
        and multiple indirection layers.
        """
        dispatch_var = self._gen_name()
        index_var = self._gen_name()
        handler_var = self._gen_name()
        
        # Generate magic numbers for index computation
        magic1 = self.rng.randint(100, 999)
        magic2 = self.rng.randint(100, 999)
        
        # Use _G["escaped"]["escaped"] to hide bit32 library name
        # bit32 = \98\105\116\51\50
        # bxor = \98\120\111\114
        # band = \98\97\110\100
        # NOTE: Use bit32 directly - _G["bit32"] returns nil in Roblox!
        b32 = 'bit32'
        bxor = f'{b32}["\\98\\120\\111\\114"]'
        band = f'{b32}["\\98\\97\\110\\100"]'
        
        return f'''local {dispatch_var}=function({index_var})
local {handler_var}={bxor}({index_var},0X{magic1:X})
{handler_var}={band}({handler_var},0XFF)
{handler_var}=({handler_var}*0X{magic2:X})%256
return {handler_var}
end'''


class OpcodeDispatchObfuscator:
    """
    Obfuscates the opcode dispatch in the VM by:
    1. Adding an opcode transformation layer (XOR with magic key)
    2. Replacing direct opcode numbers with computed expressions
    3. Adding decoy opcode handlers
    
    This makes static analysis much harder because:
    - Opcodes in bytecode don't match opcodes in dispatch
    - Dispatch uses computed values instead of constants
    - Decoy handlers add noise
    """
    
    def __init__(self, seed):
        self.seed = seed
        if hasattr(seed, 'value'):
            self.rng = random.Random(seed.value)
        elif hasattr(seed, 'seed'):
            self.rng = random.Random(seed.seed)
        else:
            self.rng = random.Random(seed)
        
        # Generate XOR key for opcode transformation
        self.xor_key = self.rng.randint(1, 255)
        
        # Generate magic numbers for computed dispatch
        self.magic_add = self.rng.randint(1000, 9999)
        self.magic_xor = self.rng.randint(100, 999)
    
    def _gen_name(self) -> str:
        first_chars = 'lIO_'
        rest_chars = 'lIO01_'
        return self.rng.choice(first_chars) + ''.join(self.rng.choice(rest_chars) for _ in range(20))
    
    def generate_opcode_decoder(self) -> str:
        """
        Generate the opcode decoder function that transforms opcodes at runtime.
        
        This function is called in luau_settings.decodeOp to transform
        each instruction word before dispatch.
        
        Uses _G["escaped"] to hide bit32 library name.
        """
        func_var = self._gen_name()
        word_var = self._gen_name()
        op_var = self._gen_name()
        rest_var = self._gen_name()
        
        # NOTE: Use bit32 directly - _G["bit32"] returns nil in Roblox!
        b32 = 'bit32'
        band = f'{b32}["\\98\\97\\110\\100"]'
        bxor = f'{b32}["\\98\\120\\111\\114"]'
        bor = f'{b32}["\\98\\111\\114"]'
        
        # The decoder XORs the opcode byte with our key
        return f'''local {func_var}=function({word_var})
local {op_var}={band}({word_var},0xFF)
local {rest_var}={band}({word_var},0xFFFFFF00)
{op_var}={bxor}({op_var},0X{self.xor_key:02X})
return {bor}({rest_var},{op_var})
end'''
    
    def transform_opcode_in_dispatch(self, opcode: int) -> str:
        """
        Transform an opcode number to its obfuscated form for dispatch.
        
        Instead of: if op == 21 then
        We generate: if op == 0X{transformed} then
        
        Uses various expression styles to hide the pattern.
        """
        # XOR the opcode with our key to get the transformed value
        transformed = opcode ^ self.xor_key
        
        # Generate different expression styles (NO bit32 calls - those expose library name)
        style = self.rng.randint(0, 4)
        
        if style == 0:
            # Direct hex
            return f'0X{transformed:02X}'
        elif style == 1:
            # Binary
            return f'0B{transformed:08b}'
        elif style == 2:
            # Addition/subtraction (instead of bit32.bxor which exposes library name)
            offset = self.rng.randint(1, 50)
            return f'(0X{transformed + offset:02X}-0X{offset:02X})'
        elif style == 3:
            # Multiplication/division
            if transformed > 0 and transformed % 2 == 0:
                return f'(0X{transformed // 2:02X}*0X02)'
            else:
                offset = self.rng.randint(1, 30)
                return f'(0X{transformed + offset:02X}-0X{offset:02X})'
        else:
            # Mixed format with underscore
            return f'0X{transformed:X}'
    
    def transform_vm_dispatch(self, vm_code: str) -> str:
        """
        Transform the VM dispatch to use obfuscated opcode comparisons.
        
        DISABLED: This transform is currently disabled because it breaks the VM
        by transforming comparisons that shouldn't be transformed (like kmode == 5).
        
        The issue is that after VM renaming, we can't reliably detect which
        variable is the opcode dispatch variable vs other variables.
        
        TODO: Fix this by:
        1. Running opcode obfuscation BEFORE VM renaming
        2. Or using a more sophisticated detection method
        """
        # DISABLED - return unchanged code
        return vm_code
        # The opcode transformation happens in the dispatch comparison, not in decodeOp
        
        return transformed_code
    
    def get_decoder_settings_code(self) -> str:
        """
        Generate code to set up the decoder in luau_settings.
        
        This should be called when creating luau_settings to enable
        opcode transformation.
        
        Uses _G["escaped"] to hide bit32 library name.
        """
        decoder_func = self._gen_name()
        
        # Use _G["escaped"]["escaped"] to hide bit32 methods
        # bit32 = \98\105\116\51\50
        # band = \98\97\110\100
        # bxor = \98\120\111\114
        # bor = \98\111\114
        # NOTE: Use bit32 directly - _G["bit32"] returns nil in Roblox!
        return f'''local {decoder_func}=function(w)
local o=bit32["\\98\\97\\110\\100"](w,0xFF)
local r=bit32["\\98\\97\\110\\100"](w,0xFFFFFF00)
o=bit32["\\98\\120\\111\\114"](o,0X{self.xor_key:02X})
return bit32["\\98\\111\\114"](r,o)
end
luau_settings.decodeOp={decoder_func}'''
    
    def generate_decoy_handlers(self, count: int = 5) -> str:
        """
        Generate decoy opcode handlers that never execute.
        
        These add noise to the dispatch and make analysis harder.
        """
        handlers = []
        used_opcodes = set(range(0, 83))  # Real opcodes
        
        for _ in range(count):
            # Pick an unused opcode number
            fake_op = self.rng.randint(100, 200)
            while fake_op in used_opcodes:
                fake_op = self.rng.randint(100, 200)
            used_opcodes.add(fake_op)
            
            # Transform it
            transformed = fake_op ^ self.xor_key
            
            # Generate fake handler code
            fake_var = self._gen_name()
            fake_val = self.rng.randint(0, 0xFFFF)
            
            handler_type = self.rng.randint(0, 3)
            if handler_type == 0:
                fake_code = f'local {fake_var}=0X{fake_val:X}'
            elif handler_type == 1:
                fake_code = f'stack[inst.A]=0X{fake_val:X}'
            elif handler_type == 2:
                fake_code = f'pc=pc+inst.D'
            else:
                fake_code = f'error("")'
            
            handlers.append(f'elseif op==0X{transformed:02X} then\n{fake_code}')
        
        return '\n'.join(handlers)


class PolymorphicBytecodeEncoder:
    """
    Polymorphic Bytecode - Different encoding each build.
    
    Each build uses a different:
    1. XOR key
    2. Byte shuffling pattern
    3. Encoding algorithm
    
    This means the same source code produces completely different
    bytecode representations each time.
    """
    
    def __init__(self, seed):
        self.seed = seed
        if hasattr(seed, 'value'):
            self.rng = random.Random(seed.value)
        elif hasattr(seed, 'seed'):
            self.rng = random.Random(seed.seed)
        else:
            self.rng = random.Random(seed)
        
        # Generate encoding parameters
        self.xor_key = self.rng.randint(1, 255)
        self.shuffle_key = self.rng.randint(1, 255)
        self.rotation = self.rng.randint(0, 7)
    
    def encode(self, data: bytes) -> Tuple[bytes, dict]:
        """
        Encode bytecode with polymorphic algorithm.
        
        Returns:
            Tuple of (encoded_data, decoding_params)
        """
        result = bytearray(data)
        
        # Layer 1: XOR with key
        for i in range(len(result)):
            result[i] ^= self.xor_key
        
        # Layer 2: Position-dependent XOR
        for i in range(len(result)):
            result[i] ^= ((i * self.shuffle_key) % 256)
        
        # Layer 3: Bit rotation
        for i in range(len(result)):
            val = result[i]
            result[i] = ((val << self.rotation) | (val >> (8 - self.rotation))) & 0xFF
        
        params = {
            'xor_key': self.xor_key,
            'shuffle_key': self.shuffle_key,
            'rotation': self.rotation,
        }
        
        return bytes(result), params
    
    def generate_decoder(self, params: dict) -> str:
        """
        Generate Lua decoder for the encoded bytecode.
        
        Uses _G["escaped"] to hide bit32 library name.
        """
        def gen_name():
            first_chars = 'lIO_'
            rest_chars = 'lIO01_'
            return self.rng.choice(first_chars) + ''.join(self.rng.choice(rest_chars) for _ in range(20))
        
        data_var = gen_name()
        i_var = gen_name()
        val_var = gen_name()
        result_var = gen_name()
        
        xor_key = params['xor_key']
        shuffle_key = params['shuffle_key']
        rotation = params['rotation']
        reverse_rotation = 8 - rotation
        
        # NOTE: Use bit32 directly - _G["bit32"] returns nil in Roblox!
        b32 = 'bit32'
        bor = f'{b32}["\\98\\111\\114"]'
        band = f'{b32}["\\98\\97\\110\\100"]'
        bxor = f'{b32}["\\98\\120\\111\\114"]'
        rshift = f'{b32}["\\114\\115\\104\\105\\102\\116"]'
        lshift = f'{b32}["\\108\\115\\104\\105\\102\\116"]'
        
        return f'''local function {gen_name()}({data_var})
local {result_var}={{}}
for {i_var}=1,#{data_var} do
local {val_var}={data_var}[{i_var}]
{val_var}={bor}({rshift}({val_var},{rotation}),{band}({lshift}({val_var},{reverse_rotation}),0xFF))
{val_var}={bxor}({val_var},(({i_var}-1)*{shuffle_key})%256)
{val_var}={bxor}({val_var},{xor_key})
{result_var}[{i_var}]={val_var}
end
return {result_var}
end'''
