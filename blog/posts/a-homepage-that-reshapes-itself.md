so i rebuilt this site.

the homepage isn't a page now. it's a cloud of dots in the dark that reshuffles based on where you're going.

go to goodies, they lock into a grid. go to the blog, they sag into a wave. open the journal and they back off and go quiet while the words take over.

same dots every time. they just keep finding new arrangements.

---

## why

the old homepage was tasteful and dead. dark, tidy, said the right things, did nothing.

odd look for a page whose entire job is "this person builds stuff."

so i quit describing the work and let the page be the work. you land, grab a dot, and you're already inside the kind of thing i make.

## the idea

one cluster. it never grows or shrinks. it rearranges.

about, goodies, the blog, the journal — each is a dot in the same small universe. tap one, the camera leans in, the dots pour into a new formation, the content shows up. no reloads, no cuts. you don't leave a page, you just move the furniture around.

the itch came from bgstaal's [multipleWindow3dScene](https://github.com/bgstaal/multipleWindow3dScene) — a site as a space you walk through, not a pile of links. mine walks somewhere else, but that's where it started.

## the tech

one rule i wouldn't break: no framework, no build step. hand-written html, css, and js, dropped on github pages and left alone. same as everything here.

the parts worth saying out loud:

- the 3d is a lie. flat canvas, a pinch of trig, no engine. a few dozen dots faking depth.
- one shape system, not seven scenes. the dots are fixed. a "shape" is just a list of where each one belongs, so a morph reads as one object folding itself instead of a swap.
- sparks run along the wires and a fainter swarm drifts far behind. two cheap tricks, but they're the gap between "org chart" and "oh."
- the reading is plain html under the spectacle. posts and the journal swing open in a big blurred panel. real text, real links, nothing a crawler has to squint at.
- the dull old pages still sit underneath all of it. if the clever layer ever trips, nothing you'd bookmark falls with it.

## what stays mine

the projection math. how a label clings to its dot through a morph. the easing curves. the multi-window trick that's still half-built on my laptop. none of that makes the cut here.

it's all client-side anyway. you know where view source is.

mostly i wanted proof that a personal site can be a toy you keep poking at, not a chore you renew once a year. the limits — no build, no libraries, one browser — weren't in the way. they were the point.
