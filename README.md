# ZustandSyncStore

A React library that provides synchronized Zustand stores with prop-based state management and persistence support.

## Features

- **Prop Synchronization**: Automatically sync React props with Zustand store state
- **Context-based**: Provides a Provider/Consumer pattern for scoped store access
- **Persistence**: Built-in support for state persistence via Zustand middleware
- **TypeScript**: Full TypeScript support with type inference
- **Selective Sync**: Control which props are synced and when

## Installation

```bash
npm install @warkypublic/zustandsyncstore
```

### Peer Dependencies

This package requires the following peer dependencies:

```bash
npm install react zustand use-sync-external-store
```

## Basic Usage

```tsx
import { createSyncStore } from '@warkypublic/zustandsyncstore';

// Define your state type
interface MyState {
  count: number;
  increment: () => void;
}

// Define your props type
interface MyProps {
  initialCount: number;
}

// Create the synchronized store
const { Provider, useStore } = createSyncStore<MyState, MyProps>(
  (set) => ({
    count: 0,
    increment: () => set((state) => ({ count: state.count + 1 })),
  })
);

// Component that uses the store
function Counter() {
  const { count, increment } = useStore();
  
  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={increment}>Increment</button>
    </div>
  );
}

// App component with Provider
function App() {
  return (
    <Provider initialCount={10}>
      <Counter />
    </Provider>
  );
}
```

## Advanced Usage

### With Custom Hook Logic

```tsx
const { Provider, useStore } = createSyncStore<MyState, MyProps>(
  (set) => ({
    count: 0,
    increment: () => set((state) => ({ count: state.count + 1 })),
  }),
  ({ useStore, useStoreApi, initialCount }) => {
    // Custom hook logic here
    const currentCount = useStore(state => state.count);
    
    // Return additional props to sync
    return {
      computedValue: initialCount * 2
    };
  }
);
```

### With Persistence

```tsx
function App() {
  return (
    <Provider 
      initialCount={10}
      persist={{
        name: 'my-store',
        storage: localStorage,
      }}
    >
      <Counter />
    </Provider>
  );
}
```

### Selective Prop Syncing

```tsx
function App() {
  return (
    <Provider 
      initialCount={10}
      otherProp="value"
      firstSyncProps={['initialCount']} // Only sync these props initially
    >
      <Counter />
    </Provider>
  );
}
```

## API Reference

### `createSyncStore<TState, TProps>(createState?, useValue?)`

Creates a synchronized Zustand store.

**Parameters:**
- `createState` (optional): Zustand state creator function
- `useValue` (optional): Custom hook function that receives props and store access

**Returns:**
- `Provider`: React component that provides the store context
- `useStore`: Hook to access the store state

### Provider Props

- `children`: React children
- `firstSyncProps` (optional): Array of prop names to sync only on first render
- `persist` (optional): Zustand persist options
- `...TProps`: Your custom props that will be synced with the store

### useStore Hook

Can be used with or without a selector:

```tsx
// Get entire state
const state = useStore();

// With selector
const count = useStore(state => state.count);

// With equality function
const count = useStore(state => state.count, (a, b) => a === b);
```

## TypeScript Support

The library is fully typed and provides type inference for your state and props:

```tsx
interface State {
  value: string;
}

interface Props {
  defaultValue: string;
}

const { Provider, useStore } = createSyncStore<State, Props>(...);

// TypeScript will infer the correct types
const { value } = useStore(); // value is string
```

## Development

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Build for production
pnpm build

# Run linting
pnpm lint

# Run type checking
pnpm typecheck
```

## License

MIT