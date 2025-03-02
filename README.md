# Beatfly

An open source music streaming application.

## Quick Start

### Prerequisites

- Node.js (v18+)
- npm (v9+)

### Development

```bash
# Install dependencies
npm install

# Start development environment with Electron
npm run electron:dev
```

### Building

```bash
# Build for production
npm run electron:build
```

## Available Scripts

- `npm run dev` - Start Vite dev server only
- `npm run build` - Build web application
- `npm run preview` - Preview built web app
- `npm run electron:dev` - Run in development mode with Electron
- `npm run electron:build` - Build distributable packages

## Project Structure

- `electron/` - Electron main process code
- `src/` - React application source
- `assets/` - Application resources

## Technologies

- React 19 + Vite
- Electron
- TailwindCSS
- Radix UI components
