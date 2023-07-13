# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [3.12.0](https://github.com/eggjs/tegg/compare/v3.11.1...v3.12.0) (2023-07-13)


### Bug Fixes

* after call mockModuleContext, hasMockModuleContext should be true ([#134](https://github.com/eggjs/tegg/issues/134)) ([88b3caa](https://github.com/eggjs/tegg/commit/88b3caadd24f08221b8098c42733e26376338cae))





## [3.11.1](https://github.com/eggjs/tegg/compare/v3.11.0...v3.11.1) (2023-06-29)

**Note:** Version bump only for package @eggjs/tegg-plugin





# [3.11.0](https://github.com/eggjs/tegg/compare/v3.10.0...v3.11.0) (2023-06-29)

**Note:** Version bump only for package @eggjs/tegg-plugin





# [3.10.0](https://github.com/eggjs/tegg/compare/v3.9.0...v3.10.0) (2023-06-28)

**Note:** Version bump only for package @eggjs/tegg-plugin





# [3.9.0](https://github.com/eggjs/tegg/compare/v3.8.0...v3.9.0) (2023-06-20)

**Note:** Version bump only for package @eggjs/tegg-plugin





# [3.8.0](https://github.com/eggjs/tegg/compare/v3.7.0...v3.8.0) (2023-05-30)


### Features

* impl EggObjectLifecycle hook in decorator ([#119](https://github.com/eggjs/tegg/issues/119)) ([cced8a2](https://github.com/eggjs/tegg/commit/cced8a2e009c33d5040fa21d00409fddef471b0e))





# [3.7.0](https://github.com/eggjs/tegg/compare/v3.6.3...v3.7.0) (2023-04-03)

**Note:** Version bump only for package @eggjs/tegg-plugin





## [3.6.3](https://github.com/eggjs/tegg/compare/v3.6.2...v3.6.3) (2023-03-02)

**Note:** Version bump only for package @eggjs/tegg-plugin





## [3.6.2](https://github.com/eggjs/tegg/compare/v3.6.1...v3.6.2) (2023-02-16)


### Bug Fixes

* should not cache ctx object ([#103](https://github.com/eggjs/tegg/issues/103)) ([be54083](https://github.com/eggjs/tegg/commit/be5408375261d98b60fbc97e18de9232581a9547))





## [3.6.1](https://github.com/eggjs/tegg/compare/v3.6.0...v3.6.1) (2023-02-14)


### Bug Fixes

* get app/ctx properties when load unit beforeCreate ([#102](https://github.com/eggjs/tegg/issues/102)) ([76ef679](https://github.com/eggjs/tegg/commit/76ef679d745deb235db9dcc3fa34984b511bd5c6))





# [3.6.0](https://github.com/eggjs/tegg/compare/v3.5.2...v3.6.0) (2023-02-13)


### Bug Fixes

* egg qualifier should register after all file loaded ([#100](https://github.com/eggjs/tegg/issues/100)) ([5033b51](https://github.com/eggjs/tegg/commit/5033b51796b8a3329bd79884a8d8f18226193a1b))


### Features

* add backgroundTask.timeout config ([#101](https://github.com/eggjs/tegg/issues/101)) ([0b1eee0](https://github.com/eggjs/tegg/commit/0b1eee00d6feb9c6d4509023dffe85c0ada749c2))





## [3.5.2](https://github.com/eggjs/tegg/compare/v3.5.1...v3.5.2) (2023-02-10)


### Bug Fixes

* not create ctx logger proto ([#97](https://github.com/eggjs/tegg/issues/97)) ([100886b](https://github.com/eggjs/tegg/commit/100886ba90bdc7cccd07fa2f390defb5b0c53e22))





## [3.5.1](https://github.com/eggjs/tegg/compare/v3.5.0...v3.5.1) (2023-02-10)


### Bug Fixes

* remove useless init singleton proto ([#96](https://github.com/eggjs/tegg/issues/96)) ([097ac58](https://github.com/eggjs/tegg/commit/097ac58c675d43088c8785a12cf224b5d6adea17))





# [3.5.0](https://github.com/eggjs/tegg/compare/v3.4.1...v3.5.0) (2023-02-10)


### Features

* append call stack for runInBackground ([#91](https://github.com/eggjs/tegg/issues/91)) ([ec7bc2c](https://github.com/eggjs/tegg/commit/ec7bc2c60ffb49b4a51feec82e391b1f6a88549a))
* remove context egg object factory ([#93](https://github.com/eggjs/tegg/issues/93)) ([e14bdb2](https://github.com/eggjs/tegg/commit/e14bdb257eaebc0b0a4c37c6073a5c3237718718))
* use SingletonProto for egg ctx object ([#92](https://github.com/eggjs/tegg/issues/92)) ([3385d57](https://github.com/eggjs/tegg/commit/3385d571b076d3148978f252188f29d9cf2c6781))





## [3.4.1](https://github.com/eggjs/tegg/compare/v3.4.0...v3.4.1) (2023-02-02)


### Bug Fixes

* BackgroundTaskHelper should support recursively call ([#90](https://github.com/eggjs/tegg/issues/90)) ([368ac03](https://github.com/eggjs/tegg/commit/368ac0343d0d4e96b3768e7fd169b721551d0e4b))





# [3.4.0](https://github.com/eggjs/tegg/compare/v3.3.4...v3.4.0) (2023-02-01)

**Note:** Version bump only for package @eggjs/tegg-plugin





## [3.3.4](https://github.com/eggjs/tegg/compare/v3.3.3...v3.3.4) (2023-01-29)


### Bug Fixes

* should not notify backgroundTaskHelper if teggContext not exists ([#88](https://github.com/eggjs/tegg/issues/88)) ([4cab68b](https://github.com/eggjs/tegg/commit/4cab68bfc08a3786bde9a67cd8687f152829d9a0))





## [3.3.3](https://github.com/eggjs/tegg/compare/v3.3.2...v3.3.3) (2023-01-29)


### Bug Fixes

* wait egg background task done before destroy tegg ctx ([#87](https://github.com/eggjs/tegg/issues/87)) ([deea4d8](https://github.com/eggjs/tegg/commit/deea4d8d75c43347c6ee09e0e97f5fa80dd68dd9))





## [3.3.2](https://github.com/eggjs/tegg/compare/v3.3.1...v3.3.2) (2023-01-29)


### Bug Fixes

* beginModuleScope should be reentrant ([#86](https://github.com/eggjs/tegg/issues/86)) ([648aeaf](https://github.com/eggjs/tegg/commit/648aeaf1f20ff5bc217bf6f16fac9d9181eb8447))





## [3.3.1](https://github.com/eggjs/tegg/compare/v3.3.0...v3.3.1) (2023-01-28)

**Note:** Version bump only for package @eggjs/tegg-plugin





# [3.3.0](https://github.com/eggjs/tegg/compare/v3.2.4...v3.3.0) (2023-01-28)


### Features

* add app.eggContextHandler ([#84](https://github.com/eggjs/tegg/issues/84)) ([2772624](https://github.com/eggjs/tegg/commit/277262418143956b2e75bd1db5f2e7dd9b75eb8b))





## [3.2.3](https://github.com/eggjs/tegg/compare/v3.2.2...v3.2.3) (2023-01-16)

**Note:** Version bump only for package @eggjs/tegg-plugin





## [3.2.2](https://github.com/eggjs/tegg/compare/v3.2.1...v3.2.2) (2023-01-06)

**Note:** Version bump only for package @eggjs/tegg-plugin





## [3.2.1](https://github.com/eggjs/tegg/compare/v3.2.0...v3.2.1) (2022-12-28)

**Note:** Version bump only for package @eggjs/tegg-plugin





# [3.2.0](https://github.com/eggjs/tegg/compare/v3.1.0...v3.2.0) (2022-12-28)


### Features

* impl mockModuleContextScope ([#73](https://github.com/eggjs/tegg/issues/73)) ([041881c](https://github.com/eggjs/tegg/commit/041881ca317ad81366172a35ac56b7b2dc0a0488))





# [3.1.0](https://github.com/eggjs/tegg/compare/v1.3.0...v3.1.0) (2022-12-27)


### Bug Fixes

* inject context proto to singleton proto ([#72](https://github.com/eggjs/tegg/issues/72)) ([fcc0b2b](https://github.com/eggjs/tegg/commit/fcc0b2b48fc9bce580c1f2bcfcc38039ae909951))
* optimize backgroud output ([#47](https://github.com/eggjs/tegg/issues/47)) ([6d978c5](https://github.com/eggjs/tegg/commit/6d978c5d7c339c78a90b00d2c2622f0be85ab3ce))


### Features

* **break:** use async local storage ([#69](https://github.com/eggjs/tegg/issues/69)) ([772aeb9](https://github.com/eggjs/tegg/commit/772aeb9412c6d7cd23560230b441161ba28ffa0e))





# [3.0.0](https://github.com/eggjs/tegg/compare/v3.0.0-alpha.0...v3.0.0) (2022-12-26)

**Note:** Version bump only for package @eggjs/tegg-plugin





# [3.0.0-alpha.0](https://github.com/eggjs/tegg/compare/v1.3.0...v3.0.0-alpha.0) (2022-12-22)


### Bug Fixes

* optimize backgroud output ([#47](https://github.com/eggjs/tegg/issues/47)) ([6d978c5](https://github.com/eggjs/tegg/commit/6d978c5d7c339c78a90b00d2c2622f0be85ab3ce))


### Features

* **break:** use async local storage ([#69](https://github.com/eggjs/tegg/issues/69)) ([772aeb9](https://github.com/eggjs/tegg/commit/772aeb9412c6d7cd23560230b441161ba28ffa0e))





## [1.3.8](https://github.com/eggjs/tegg/compare/@eggjs/tegg-plugin@1.3.7...@eggjs/tegg-plugin@1.3.8) (2022-09-05)

**Note:** Version bump only for package @eggjs/tegg-plugin





## [1.3.7](https://github.com/eggjs/tegg/compare/@eggjs/tegg-plugin@1.3.6...@eggjs/tegg-plugin@1.3.7) (2022-09-04)

**Note:** Version bump only for package @eggjs/tegg-plugin





## [1.3.6](https://github.com/eggjs/tegg/compare/@eggjs/tegg-plugin@1.3.5...@eggjs/tegg-plugin@1.3.6) (2022-08-16)

**Note:** Version bump only for package @eggjs/tegg-plugin





## [1.3.4](https://github.com/eggjs/tegg/compare/@eggjs/tegg-plugin@1.3.3...@eggjs/tegg-plugin@1.3.4) (2022-07-28)

**Note:** Version bump only for package @eggjs/tegg-plugin





## [1.3.3](https://github.com/eggjs/tegg/compare/@eggjs/tegg-plugin@1.3.2...@eggjs/tegg-plugin@1.3.3) (2022-07-20)

**Note:** Version bump only for package @eggjs/tegg-plugin





## [1.3.2](https://github.com/eggjs/tegg/compare/@eggjs/tegg-plugin@1.3.1...@eggjs/tegg-plugin@1.3.2) (2022-07-20)

**Note:** Version bump only for package @eggjs/tegg-plugin





# [1.3.0](https://github.com/eggjs/tegg/compare/v1.2.0...v1.3.0) (2022-07-01)

**Note:** Version bump only for package @eggjs/tegg-plugin





# [0.2.0](https://github.com/eggjs/tegg/compare/v0.1.19...v0.2.0) (2022-01-20)


### Features

* impl aop ([c53df00](https://github.com/eggjs/tegg/commit/c53df001d1455a0a105689694775d880541d9d2f))
