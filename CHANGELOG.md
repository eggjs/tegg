# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

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
