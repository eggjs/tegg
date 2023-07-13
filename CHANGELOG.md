# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [3.12.0](https://github.com/eggjs/tegg/compare/v3.11.1...v3.12.0) (2023-07-13)


### Bug Fixes

* after call mockModuleContext, hasMockModuleContext should be true ([#134](https://github.com/eggjs/tegg/issues/134)) ([88b3caa](https://github.com/eggjs/tegg/commit/88b3caadd24f08221b8098c42733e26376338cae))





## [3.11.1](https://github.com/eggjs/tegg/compare/v3.11.0...v3.11.1) (2023-06-29)


### Bug Fixes

* export StandaloneInnerObject ([#131](https://github.com/eggjs/tegg/issues/131)) ([e4b87e0](https://github.com/eggjs/tegg/commit/e4b87e0a48e3232adaf43bad75f44d0ae775c984))





# [3.11.0](https://github.com/eggjs/tegg/compare/v3.10.0...v3.11.0) (2023-06-29)


### Features

* export transaction decorator from tegg ([8be0521](https://github.com/eggjs/tegg/commit/8be05212b62fe7f111688efaec935be64d623918))
* impl transaction decorator ([#124](https://github.com/eggjs/tegg/issues/124)) ([4896615](https://github.com/eggjs/tegg/commit/4896615af951bbff940cda7abc116df40ed486e5))





# [3.10.0](https://github.com/eggjs/tegg/compare/v3.9.0...v3.10.0) (2023-06-28)


### Bug Fixes

* use posix join for package path ([#127](https://github.com/eggjs/tegg/issues/127)) ([53672f4](https://github.com/eggjs/tegg/commit/53672f404edb72c7330e125f72dd356cde0607ad))


### Features

* standalone Runner run support ctx ([#126](https://github.com/eggjs/tegg/issues/126)) ([0788c7d](https://github.com/eggjs/tegg/commit/0788c7dfb57f96c55e94cc6692c0b6e9ac1ee03c))





# [3.9.0](https://github.com/eggjs/tegg/compare/v3.8.0...v3.9.0) (2023-06-20)


### Features

* implement advice params ([76ec8ad](https://github.com/eggjs/tegg/commit/76ec8ad7b7170a637e59d74d49c1f00d8a201321))





# [3.8.0](https://github.com/eggjs/tegg/compare/v3.7.0...v3.8.0) (2023-05-30)


### Features

* impl EggObjectLifecycle hook in decorator ([#119](https://github.com/eggjs/tegg/issues/119)) ([cced8a2](https://github.com/eggjs/tegg/commit/cced8a2e009c33d5040fa21d00409fddef471b0e))





# [3.7.0](https://github.com/eggjs/tegg/compare/v3.6.3...v3.7.0) (2023-04-03)


### Bug Fixes

* don't check eventbus plugin name ([#113](https://github.com/eggjs/tegg/issues/113)) ([2a94a57](https://github.com/eggjs/tegg/commit/2a94a57c58e4fd971400966c15597aace4bb1ecc))


### Features

* The exposed module reads the options. ([#112](https://github.com/eggjs/tegg/issues/112)) ([a52b44b](https://github.com/eggjs/tegg/commit/a52b44b753463bfdef6fbbc39f920be8eccf1567))





## [3.6.3](https://github.com/eggjs/tegg/compare/v3.6.2...v3.6.3) (2023-03-02)


### Bug Fixes

* fix contextEggObjectGetProperty conflict ([#105](https://github.com/eggjs/tegg/issues/105)) ([c570315](https://github.com/eggjs/tegg/commit/c570315ece6ef7443ecf3df2b45aa8c934a5aa38))





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

* eventbus cork should support reentry ([#98](https://github.com/eggjs/tegg/issues/98)) ([077044c](https://github.com/eggjs/tegg/commit/077044c040f8423572605eb2980e3cc6da8c038e))
* not create ctx logger proto ([#97](https://github.com/eggjs/tegg/issues/97)) ([100886b](https://github.com/eggjs/tegg/commit/100886ba90bdc7cccd07fa2f390defb5b0c53e22))





## [3.5.1](https://github.com/eggjs/tegg/compare/v3.5.0...v3.5.1) (2023-02-10)


### Bug Fixes

* remove useless init singleton proto ([#96](https://github.com/eggjs/tegg/issues/96)) ([097ac58](https://github.com/eggjs/tegg/commit/097ac58c675d43088c8785a12cf224b5d6adea17))





# [3.5.0](https://github.com/eggjs/tegg/compare/v3.4.1...v3.5.0) (2023-02-10)


### Bug Fixes

* loader should not deps metadata ([#94](https://github.com/eggjs/tegg/issues/94)) ([ff57de4](https://github.com/eggjs/tegg/commit/ff57de4f3e0d0dc33d77d05a887242fcb4c32024))


### Features

* append call stack for runInBackground ([#91](https://github.com/eggjs/tegg/issues/91)) ([ec7bc2c](https://github.com/eggjs/tegg/commit/ec7bc2c60ffb49b4a51feec82e391b1f6a88549a))
* remove context egg object factory ([#93](https://github.com/eggjs/tegg/issues/93)) ([e14bdb2](https://github.com/eggjs/tegg/commit/e14bdb257eaebc0b0a4c37c6073a5c3237718718))
* use SingletonProto for egg ctx object ([#92](https://github.com/eggjs/tegg/issues/92)) ([3385d57](https://github.com/eggjs/tegg/commit/3385d571b076d3148978f252188f29d9cf2c6781))





## [3.4.1](https://github.com/eggjs/tegg/compare/v3.4.0...v3.4.1) (2023-02-02)


### Bug Fixes

* BackgroundTaskHelper should support recursively call ([#90](https://github.com/eggjs/tegg/issues/90)) ([368ac03](https://github.com/eggjs/tegg/commit/368ac0343d0d4e96b3768e7fd169b721551d0e4b))





# [3.4.0](https://github.com/eggjs/tegg/compare/v3.3.4...v3.4.0) (2023-02-01)


### Features

* use singleton model insteadof context ([#89](https://github.com/eggjs/tegg/issues/89)) ([cfdfc05](https://github.com/eggjs/tegg/commit/cfdfc05f13048806274de1a35b1207c073a8519d))





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


### Bug Fixes

* inject property should be configurable ([#85](https://github.com/eggjs/tegg/issues/85)) ([c13ab55](https://github.com/eggjs/tegg/commit/c13ab55d7b483a5c4a6e4293a6095aa98d070a8b))





# [3.3.0](https://github.com/eggjs/tegg/compare/v3.2.4...v3.3.0) (2023-01-28)


### Bug Fixes

* router type ([#83](https://github.com/eggjs/tegg/issues/83)) ([b32d9b8](https://github.com/eggjs/tegg/commit/b32d9b8e94552d27dc0249c9f38e7223b24beff0))


### Features

* add app.eggContextHandler ([#84](https://github.com/eggjs/tegg/issues/84)) ([2772624](https://github.com/eggjs/tegg/commit/277262418143956b2e75bd1db5f2e7dd9b75eb8b))
* export singleton orm client ([#82](https://github.com/eggjs/tegg/issues/82)) ([5320af7](https://github.com/eggjs/tegg/commit/5320af77d7e7c5c73b80560a576f2ce01fc21fff))





## [3.2.3](https://github.com/eggjs/tegg/compare/v3.2.2...v3.2.3) (2023-01-16)


### Bug Fixes

* cork/uncork should can be called multi times in same ctx ([#78](https://github.com/eggjs/tegg/issues/78)) ([269cda6](https://github.com/eggjs/tegg/commit/269cda6327122111c230e6f69abb525ce4ab5be1))





## [3.2.2](https://github.com/eggjs/tegg/compare/v3.2.1...v3.2.2) (2023-01-06)

**Note:** Version bump only for package tegg





## [3.2.1](https://github.com/eggjs/tegg/compare/v3.2.0...v3.2.1) (2022-12-28)


### Bug Fixes

* fix nest inject ctx obj to singleton obj ([#74](https://github.com/eggjs/tegg/issues/74)) ([e4b6252](https://github.com/eggjs/tegg/commit/e4b6252aa79925e16185e568bf7b220f367253ab))





# [3.2.0](https://github.com/eggjs/tegg/compare/v3.1.0...v3.2.0) (2022-12-28)


### Features

* impl mockModuleContextScope ([#73](https://github.com/eggjs/tegg/issues/73)) ([041881c](https://github.com/eggjs/tegg/commit/041881ca317ad81366172a35ac56b7b2dc0a0488))





# [3.1.0](https://github.com/eggjs/tegg/compare/v1.3.0...v3.1.0) (2022-12-27)


### Bug Fixes

* add 'globby' as dependencies ([#71](https://github.com/eggjs/tegg/issues/71)) ([76d85d9](https://github.com/eggjs/tegg/commit/76d85d9948527028f926ae0ff5a61111eb1cbd04))
* eventbus runtime should wait all handlers done ([#51](https://github.com/eggjs/tegg/issues/51)) ([0651d30](https://github.com/eggjs/tegg/commit/0651d300f9a18bd97299548f3ebccad1d0382d28))
* fix events type from any to keyof Events ([#54](https://github.com/eggjs/tegg/issues/54)) ([a2551b2](https://github.com/eggjs/tegg/commit/a2551b2d9f9eabf9ed5c87f83489615eefa3e6d1))
* fix file path for advice decorator ([#64](https://github.com/eggjs/tegg/issues/64)) ([d6aa091](https://github.com/eggjs/tegg/commit/d6aa091851b5d1ca63e7e56e081df4d15ab3284e))
* fix miss agent file ([0fa496b](https://github.com/eggjs/tegg/commit/0fa496bdbb4ffa4e911fffa3e176fa7bdf03fb12))
* fix miss agent file ([#56](https://github.com/eggjs/tegg/issues/56)) ([cfb4dcc](https://github.com/eggjs/tegg/commit/cfb4dcc006ee1253733c7122f885a05da94f80b5))
* fix mock prototype in aop not work ([#66](https://github.com/eggjs/tegg/issues/66)) ([16640eb](https://github.com/eggjs/tegg/commit/16640eb751405532b2a1241b17624ce3ac2d1c7a))
* fix rootProtoManager.registerRootProto ([f416ed7](https://github.com/eggjs/tegg/commit/f416ed70af1c46d31ebf712b208205d67337d958))
* fix schedule import ([1fb5481](https://github.com/eggjs/tegg/commit/1fb54816fb3240c641824c2bc2b464c35652b655))
* inject context proto to singleton proto ([#72](https://github.com/eggjs/tegg/issues/72)) ([fcc0b2b](https://github.com/eggjs/tegg/commit/fcc0b2b48fc9bce580c1f2bcfcc38039ae909951))
* none exist node_modules path ([#59](https://github.com/eggjs/tegg/issues/59)) ([77cb068](https://github.com/eggjs/tegg/commit/77cb0687ba8e5d9f20a6df0548de9d55a8771c21))
* optimize backgroud output ([#47](https://github.com/eggjs/tegg/issues/47)) ([6d978c5](https://github.com/eggjs/tegg/commit/6d978c5d7c339c78a90b00d2c2622f0be85ab3ce))
* skip file not exits ([#62](https://github.com/eggjs/tegg/issues/62)) ([10e56d4](https://github.com/eggjs/tegg/commit/10e56d418f359efa5d8909541768082cf068d2a4))
* use getMetaData for ModelMetadataUtil ([#44](https://github.com/eggjs/tegg/issues/44)) ([87a306c](https://github.com/eggjs/tegg/commit/87a306c4fba51fd519a47c0caaa79442643ea107))
* use require.resolve instead path.join to resolve dependencies path ([#63](https://github.com/eggjs/tegg/issues/63)) ([d7f3beb](https://github.com/eggjs/tegg/commit/d7f3beb27a22b95bb54589c5988a68ce2484c089))


### Features

* add new module scan mode ([#58](https://github.com/eggjs/tegg/issues/58)) ([3be6c20](https://github.com/eggjs/tegg/commit/3be6c2047a0241a482aafd0aaa072f51f861b6ea))
* **break:** use async local storage ([#69](https://github.com/eggjs/tegg/issues/69)) ([772aeb9](https://github.com/eggjs/tegg/commit/772aeb9412c6d7cd23560230b441161ba28ffa0e))
* impl Host decorator ([#48](https://github.com/eggjs/tegg/issues/48)) ([65dc7a8](https://github.com/eggjs/tegg/commit/65dc7a899ba72dd0851c35046562766d7f2b71b6))
* impl Inject Model ([#43](https://github.com/eggjs/tegg/issues/43)) ([ced2ce2](https://github.com/eggjs/tegg/commit/ced2ce2134964dcb410410c0192a34f77507c42d))
* impl Schedule decorator ([#52](https://github.com/eggjs/tegg/issues/52)) ([7f95005](https://github.com/eggjs/tegg/commit/7f950050b548ca542addbd7b466675da4e81ce3f))
* implement cork/uncork for eventbus ([#60](https://github.com/eggjs/tegg/issues/60)) ([38114bd](https://github.com/eggjs/tegg/commit/38114bd7ea3b46cc4a79556a005ef18b2ae11ec2))
* middleware decorator allow multi middleware function ([#46](https://github.com/eggjs/tegg/issues/46)) ([a4b55f7](https://github.com/eggjs/tegg/commit/a4b55f7065c3d78e2c98c4b05f01871f666542ef))
* multi host decorator ([#68](https://github.com/eggjs/tegg/issues/68)) ([f6679de](https://github.com/eggjs/tegg/commit/f6679de1495024ecb9182168843300aa91288508))
* standalone support context ([#65](https://github.com/eggjs/tegg/issues/65)) ([b35dc2d](https://github.com/eggjs/tegg/commit/b35dc2d40fff1331145abd3f04917dc64f80010b))
* support leoric hooks ([#41](https://github.com/eggjs/tegg/issues/41)) ([9ecdbd2](https://github.com/eggjs/tegg/commit/9ecdbd2fe434445c698cd2140ae97f76b6bb6ddf))





# [3.0.0](https://github.com/eggjs/tegg/compare/v3.0.0-alpha.0...v3.0.0) (2022-12-26)


### Features

* delete controller root hook ([bbb68f4](https://github.com/eggjs/tegg/commit/bbb68f43a1a9fcfd86c05581b10c56eeb77d4053))





# [3.0.0-alpha.0](https://github.com/eggjs/tegg/compare/v1.3.0...v3.0.0-alpha.0) (2022-12-22)


### Bug Fixes

* eventbus runtime should wait all handlers done ([#51](https://github.com/eggjs/tegg/issues/51)) ([0651d30](https://github.com/eggjs/tegg/commit/0651d300f9a18bd97299548f3ebccad1d0382d28))
* fix events type from any to keyof Events ([#54](https://github.com/eggjs/tegg/issues/54)) ([a2551b2](https://github.com/eggjs/tegg/commit/a2551b2d9f9eabf9ed5c87f83489615eefa3e6d1))
* fix file path for advice decorator ([#64](https://github.com/eggjs/tegg/issues/64)) ([d6aa091](https://github.com/eggjs/tegg/commit/d6aa091851b5d1ca63e7e56e081df4d15ab3284e))
* fix miss agent file ([0fa496b](https://github.com/eggjs/tegg/commit/0fa496bdbb4ffa4e911fffa3e176fa7bdf03fb12))
* fix miss agent file ([#56](https://github.com/eggjs/tegg/issues/56)) ([cfb4dcc](https://github.com/eggjs/tegg/commit/cfb4dcc006ee1253733c7122f885a05da94f80b5))
* fix mock prototype in aop not work ([#66](https://github.com/eggjs/tegg/issues/66)) ([16640eb](https://github.com/eggjs/tegg/commit/16640eb751405532b2a1241b17624ce3ac2d1c7a))
* fix rootProtoManager.registerRootProto ([f416ed7](https://github.com/eggjs/tegg/commit/f416ed70af1c46d31ebf712b208205d67337d958))
* fix schedule import ([1fb5481](https://github.com/eggjs/tegg/commit/1fb54816fb3240c641824c2bc2b464c35652b655))
* none exist node_modules path ([#59](https://github.com/eggjs/tegg/issues/59)) ([77cb068](https://github.com/eggjs/tegg/commit/77cb0687ba8e5d9f20a6df0548de9d55a8771c21))
* optimize backgroud output ([#47](https://github.com/eggjs/tegg/issues/47)) ([6d978c5](https://github.com/eggjs/tegg/commit/6d978c5d7c339c78a90b00d2c2622f0be85ab3ce))
* skip file not exits ([#62](https://github.com/eggjs/tegg/issues/62)) ([10e56d4](https://github.com/eggjs/tegg/commit/10e56d418f359efa5d8909541768082cf068d2a4))
* use getMetaData for ModelMetadataUtil ([#44](https://github.com/eggjs/tegg/issues/44)) ([87a306c](https://github.com/eggjs/tegg/commit/87a306c4fba51fd519a47c0caaa79442643ea107))
* use require.resolve instead path.join to resolve dependencies path ([#63](https://github.com/eggjs/tegg/issues/63)) ([d7f3beb](https://github.com/eggjs/tegg/commit/d7f3beb27a22b95bb54589c5988a68ce2484c089))


### Features

* add new module scan mode ([#58](https://github.com/eggjs/tegg/issues/58)) ([3be6c20](https://github.com/eggjs/tegg/commit/3be6c2047a0241a482aafd0aaa072f51f861b6ea))
* **break:** use async local storage ([#69](https://github.com/eggjs/tegg/issues/69)) ([772aeb9](https://github.com/eggjs/tegg/commit/772aeb9412c6d7cd23560230b441161ba28ffa0e))
* impl Host decorator ([#48](https://github.com/eggjs/tegg/issues/48)) ([65dc7a8](https://github.com/eggjs/tegg/commit/65dc7a899ba72dd0851c35046562766d7f2b71b6))
* impl Inject Model ([#43](https://github.com/eggjs/tegg/issues/43)) ([ced2ce2](https://github.com/eggjs/tegg/commit/ced2ce2134964dcb410410c0192a34f77507c42d))
* impl Schedule decorator ([#52](https://github.com/eggjs/tegg/issues/52)) ([7f95005](https://github.com/eggjs/tegg/commit/7f950050b548ca542addbd7b466675da4e81ce3f))
* implement cork/uncork for eventbus ([#60](https://github.com/eggjs/tegg/issues/60)) ([38114bd](https://github.com/eggjs/tegg/commit/38114bd7ea3b46cc4a79556a005ef18b2ae11ec2))
* middleware decorator allow multi middleware function ([#46](https://github.com/eggjs/tegg/issues/46)) ([a4b55f7](https://github.com/eggjs/tegg/commit/a4b55f7065c3d78e2c98c4b05f01871f666542ef))
* multi host decorator ([#68](https://github.com/eggjs/tegg/issues/68)) ([f6679de](https://github.com/eggjs/tegg/commit/f6679de1495024ecb9182168843300aa91288508))
* standalone support context ([#65](https://github.com/eggjs/tegg/issues/65)) ([b35dc2d](https://github.com/eggjs/tegg/commit/b35dc2d40fff1331145abd3f04917dc64f80010b))
* support leoric hooks ([#41](https://github.com/eggjs/tegg/issues/41)) ([9ecdbd2](https://github.com/eggjs/tegg/commit/9ecdbd2fe434445c698cd2140ae97f76b6bb6ddf))





# [1.3.0](https://github.com/eggjs/tegg/compare/v1.2.0...v1.3.0) (2022-07-01)


### Features

* allow inject proto and name ([#40](https://github.com/eggjs/tegg/issues/40)) ([abd1766](https://github.com/eggjs/tegg/commit/abd17665af2528c4c2e33f4c6b0fceddd8a4e76b))
* support leoric hooks ([#41](https://github.com/eggjs/tegg/issues/41)) ([9bdbc2c](https://github.com/eggjs/tegg/commit/9bdbc2cbe96df9f66f96b4f8e208883e99957946))





# [0.2.0](https://github.com/eggjs/tegg/compare/v0.1.19...v0.2.0) (2022-01-20)


### Bug Fixes

* invalid value of main ([#27](https://github.com/eggjs/tegg/issues/27)) ([47f22d6](https://github.com/eggjs/tegg/commit/47f22d60f7ab01cf3c0e68bd078cdd0bb75169d5))


### Features

* impl aop ([c53df00](https://github.com/eggjs/tegg/commit/c53df001d1455a0a105689694775d880541d9d2f))
