# A Homepage That Reshapes Itself

I rebuilt this site so the homepage isn't really a page anymore. It's a single cluster of glowing nodes floating in space — and it takes a different shape for every section. Open *goodies* and it snaps into a lattice. Open *blog* and it ripples into a field. Pull up the journal and the whole thing blurs back as the timeline slides over the top.

This is a short note on what it is and how I got there — not a full teardown. Half the fun is in the details, so I'm keeping some of them.

---

## Why

My old homepage was fine. Clean, dark, readable — and completely forgettable. For a site that's supposed to show that I build things, it didn't *do* anything.

So the goal flipped: make the homepage the demo. If someone lands here, the first thing they touch should be the kind of thing I like to make.

## The idea

One cluster. Many shapes.

Every section the site has — about, goodies, blog, the journal — is a node living in the same 3D field. Click a node (or the nav) and the camera eases over while the cluster morphs into that section's signature shape and its content slides in. Nothing reloads. It's all one continuous world that re-wires itself as you move through it.

The seed for this was [bgstaal's multipleWindow3dScene](https://github.com/bgstaal/multipleWindow3dScene) — the idea that a scene can be one shared space you move *through* rather than a stack of pages you click between. I took the spirit of it in a different direction.

## The tech

The fun constraint I gave myself: **no framework, no build step.** Just hand-written HTML, CSS, and vanilla JavaScript, served straight off GitHub Pages — same as the rest of this site.

A few choices that made it work:

- **The 3D is hand-rolled on a 2D canvas.** No WebGL, no Three.js in the live build. Just a few dozen points, a projection, and a render loop. Lighter than it looks, and it keeps the whole thing to one small script.
- **The shapes are one system, not seven scenes.** The cluster is a fixed set of nodes; each section is just a different set of target positions. Moving between them is interpolation, which is why the morph feels like the *same* object rearranging instead of a hard cut.
- **Energy flows along the connections,** and a dimmer field drifts behind everything for depth. Small touches, but they're what make it feel alive instead of like a static diagram.
- **Content lives in real HTML.** The journal and long reads open in a full-screen, softly-blurred reader; sections open in a side panel. All of it is normal markup layered over the canvas — readable, linkable, and friendly to crawlers.
- **Progressive enhancement underneath.** The classic pages still exist as fallbacks, so links, bookmarks, and search engines never depend on the 3D layer.

## What I'm leaving out

The projection math, how the labels ride the morph, the timing curves, the cross-window experiment that didn't ship yet — those stay in the garage for now. If you want to see how a piece of it behaves, the whole thing runs client-side. View source is right there.

The point isn't the trick. It's that a personal site can be a small, self-contained thing you actually enjoy building — and that the constraints (no build, no deps, just the browser) make it better, not worse.
