# `@eggjs/tegg-orm-decorator`

## Install

```shell
npm i --save @eggjs/tegg-orm-decorator
```

## Define Model

```ts
import { Model, Attribute } from '@eggjs/tegg-orm-decorator';
import { DataTypes, Bone } from 'leoric';

@Model()
export class App extends Bone {
  @Attribute(DataTypes.STRING)
  name: string;
  @Attribute(DataTypes.STRING)
  desc: string;
}
```

## Use Model

```ts
import { SingletonProto, Inject } from '@eggjs/tegg';
import { App } from './model/App';

@SingletonProto()
export class AppService {
  @Inject()
  App: typeof App;

  async createApp(data: {
    name: string;
    desc: string;
  }): Promise<App> {
    const bone = await this.App.create(data as any);
    return bone as App;
  }

  async findApp(name: string): Promise<App | null> {
    const app = await this.App.findOne({ name });
    return app as App;
  }
}

```
