# Package Naming

This repository follows the shared usmhic package-naming policy in `STANDARDS.md`.
Names below are public identifiers and should be treated as compatibility surfaces.

## Existing names

| Surface | Public name | Rule |
| --- | --- | --- |
| Repository | `expenn` | Lowercase product/repository name |
| .NET API assembly | `Expenn.Api` | `Expenn.Api` root namespace and assembly |
| .NET API domains | `Expenn.Api.<Area>` | PascalCase namespaces grouped by domain |
| Web application | `expenn` | Lowercase npm application name |
| Mobile application | `expenn-traveler` | Lowercase npm application name and Expo slug |
| Android package | `com.osascloud.expenn` | Reverse-domain, lowercase identifier |

## Rules for new code

- Keep repository and npm names lowercase and use hyphens only when they improve readability.
- Keep .NET namespaces and assemblies under `Expenn.Api`; do not introduce an `Expenn`-less namespace.
- Name new domain folders and namespaces with PascalCase and keep them aligned.
- Do not rename an existing app, assembly, Android package, or API namespace without a migration plan and release-note entry.
- Use `usmhic` for repository ownership and source links, not as a replacement for the product namespace.
