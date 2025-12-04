# ECHO

A first-person horror game built with React Three Fiber where sound is your only weapon. Navigate dark mazes using sonar pulses while evading enemies that hunt by sound.

🎮 **[Play Now](https://sakets594.github.io/echo/)** | 📖 [Deployment Guide](DEPLOY.md)

## Overview

ECHO is a stealth-horror experience where you're trapped in darkness with limited visibility. Use sonar pulses to reveal your surroundings, but be careful - every sound you make attracts deadly enemies.

### Key Features

- **Sonar-Based Navigation**: Reveal the environment using lidar pulses
- **Sound-Based Enemy AI**: Enemies detect footsteps, sprints, and sonar pings
- **Strategic Movement**: Crouch to move quietly or sprint to escape
- **Progressive Difficulty**: 10 handcrafted levels with increasing complexity
- **Mobile Support**: Touch controls for mobile devices
- **3D Audio**: Spatial audio for immersive enemy tracking

## Tech Stack

### Core
- **React 18** - UI framework
- **Three.js** - 3D rendering engine
- **React Three Fiber** - React renderer for Three.js
- **Rapier** - Physics engine for collision detection

### Key Libraries
- `@react-three/drei` - Three.js helpers and abstractions
- `@react-three/rapier` - Physics integration
- `leva` - Development UI controls (dev only)

### Build & Deploy
- **Vite** - Fast build tool and dev server
- **GitHub Pages** - Hosting platform
- **gh-pages** - Automated deployment

## Game Mechanics

### Controls

**Desktop:**
- `WASD` / Arrow Keys - Move
- `Mouse` - Look around
- `Shift` - Crouch (quiet movement)
- `Ctrl` - Sprint (loud, fast movement)
- `Space` - Sonar pulse (reveals environment)
- `Esc` - Pause game

**Mobile:**
- Virtual joystick - Movement
- Swipe - Look around
- Sonar button - Activate pulse

### Objectives

1. **Find the Access Token (Key)** - Unlocks the exit door
2. **Locate the Escape Route (Exit)** - Complete the level
3. **Avoid Detection** - Enemies hunt by sound and proximity

### Enemy AI

Enemies operate in multiple states:

- **Patrol**: Random wandering until stimulus detected
- **Investigate**: Moves to last known sound location
- **Chase**: Direct pursuit when player is detected
- **Search**: Scans area after losing player

**Detection Methods:**
- Footsteps (moderate range)
- Sprinting (large range)
- Sonar pulses (medium range)
- Proximity/breathing (close range)

## Project Structure

```
echo/
├── public/
│   ├── models/          # 3D models (.glb)
│   ├── sounds/          # Audio files (.mp3, .wav)
│   └── textures/        # Wall/floor textures
├── src/
│   ├── ai/              # Enemy AI system
│   │   ├── EnemyAI.js
│   │   └── EnemyMovement.js
│   ├── components/      # React/Three.js components
│   │   ├── Enemy.jsx
│   │   ├── Player.jsx
│   │   ├── LevelBuilder.jsx
│   │   ├── HUD.jsx
│   │   └── MobileControls.jsx
│   ├── contexts/        # React contexts
│   │   ├── GameContext.jsx
│   │   ├── AudioContext.jsx
│   │   ├── NoiseContext.jsx
│   │   └── ScannerContext.jsx
│   ├── levels/          # Level definitions (.json)
│   ├── materials/       # Custom Three.js materials
│   │   └── LidarMaterial.js
│   ├── systems/         # Game systems
│   │   └── HeartbeatSystem.jsx
│   └── utils/           # Utilities
│       └── pathfinding.js
└── vite.config.js
```

## Development

### Prerequisites
- Node.js 16+ (Note: Some dependencies require Node 18+)
- npm or yarn

### Setup

```bash
# Clone repository
git clone https://github.com/sakets594/echo.git
cd echo

# Install dependencies
npm install

# Start development server
npm run dev
```

The game will be available at `http://localhost:5173`

### Available Scripts

- `npm run dev` - Start development server with HMR
- `npm run build` - Build production bundle
- `npm run preview` - Preview production build locally
- `npm run deploy` - Deploy to GitHub Pages

### Development Features

Debug UI (available in dev mode only):
- **Leva Controls** - Tweak AI parameters, lidar settings
- **Stats Panel** - FPS and performance metrics
- **Debug Panel** - Game state information
- **Level Selector** - Quick level switching

## Production Build

The production build removes all debug UI and is optimized for deployment:

- **Clean UI**: No debug panels, controls, or stats
- **Mobile-Optimized**: Conditional controls for mobile devices
- **Asset Optimization**: All resources load with correct base path
- **Bundle Size**: 3.49 MB (1.17 MB gzipped)

## Deployment

The game is deployed to GitHub Pages at: https://sakets594.github.io/echo/

### Deploy Process

```bash
# Build and deploy in one command
npm run deploy
```

This will:
1. Build the production bundle
2. Push to `gh-pages` branch
3. Deploy to GitHub Pages automatically

See [DEPLOY.md](DEPLOY.md) for detailed deployment instructions.

## Assets

### Audio
- Sound effects from [Pixabay](https://pixabay.com)
- Heartbeat sound by [l4rzy/semicute](https://github.com/l4rzy/semicute) on GitHub

### 3D Models
- Enemy model by [TileItRight](https://sketchfab.com/TileItRight) (CC-BY 4.0)
- Exit portal by [st4ng](https://sketchfab.com/st4ng) (CC-BY 4.0)
- Keycard by [Nelamon](https://sketchfab.com/Nelamon) (CC-BY 4.0)

## Known Issues

- Large bundle size (~3.5 MB) - future optimization planned
- Font rendering warnings (GPOS/GSUB tables) - cosmetic only

## TODO

### Documentation
- [ ] Add gameplay screenshots
- [ ] Add demo GIF/video
- [ ] Create LICENSE file

### Assets & Visuals
- [ ] Apply wall and floor textures (textures downloaded but not applied)
- [ ] Add more visual polish to 3D models
- [ ] Optimize asset loading

### Features & Enhancements
- [ ] Level editor for custom maps
- [ ] Procedural level generation
- [ ] Additional enemy types with varied behaviors
- [ ] Sound effect customization/mixer
- [ ] Difficulty settings
- [ ] Achievement system
- [ ] Leaderboard/time tracking

### Performance
- [ ] Code splitting for smaller initial bundle
- [ ] Lazy load levels
- [ ] Optimize Three.js scene rendering
- [ ] Asset compression and optimization

### Polish
- [ ] Tutorial/onboarding level
- [ ] Better mobile UI/UX
- [ ] Settings menu (audio, graphics)
- [ ] Keyboard rebinding

## Contributing

This is a personal project, but feedback and suggestions are welcome via GitHub issues.

## License

MIT License - See LICENSE file for details

## Acknowledgments

- Three.js and React Three Fiber communities
- Asset creators (credited in-game)
- [Pixabay](https://pixabay.com) for audio resources

---
