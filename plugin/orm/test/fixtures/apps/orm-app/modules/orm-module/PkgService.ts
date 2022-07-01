import { ContextProto } from '@eggjs/tegg';
import { Pkg } from './model/Pkg';

@ContextProto()
export class PkgService {
  // TODO impl inject Bone for context
  Pkg: typeof Pkg = Pkg;

  async createPkg(data: {
    name: string;
    desc: string;
  }): Promise<Pkg> {
    const bone = await this.Pkg.create(data as any);
    return bone as Pkg;
  }

  async findPkg(name: string): Promise<Pkg | null> {
    const app = await this.Pkg.findOne({ name });
    return app as Pkg;
  }
}
