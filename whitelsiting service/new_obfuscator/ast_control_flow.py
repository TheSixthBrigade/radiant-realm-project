#!/usr/bin/env python3
"""
AST-Based Control Flow Flattening for Luau Code.

This module uses the luau_ast parser to apply control flow flattening
EVERYWHERE in the code, not just the return statement.

It transforms:
- If statements into state machines
- While loops into nested state machines
- For loops into state machine equivalents
- Function bodies into flattened control flow

This is the proper way to do control flow flattening - using AST transformation
rather than regex-based string manipulation.
"""

import random
from typing import List, Optional, Dict, Tuple
from dataclasses import dataclass

from luau_ast import (
    parse_luau, ast_to_code,
    ASTNode, Block, LocalAssign, Assign, LocalFunction, Function,
    AnonymousFunction, If, While, Repeat, ForNumeric, ForGeneric,
    Do, Return, Break, Continue, Call, MethodCall, Name, Number,
    String, Boolean, Nil, Vararg, Table, TableField, Index,
    BinaryOp, UnaryOp, IfExpr
)

try:
    from core.seed import PolymorphicBuildSeed
    from core.predicates import OpaquePredicateGenerator
except ImportError:
    from core import PolymorphicBuildSeed, OpaquePredicateGenerator


class ASTControlFlowFlattener:
    """
    AST-based control flow flattening transformer.
    
    This transformer walks the AST and applies control flow obfuscation
    to every applicable construct:
    - Wraps if statements in state machines
    - Wraps loops in nested control structures
    - Adds opaque predicates throughout
    """
    
    # State variable names (Luraph style)
    STATE_VAR_NAMES = ['_ST', 'F', '_F', 'S', '_S', 'e', '_e', 'C', '_C', 
                       '_Il', '_lI', '_O0', '_0O', '_1l', '_l1']
    
    def __init__(self, seed: PolymorphicBuildSeed, opg: Optional[OpaquePredicateGenerator] = None,
                 max_depth: int = 2, wrap_probability: float = 0.7):
        """
        Initialize the control flow flattener.
        
        Args:
            seed: PolymorphicBuildSeed for randomization
            opg: OpaquePredicateGenerator for predicates
            max_depth: Maximum nesting depth for transformations
            wrap_probability: Probability of wrapping each construct (0.0-1.0)
        """
        self.seed = seed
        self.opg = opg or OpaquePredicateGenerator(seed)
        self.max_depth = max_depth
        self.wrap_probability = wrap_probability
        self._state_counter = 0
        self._used_state_vars = set()
    
    def _get_state_var(self) -> str:
        """Get a unique state variable name."""
        available = [v for v in self.STATE_VAR_NAMES if v not in self._used_state_vars]
        if not available:
            # Generate a new one
            self._state_counter += 1
            return f'_S{self._state_counter}'
        var = self.seed.choice(available)
        self._used_state_vars.add(var)
        return var
    
    def _release_state_var(self, var: str):
        """Release a state variable for reuse."""
        self._used_state_vars.discard(var)
    
    def _format_number(self, num: int) -> str:
        """Format a number in obfuscated format."""
        fmt = self.seed.get_random_int(0, 3)
        if fmt == 0:
            return f'0x{num:X}'
        elif fmt == 1:
            return f'0X{num:x}'
        elif fmt == 2 and num < 256:
            return f'0B{num:b}'
        else:
            return str(num)
    
    def _should_wrap(self) -> bool:
        """Decide whether to wrap a construct based on probability."""
        return self.seed.get_random_float() < self.wrap_probability
    
    def transform(self, code: str) -> str:
        """
        Transform Luau code with AST-based control flow flattening.
        
        Args:
            code: The Luau source code
            
        Returns:
            Transformed code with control flow flattening
        """
        try:
            ast = parse_luau(code)
            # Pass is_top_level=True for the root block to avoid wrapping
            # the final return statement (needed for VM template compatibility)
            transformed_ast = self._transform_block(ast, depth=0, is_top_level=True)
            return ast_to_code(transformed_ast)
        except Exception as e:
            # If parsing fails, return original code
            print(f"AST control flow transform failed: {e}")
            return code
    
    def _transform_block(self, block: Block, depth: int, is_top_level: bool = False) -> Block:
        """Transform a block of statements.
        
        Args:
            block: The block to transform
            depth: Current nesting depth
            is_top_level: If True, don't wrap the final return statement
                         (needed for VM template compatibility)
        """
        if depth >= self.max_depth:
            return block
        
        new_statements = []
        num_statements = len(block.statements)
        
        for i, stmt in enumerate(block.statements):
            # At top level (depth=0), don't wrap the final return statement
            # This is needed because _generate_output removes the final return
            # and if it's wrapped in control flow, the wrapper will be left unclosed
            is_final_return = (is_top_level and 
                              i == num_statements - 1 and 
                              isinstance(stmt, Return))
            
            if is_final_return:
                # Don't transform the final return at top level
                new_statements.append(stmt)
            else:
                transformed = self._transform_statement(stmt, depth)
                if isinstance(transformed, list):
                    new_statements.extend(transformed)
                else:
                    new_statements.append(transformed)
        
        return Block(statements=new_statements, line=block.line, column=block.column)
    
    def _transform_statement(self, stmt: ASTNode, depth: int) -> ASTNode:
        """Transform a single statement."""
        if isinstance(stmt, If):
            return self._transform_if(stmt, depth)
        elif isinstance(stmt, While):
            return self._transform_while(stmt, depth)
        elif isinstance(stmt, Repeat):
            return self._transform_repeat(stmt, depth)
        elif isinstance(stmt, ForNumeric):
            return self._transform_for_numeric(stmt, depth)
        elif isinstance(stmt, ForGeneric):
            return self._transform_for_generic(stmt, depth)
        elif isinstance(stmt, Do):
            return self._transform_do(stmt, depth)
        elif isinstance(stmt, LocalFunction):
            return self._transform_local_function(stmt, depth)
        elif isinstance(stmt, Function):
            return self._transform_function(stmt, depth)
        elif isinstance(stmt, (LocalAssign, Assign)):
            return self._transform_assignment(stmt, depth)
        elif isinstance(stmt, Return):
            return self._wrap_return(stmt, depth)
        else:
            return stmt
    
    def _transform_if(self, node: If, depth: int) -> ASTNode:
        """Transform an if statement with control flow obfuscation."""
        # Transform the inner blocks first
        then_block = self._transform_block(node.then_block, depth + 1)
        
        elseif_blocks = []
        for cond, block in node.elseif_blocks:
            elseif_blocks.append((cond, self._transform_block(block, depth + 1)))
        
        else_block = None
        if node.else_block:
            else_block = self._transform_block(node.else_block, depth + 1)
        
        transformed_if = If(
            condition=node.condition,
            then_block=then_block,
            elseif_blocks=elseif_blocks,
            else_block=else_block,
            line=node.line,
            column=node.column
        )
        
        # Optionally wrap in control flow structure
        if self._should_wrap() and depth < self.max_depth:
            return self._wrap_in_state_machine(transformed_if)
        
        return transformed_if
    
    def _transform_while(self, node: While, depth: int) -> ASTNode:
        """Transform a while loop with control flow obfuscation."""
        body = self._transform_block(node.body, depth + 1)
        
        transformed = While(
            condition=node.condition,
            body=body,
            line=node.line,
            column=node.column
        )
        
        # Optionally wrap in additional control flow
        if self._should_wrap() and depth < self.max_depth:
            return self._wrap_in_predicate_if(transformed)
        
        return transformed
    
    def _transform_repeat(self, node: Repeat, depth: int) -> ASTNode:
        """Transform a repeat-until loop."""
        body = self._transform_block(node.body, depth + 1)
        
        return Repeat(
            body=body,
            condition=node.condition,
            line=node.line,
            column=node.column
        )
    
    def _transform_for_numeric(self, node: ForNumeric, depth: int) -> ASTNode:
        """Transform a numeric for loop."""
        body = self._transform_block(node.body, depth + 1)
        
        transformed = ForNumeric(
            var=node.var,
            start=node.start,
            stop=node.stop,
            step=node.step,
            body=body,
            line=node.line,
            column=node.column
        )
        
        # Optionally wrap in control flow
        if self._should_wrap() and depth < self.max_depth:
            return self._wrap_in_predicate_if(transformed)
        
        return transformed
    
    def _transform_for_generic(self, node: ForGeneric, depth: int) -> ASTNode:
        """Transform a generic for loop."""
        body = self._transform_block(node.body, depth + 1)
        
        return ForGeneric(
            vars=node.vars,
            iterators=node.iterators,
            body=body,
            line=node.line,
            column=node.column
        )
    
    def _transform_do(self, node: Do, depth: int) -> ASTNode:
        """Transform a do block."""
        body = self._transform_block(node.body, depth + 1)
        
        transformed = Do(body=body, line=node.line, column=node.column)
        
        # Optionally wrap
        if self._should_wrap() and depth < self.max_depth:
            return self._wrap_in_state_machine(transformed)
        
        return transformed
    
    def _transform_local_function(self, node: LocalFunction, depth: int) -> LocalFunction:
        """Transform a local function definition."""
        body = self._transform_block(node.body, depth + 1)
        
        return LocalFunction(
            name=node.name,
            params=node.params,
            body=body,
            is_vararg=node.is_vararg,
            line=node.line,
            column=node.column
        )
    
    def _transform_function(self, node: Function, depth: int) -> Function:
        """Transform a function definition."""
        body = self._transform_block(node.body, depth + 1)
        
        return Function(
            name=node.name,
            params=node.params,
            body=body,
            is_vararg=node.is_vararg,
            line=node.line,
            column=node.column
        )
    
    def _transform_assignment(self, node: ASTNode, depth: int) -> ASTNode:
        """Transform assignments that contain anonymous functions."""
        if isinstance(node, LocalAssign):
            new_values = []
            for val in node.values:
                if isinstance(val, AnonymousFunction):
                    body = self._transform_block(val.body, depth + 1)
                    new_values.append(AnonymousFunction(
                        params=val.params,
                        body=body,
                        is_vararg=val.is_vararg,
                        line=val.line,
                        column=val.column
                    ))
                else:
                    new_values.append(val)
            return LocalAssign(names=node.names, values=new_values, 
                             line=node.line, column=node.column)
        elif isinstance(node, Assign):
            new_values = []
            for val in node.values:
                if isinstance(val, AnonymousFunction):
                    body = self._transform_block(val.body, depth + 1)
                    new_values.append(AnonymousFunction(
                        params=val.params,
                        body=body,
                        is_vararg=val.is_vararg,
                        line=val.line,
                        column=val.column
                    ))
                else:
                    new_values.append(val)
            return Assign(targets=node.targets, values=new_values,
                        line=node.line, column=node.column)
        return node
    
    def _wrap_return(self, node: Return, depth: int) -> ASTNode:
        """Wrap a return statement in control flow."""
        if not self._should_wrap() or depth >= self.max_depth:
            return node
        
        # Wrap return in a simple predicate check
        predicate = self._make_true_predicate()
        
        return If(
            condition=predicate,
            then_block=Block(statements=[node]),
            elseif_blocks=[],
            else_block=None,
            line=node.line,
            column=node.column
        )
    
    def _wrap_in_state_machine(self, stmt: ASTNode) -> Do:
        """Wrap a statement in a simple state machine."""
        state_var = self._get_state_var()
        initial = self.seed.get_random_int(1, 255)
        exit_val = 0
        
        # Create: local _ST = initial; while _ST ~= 0 do <stmt>; _ST = 0 end
        init_stmt = LocalAssign(
            names=[state_var],
            values=[Number(value=self._format_number(initial))]
        )
        
        # The condition: _ST ~= 0
        condition = BinaryOp(
            op='~=',
            left=Name(name=state_var),
            right=Number(value=self._format_number(exit_val))
        )
        
        # The body: <stmt>; _ST = 0
        exit_assign = Assign(
            targets=[Name(name=state_var)],
            values=[Number(value=self._format_number(exit_val))]
        )
        
        while_body = Block(statements=[stmt, exit_assign])
        
        while_stmt = While(condition=condition, body=while_body)
        
        # Wrap in do block
        do_block = Do(body=Block(statements=[init_stmt, while_stmt]))
        
        self._release_state_var(state_var)
        return do_block
    
    def _wrap_in_predicate_if(self, stmt: ASTNode) -> If:
        """Wrap a statement in an if with opaque predicate."""
        predicate = self._make_true_predicate()
        dead_code = self._make_dead_code()
        
        return If(
            condition=predicate,
            then_block=Block(statements=[stmt]),
            elseif_blocks=[],
            else_block=Block(statements=[dead_code]),
            line=stmt.line if hasattr(stmt, 'line') else 0,
            column=stmt.column if hasattr(stmt, 'column') else 0
        )
    
    def _make_true_predicate(self) -> ASTNode:
        """Create an opaque predicate that's always true."""
        # Use bit32.band(0xFF, 0xFF) == 0xFF style
        patterns = [
            # bit32.band(0xFF, 0xFF) == 0xFF
            lambda: BinaryOp(
                op='==',
                left=Call(
                    func=Index(obj=Name(name='bit32'), key=String(value='"band"')),
                    args=[Number(value='0xFF'), Number(value='0xFF')]
                ),
                right=Number(value='0xFF')
            ),
            # 1 == 1
            lambda: BinaryOp(op='==', left=Number(value='1'), right=Number(value='1')),
            # true
            lambda: Boolean(value=True),
            # not false
            lambda: UnaryOp(op='not', operand=Boolean(value=False)),
        ]
        
        return self.seed.choice(patterns)()
    
    def _make_dead_code(self) -> ASTNode:
        """Create dead code that never executes."""
        patterns = [
            lambda: LocalAssign(names=['_'], values=[Nil()]),
            lambda: LocalAssign(names=['_'], values=[Number(value='0')]),
            lambda: Do(body=Block(statements=[])),
        ]
        
        return self.seed.choice(patterns)()


def transform_with_ast_control_flow(code: str, seed: PolymorphicBuildSeed = None,
                                     max_depth: int = 2, 
                                     wrap_probability: float = 0.5) -> str:
    """
    Transform code with AST-based control flow flattening.
    
    Args:
        code: The Luau source code
        seed: Optional seed for randomization
        max_depth: Maximum nesting depth
        wrap_probability: Probability of wrapping each construct
        
    Returns:
        Transformed code
    """
    if seed is None:
        seed = PolymorphicBuildSeed()
    
    flattener = ASTControlFlowFlattener(
        seed=seed,
        max_depth=max_depth,
        wrap_probability=wrap_probability
    )
    
    return flattener.transform(code)


# Test
if __name__ == '__main__':
    test_code = '''
local function test(x)
    if x > 0 then
        print("positive")
    else
        print("non-positive")
    end
    
    for i = 1, 10 do
        if i == 5 then
            continue
        end
        print(i)
    end
    
    return x * 2
end

print(test(5))
'''
    
    print("=== Original Code ===")
    print(test_code)
    
    seed = PolymorphicBuildSeed(seed=42)
    transformed = transform_with_ast_control_flow(test_code, seed, max_depth=2, wrap_probability=0.8)
    
    print("\n=== Transformed Code ===")
    print(transformed)
