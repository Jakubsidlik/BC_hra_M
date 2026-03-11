/* eslint-disable @typescript-eslint/no-explicit-any */
/// <reference types="react" />

// This file provides a catch-all JSX.IntrinsicElements declaration
// to satisfy the language server when React types are not picked up properly.
// It should be safe since actual element typings come from React at runtime.

declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}
