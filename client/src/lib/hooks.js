import { startTransition, useActionState, useCallback, useEffect, useEffectEvent, useState } from "react";

// Loads data with `load()` whenever one of `deps` (primitives) changes.
// `reload()` fetches again and `setData()` updates the value after a mutation.
// While a new request is in flight the previous data stays visible.
export function useAsync(load, deps) {
    const [version, setVersion] = useState(0);
    const key = JSON.stringify([...deps, version]);
    const [state, setState] = useState({ key: null, data: undefined, error: null });
    const runLoad = useEffectEvent(() => load());

    useEffect(() => {
        let active = true;
        runLoad().then(
            (data) => active && setState({ key, data, error: null }),
            (error) => active && setState((current) => ({ key, data: current.data, error }))
        );
        return () => {
            active = false;
        };
    }, [key]);

    const reload = useCallback(() => setVersion((v) => v + 1), []);
    const setData = useCallback(
        (update) =>
            setState((current) => ({
                ...current,
                data: typeof update === "function" ? update(current.data) : update,
            })),
        []
    );

    const settled = state.key === key;
    return { data: state.data, error: settled ? state.error : null, loading: !settled, reload, setData };
}

// React 19 form action without the automatic form reset, so values (and chosen
// files) stay in place when the server reports validation errors.
//   const [state, onSubmit, pending] = useFormAction(async (previous, formData) => {...})
//   <form onSubmit={onSubmit}>
export function useFormAction(action, initialState = {}) {
    const [state, dispatch, pending] = useActionState(action, initialState);
    const onSubmit = (event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        startTransition(() => dispatch(formData));
    };
    return [state, onSubmit, pending];
}

// Turns a thrown ApiError into form state ({ error, fieldErrors, code }).
export const formError = (error, extra = {}) => ({
    error: error.message,
    fieldErrors: error.errors || {},
    code: error.code,
    ...extra,
});

// Runs an async action and tracks which one is in flight.
export function usePendingAction() {
    const [pendingKey, setPendingKey] = useState(null);
    const run = useCallback(async (key, fn) => {
        setPendingKey(key);
        try {
            return await fn();
        } finally {
            setPendingKey(null);
        }
    }, []);
    return [pendingKey, run];
}
