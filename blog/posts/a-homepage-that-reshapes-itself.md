So I rebuilt the homepage.

It's not a normal page anymore. It's a small cluster of points on a dark canvas, and it rearranges itself depending on which section you open.

Goodies forms a grid. The blog forms a wave. The journal pushes everything back and fades it out so you can read.

Same points every time. They just move into different shapes.

## The idea

One cluster, and each section of the site is one of its points. You click a point, the view shifts toward it, the points settle into that section's shape, and the content opens. Nothing reloads; it stays one scene the whole time.

The idea came from bgstaal's [multipleWindow3dScene](https://github.com/bgstaal/multipleWindow3dScene). Mine works differently, but that's the starting point.

## How it's built

No framework, no build step. Just HTML, CSS, and JavaScript on GitHub Pages.

A few notes:

- It isn't real 3D. It's a 2D canvas with simple projection math, a few dozen points redrawn every frame.
- There's one set of points and a list of target positions per section. Switching sections animates the points to the new positions, so it looks like one object moving rather than a swap.
- The extras: lines between points, highlights that travel along them, and a dimmer layer further back for depth.
- The content is plain HTML over the canvas. Posts and the journal open in a large blurred panel — normal text and links, fully indexable.
- The old static pages still exist underneath as a fallback.

## What I'm skipping

The projection math, the label positioning, the timing, and a multi-window version I haven't finished. Not here.

It all runs in the browser if you want to dig in.
