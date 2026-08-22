# Product photos

Place approved product photos in this folder. JPG, PNG and WebP files are supported.

Recommended naming uses the stable item id from `data/menu.json`, for example:

- `biscoff.jpg`
- `fudge-brownies.jpg`
- `tiramisu.jpg`

Then set the item's `photo` field in `data/menu.json`:

```json
"photo": "assets/menu/biscoff.jpg"
```

Recommended source size: at least 1200 x 900 pixels. Keep the main product near the center so it
works on both desktop and mobile crops. Only publish photographs you have permission to use.
