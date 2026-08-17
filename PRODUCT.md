# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Site reliability engineers, platform engineers, Kubernetes operators, and engineering
leaders evaluating desktop tooling for day-to-day cluster investigation and operations.
They arrive while comparing Lens, Freelens, Headlamp, K9s, Aptakube, Kubernetes
Dashboard, or kubectl-adjacent workflows.

## Product Purpose

srelens is a local-first Kubernetes desktop workspace. It gives engineers one place to
browse live cluster resources, inspect configuration and health, stream logs, open pod
terminals, manage port forwards, and expose supported operations to MCP-capable AI
agents. The website must make the product understandable, credible, and easy to
evaluate or download.

## Positioning

srelens combines a native Tauri desktop application, a pure-Rust kube-rs core, direct
local kubeconfig access, and a built-in MCP server in one open-source control room. It
is a clean-room product, not a Lens or Freelens fork.

## Operating Context

Engineers use srelens during cluster exploration, incident response, deployment
inspection, and routine operations across macOS, Windows, and Linux. Evaluation happens
through real product screenshots, architectural comparisons, documentation, GitHub,
and a downloadable release.

## Capabilities and Constraints

- Static HTML, CSS, and progressive-enhancement JavaScript with no build step.
- Existing public URLs and search-indexed comparison pages must remain stable.
- Existing factual copy, metadata, structured data, accessibility behavior, theme
  preference, download behavior, and product claims must remain accurate.
- Real dark and light screenshots in `assets/shots/` are the primary product evidence.
- The product is free, MIT-licensed, and distributed through GitHub Releases.
- No fabricated customer logos, testimonials, benchmarks, adoption numbers, or
  enterprise security claims.

## Brand Commitments

- Preserve the `srelens` name, logo mark, and control-room positioning.
- The website should look professional and enterprise-ready.
- Avoid generic AI-generated landing-page conventions.
- Voice is direct, technical, specific, and low-hype.

## Evidence on Hand

- Fourteen real product workflows captured in light and dark themes.
- Current feature inventory, MCP setup instructions, download details, FAQs, and
  source links in the existing public pages.
- Six current comparison guides backed by first-party project sources.
- No customer case studies, customer logos, or independently verified performance
  benchmarks are available and none should be invented.

## Product Principles

- Show operational evidence before marketing claims.
- Keep cluster credentials and the engineering workflow local.
- Make consequential operations explicit and confirmation-gated.
- Respect existing Kubernetes tools and compare them honestly.
- Let engineers evaluate the product without creating an account.

## Accessibility & Inclusion

The site must retain semantic HTML, keyboard focus visibility, reduced-motion support,
responsive layouts, descriptive image text, and legible contrast in both themes.
