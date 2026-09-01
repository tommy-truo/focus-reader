# Focus Reader

> **Status:** In development — documentation and project setup only. The extension is not yet installable from the Chrome Web Store or buildable from this repository.

Chrome extension for focus-friendly reading of highlighted webpage text. For the full project story — problem, audience, and goals — see **[PROJECT.md](./PROJECT.md)**.

## Getting Focus Reader

**Chrome Web Store:** Not published yet. This repository will link to the store listing once v1 is released.

**Develop from source:** See [Development](#development) below (available after the extension codebase is added to this repo).

## Development

Extension source and build tooling are not in the repository yet. The workflow below is the intended setup once implementation begins.

Detailed specs and architecture are kept in local internal docs (`docs/internal/`, not tracked in this repository).

### Prerequisites

- [Node.js](https://nodejs.org/) 20 LTS or later
- Google Chrome (latest)

### Setup

```bash
git clone https://github.com/tommy-truo/focus-reader.git
cd focus-reader
npm install
npm run build
```

### Load in Chrome (unpacked)

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the extension output directory (typically `dist/` after build)

### Development workflow

```bash
npm run dev    # watch mode + rebuild on change
```

After rebuilding, click **Reload** on the extension card in `chrome://extensions`.

## Documentation

| Document | Description |
|----------|-------------|
| [PROJECT.md](./PROJECT.md) | Public project overview |
| [docs/privacy-policy.md](./docs/privacy-policy.md) | Privacy policy (draft) |

## Chrome Web Store

This project targets public distribution on the Chrome Web Store once v1 is ready.

## License

License TBD — to be chosen before public release.
