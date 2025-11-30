# Visualizing the Invisible: A Beginner's Guide to Shaders

If you've ever played a video game and wondered "how do they make the water look wet?" or "how does that shield glow?", the answer is usually **Shaders**.

Shaders are often considered "black magic" by developers. They look scary. They use a different language. But the concept behind them is actually very simple.

In this post, I'll explain how I built a "Lidar Pulse" effect—where sound waves reveal a hidden world—using zero complex math.

## The Analogy: The Paint Factory

Imagine you have a massive wall made of 2 million tiny white tiles (pixels). You want to paint a picture on it.

### The CPU Way (Standard Programming)
You have **one painter**. He walks to the first tile, paints it, walks to the second, paints it, and so on.
*   *Pros*: Easy to give instructions.
*   *Cons*: Takes forever to paint 2 million tiles.

### The GPU Way (Shaders)
You hire **2 million painters**. You stand in the middle of the room and shout **one instruction** that everyone follows at the exact same time.
*   *Instruction*: "If your tile is more than 5 meters from the center, paint it Blue!"
*   *Result*: The entire wall is painted instantly.

**This is a Shader.** It's a single function that runs for every pixel on your screen simultaneously.

## The Challenge: Seeing Sound

In my game, the player is blind. The screen is pitch black. They can only "see" by making noise (clapping), which sends out a wave that lights up the walls.

We need a ring of light that expands outwards.

## The Solution: The "Flashlight" Math

Since every pixel painter is working alone, they don't know what their neighbors are doing. They only know two things:
1.  **"Where am I?"** (My World Position)
2.  **"Where is the Player?"** (The Sound Origin)

With just these two facts, every pixel can figure out if it should light up.

### The Logic (Pseudo-Code)

Imagine you are one of the pixel painters. I shout the instruction: *"The sound wave is currently 10 meters wide!"*

You do a quick check:
1.  "I am at position `(10, 0)`."
2.  "The player is at `(0, 0)`."
3.  "My distance to the player is **10 meters**."
4.  "The wave is **10 meters** wide."
5.  "Match! I will paint myself **Blue**."

Your neighbor at `(20, 0)` does the same check:
1.  "My distance is **20 meters**."
2.  "The wave is **10 meters**."
3.  "No match. I will paint myself **Black**."

## Implementing it in Code

We write shaders in **GLSL**. It looks scary, but let's translate our logic directly.

### Step 1: The Setup
We need to tell the GPU the "Global Facts" (Uniforms) that apply to everyone.
```glsl
uniform vec3 uPlayerPosition; // Where the sound started
uniform float uWaveRadius;    // How big the wave is right now
```

### Step 2: The Pixel Logic
This function runs for every pixel.
```glsl
void main() {
  // 1. Calculate distance to player
  float dist = distance(vPosition, uPlayerPosition);

  // 2. Check if the wave hit us
  // We check if the distance is close to the radius (within 1 meter)
  float diff = abs(dist - uWaveRadius);

  if (diff < 1.0) {
      // Hit! Paint Blue
      gl_FragColor = vec4(0.0, 0.0, 1.0, 1.0); 
  } else {
      // Miss. Paint Black
      gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
  }
}
```

## Why is this better than a real light?

If we used a real "light source" in a game engine:
1.  The engine has to calculate shadows.
2.  It has to calculate reflections.
3.  It has to check if walls are blocking the light.

With our Shader approach, we skip all of that. We just ask "How far away are you?". It is incredibly fast, allowing us to run it on mobile phones or web browsers without any lag.

## What else can be a "Global Fact" (Uniform)?

We passed the Player Position and Wave Radius, but you can pass *anything* to a shader to control it from your game code:

1.  **Time (`uTime`)**: To animate things (like waving grass or flowing water).
2.  **Mouse Position (`uMouse`)**: To make eyes follow your cursor.
3.  **Health (`uHealth`)**: To make a character turn red as they get damaged.
4.  **Textures (`uTexture`)**: Images to wrap around the object.

## Advanced Challenge: Blocking Sound

You might notice a flaw in our logic: **The sound travels through walls!**
Because we only check "Distance," the shader doesn't know if there is a wall *between* the player and the pixel.

To fix this, we would need a more advanced technique called **Shadow Mapping**.
1.  We place a "Camera" at the sound source.
2.  We take a special picture called a **Depth Map**. Instead of colors, it records **"How far is the closest object?"** for every pixel.
3.  We send this "Distance Diary" to the shader.
4.  The shader does a check:
    *   "I am **20 meters** away."
    *   "The Diary says the closest object in my direction is **10 meters** away."
    *   "Since 20 > 10, I am behind a wall. I am blocked!"

This is how dynamic lights work in major game engines like Unity or Unreal!

### How we did it in ECHO (The Cheat)

Writing a full Shadow Map system from scratch is hard. So we cheated by using **Three.js**.

1.  **The Light**: We placed a standard `<pointLight castShadow />` in the scene.
    *   *PointLight*: A light bulb that shines in all directions (360°).
    *   *CastShadow*: A flag that tells the 3D engine "Please calculate if walls block this light."
2.  **The Trick**: Every time the player claps, we move this light to the player's position.
3.  **The Shader**: Three.js automatically calculates the shadow for us. In our shader, we just multiply our Lidar color by the shadow value.

```glsl
// If shadow is 0.0 (blocked), the whole color becomes 0.0 (invisible)
vec3 finalColor = lidarColor * shadowValue;
```

This gives us advanced occlusion for free!

## Other Use Cases

This "Distance Check" technique is used everywhere:
1.  **Force Fields**: In sci-fi games, when a shield gets hit, they use this math to draw a ripple at the impact point.
2.  **Sonar**: Submarine games use it to show the sea floor.
3.  **RPGs**: When a wizard casts a fireball, the glowing ring on the ground is just a distance check!
