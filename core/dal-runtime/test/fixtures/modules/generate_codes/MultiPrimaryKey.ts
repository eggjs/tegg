import { Column, ColumnType, Index, IndexType, Table } from '@eggjs/dal-decorator';

@Table({
  name: 'multi_primary_key_table',
  comment: 'multi primary key table',
})
@Index({
  name: 'pk_id1_id2',
  type: IndexType.PRIMARY,
  keys: ['id1', 'id2'],
})
export class MultiPrimaryKey {
  @Column({
    type: ColumnType.INT,
  }, {
    autoIncrement: true,
    comment: 'the primary key',
  })
  id1: number;

  @Column({
    type: ColumnType.INT,
  }, {
    comment: 'the primary key',
  })
  id2: number;

  @Column({
    type: ColumnType.VARCHAR,
    length: 100,
  }, {
    uniqueKey: true,
  })
  name: string;

}
