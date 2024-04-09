export interface AttributeOptions {
  // field name, default is property name
  name?: string;
  // allow null, default is true
  allowNull?: boolean;
  // auto increment, default is false
  autoIncrement?: boolean;
  // primary field, default is false
  primary?: boolean;
  // unique field, default is false
  unique?: boolean;
}

export interface IndexOptions {
  unique?: boolean;
  primary?: boolean;
  name?: string;
}

export interface ModelParams {
  tableName?: string;
  dataSource?: string;
}

export const MODEL_PROTO_IMPL_TYPE = 'MODEL_PROTO';
