# Event Runtime Product Boundary / 事件运行时语义边界

Updated: 2026-05-19

## 1. Core Rule

The runtime lane is a coordination layer, not a replacement for module-owned records.

## 2. Ownership Split

### Event Runtime / 事件运行时

Owns:

- event logs
- cooldowns
- caps
- trigger policy
- adapter orchestration

Does not own:

- module-native records such as orders, routes, reminders, or role profiles

### Relationship Runtime / 关系运行时

Owns:

- relationship metrics
- stages
- milestones
- growth traits
- memory groups

### World Hub / 世界中枢

Owns:

- optional runtime review
- narrow override/review actions
- future GM-like control entry

Does not own:

- normal role/data entry
- daily reminders
- role profile editing

### Cheats / 金手指

Owns later:

- stronger override lane than World Hub
- debug correction and high-power controls when explicitly unlocked

Does not own yet:

- stable route
- default Home visibility
- mandatory user workflow

