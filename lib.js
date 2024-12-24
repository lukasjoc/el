// @ts-expect

export function query(selector) {
    return document.querySelector(selector);
}
export function queryAll(selector) {
    return document.querySelectorAll(selector);
}

// TODO: This should be cleaned up somewhere -- upsii :D

/** @type {Map<string, string>} */
const bindings = new Map();

/** @type {Map<string, typeof ctx>} */
const contexts = new Map();

function track(rid, eid) {
    // console.log("Binding: %s ~> %s", rid, eid);
    if (bindings.has(rid)) {
        bindings.get(rid).add(eid);
    } else {
        bindings.set(rid, new Set([eid]));
    }
}

function trigger(rid, eid, newVal) {
    const depEl = document.querySelector(`[${eid}=\"\"]`);
    if (!depEl) {
        throw new Error(`Element not reachable: ${eid}`);
    }
    if (contexts.has(eid)) {
        const ctx = contexts.get(eid);
        const rendered = renderCtx(ctx);
        if (rendered.deps.has(rid)) {
            depEl.textContent = rendered.result;
            return;
        }
    }
    depEl.textContent = newVal.toString();
}

export const ref = (initialValue) => {
    const rid = "rid-" + crypto.getRandomValues(new Uint32Array(1))[0];
    let value = initialValue;
    return {
        get: () => value,
        set: (cb) => {
            const nextValue = cb();
            value = nextValue;
            if (!bindings.has(rid)) {
                throw new Error("Trying to mutate untracked binding: " + rid);
            }
            for (const eid of bindings.get(rid)) {
                trigger(rid, eid, value);
            }
        },
        __ctx: { __isRef: true, __rid: rid },
    };
};

export const isRef = (maybeRef) => {
    return typeof maybeRef === "object" && "__ctx" in maybeRef && maybeRef.__ctx.__isRef;
};

export const ctx = (strings, ...slots) => ({
    __isRefCtx: true,
    strings,
    slots,
});

export const renderCtx = (ctx) => {
    const deps = new Set();
    let result = "";
    const strings = ctx.strings.slice();
    const slots = ctx.slots.slice();
    const renderSlot = (slot) => {
        // TODO: support for non ref as slot
        const dep = slot;
        const rid = dep.__ctx.__rid;
        deps.add(rid);
        return slot.get();
    };
    while (strings.length || slots.length) {
        const str = strings.shift();
        if (str) {
            result += str;
        }
        const slot = slots.shift();
        if (slot) {
            result += renderSlot(slot);
        }
    }
    return { result, deps };
};

export function el(tag, args, content, events) {
    const eid = "eid-" + crypto.getRandomValues(new Uint32Array(1))[0];
    return {
        eid,
        render: () => {
            const root = document.createElement(tag);
            root.setAttribute(eid, "");
            for (const entry of Object.entries(args ?? {})) {
                root.setAttribute(...entry);
            }
            for (const [eventName, cb] of Object.entries(events ?? {})) {
                root.addEventListener(eventName, cb);
            }
            if (content) {
                if (isRef(content)) {
                    const rid = content.__ctx.__rid;
                    track(rid, eid);
                    root.textContent = content.get().toString();
                } else if (content.__isRefCtx) {
                    const resolved = renderCtx(content);
                    for (const dep of resolved.deps) {
                        track(dep, eid);
                    }
                    contexts.set(eid, content);
                    root.textContent = resolved.result;
                } else if (typeof content === "string") {
                    root.textContent = content;
                }
            }
            const children = Array.isArray(content) ? content : undefined;
            return { root, children };
        },
    };
}

export function mount(mnt, el) {
    if (!Array.isArray(el)) {
        const { root, children } = el.render();
        if (Array.isArray(children)) {
            mount(root, children);
        }
        mnt.appendChild(root);
        return mnt;
    }
    for (const r of el) {
        mount(mnt, r);
    }
    return mnt;
}
