So I've been building an app for group trips.

It's called **[Oaro](https://oaro.app)**. Every trip gets its own private space. People join with an invite link, and everything for that trip lives in one place: a countdown, the plan, where you're staying, who paid for what, and every photo and video anyone took.

That last part is what started it. After every trip the photos end up scattered across five group chats, all compressed, and nobody can find the good ones a week later. In Oaro they go into one shared feed, at full resolution, sorted by day.

## What's in it

- **The plan.** A shared itinerary and a personal checklist. There's also **V**, an assistant that proposes changes you can approve or skip. It never edits anything on its own.
- **Budget.** One ledger for private spending and group splits. You can photograph a receipt and split it item by item, see who owes whom, settle up, and send someone a reminder.
- **Photos.** The shared feed, with likes, comments and `@mentions`. It updates live on every device.
- **Guess the spot.** A small game: a photo from the trip comes up and everyone drops a pin where they think it was taken. It's more competitive than it has any right to be.
- **Stays.** Paste an Airbnb or hotel link and it turns into a card with photos and details.

It runs in four languages and has a light and a dark theme.

## How it's built

There's a web app and a native iPhone app, and I build both at the same time. Every feature lands on both in the same change.

A few notes:

- **Web:** React, Vite and Tailwind. **iPhone:** SwiftUI. They share one brand file, so the name, colours, font and icon can't drift apart.
- **Almost no backend.** The apps talk to Firebase directly, and the security rules are the only thing deciding who can read what. A trip's data is invisible unless you're a member of it.
- **The few functions that do exist** handle what a phone can't be trusted with: push notifications, fetching link previews, and the two Claude calls (V and the receipt reader), where the API key has to stay on a server.
- **Everything is live.** Firestore listeners keep every device in sync. A local cache means opening the app again doesn't download anything it already has.
- **The iPhone app ships through GitHub Actions.** One workflow tags a version, another builds it, uploads it to TestFlight and sends it to external testers.

## Try it

The web app is at **[oaro.app](https://oaro.app)**. The iPhone app is in public beta on **[TestFlight](https://testflight.apple.com/join/MxYhFBsg)**.

It's still a side project, and I'm still shaping it. If you plan a trip with it, I'd like to hear what breaks.
