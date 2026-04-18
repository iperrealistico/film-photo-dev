# Docs Guide

This directory contains tracked repository documentation only.

## What Belongs Here
- stable, sanitized documentation that should travel with the repository;
- high-level architecture and system overview;
- historical reference material that explains product intent or past implementation work;
- no secrets, local machine notes, daily logs, or privileged live-only data.

## Layout
- `app-creation-plan.md`
  - phased execution roadmap for building the first version of the app.
- `system-overview.md`
  - repo-oriented technical overview of the current workspace.
- `reference/`
  - archived, historical, and source reference material.

## Current Scope
- [Verified] The workspace now contains a first runnable Vite + React + TypeScript application scaffold alongside the documentation and local AI control plane.
- [Verified] The repository includes a package manifest, build configuration, static PWA assets, typed domain logic, and a mobile-first UI shell.
- [Derived] The app is still early-stage, but it has moved beyond documentation-only bootstrap status.

## Official Repository
- [Verified] The canonical GitHub repository for this project is `https://github.com/iperrealistico/film-photo-dev.git`.
- [Derived] Repo-facing documentation in this directory should treat that repository as the official upstream home of the project unless a later tracked decision supersedes it.

## Canonical Operational Documentation
For live-state, sensitive, or local-only documentation, use:
- `../START-HERE-AI.local.md`
- `../documents-local/platform-dossier/`
- `../documents-local/agent-operations/`
- `../documents-local/workspace-local/`

## Rule Of Thumb
- Put durable repo-facing documentation in `docs/`.
- Put historical plans and archived reference material in `docs/reference/`.
- Put secrets, incident history, daily notes, and machine-local operational material in `documents-local/`.
