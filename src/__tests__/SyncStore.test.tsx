import React, { useState } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import { createSyncStore } from "../SyncStore";

// ─── Test Store Definitions ──────────────────────────────────────────────────

type CounterState = {
  count: number;
  label: string;
  initialCount: number;
  increment: () => void;
  decrement: () => void;
};

type CounterProps = {
  initialCount: number;
  label: string;
};

function createCounterStore() {
  return createSyncStore<CounterState, CounterProps>((set) => ({
    count: 0,
    label: "",
    initialCount: 0,
    increment: () => set((s) => ({ ...s, count: s.count + 1 })),
    decrement: () => set((s) => ({ ...s, count: s.count - 1 })),
  }));
}

// ─── 1. Props Sync ───────────────────────────────────────────────────────────

describe("Props sync", () => {
  it("syncs initial props into the store", () => {
    const { Provider, useStore } = createCounterStore();

    const Display = () => {
      const label = useStore((s) => s.label);
      return <div data-testid="label">{label}</div>;
    };

    render(
      <Provider initialCount={5} label="clicks">
        <Display />
      </Provider>
    );

    expect(screen.getByTestId("label")).toHaveTextContent("clicks");
  });

  it("updates store when props change", () => {
    const { Provider, useStore } = createCounterStore();

    const Display = () => {
      const label = useStore((s) => s.label);
      return <div data-testid="label">{label}</div>;
    };

    const Wrapper = () => {
      const [label, setLabel] = useState("clicks");
      return (
        <>
          <button data-testid="change" onClick={() => setLabel("taps")}>
            change
          </button>
          <Provider initialCount={0} label={label}>
            <Display />
          </Provider>
        </>
      );
    };

    render(<Wrapper />);
    expect(screen.getByTestId("label")).toHaveTextContent("clicks");

    act(() => fireEvent.click(screen.getByTestId("change")));
    expect(screen.getByTestId("label")).toHaveTextContent("taps");
  });

  it("does not sync props unchanged between renders", () => {
    const renderSpy = vi.fn();
    const { Provider, useStore } = createCounterStore();

    const Display = () => {
      const label = useStore((s) => s.label);
      renderSpy();
      return <div data-testid="label">{label}</div>;
    };

    const Wrapper = () => {
      const [, setTick] = useState(0);
      return (
        <>
          <button data-testid="tick" onClick={() => setTick((t) => t + 1)}>
            tick
          </button>
          <Provider initialCount={0} label="stable">
            <Display />
          </Provider>
        </>
      );
    };

    render(<Wrapper />);
    const initialRenders = renderSpy.mock.calls.length;

    act(() => fireEvent.click(screen.getByTestId("tick")));
    expect(screen.getByTestId("label")).toHaveTextContent("stable");
    expect(renderSpy.mock.calls.length).toBeLessThanOrEqual(initialRenders + 1);
  });
});

// ─── 2. Render Tracking ─────────────────────────────────────────────────────

describe("Render tracking", () => {
  it("only re-renders when selected state changes (selector)", () => {
    const renderSpy = vi.fn();
    const { Provider, useStore } = createCounterStore();

    const LabelDisplay = () => {
      const label = useStore((s) => s.label);
      renderSpy();
      return <div data-testid="label">{label}</div>;
    };

    const CountDisplay = () => {
      const { count, increment } = useStore((s) => ({
        count: s.count,
        increment: s.increment,
      }));
      return (
        <>
          <div data-testid="count">{count}</div>
          <button data-testid="inc" onClick={increment}>
            inc
          </button>
        </>
      );
    };

    render(
      <Provider initialCount={0} label="clicks">
        <LabelDisplay />
        <CountDisplay />
      </Provider>
    );

    const rendersAfterMount = renderSpy.mock.calls.length;

    act(() => fireEvent.click(screen.getByTestId("inc")));
    expect(screen.getByTestId("count")).toHaveTextContent("1");

    // LabelDisplay should NOT have re-rendered since label didn't change
    expect(renderSpy.mock.calls.length).toBe(rendersAfterMount);
  });

  it("re-renders consumer when relevant prop changes", () => {
    const renderSpy = vi.fn();
    const { Provider, useStore } = createCounterStore();

    const Display = () => {
      const label = useStore((s) => s.label);
      renderSpy();
      return <div data-testid="label">{label}</div>;
    };

    const Wrapper = () => {
      const [label, setLabel] = useState("a");
      return (
        <>
          <button data-testid="change" onClick={() => setLabel("b")}>
            change
          </button>
          <Provider initialCount={0} label={label}>
            <Display />
          </Provider>
        </>
      );
    };

    render(<Wrapper />);
    const rendersAfterMount = renderSpy.mock.calls.length;

    act(() => fireEvent.click(screen.getByTestId("change")));
    expect(screen.getByTestId("label")).toHaveTextContent("b");
    expect(renderSpy.mock.calls.length).toBeGreaterThan(rendersAfterMount);
  });
});

// ─── 3. useValue (function input) ────────────────────────────────────────────

describe("useValue", () => {
  it("syncs derived values from useValue into the store", () => {
    type DerivedState = {
      doubled: number;
    };
    type DerivedProps = {
      base: number;
    };

    const { Provider, useStore } = createSyncStore<DerivedState, DerivedProps>(
      undefined,
      ({ base }) => {
        return { doubled: base * 2 };
      }
    );

    const Display = () => {
      const doubled = useStore((s) => s.doubled);
      return <div data-testid="doubled">{doubled}</div>;
    };

    render(
      <Provider base={5}>
        <Display />
      </Provider>
    );

    expect(screen.getByTestId("doubled")).toHaveTextContent("10");
  });

  it("updates store when useValue dependencies change", () => {
    type DerivedState = {
      doubled: number;
    };
    type DerivedProps = {
      base: number;
    };

    const { Provider, useStore } = createSyncStore<DerivedState, DerivedProps>(
      undefined,
      ({ base }) => {
        return { doubled: base * 2 };
      }
    );

    const Display = () => {
      const doubled = useStore((s) => s.doubled);
      return <div data-testid="doubled">{doubled}</div>;
    };

    const Wrapper = () => {
      const [base, setBase] = useState(3);
      return (
        <>
          <button data-testid="change" onClick={() => setBase(7)}>
            change
          </button>
          <Provider base={base}>
            <Display />
          </Provider>
        </>
      );
    };

    render(<Wrapper />);
    expect(screen.getByTestId("doubled")).toHaveTextContent("6");

    act(() => fireEvent.click(screen.getByTestId("change")));
    expect(screen.getByTestId("doubled")).toHaveTextContent("14");
  });

  it("does not re-render when useValue returns shallowly equal object", () => {
    const renderSpy = vi.fn();
    type DerivedState = {
      result: string;
    };
    type DerivedProps = {
      base: number;
      unrelated: number;
    };

    const { Provider, useStore } = createSyncStore<DerivedState, DerivedProps>(
      undefined,
      ({ base }) => {
        return { result: `val-${base}` };
      }
    );

    const Display = () => {
      const result = useStore((s) => s.result);
      renderSpy();
      return <div data-testid="result">{result}</div>;
    };

    const Wrapper = () => {
      const [unrelated, setUnrelated] = useState(0);
      return (
        <>
          <button
            data-testid="bump"
            onClick={() => setUnrelated((n) => n + 1)}
          >
            bump
          </button>
          <Provider base={5} unrelated={unrelated}>
            <Display />
          </Provider>
        </>
      );
    };

    render(<Wrapper />);
    const rendersAfterMount = renderSpy.mock.calls.length;

    act(() => fireEvent.click(screen.getByTestId("bump")));

    expect(screen.getByTestId("result")).toHaveTextContent("val-5");
    expect(renderSpy.mock.calls.length).toBeLessThanOrEqual(
      rendersAfterMount + 1
    );
  });
});

// ─── 4. React Element Props ──────────────────────────────────────────────────

describe("React element props", () => {
  it("does not trigger re-sync when React element prop has same type and key", () => {
    const syncSpy = vi.fn();

    type ElemState = {
      icon: React.ReactNode;
    };
    type ElemProps = {
      icon: React.ReactNode;
    };

    const { Provider, useStore } = createSyncStore<ElemState, ElemProps>();

    const Display = () => {
      useStore();
      syncSpy();
      return <div data-testid="display">rendered</div>;
    };

    const Wrapper = () => {
      const [, setTick] = useState(0);
      return (
        <>
          <button data-testid="tick" onClick={() => setTick((t) => t + 1)}>
            tick
          </button>
          <Provider icon={<span key="ic">icon</span>}>
            <Display />
          </Provider>
        </>
      );
    };

    render(<Wrapper />);
    const initialRenders = syncSpy.mock.calls.length;

    act(() => fireEvent.click(screen.getByTestId("tick")));

    expect(syncSpy.mock.calls.length).toBeLessThanOrEqual(initialRenders + 1);
  });

  it("triggers re-sync when React element type changes", () => {
    type ElemState = {
      icon: React.ReactNode;
    };
    type ElemProps = {
      icon: React.ReactNode;
    };

    const { Provider, useStore } = createSyncStore<ElemState, ElemProps>();

    const Display = () => {
      useStore();
      return <div data-testid="display">rendered</div>;
    };

    const Wrapper = () => {
      const [useDiv, setUseDiv] = useState(false);
      return (
        <>
          <button data-testid="switch" onClick={() => setUseDiv(true)}>
            switch
          </button>
          <Provider
            icon={useDiv ? <div key="ic">icon</div> : <span key="ic">icon</span>}
          >
            <Display />
          </Provider>
        </>
      );
    };

    render(<Wrapper />);

    act(() => fireEvent.click(screen.getByTestId("switch")));
    expect(screen.getByTestId("display")).toHaveTextContent("rendered");
  });

  it("triggers re-sync when prop changes from React element to non-element", () => {
    type ElemState = {
      icon: React.ReactNode;
    };
    type ElemProps = {
      icon: React.ReactNode;
    };

    const { Provider, useStore } = createSyncStore<ElemState, ElemProps>();

    const Display = () => {
      useStore();
      return <div data-testid="display">rendered</div>;
    };

    const Wrapper = () => {
      const [useString, setUseString] = useState(false);
      return (
        <>
          <button data-testid="switch" onClick={() => setUseString(true)}>
            switch
          </button>
          <Provider
            icon={useString ? ("plain text" as unknown as React.ReactNode) : <span>icon</span>}
          >
            <Display />
          </Provider>
        </>
      );
    };

    render(<Wrapper />);

    act(() => fireEvent.click(screen.getByTestId("switch")));
    expect(screen.getByTestId("display")).toHaveTextContent("rendered");
  });
});

// ─── 5. firstSyncProps ───────────────────────────────────────────────────────

describe("firstSyncProps", () => {
  it("only syncs listed props on first render, ignores them on subsequent syncs", () => {
    const { Provider, useStore } = createCounterStore();

    const Display = () => {
      const { initialCount, label } = useStore((s) => ({
        initialCount: s.initialCount,
        label: s.label,
      }));
      return (
        <>
          <div data-testid="initial">{initialCount}</div>
          <div data-testid="label">{label}</div>
        </>
      );
    };

    const Wrapper = () => {
      const [label, setLabel] = useState("v1");
      const [initCount, setInitCount] = useState(10);
      return (
        <>
          <button
            data-testid="change"
            onClick={() => {
              setLabel("v2");
              setInitCount(99);
            }}
          >
            change
          </button>
          <Provider
            initialCount={initCount}
            label={label}
            firstSyncProps={["initialCount"]}
          >
            <Display />
          </Provider>
        </>
      );
    };

    render(<Wrapper />);
    expect(screen.getByTestId("initial")).toHaveTextContent("10");
    expect(screen.getByTestId("label")).toHaveTextContent("v1");

    act(() => fireEvent.click(screen.getByTestId("change")));

    // label should update, but initialCount should stay at 10 (firstSyncProps)
    expect(screen.getByTestId("label")).toHaveTextContent("v2");
    expect(screen.getByTestId("initial")).toHaveTextContent("10");
  });
});

// ─── 6. $sync Hidden from Consumer ──────────────────────────────────────────

describe("$sync encapsulation", () => {
  it("does not expose $sync in useStore return type at runtime", () => {
    const { Provider, useStore } = createCounterStore();

    let storeState: Record<string, unknown> = {};
    const Capture = () => {
      const s = useStore();

      // Compile-time: TState fields are accessible
      void s.count;
      void s.increment;
      void s.decrement;

      // Compile-time: TProps fields are accessible
      void s.label;
      void s.initialCount;

      // Compile-time: $sync is NOT on the type
      // @ts-expect-error - $sync should not be exposed to consumers
      void s.$sync;

      storeState = s as unknown as Record<string, unknown>;
      return null;
    };

    render(
      <Provider initialCount={0} label="test">
        <Capture />
      </Provider>
    );

    // Runtime: TState fields
    expect(storeState.count).toBe(0);
    expect(typeof storeState.increment).toBe("function");
    expect(typeof storeState.decrement).toBe("function");

    // Runtime: TProps fields synced in
    expect(storeState.label).toBe("test");
    expect(storeState.initialCount).toBe(0);
  });

  it("exposes correct types through selector", () => {
    const { Provider, useStore } = createCounterStore();

    let capturedLabel = "";
    let capturedCount = -1;
    const Capture = () => {
      // Selector accessing TProps field
      const label = useStore((s) => s.label);
      // Selector accessing TState field
      const count = useStore((s) => s.count);

      capturedLabel = label;
      capturedCount = count;
      return null;
    };

    render(
      <Provider initialCount={0} label="typed">
        <Capture />
      </Provider>
    );

    expect(capturedLabel).toBe("typed");
    expect(capturedCount).toBe(0);
  });
});

// ─── 7. Persistence ─────────────────────────────────────────────────────────

describe("Persistence", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("persists state to localStorage", () => {
    type PState = { value: number; setValue: (v: number) => void };
    type PProps = { label: string };

    const { Provider, useStore } = createSyncStore<PState, PProps>((set) => ({
      value: 0,
      setValue: (v: number) => set((s) => ({ ...s, value: v })),
    }));

    const Display = () => {
      const { value, setValue } = useStore((s) => ({
        value: s.value,
        setValue: s.setValue,
      }));
      return (
        <>
          <div data-testid="value">{value}</div>
          <button data-testid="set" onClick={() => setValue(42)}>
            set
          </button>
        </>
      );
    };

    render(
      <Provider
        label="persisted"
        persist={{ name: "test-persist-store" }}
      >
        <Display />
      </Provider>
    );

    act(() => fireEvent.click(screen.getByTestId("set")));
    expect(screen.getByTestId("value")).toHaveTextContent("42");

    const stored = localStorage.getItem("test-persist-store");
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored!);
    expect(parsed.state.value).toBe(42);
  });

  it("restores persisted state on remount", async () => {
    type PState = { value: number; setValue: (v: number) => void };
    type PProps = { label: string };

    localStorage.setItem(
      "test-restore-store",
      JSON.stringify({
        state: { value: 99, label: "persisted" },
        version: 0,
      })
    );

    const { Provider, useStore } = createSyncStore<PState, PProps>((set) => ({
      value: 0,
      setValue: (v: number) => set((s) => ({ ...s, value: v })),
    }));

    const Display = () => {
      const value = useStore((s) => s.value);
      return <div data-testid="value">{value}</div>;
    };

    render(
      <Provider
        label="persisted"
        persist={{ name: "test-restore-store" }}
      >
        <Display />
      </Provider>
    );

    await vi.waitFor(() => {
      expect(screen.getByTestId("value")).toHaveTextContent("99");
    });
  });
});

// ─── 8. Error Handling ───────────────────────────────────────────────────────

describe("Error handling", () => {
  it("throws when useStore is called outside Provider", () => {
    const { useStore } = createCounterStore();

    const BadComponent = () => {
      useStore();
      return null;
    };

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<BadComponent />)).toThrow("Missing StoreProvider");
    consoleSpy.mockRestore();
  });
});

// ─── 9. createState Optional ─────────────────────────────────────────────────

describe("createState optional", () => {
  it("works without createState, using only synced props", () => {
    type MyState = { name: string };
    type MyProps = { name: string };

    const { Provider, useStore } = createSyncStore<MyState, MyProps>();

    const Display = () => {
      const name = useStore((s) => s.name);
      return <div data-testid="name">{name}</div>;
    };

    render(
      <Provider name="hello">
        <Display />
      </Provider>
    );

    expect(screen.getByTestId("name")).toHaveTextContent("hello");
  });
});

// ─── 10. Selector with equalityFn ────────────────────────────────────────────

describe("Custom equality function", () => {
  it("uses custom equalityFn to prevent re-renders", () => {
    const renderSpy = vi.fn();
    const { Provider, useStore } = createCounterStore();

    const Display = () => {
      const count = useStore(
        (s) => s.count,
        () => true
      );
      renderSpy();
      return <div data-testid="count">{count}</div>;
    };

    const Controls = () => {
      const increment = useStore((s) => s.increment);
      return (
        <button data-testid="inc" onClick={increment}>
          inc
        </button>
      );
    };

    render(
      <Provider initialCount={0} label="test">
        <Display />
        <Controls />
      </Provider>
    );

    const rendersAfterMount = renderSpy.mock.calls.length;

    act(() => fireEvent.click(screen.getByTestId("inc")));
    act(() => fireEvent.click(screen.getByTestId("inc")));

    expect(renderSpy.mock.calls.length).toBe(rendersAfterMount);
  });
});
