# Module Architecture Governance Boundary / 模块架构治理边界

Updated: 2026-06-19

## 1. Core Rule

This package is for technical ownership and long-term maintainability, not for inventing new product requirements.

Behavior extraction is not product expansion. A governance slice can move workflow code behind a clearer Interface, but it must preserve user-visible behavior, persisted storage shape, and cross-module meaning unless the slice explicitly declares a product or migration change.

## 2. What It Owns

- state ownership clarity
- refactor and split planning
- cleanup of stale semantics or unused structures
- migration and storage boundary decisions
- file-size and test-pressure triage

## 3. What It Does Not Own

- daily PM status
- live execution ordering by itself
- visual direction by itself
- new feature scope hidden inside cleanup work
