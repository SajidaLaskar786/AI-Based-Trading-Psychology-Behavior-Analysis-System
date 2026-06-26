import re
import os

with open("/Users/Inarat/Project/Stock_Simulation/public/index.html", "r") as f:
    html = f.read()

# Extract everything between <body> and <!-- Scripts -->
match = re.search(r'<body[^>]*>([\s\S]*?)<!-- Scripts -->', html)
if match:
    body_content = match.group(1).strip()
else:
    body_content = "<div>Error parsing HTML</div>"

with open("/Users/Inarat/Project/Stock_Simulation/public/js/api.js", "r") as f:
    api_js = f.read()

with open("/Users/Inarat/Project/Stock_Simulation/public/js/app.js", "r") as f:
    app_js = f.read()

simulation_js = f"""
// Simulation Page
export function render() {{
  return `
    <div class="simulation-page-wrapper" style="height: 100vh; overflow-y: auto;">
      {body_content}
    </div>
  `;
}}

{api_js}

{app_js}
"""

simulation_js = simulation_js.replace(
    "document.addEventListener('DOMContentLoaded', () => {",
    "export function mount() {"
)
simulation_js = simulation_js.replace(
    "  setupEventListeners();\n  checkSession();\n});",
    "  setupEventListeners();\n  checkSession();\n}\n\nexport function unmount() {\n  stopPolling();\n  if (activeChart) {\n    activeChart.remove();\n    activeChart = null;\n    candlestickSeries = null;\n  }\n}"
)

# We need to make activeChart globally accessible within the file, it already is.

with open("/Users/Inarat/Project/src/pages/simulation.js", "w") as f:
    f.write(simulation_js)

print("Generated src/pages/simulation.js")
