# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [3.77.2](https://github.com/eggjs/tegg/compare/v3.77.1...v3.77.2) (2026-04-07)

**Note:** Version bump only for package @eggjs/agent-runtime





## [3.77.1](https://github.com/eggjs/tegg/compare/v3.77.0...v3.77.1) (2026-04-01)


### Bug Fixes

* **agent-runtime:** handle all content_block_start and delta subtypes in normalizeContentBlocks ([#430](https://github.com/eggjs/tegg/issues/430)) ([119ba38](https://github.com/eggjs/tegg/commit/119ba3889a52b3577bf0aa23b6123c4d2fd4a23c))





# [3.77.0](https://github.com/eggjs/tegg/compare/v3.76.1...v3.77.0) (2026-04-01)


### Features

* **agent-runtime:** add normalizeContentBlocks for Anthropic SDK stream events ([#429](https://github.com/eggjs/tegg/issues/429)) ([d780fdb](https://github.com/eggjs/tegg/commit/d780fdba3cc243db4811af6733fda737f8c1dc4a))





## [3.76.1](https://github.com/eggjs/tegg/compare/v3.76.0...v3.76.1) (2026-04-01)


### Bug Fixes

* **agent-runtime:** merge content blocks and support accumulate control ([#428](https://github.com/eggjs/tegg/issues/428)) ([f4f904e](https://github.com/eggjs/tegg/commit/f4f904e357497fc5ad9a2c7d2ece4e9b305f5738))





# [3.76.0](https://github.com/eggjs/tegg/compare/v3.75.1...v3.76.0) (2026-04-01)


### Features

* **agent-runtime:** support custom SSE event types in streamRun ([#427](https://github.com/eggjs/tegg/issues/427)) ([2efe539](https://github.com/eggjs/tegg/commit/2efe539cd2673e27dc91cb4597751e6e0a9d4b67))





## [3.75.1](https://github.com/eggjs/tegg/compare/v3.75.0...v3.75.1) (2026-04-01)


### Bug Fixes

* **agent-runtime:** preserve non-text content blocks in MessageConverter ([#426](https://github.com/eggjs/tegg/issues/426)) ([8c4382f](https://github.com/eggjs/tegg/commit/8c4382f33f68534218049cfbfadfd4f6800a348c))





# [3.75.0](https://github.com/eggjs/tegg/compare/v3.74.0...v3.75.0) (2026-03-30)

**Note:** Version bump only for package @eggjs/agent-runtime





# [3.74.0](https://github.com/eggjs/tegg/compare/v3.73.0...v3.74.0) (2026-03-30)


### Bug Fixes

* **agent-runtime:** set isResume based on thread message history ([#419](https://github.com/eggjs/tegg/issues/419)) ([8a7eacc](https://github.com/eggjs/tegg/commit/8a7eacca79a94815251a0d660f828ebef443d12a))





# [3.73.0](https://github.com/eggjs/tegg/compare/v3.72.0...v3.73.0) (2026-03-25)


### Features

* add agent-runtime package with @AgentController decorator ([#411](https://github.com/eggjs/tegg/issues/411)) ([d4d0006](https://github.com/eggjs/tegg/commit/d4d00061e90230f82c0958bcf5268f8a511395db))
* **agent-runtime:** add isResume flag to CreateRunInput ([#414](https://github.com/eggjs/tegg/issues/414)) ([29ac989](https://github.com/eggjs/tegg/commit/29ac98995c0a37bb34d33f7ad81af7c664a67bce))
