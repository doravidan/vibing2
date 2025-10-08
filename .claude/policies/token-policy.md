# QuickVibe Token Policy

This document defines the token optimization strategies for QuickVibe development.

## Core Rules

### 1. POINTER_FIRST Mode
- Operate on exact file paths with line ranges (Lx-Ly)
- Never dump full files unnecessarily
- Reference specific locations: `file_path:line_number`
- Use file snippets only for targeted operations

### 2. LAZY_RETRIEVAL
- Fetch minimal snippets needed for immediate task
- Defer reading until action is required
- Batch related file operations when possible
- Cache commonly referenced code patterns

### 3. EVIDENCE_GATED Operations
- Cite exact lines for any code assumption
- Verify imports and dependencies before use
- Check existing patterns before implementing new ones
- Document source of any copied/adapted code

### 4. DIFF_ONLY Changes
- Propose unified diffs instead of full rewrites
- Show before/after context (3-5 lines)
- Minimize change surface area
- Preserve existing code style and patterns

### 5. DECISION_CACHE
- Store architectural decisions in `/.claude/cache/`
- Record naming conventions and patterns
- Cache commonly used code snippets
- Maintain consistency across sessions

### 6. BOUNDED_PASSES
- Complete one objective per development pass
- Stop at Definition of Done (DOD)
- Avoid scope creep within single tasks
- Plan multi-phase work explicitly

### 7. COST_REPORT
- Estimate token usage before deep operations
- Confirm budget before exceeding limits
- Report actual usage for optimization
- Prefer efficient operations when equivalent

## Token Budgets

- **Input Budget**: 15,000 tokens per conversation
- **Output Budget**: 2,600 tokens per response
- **Warning Threshold**: 80% of budget
- **Hard Stop**: 95% of budget

## Implementation Guidelines

### Code Reviews
- Read targeted files only
- Focus on changed sections
- Use AST/pattern matching when possible
- Summarize findings concisely

### Feature Development
- Plan before coding
- Use existing components/patterns
- Generate minimal viable implementation
- Defer optimization unless required

### Debugging
- Start with error location
- Read minimal context around issue
- Test hypotheses incrementally
- Document solution for cache

### Refactoring
- Identify change scope first
- Plan dependency impacts
- Apply changes incrementally
- Verify each step before proceeding

## Optimization Strategies

1. **Incremental Development**: Build in small, verifiable steps
2. **Pattern Reuse**: Leverage existing code patterns and libraries
3. **Scope Limitation**: Focus on immediate requirements only
4. **Context Preservation**: Maintain architectural consistency
5. **Efficient Tools**: Use search/replace over read/write cycles

## Monitoring

- Track tokens per feature/task
- Identify high-cost operations
- Optimize frequently used patterns
- Review and update policies regularly

---

*This policy ensures QuickVibe development remains efficient while maintaining code quality and architectural consistency.*
