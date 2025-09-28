
# Busy Realtors Time Saviour — Interactive Prompt Finder

Premium, glassy, animated UI to filter and copy real-estate prompts.

## Quick start (local)
```bash
npm install
npm run dev
```

## Build for Vercel
```bash
npm run build
# Deploy the repo to Vercel (recommended),
# or drag & drop the folder in Vercel's dashboard,
# Vercel will run the build and host it.
```

## Add your full prompt list
Open `src/App.tsx` and extend `DEFAULT_DATA`. Each prompt:
```ts
{
  id: "your-id",
  title: "Your title",
  category: "Listings" | "Tone" | "Social" | "Ads" | "Email" | "Client" | "SEO" | "Business",
  keywords: ["mls","website","seo"],
  body: "Your prompt with [placeholders]"
}
```
