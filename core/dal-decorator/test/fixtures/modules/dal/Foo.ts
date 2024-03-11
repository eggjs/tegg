import { Table, Index, Column, ColumnType, IndexType } from '../../../..';

@Table({
  comment: 'foo table',
})
@Index({
  keys: [ 'name' ],
  type: IndexType.UNIQUE,
})
export class Foo {
  @Column({
    type: ColumnType.INT,
  }, {
    primaryKey: true,
  })
  id: number;

  @Column({
    type: ColumnType.VARCHAR,
    length: 100,
  })
  name: string;
}
