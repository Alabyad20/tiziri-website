/// <reference types="vite/client" />
import type { TiziriApi } from "../../shared/ipc-contract.ts";

declare global {
  interface Window {
    readonly tiziri: TiziriApi;
  }
}

export {};
