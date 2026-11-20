# `@eggjs/tegg-plugin`

## Configuration

TEgg keeps synchronous module file loading and evaluation by default.
Applications can opt in to cooperative asynchronous loading during `didLoad`:

```ts
config.tegg = {
  asyncLoad: true,
  asyncLoadYieldIntervalMs: 50,
};
```

`asyncLoadYieldIntervalMs` controls how much time top-level file `require` calls
within each TEgg module may cumulatively consume before TEgg yields to the event
loop. The timer is reset for each module and defaults to 50ms. A single
`require`, including its transitive imports, cannot be interrupted midway.

## Usage

Please read [../../README.md](../..)
