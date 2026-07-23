# Picture collections

Add image files under `assets/pictures/`, then list them in
`data/pictures.json` under either `ai` or `camera`.

```json
{
  "ai": [
    {
      "src": "./assets/pictures/ai/example.jpg",
      "title": "Example AI image",
      "alt": "A concise visual description",
      "date": "2026",
      "caption": "Created with Midjourney"
    }
  ],
  "camera": [
    {
      "src": "./assets/pictures/camera/example.jpg",
      "title": "Example photograph",
      "alt": "A concise visual description",
      "date": "2026",
      "location": "Location",
      "caption": "Optional caption"
    }
  ]
}
```

Only files explicitly listed in `pictures.json` appear on the public page.
