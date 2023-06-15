import { ILogger } from '@ts-libs/log';

interface TPeriodicOptions {
  logger?: ILogger;
  runOnStart?: boolean;
  onerror?: (e: any) => void;
}

export class Periodic implements TPeriodicOptions {
  logger?: ILogger;
  runOnStart?: boolean;
  onerror?: (e: any) => void;
  constructor(
    readonly runnable: () => unknown,
    public interval: number,
    options?: TPeriodicOptions
  ) {
    Object.assign(this, options);
  }
  get isRunning() {
    return this._running;
  }
  async start() {
    await Promise.resolve(this._pending);
    if (this._running) await this.reset();
    else {
      this._running = true;
      if (this.runOnStart) await this.run();
      else await this.reset();
    }
  }
  async stop() {
    this._running = false;
    clearTimeout(this._timeoutHandle);
    await this.whenComplete();
  }
  suspend(duration: number) {
    clearTimeout(this._timeoutHandle);
    // allows suspend to be called from within runnable
    setImmediate(() =>
      this.startTimer(duration).catch((e) => this.logger?.warn(e, 'suspend'))
    );
  }
  async reset() {
    if (!this._running) return;
    clearTimeout(this._timeoutHandle);
    await this.startTimer();
  }
  private async run() {
    clearTimeout(this._timeoutHandle);
    if (this._running) {
      this._pending = (async () => {
        try {
          await Promise.resolve(this.runnable());
        } catch (e) {
          this.onerror?.(e);
          this.logger?.warn(e);
        } finally {
          this._pending = undefined;
        }
      })();
    }
    await this.startTimer();
  }
  private async startTimer(timeout?: number) {
    await this.whenComplete();
    if (this._running)
      this._timeoutHandle = setTimeout(
        () => this.run(),
        timeout || this.interval
      );
  }
  private async whenComplete() {
    if (this._pending)
      // this will never throw, see run()
      await Promise.resolve(this._pending);
  }
  private _running = false;
  private _pending?: Promise<void>;
  private _timeoutHandle?: ReturnType<typeof setTimeout>;
}
