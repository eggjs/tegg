import { PropagationType } from '../Common';

export interface TransactionMetadata {
  propagation: PropagationType;
  method: PropertyKey;
}
