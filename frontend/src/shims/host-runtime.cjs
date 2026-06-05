// Browser shim for the RoomKit host runtime.
//
// The markdown parser / embed providers import the shared plugin barrel
// (examples/plugins/src/shared/index.cjs), whose first line requires the full
// host runtime. That pulls in node:crypto (roleKeys signing) which cannot be
// bundled for the browser. The parser and providers only ever use the pure
// helpers from `shared` (url/embed/validation) and never call any of the four
// host-runtime functions below, so harmless stubs let the graph resolve.
module.exports = {
  allow: () => ({ ok: true }),
  deny: (reason) => ({ ok: false, reason }),
  defineHostPlugin: (plugin) => plugin,
  createOperationSchemaDescriptor: () => ({})
};
