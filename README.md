# Redge

A minimal React partial-hydrations.

hydrate your components only when you need.

> [WIP] DON`T USE IT !!

Demo => https://redge.deno.dev/

## Features

- Partial Hydration.
- Optional JIT Rendering.
- Optional build step.
- Hot Reloading.

## Usage

```bash
git clone https://github.com/nhttp/redge.git my_app

cd my_app

// run dev
deno task dev

// build-step (optionals)
deno task build

// run prod 
deno task start
```

## Deploy to Deno Deploy

just link `main.ts` as deploy target.
