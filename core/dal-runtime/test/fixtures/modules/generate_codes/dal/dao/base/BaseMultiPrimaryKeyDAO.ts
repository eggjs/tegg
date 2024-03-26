import type { InsertResult, UpdateResult, DeleteResult } from '@eggjs/dal-decorator';
import { SingletonProto, AccessLevel, Inject } from '@eggjs/tegg';
import { DataSource, DataSourceInjectName, DataSourceQualifier, ColumnTsType } from '@eggjs/dal-decorator';
import { MultiPrimaryKey } from '../../../MultiPrimaryKey';

type Optional<T, K extends keyof T> = Omit < T, K > & Partial<T> ;
/**
 * 自动生成的 MultiPrimaryKeyDAO 基类
 * @class BaseMultiPrimaryKeyDAO
 * @classdesc 该文件由 @eggjs/tegg 自动生成，请**不要**修改它！
 */
/* istanbul ignore next */
@SingletonProto({
  accessLevel: AccessLevel.PUBLIC,
})
export class BaseMultiPrimaryKeyDAO {
  static clazzModel = MultiPrimaryKey;
  @Inject({
    name: DataSourceInjectName,
  })
  @DataSourceQualifier('dal.default.MultiPrimaryKey')
  protected readonly dataSource: DataSource<MultiPrimaryKey> ;

  public async insert(raw: Optional<MultiPrimaryKey, 'id1' | 'id2'> ): Promise<InsertResult> {
    const data: Record<string, any> = {};
    let tmp;

    tmp = raw.id1;
    if (tmp !== undefined) {
      data.$id1 = tmp;
    }

    tmp = raw.id2;
    if (tmp !== undefined) {
      data.$id2 = tmp;
    }

    tmp = raw.name;
    if (tmp !== undefined) {
      data.$name = tmp;
    }

    return this.dataSource.executeRawScalar('insert', data);
  }

  public async update(primary: {
    id1: ColumnTsType['INT'],
    id2: ColumnTsType['INT']
  }, data: Partial<MultiPrimaryKey> ): Promise<UpdateResult> {

    const newData: Record<string, any> = {
      primary,
    };
    let tmp;

    tmp = data.id1;
    if (tmp !== undefined) {
      newData.$id1 = tmp;
    }

    tmp = data.id2;
    if (tmp !== undefined) {
      newData.$id2 = tmp;
    }

    tmp = data.name;
    if (tmp !== undefined) {
      newData.$name = tmp;
    }

    return this.dataSource.executeRawScalar('update', newData);
  }

  public async delete(primary: {
    id1: ColumnTsType['INT'],
    id2: ColumnTsType['INT']
  }): Promise<DeleteResult> {
    return this.dataSource.executeRawScalar('delete', primary);
  }

  public async del(primary: {
    id1: ColumnTsType['INT'],
    id2: ColumnTsType['INT']
  }): Promise<DeleteResult> {
    return this.dataSource.executeRawScalar('delete', primary);
  }

  public async findByPrimary($id1: ColumnTsType['INT'], $id2: ColumnTsType['INT']): Promise<MultiPrimaryKey | null> {
    return this.dataSource.executeScalar('findByPrimary', {
      $id1,
      $id2,
    });
  }
}
