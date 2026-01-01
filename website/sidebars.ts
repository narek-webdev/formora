import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */
const sidebars: SidebarsConfig = {
  docs: [
    "intro",
    "getting-started",
    {
      type: "category",
      label: "Concepts",
      items: [
        "concepts/validate-on",
        "concepts/field-meta",
        "concepts/async-validation",
      ],
    },
    {
      type: "category",
      label: "Guides",
      items: ["guides/nested-fields", "guides/field-arrays", "guides/reset"],
    },
    {
      type: "category",
      label: "API Reference",
      items: ["api/useform", "api/register", "api/field-arrays", "api/reset"],
    },
  ],
};

export default sidebars;
