CREATE TABLE IF NOT EXISTS multi_primary_key_table (
  id_1 INT NOT NULL AUTO_INCREMENT COMMENT 'the primary key',
  id_2 INT NOT NULL COMMENT 'the primary key',
  name VARCHAR(100) NOT NULL UNIQUE KEY,
  PRIMARY KEY pk_id1_id2 (id_1,id_2)
) COMMENT='multi primary key table';