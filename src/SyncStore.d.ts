import React, { type ReactNode } from "react";
import { type StateCreator, type StoreApi } from "zustand";
import { type PersistOptions } from "zustand/middleware";
export type SyncStoreReturn<TState, TProps> = {
    Provider: (props: {
        children: ReactNode;
    } & {
        firstSyncProps?: string[];
        persist?: PersistOptions<Partial<TProps & TState>>;
    } & TProps) => React.ReactNode;
    useStore: {
        (): LocalUseStore<TState, TProps>;
        <U>(selector: (state: LocalUseStore<TState, TProps>) => U, equalityFn?: (a: U, b: U) => boolean): U;
    };
};
type CreateContextUseStore<TState> = {
    (): TState;
    <U>(selector: (state: TState) => U, equalityFn?: (a: U, b: U) => boolean): U;
};
type LocalUseStore<TState, TProps> = {
    $sync?: (props: TProps) => void;
} & TState;
export declare function createSyncStore<TState, TProps>(createState?: StateCreator<TState>, useValue?: (props: {
    useStore: CreateContextUseStore<LocalUseStore<TState, TProps>>;
    useStoreApi: StoreApi<LocalUseStore<TState, TProps>>;
} & TProps) => unknown): SyncStoreReturn<TState, TProps>;
export default createSyncStore;
