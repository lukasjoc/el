import { ctx, el, mount, query, ref } from "./lib.js";

const counterReactive = (props) => {
    const count = ref(props.initialValue);
    const inc = () => count.set(() => count.get() + 1);
    const dec = () => count.set(() => count.get() - 1);
    return [
        el(
            "code",
            { class: "count-with-ctx", title: "Updates using a ctx literal." },
            ctx`Current count: ${count}`,
        ),
        el("br"),
        el("code", { class: "count-direct", title: "Updates directly." }, count),
        el("br"),
        el("button", { class: "btn", style: "cursor: pointer;" }, "- 1", { click: dec }),
        el("button", { class: "btn", style: "cursor: pointer;" }, "+ 1", { click: inc }),
    ];
};

const App = () => {
    return [
        counterReactive({ initialValue: 0 }),
    ];
};

const root = query("#app");
const mnt = mount(root, App());

console.log("Mounted at: ", mnt.outerHTML);
