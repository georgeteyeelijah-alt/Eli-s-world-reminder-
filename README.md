# Eli's World

Open `index.html` (or upload this whole folder to any web host). Keep the files together:
`index.html, style.css, assets.js, app.js, ai.js, world.js, themes.js, modules.js, friends.js, finder.js, portal.js, sw.js, assets/`.

## Connect your school portal (Moodle)
1. Moodle → Calendar → Import or export calendars → Export calendar → "All events" + "Recent and next 60 days" → **Get calendar URL**. Keep this link private.
2. Go to https://dash.cloudflare.com → Workers & Pages → Create → **Create Worker** → Deploy → **Edit code**, paste `portal-proxy.js`, Deploy. Copy the `*.workers.dev` link.
3. In Eli's World → Settings → **Portal connection**: paste the Moodle link and the Worker link, press **Sync now**.
4. New or changed deadlines show up in Assignments, Calendar and Exams, with alerts 3 days, 1 day and on the day.
Without the Worker you can still upload the `.ics` file on the Assignments page.

Email cannot be read from a static page. Moodle can email you its own notices; forward those to yourself or check them as usual.

## AI planner (optional, paid)
Settings → AI planner: paste an Anthropic API key (console.anthropic.com, separate from a Claude chat plan). The girl's **Plan my day** button works without any key.

## Notifications
Work on `https://` hosting and while Eli's World is open in a tab (or installed as an app on your phone).

## Finding things
Tap the tour guide and choose **Find something**, or use the search bar. Try "settings", "dark mode", "portal", or the name of a task or note.
The menu scrolls: swipe the top bar on a phone, or scroll the left menu on a computer, to reach Settings.
