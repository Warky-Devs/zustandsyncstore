
import {decycle} from '@warkypublic/artemis-kit/object'
import React, { createContext, type ReactNode, useContext, useLayoutEffect, useRef } from 'react';
import { createStore as createZustandStore, type StateCreator, type StoreApi } from 'zustand';
import { persist, type PersistOptions } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import { useStoreWithEqualityFn } from 'zustand/traditional';

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

type CreateContextUseStore<TState> = {
  (): TState;
  <U>(selector: (state: TState) => U, equalityFn?: (a: U, b: U) => boolean): U;
};

type LocalUseStore<TState, TProps> = {
  $sync?: (props: TProps) => void;
} & TState;

export function createSyncStore<TState, TProps>(
  createState?: StateCreator<TState>,
  useValue?: (
    props: {
      useStore: CreateContextUseStore<LocalUseStore<TState, TProps>>;
      useStoreApi: StoreApi<LocalUseStore<TState, TProps>>;
    } & TProps
  ) => any
): SyncStoreReturn<TState, TProps> {
  const StoreContext = createContext<null | StoreApi<LocalUseStore<TState, TProps>>>(null);

  function useStore(): LocalUseStore<TState, TProps>;
  function useStore<U>(
    selector: (state: LocalUseStore<TState, TProps>) => U,
    equalityFn?: (a: U, b: U) => boolean
  ): U;
  function useStore<U>(
    selector?: (state: LocalUseStore<TState, TProps>) => U,
    equalityFn?: (a: U, b: U) => boolean
  ) {
    const store = useContext(StoreContext);
    if (!store) {
      throw new Error('Missing StoreProvider');
    }
    return useStoreWithEqualityFn(
      store,
      selector ? useShallow(selector) : (state) => state as unknown as U,
      equalityFn
    );
  }

  const Hook = ({
    firstSyncProps,
    ...others
  }: {
    firstSyncProps: string[];
  } & TProps) => {
    const syncedProps = useRef(false);

    const { $sync } = useStore((state) => ({ $sync: state.$sync }));
    const storeApi = useContext<null | StoreApi<LocalUseStore<TState, TProps>>>(StoreContext);

    if (firstSyncProps) {
      for (const key of firstSyncProps) {
        if (syncedProps.current) {
          //@ts-ignore
          delete others[key];
        }
      }
    }

    useLayoutEffect(
      () => {
        //@ts-ignore
        $sync?.(others);
        //method was actually called
        if ($sync) {
          syncedProps.current = true;
        }
      },
      [JSON.stringify(decycle(others ?? {}))]
    );

    if (useValue) {
      // @ts-ignore
      const returned = useValue({
        ...others,
        useStore,
        useStoreApi: storeApi
      });

      useLayoutEffect(() => {
        if (returned && typeof returned === 'object') {$sync?.(returned);}
      }, [returned]);
    }

    return null;
  };

  // eslint-disable-next-line no-param-reassign
  createState = createState || (() => ({}) as TState);

  const StoreProvider = (
    props: {
      children: ReactNode;
    } & {
      firstSyncProps?: string[];
      persist?: PersistOptions<Partial<TProps & TState>>;
    } & TProps
  ) => {
    const storeRef = useRef<StoreApi<LocalUseStore<TState, TProps>>>(null);

    const { children, ...propsWithoutChildren } = props;

    if (!storeRef.current) {
      if (props?.persist) {
        storeRef.current = createZustandStore<LocalUseStore<TState, TProps>>(
          //@ts-ignore
          persist(
            //@ts-ignore
            (set, get, api) => ({
              //@ts-ignore
              ...createState?.(set, get, api),
              $sync: (props: TProps) => set((state) => ({ ...state, ...props }))
            }),
            { ...props?.persist }
          )
        );
      } else {
        storeRef.current = createZustandStore<LocalUseStore<TState, TProps>>(
          // @ts-ignore
          (set, get, api) => ({
            ...createState?.(set, get, api),
            $sync: (props: TProps) => set((state) => ({ ...state, ...props }))
          })
        );
      }
    }

    return (
      <StoreContext.Provider value={storeRef.current}>
        {/* @ts-ignore*/}
        <Hook {...propsWithoutChildren} firstSyncProps={props.firstSyncProps} />
        {children}
      </StoreContext.Provider>
    );
  };

  return {
    Provider: StoreProvider,
    useStore
  };
}

export default createSyncStore;
