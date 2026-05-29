> **TL;DR** — I turned manual store onboarding — installing a cart widget into a Shopify or BigCommerce theme — into a single Claude Code skill. It pulls the theme, finds where the widget belongs, edits the files, and pushes a draft. This is a tour of the parts that were actually hard.

Onboarding a new store used to mean the same dance every time: pull down the theme, hunt for the right files, paste in a cart widget snippet, push it back as a draft, and verify nothing broke. Tedious, fiddly, and easy to get wrong on a theme you've never seen before.

So I turned the whole thing into a Claude Code skill. You point it at a store and it does the rest — Shopify or BigCommerce, against local, staging, or prod.

---

## Why

Theme onboarding doesn't scale with humans. Every Shopify theme is a little different — Dawn, an old vintage theme, something a freelancer hand-rolled — and the cart lives in different files with different markup each time. Do it by hand and you'll eventually paste the snippet in the wrong place, miss a cart surface, or clobber someone's customization.

> I wanted onboarding to be one command that's **right by construction** — not a checklist a human follows at 5pm on a Friday.

## How It Works

It's an agent skill — a long, structured prompt plus a set of tools the model can call. Same four phases every run:

```text
  ┌─ 1. PULL ──── theme to disk
  │
  ├─ 2. ANALYZE ─ find where the widget belongs
  │
  ├─ 3. MODIFY ── edit the files locally
  │
  └─ 4. PUSH ──── new draft theme, then verify
```

**Nothing is edited in place.** Every run works on a duplicate, so a bad pass never touches what customers actually see.

The happy path was easy. These three things are what kept biting me.

---

## Gotcha #1 — Don't hardcode the cart files

My first version had a list of file names: `cart-drawer.liquid`, `main-cart-footer.liquid`, the usual suspects. It worked on the themes I tested and broke on the very next one.

The fix was to stop guessing by name and start reading by **content**. The skill profiles every `.liquid` file under `snippets/` and `sections/` and classifies it by what's actually inside:

```text
for each liquid file in snippets/ + sections/:
    has_items_loop   = matches  for ... in cart.items
    has_checkout_btn = matches  name="checkout" | /checkout
    has_subtotal     = matches  cart.total_price

    classify -> PRIMARY | NOTIFICATION | ITEMS_ONLY | SINGLE_ITEM
    apply the transform for that class
```

> **Why it matters:** some themes ship a tiny cart-notification popup with its *own* checkout button. Miss that surface and a shopper can blow right past the widget straight to checkout. Name-based discovery would never have found it.

## Gotcha #2 — "Ready" isn't ready

This one cost me an afternoon. The API call that duplicates a theme returns almost immediately and tells you the copy is "ready." **It's lying.** The file copy keeps happening in the background, and if you start writing edits too soon, the still-in-flight copy overwrites them seconds later. Your run reports success and the draft silently reverts.

Two fixes:

- **Wait for real readiness** — don't trust the ready flag. Poll until the layout and a few key files are byte-for-byte identical between source and duplicate for two checks in a row.
- **Verify by bytes, not by grep** — a partial revert can leave the snippet present but broken. The final check now byte-compares each file it wrote against what's actually on the draft.

## Gotcha #3 — Stop fetching the theme one file at a time

The analyze step originally pulled every asset in the theme, one request per file. On a big theme that's hundreds of round trips and a long wait before the skill could even start thinking.

Switching to a single bulk query that returns the templates in a handful of calls changed the math:

| Approach | Requests | Time to first analysis |
| --- | --- | --- |
| One REST call per asset | hundreds | 15–30 min |
| One bulk query | a handful | a few min |

> If you're ever walking a Shopify theme programmatically: don't loop over the asset list. Ask for everything you need in one shot.

---

## What changed

| | Before | After |
| --- | --- | --- |
| Onboarding a store | ~30 min, by hand | one command + a draft to review |
| Cart surface coverage | whatever you remembered | every surface, found by content |
| Theme pull | 15–30 min | a few min |

## Takeaways

A few things that generalized well beyond this one tool:

- **Classify by content, not by name.** Anything you discover by hardcoded filename will break on the input you didn't test.
- **"Ready" isn't always ready.** When an async API hands you an object, verify it actually exists the way you expect before building on it.
- **Batch your reads.** Looping one API call per item is the slow default — ask for everything in a single request when the API lets you.

> The code lives in a private repo, so no links this time — but the patterns are all yours to steal.
