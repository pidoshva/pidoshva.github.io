So I rebuilt this site.

The homepage isn't a page now. It's a cloud of dots in the dark that reshuffles based on where you're going.

Go to goodies, they lock into a grid. Go to the blog, they sag into a wave. Open the journal and they back off and go quiet while the words take over.

Same dots every time. They just keep finding new arrangements.

---

## The idea

One cluster. It never grows or shrinks. It rearranges.

About, goodies, the blog, the journal — each is a dot in the same small universe. Tap one, the camera leans in, the dots pour into a new formation, the content shows up. No reloads, no cuts. You move the furniture around instead of leaving the room.

The itch came from bgstaal's [multipleWindow3dScene](https://github.com/bgstaal/multipleWindow3dScene) — a site as a space you walk through, not a pile of links. Mine walks somewhere else, but that's where it started.

## The tech

One rule I wouldn't break: no framework, no build step. Hand-written HTML, CSS, and JS, dropped on GitHub Pages and left alone.

The parts worth saying out loud:

- The 3D is a lie. Flat canvas, a pinch of trig, no engine. A few dozen dots faking depth.
- One shape system, not seven scenes. The dots are fixed. A "shape" is just a list of where each one belongs, so a morph reads as one object folding itself instead of a swap.
- Sparks run along the wires and a fainter swarm drifts far behind. Two cheap tricks, but they're the gap between "org chart" and "oh."
- The reading is plain HTML under the spectacle. Posts and the journal swing open in a big blurred panel. Real text, real links, nothing a crawler has to squint at.
- The dull old pages still sit underneath. If the clever layer trips, nothing you'd bookmark falls with it.

## What stays mine

The projection math. How a label clings to its dot through a morph. The easing curves. The multi-window trick that's still half-built on my laptop.

It's all client-side anyway. You know where view source is.
