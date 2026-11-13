/// <reference types="vite/client" />

declare module "*.svg" {
  const src: string;
  export default src;
}

declare module "*.css" {
  const content: Record<string, string>;
  export default content;
}

declare module "@nicecxone/lyra-ui/styles" {
  // Side-effect CSS import — no exports.
}
