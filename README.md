# Coffee Tuner

A static, browser-local recipe calculator for James Hoffmann’s one-cup pulse method. A serving defaults to 15 g of coffee. The tuner calculates scale targets, adapts to roast and cup style, and includes a brew timer. It remembers your last settings in the browser.

- [Hoffmann’s original video](https://www.youtube.com/watch?v=1oB1oDrDkHM)
- [Follow-up Q&A](https://www.youtube.com/watch?v=v5WQ1sZzW4o)

The [espresso dial-in page](dist/espresso.html) pairs taste with shot flow to suggest one change at a time. It also includes a yield calculator and a low-pressure pre-infusion explorer.

- [James Hoffmann’s espresso walkthrough](https://www.youtube.com/watch?v=lFwJF-_SUr0)
- [Lance Hedrick’s guide to espresso variables](https://www.youtube.com/watch?v=j-Hu4hF5PTM)
- [Flair’s guide to espresso pre-infusion](https://flairespresso.com/blogs/news/espresso-pre-infusion-techniques)

## Run locally

Run `python3 -m http.server 8000 --directory dist` and open <http://localhost:8000>. Run `npm test` with Node.js 20 or newer.

## Deploy on Vercel

Import the private repository as a Vercel project. The checked-in configuration serves `dist` with no build step. Use your personal Vercel scope and set **Vercel Authentication → All Deployments** before releasing the first deployment so preview and production both require authorized sign-in.

## Future improvements

Add a V60 recipe editor. Let users create and name multiple recipes, edit their brew settings and pour schedules, and switch between saved recipes.
