import "@radix-ui/themes/styles.css";
import "./styles/global.css";
import "./styles/atom-one-dark.min.css";

import { Theme } from "@radix-ui/themes";
import * as React from "react";
import * as ReactDOM from "react-dom/client";

import { Container } from "@/components/container";
import { useChatStore } from "@/store/chat";

declare global {
  interface Window {
    acquireVsCodeApi(): any;
  }
}

const vscode = window.acquireVsCodeApi();

// Initialize the store with vscode API
useChatStore.getState().setVscode(vscode);

const root = ReactDOM.createRoot(document.getElementById("root")!);

root.render(
  <Theme
    appearance="dark"
    accentColor="blue"
    grayColor="slate"
    radius="medium"
    scaling="90%"
  >
    <Container />
  </Theme>,
);
