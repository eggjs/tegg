import { Readable, Writable, Stream, Transform } from 'node:stream';
import { EventEmitter } from 'node:events';

export class StreamUtil {
  /**
   * 判断对象是否是基本的 stream
   */
  static isStream(obj: any): boolean {
    return obj !== null &&
      typeof obj === 'object' &&
      typeof obj.pipe === 'function' &&
      typeof obj.on === 'function' &&
      obj instanceof EventEmitter;
  }

  /**
   * 判断是否是可读流
   */
  static isReadableStream(obj: any): boolean {
    return this.isStream(obj) &&
      typeof (obj as Readable).read === 'function' &&
      typeof (obj as Readable).readable === 'boolean';
  }

  /**
   * 判断是否是可写流
   */
  static isWritableStream(obj: any): boolean {
    return this.isStream(obj) &&
      typeof (obj as Writable).write === 'function' &&
      typeof (obj as Writable).writable === 'boolean';
  }

  /**
   * 判断是否是双工流
   */
  static isDuplexStream(obj: any): boolean {
    return this.isStream(obj) &&
      this.isReadableStream(obj) &&
      this.isWritableStream(obj);
  }

  /**
   * 判断是否是转换流
   */
  static isTransformStream(obj: any): boolean {
    return this.isStream(obj) &&
      this.isDuplexStream(obj) &&
      typeof (obj as Transform)._transform === 'function';
  }

  /**
   * 安全地处理 stream 错误
   */
  static handleStreamError(stream: Stream, errorHandler?: (error: Error) => void): void {
    if (!this.isStream(stream)) {
      throw new Error('Invalid stream object');
    }

    const handler = errorHandler || ((error: Error) => {
      console.error('Stream error:', error);
    });

    stream.on('error', handler);
  }

  /**
   * 安全地销毁 stream
   */
  static destroyStream(stream: Stream, error?: Error): void {
    if (!this.isStream(stream)) {
      throw new Error('Invalid stream object');
    }

    if (!(stream as any).destroyed) {
      (stream as any).destroy(error);
    }
  }

  /**
   * 安全地结束可写流
   */
  static endStream(stream: Writable, chunk?: any, encoding?: BufferEncoding): Promise<void> {
    if (!this.isWritableStream(stream)) {
      throw new Error('Invalid writable stream');
    }

    return new Promise((resolve, reject) => {
      if ((stream as any).destroyed) {
        resolve();
        return;
      }

      const handleError = (error: Error) => {
        stream.removeListener('finish', handleFinish);
        reject(error);
      };

      const handleFinish = () => {
        stream.removeListener('error', handleError);
        resolve();
      };

      stream.once('error', handleError);
      stream.once('finish', handleFinish);

      if (chunk !== undefined) {
        if (encoding) {
          stream.end(chunk, encoding);
        } else {
          stream.end(chunk);
        }
      } else {
        stream.end();
      }
    });
  }

  /**
   * 等待流结束
   * @param stream 要监听的流
   * @param callback 流结束时的回调函数
   */
  static untilEnd(stream: Stream, callback: () => void): void {
    if (!this.isStream(stream)) {
      throw new Error('Invalid stream object');
    }

    // 如果流已经被销毁，直接调用回调
    if ((stream as any).destroyed) {
      callback();
      return;
    }

    const handleEnd = () => {
      console.log('handle end');
      stream.removeListener('end', handleEnd);
      stream.removeListener('error', handleEnd);
      stream.removeListener('close', handleEnd);
      callback();
    };

    // 添加事件监听器
    stream.on('end', handleEnd);
    stream.on('error', handleEnd);
    stream.on('close', handleEnd);
  }
}
