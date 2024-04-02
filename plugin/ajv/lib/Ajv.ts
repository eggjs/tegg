import Ajv2019, { type Schema } from 'ajv/dist/2019';
import addFormats from 'ajv-formats';
import keyWords from 'ajv-keywords';
import { type Ajv as IAjv, AjvInvalidParamError } from '@eggjs/tegg/ajv';
import { SingletonProto, AccessLevel, LifecycleInit } from '@eggjs/tegg';

@SingletonProto({
  accessLevel: AccessLevel.PUBLIC,
})
export class Ajv implements IAjv {
  static InvalidParamErrorClass = AjvInvalidParamError;

  #ajvInstance: Ajv2019;

  @LifecycleInit()
  protected _init() {
    this.#ajvInstance = new Ajv2019();
    keyWords(this.#ajvInstance, 'transform');
    addFormats(this.#ajvInstance, [
      'date-time',
      'time',
      'date',
      'email',
      'hostname',
      'ipv4',
      'ipv6',
      'uri',
      'uri-reference',
      'uuid',
      'uri-template',
      'json-pointer',
      'relative-json-pointer',
      'regex',
    ])
      .addKeyword('kind')
      .addKeyword('modifier');
  }

  /**
   * Validate data with typebox Schema.
   *
   * If validate fail, with throw `Ajv.InvalidParamErrorClass`
   */
  validate(schema: Schema, data: unknown): void {
    const result = this.#ajvInstance.validate(schema, data);
    if (!result) {
      throw new Ajv.InvalidParamErrorClass('Validation Failed', {
        errorData: data,
        currentSchema: JSON.stringify(schema),
        errors: this.#ajvInstance.errors!,
      });
    }
  }
}
