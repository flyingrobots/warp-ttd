# WARP TTD Manual

The WARP TTD Manual is the durable operator and maintainer book for the
debugger. It compiles design-cycle knowledge into a stable reading order.

Design packets in `docs/design/` remain the cycle ledger: they explain what was
decided, why it was decided, and how the work is verified. Manual chapters are
the forward-facing version of that knowledge. They should be readable after the
cycle context has faded.

## Manual Rule

From cycle 0027 onward, every new design cycle should add or update a manual
chapter when it introduces durable doctrine, architecture, protocol boundary,
operator workflow, or agent contract knowledge.

Manual chapters should:

- link back to their source design cycle
- state the operator-facing rule
- name the owner of each important fact family
- preserve non-goals and safety boundaries
- explain what future cycles should do next

## Contents

- [Manual Index](./docs/manual/README.md)
- [001. Generated Family Ingress Seam](./docs/manual/001-generated-family-ingress-seam.md)
