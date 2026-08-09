# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: mosh-closed-surfaces.spec.cjs >> Mosh closed public surfaces >> forwards a Files v2 attachment across scopes with replacement provenance
- Location: e2e/mosh-closed-surfaces.spec.cjs:82:3

# Error details

```
Error: Channel closed
```

# Page snapshot

```yaml
- main "Room startup failed" [ref=e3]:
  - generic [ref=e4]:
    - img [ref=e5]
    - heading "Could not start this room directly" [level=1] [ref=e6]
    - paragraph [ref=e7]: "WASM download failed: 404"
    - generic [ref=e8]:
      - button "Retry direct launch" [ref=e9] [cursor=pointer]
      - button "Open launcher" [ref=e10] [cursor=pointer]
```