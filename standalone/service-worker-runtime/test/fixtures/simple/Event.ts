export class CustomEvent extends Event {
  readonly data: any;

  constructor(type: 'custom', data: any) {
    super(type);
    this.data = data;
  }
}
