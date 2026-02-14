/* eslint-disable @typescript-eslint/ban-ts-comment */
import React, {
  createContext,
  type ReactNode,
  useContext,
  useLayoutEffect,
  useRef,
} from "react";
import {
  createStore as createZustandStore,
  type StateCreator,
  type StoreApi,
} from "zustand";
import { persist, type PersistOptions } from "zustand/middleware";
import { useShallow } from "zustand/react/shallow";
import { useStoreWithEqualityFn } from "zustand/traditional";

// Consumer-facing state type: TState + TProps, no $sync
type LocalUseStore<TState, TProps> = TState & TProps;

// Internal state type with $sync included
type InternalStoreState<TState, TProps> = TState & TProps & {
  $sync: (props: TProps) => void;
};

type CreateContextUseStore<TState> = {
  (): TState;
  <U>(selector: (state: TState) => U, equalityFn?: (a: U, b: U) => boolean): U;
};

export type SyncStoreReturn<TState, TProps> = {
  Provider: (
    props: {
      children: ReactNode;
    } & {
      firstSyncProps?: string[];
      persist?: PersistOptions<Partial<TProps & TState>>;
    } & TProps
  ) => React.ReactNode;
  useStore: {
    (): LocalUseStore<TState, TProps>;
    <U>(
      selector: (state: LocalUseStore<TState, TProps>) => U,
      equalityFn?: (a: U, b: U) => boolean
    ): U;
  };
};

export function createSyncStore<TState, TProps>(
  createState?: StateCreator<TState>,
  useValue?: (
    props: {
      useStore: CreateContextUseStore<LocalUseStore<TState, TProps>>;
      useStoreApi: StoreApi<InternalStoreState<TState, TProps>>;
    } & TProps
  ) => unknown
): SyncStoreReturn<TState, TProps> {
  const StoreContext = createContext<null | StoreApi<
    InternalStoreState<TState, TProps>
  >>(null);

  function useStoreInternal(): InternalStoreState<TState, TProps>;
  function useStoreInternal<U>(
    selector: (state: InternalStoreState<TState, TProps>) => U,
    equalityFn?: (a: U, b: U) => boolean
  ): U;
  function useStoreInternal<U>(
    selector?: (state: InternalStoreState<TState, TProps>) => U,
    equalityFn?: (a: U, b: U) => boolean
  ) {
    const store = useContext(StoreContext);
    if (!store) {
      throw new Error("Missing StoreProvider");
    }
    // @ts-ignore - useShallow type narrowing with conditional selector
    const shallowSelector = useShallow(
      selector ?? ((state: InternalStoreState<TState, TProps>) => state as unknown as U)
    );
    // @ts-ignore
    return useStoreWithEqualityFn(store, shallowSelector, equalityFn);
  }

  // Consumer-facing useStore that omits $sync from the return type
  function useStore(): LocalUseStore<TState, TProps>;
  function useStore<U>(
    selector: (state: LocalUseStore<TState, TProps>) => U,
    equalityFn?: (a: U, b: U) => boolean
  ): U;
  function useStore<U>(
    selector?: (state: LocalUseStore<TState, TProps>) => U,
    equalityFn?: (a: U, b: U) => boolean
  ) {
    // @ts-ignore - internal state includes $sync but consumer type does not
    return useStoreInternal(selector, equalityFn);
  }

  function shallowChanged(
    prev: Record<string, unknown> | null,
    next: Record<string, unknown>
  ): boolean {
    if (!prev) return true;
    const keys = Object.keys(next);
    if (keys.length !== Object.keys(prev).length) return true;
    for (const key of keys) {
      const nextVal = next[key];
      const prevVal = prev[key];
      if (React.isValidElement(nextVal) || React.isValidElement(prevVal)) {
        if (!React.isValidElement(nextVal) || !React.isValidElement(prevVal)) return true;
        if (nextVal.type !== prevVal.type || nextVal.key !== prevVal.key) return true;
      } else if (!Object.is(prevVal, nextVal)) {
        return true;
      }
    }
    return false;
  }

  // Extracted useValue hook into its own component to avoid conditional hooks
  const UseValueHook = ({
    $sync,
    others,
    storeApi,
  }: {
    $sync: ((props: TProps) => void) | undefined;
    others: TProps;
    storeApi: StoreApi<InternalStoreState<TState, TProps>> | null;
  }) => {
    const prevReturnedRef = useRef<unknown>(null);

    // @ts-ignore
    const returned = useValue!({
      ...others,
      useStore,
      useStoreApi: storeApi,
    });

    useLayoutEffect(() => {
      if (
        returned &&
        typeof returned === "object" &&
        shallowChanged(prevReturnedRef.current as Record<string, unknown> | null, returned as Record<string, unknown>)
      ) {
        prevReturnedRef.current = returned;
        $sync?.(returned as TProps);
      }
    });

    return null;
  };

  const Hook = ({
    firstSyncProps,
    ...others
  }: {
    firstSyncProps: string[];
  } & TProps) => {
    const syncedProps = useRef(false);
    const prevPropsRef = useRef<Record<string, unknown> | null>(null);

    const { $sync } = useStoreInternal((state) => ({ $sync: state.$sync }));
    const storeApi = useContext<null | StoreApi<InternalStoreState<TState, TProps>>>(
      StoreContext
    );

    // #7: Don't mutate `others` — create a filtered copy
    let propsToSync: Record<string, unknown> = others as Record<string, unknown>;
    if (firstSyncProps && syncedProps.current) {
      const filteredProps = { ...others } as Record<string, unknown>;
      for (const key of firstSyncProps) {
        delete filteredProps[key];
      }
      propsToSync = filteredProps;
    }

    const propsChanged = shallowChanged(prevPropsRef.current, propsToSync);

    useLayoutEffect(() => {
      if (propsChanged) {
        prevPropsRef.current = propsToSync;
        $sync(propsToSync as TProps);
        syncedProps.current = true;
      }
    });

    // #5: Conditionally render UseValueHook component instead of conditional hooks
    return useValue ? (
      <UseValueHook $sync={$sync} others={others as TProps} storeApi={storeApi} />
    ) : null;
  };

  createState = createState || (() => ({}) as TState);

  const StoreProvider = (
    props: {
      children: ReactNode;
    } & {
      firstSyncProps?: string[];
      persist?: PersistOptions<Partial<TProps & TState>>;
    } & TProps
  ) => {
    const storeRef = useRef<StoreApi<InternalStoreState<TState, TProps>>>(null);

    // #2: Destructure known keys directly instead of Object.fromEntries per render
    const {
      children,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      persist: persistOptions,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      firstSyncProps,
      ...syncProps
    } = props;

    if (!storeRef.current) {
      // #3: Deduplicated store initializer
      // @ts-ignore
      const initializer = (set, get, api) => ({
        // @ts-ignore
        ...createState?.(set, get, api),
        ...(syncProps as TProps),
        $sync: (props: TProps) => set((state: InternalStoreState<TState, TProps>) => ({ ...state, ...props })),
      });

      if (props?.persist) {
        storeRef.current = createZustandStore<InternalStoreState<TState, TProps>>(
          // @ts-ignore
          persist(initializer, { ...props.persist })
        );
      } else {
        storeRef.current = createZustandStore<InternalStoreState<TState, TProps>>(
          // @ts-ignore
          initializer
        );
      }
    }

    return (
      <StoreContext.Provider value={storeRef.current}>
        {/* @ts-ignore*/}
        <Hook {...(syncProps as TProps)} firstSyncProps={props.firstSyncProps} />
        {children}
      </StoreContext.Provider>
    );
  };

  return {
    Provider: StoreProvider,
    useStore,
  };
}

export default createSyncStore;
