# Provenance Viewer — Design Cycle

**Legend:** CORE_VIEWS
**Type:** design cycle

## Intent

Design the provenance viewer — select any value in the materialized
graph and trace its complete reverse causal cone through the receipt
chain. The "why is x = 5" view.

## Open questions

- What does the user select? A node property? An edge? A node
  itself? All of the above?
- How deep does the trace go? Full history or bounded depth?
- How are rejected alternatives (counterfactuals) shown alongside
  the admitted path?
- What is the rendering model? Vertical chain? Tree with branches
  for counterfactuals? Timeline with annotations?
- What data does the adapter need to expose? Is the current
  ReceiptSummary enough or do we need richer receipt queries?
- How does this connect to the counterfactual inspection cycle
  (already in up-next)?
- What is the agent surface? Structured provenance chain format?

## Expected outputs

- Design doc with sponsor users, hill, playback questions
- Backlog items for implementation work
- Decision on ReceiptSummary adequacy vs. new adapter methods
- Clarity on relationship to counterfactual inspection
