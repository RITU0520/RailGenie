
# 🚆 RailGenie

## Railway Maintenance Planning & Optimization System

RailGenie is an intelligent railway maintenance planning system designed to generate safe and priority-aware maintenance schedules while considering train movements, maintenance availability windows, safety buffers, and operational conflicts.

The system combines a **Python/FastAPI optimization backend** with a **React frontend** to provide railway planners with scheduling, what-if simulation, diagnostics, scoring, and analytics.

---

## ✨ Features

### 🧠 Priority-Aware Optimization

RailGenie prioritizes maintenance tasks according to their operational priority:

- Critical
- High
- Medium
- Low

Higher-priority maintenance tasks are favored when competing for available maintenance windows.

### 🛡️ Train Safety Buffers

Maintenance activities cannot overlap protected train movement intervals.

The optimizer supports configurable safety buffers:

```text
Train arrival
      ↓
Safety buffer before
      ↓
Protected train movement
      ↓
Safety buffer after
      ↓
Maintenance allowed
```
