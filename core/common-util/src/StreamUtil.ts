import { Stream } from 'node:stream';

export class StreamUtil {
  static isStream(obj: any): boolean {
    return obj instanceof Stream;
  }

  static untilEnd(stream: Stream, callback: () => void): void {
    if (!this.isStream(stream)) {
      throw new Error('Invalid stream object');
    }

    if ((stream as any).destroyed) {
      callback();
      return;
    }

    const handleEnd = () => {
      stream.removeListener('end', handleEnd);
      stream.removeListener('error', handleEnd);
      stream.removeListener('close', handleEnd);
      callback();
    };

    stream.on('end', handleEnd);
    stream.on('error', handleEnd);
    stream.on('close', handleEnd);
  }
}
