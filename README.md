# ECHO

ECHO is a first-person exploration game where you must navigate a pitch-black environment using a Lidar-like scanner. Use sound and echolocation to reveal your surroundings, avoid enemies, and find the exit.

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm (Node Package Manager)

### Installation

1. Clone the repository (if you haven't already).
2. Navigate to the project directory:
   ```bash
   cd echo
   ```
3. Install dependencies:
   ```bash
   npm install
   ```

### Running the Game

Start the development server:
```bash
npm run dev
```
Open your browser and navigate to `http://localhost:5173` (or the URL shown in the terminal).

## Controls

| Key | Action |
| --- | --- |
| **W, A, S, D** | Move Player |
| **Mouse** | Look Around |
| **Space** | **Standard Clap**: Emits a scanner pulse AND a bright flash (High Noise) |
| **Shift + Space** | **Stealth Clap**: Emits a scanner pulse ONLY (Low Noise) |
| **Shift** | Crouch (Move slower, less noise) |
| **Ctrl** | Sprint (Move faster, more noise) |
| **L** | Toggle Debug Lights (Cheats) |

## Gameplay

- **Objective**: Find the **Key (K)** to unlock the **Door (L)** and escape through the **Exit (X)**.
- **Scanner**: The world is dark. Clap to send out a pulse that reveals geometry.
- **Noise**: Making noise (walking fast, clapping) attracts the **Entity**.
- **Stealth**: Crouch and use Stealth Clap to stay hidden.
- **The Entity**: If it catches you, it's Game Over.

## Development

- `npm run build`: Build for production.
- `npm run preview`: Preview the production build locally.
