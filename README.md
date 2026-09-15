# DOOPE Figma implementation

- `index.html`: Figma node `4:319` (1080 × 16212.09)
- `feature.html`: Figma node `4:585` (1941.25 × 1245.47)
- `buy.html`: Figma node `17:18` (1080 × 6644)

The SVG viewport preserves the Figma artboard geometry while scaling fluidly to the browser width.

`index.html` also includes:

- A three-card feature carousel controlled by horizontal drag/swipe or the three dots
- Native, keyboard-accessible contact inputs with required and email validation
- Minimal vanilla JavaScript in `script.js` for those interactions only

The `BUY NOW` button in `index.html` opens `buy.html`. The buy page includes
working quantity selectors and stores the selected quantities in `sessionStorage`.
