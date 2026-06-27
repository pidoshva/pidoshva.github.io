so i rebuilt this site.

the homepage isn't really a page anymore. it's a bunch of glowing dots floating in space, and they rearrange themselves depending on where you go.

open goodies, they snap into a grid. open the blog, they melt into a wave. pull up the journal and everything softens out behind it.

one little world that keeps changing shape.

---

## why

my old homepage was fine. clean, dark, easy to read. also kind of boring.

it's supposed to show that i build things. instead it just sat there.

so i flipped it. make the homepage the thing. the first bit you touch should feel like something i'd actually make.

## the idea

one cluster. lots of shapes.

every part of the site — about, goodies, the blog, the journal — is a dot in the same space. you tap one, the camera drifts over, the dots flow into a new shape, and the content slides in.

nothing reloads. it's all one place that quietly rearranges as you move around.

the spark was [bgstaal's multipleWindow3dScene](https://github.com/bgstaal/multipleWindow3dScene). the idea that a site can be a space you move through, not a stack of pages you click. i took that feeling somewhere a little different.

## the tech

i gave myself one rule: no framework, no build step. just plain html, css, and javascript, served straight off github pages. same as the rest of this site.

a few things that made it click:

- the 3d is faked. it's a flat canvas with a little math, not a real 3d engine. way lighter than it looks.
- it's one shape system, not seven scenes. the dots never change. each section is just a new set of spots for them to slide into. that's why it feels like the same thing rearranging, not a hard cut.
- tiny lights travel along the lines, and a dimmer field drifts behind everything. small touches, but they're what make it feel alive.
- the words are still just html. posts and the journal open in a big, soft-blurred reader. easy to read, easy to link, friendly to search engines.
- the plain old pages still live underneath. so links and bookmarks never lean on the fancy part.

## what i'm leaving out

the math, how the labels ride along, the timing, the multi-window thing that isn't ready yet. those stay in the garage.

it all runs in your browser though. view source is right there.

the point was never the trick.

it's that a personal site can be a small thing you actually enjoy making. and the limits — no build, no libraries, just the browser — made it better, not worse.
