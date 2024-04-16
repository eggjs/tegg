import { TableModel } from '@eggjs/tegg/dal';

export class TableModelInstanceBuilder {
  constructor(tableModel: TableModel, row: Record<string, any>) {
    for (const [ key, value ] of Object.entries(row)) {
      const column = tableModel.columns.find(t => t.columnName === key);
      Reflect.set(this, column?.propertyName ?? key, value);
    }
  }

  static buildInstance<T>(tableModel: TableModel<T>, row: Record<string, any>) {
    return Reflect.construct(TableModelInstanceBuilder, [ tableModel, row ], tableModel.clazz);
  }

  static buildRow<T extends object>(instance: T, tableModel: TableModel<T>) {
    const result: any = {};
    for (const column of tableModel.columns) {
      const columnValue = Reflect.get(instance, column.propertyName);
      if (typeof columnValue !== 'undefined') {
        result[`$${column.propertyName}`] = columnValue;
      }
    }
    return result;
  }
}
