# Architecture Decision Records

## Purpose
This document provides an index of all Architecture Decision Records (ADRs) for the project, organized by status, domain, and chronology.

## Classification
- **Domain:** Decision
- **Stability:** Dynamic
- **Abstraction:** Structural
- **Confidence:** Established

## Content

### What is an Architecture Decision Record?

An Architecture Decision Record (ADR) is a document that captures an important architectural decision made along with its context and consequences. Each ADR describes:

- The architectural decision that was made
- The context and problem statement that motivated the decision
- The decision's consequences and trade-offs
- Alternatives that were considered
- The current status of the decision

ADRs are immutable once accepted - they are not updated to reflect new decisions, but may be marked as "Superseded" by newer ADRs.

### How to Use This Index

This index organizes ADRs in multiple ways to help you find relevant decisions:

1. **By Status**: Find current, proposed, or superseded decisions
2. **By Domain**: Find decisions related to specific areas of the system
3. **By Chronology**: See the evolution of decisions over time
4. **By Component**: Find decisions affecting specific components

### Decision Status Definitions

- **Proposed**: A decision that has been suggested but not yet accepted
- **Accepted**: A decision that has been accepted and is currently in effect
- **Deprecated**: A decision that is no longer recommended but may still be in effect
- **Superseded**: A decision that has been replaced by a newer decision

### ADRs by Status

#### Proposed
- *None currently*

#### Accepted
- [ADR-001: TypeScript NPM Package Setup for Mastra Compatibility](adr_001_typescript_npm_package_setup_for_mastra_compatibility.md)
- [ADR-002: Minimum Viable Package Implementation](adr_002_minimum_viable_package_implementation.md)
- [ADR-003: Semantic Interface Redesign Based on LSFS Research](adr_003_semantic_interface_redesign.md)
- [ADR-004: Native Mastra Integration Layer](adr_004_native_mastra_integration_layer.md)

#### Deprecated
- *None yet*

#### Superseded
- *None yet*

### ADRs by Domain

#### Foundation
- *None yet*

#### Architecture
- [ADR-003: Semantic Interface Redesign Based on LSFS Research](adr_003_semantic_interface_redesign.md)
- [ADR-004: Native Mastra Integration Layer](adr_004_native_mastra_integration_layer.md)

#### Technology
- [ADR-001: TypeScript NPM Package Setup for Mastra Compatibility](adr_001_typescript_npm_package_setup_for_mastra_compatibility.md)
- [ADR-002: Minimum Viable Package Implementation](adr_002_minimum_viable_package_implementation.md)

#### Process
- *None yet*

#### Security
- *None yet*

#### Performance
- *None yet*

### ADRs by Chronology

#### 2024
- [ADR-001: TypeScript NPM Package Setup for Mastra Compatibility](adr_001_typescript_npm_package_setup_for_mastra_compatibility.md) - January 15
- [ADR-002: Minimum Viable Package Implementation](adr_002_minimum_viable_package_implementation.md) - January 18
- [ADR-003: Semantic Interface Redesign Based on LSFS Research](adr_003_semantic_interface_redesign.md) - January 18
- [ADR-004: Native Mastra Integration Layer](adr_004_native_mastra_integration_layer.md) - June 19

### ADRs by Component

#### Component 1
- *None yet*

#### Component 2
- *None yet*

### Creating New ADRs

To create a new ADR:

1. Copy the template from `meta/templates/adr_template.md`
2. Name the file `adr_NNN_title_with_underscores.md` where NNN is the next available number
3. Fill in all sections of the template
4. Add the ADR to this index in all relevant sections
5. Submit the ADR for review

### Changing Decision Status

When a decision's status changes:

1. Update the ADR's status field
2. Move the ADR in this index to the appropriate status section
3. If superseded, add a reference to the superseding ADR
4. If superseding, add a reference to the superseded ADR

## Relationships
- **Parent Nodes:** None
- **Child Nodes:** 
  - [All individual ADRs] - contains - Individual decision records
- **Related Nodes:** 
  - [architecture/system_architecture.md] - justifies - Architectural decisions shape the system architecture
  - [evolution/refactoring_plans.md] - motivates - Decisions may drive refactoring plans
  - [meta/templates/adr_template.md] - uses - Template for creating new ADRs

## Navigation Guidance
- **Access Context:** Use this document when needing to understand key decisions that have shaped the system
- **Common Next Steps:** After reviewing this index, typically explore specific ADRs of interest
- **Related Tasks:** Architecture review, onboarding new team members, planning system changes
- **Update Patterns:** This document should be updated whenever a new ADR is added or an existing ADR's status changes

## Metadata
- **Created:** Initial project setup
- **Last Updated:** 2024-06-19
- **Updated By:** Implementation team

## Change History
- Initial: Created decision index
- 2024-01-18: Added ADR-002 for minimum viable package implementation
- 2024-06-19: Added ADR-004 for native Mastra integration layer
