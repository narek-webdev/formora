import React from "react";
import { useForm } from "formora";

type Values = { tags: string[] };

export default function App() {
  const { register, values } = useForm<Values>({
    initialValues: { tags: [] },
    validateOn: "change",
  });

  console.log(values.tags);

  return (
    <div style={{ padding: 24, fontFamily: "sans-serif", maxWidth: 520 }}>
      <h2>Select multiple test</h2>

      <label style={{ display: "block", marginBottom: 6 }}>
        Pick tags (Ctrl/Cmd click to select multiple):
      </label>

      <select
        multiple
        {...register("tags")}
        style={{ width: "100%", padding: 8, fontSize: 16, height: 140 }}
      >
        <option value="js">JavaScript</option>
        <option value="ts">TypeScript</option>
        <option value="react">React</option>
        <option value="node">Node.js</option>
      </select>

      <div style={{ marginTop: 12 }}>
        Selected tags:
        <b>
          {" "}
          {Array.isArray(values.tags)
            ? values.tags.join(", ")
            : String(values.tags)}
        </b>
      </div>

      <pre style={{ marginTop: 16 }}>{JSON.stringify(values, null, 2)}</pre>
    </div>
  );
}
