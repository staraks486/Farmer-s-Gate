import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    "const isRestricted = ['partner', 'management', 'executive', 'store_pos'].includes(targetPortal);",
    "const isRestricted = ['partner', 'management', 'executive', 'store_pos', 'transport'].includes(targetPortal);"
)

# And let's check for any other places with hardcoded lists of portals
content = content.replace(
    "if (activePortal === 'store_pos' || email === 'store_pos@farmersgate.com') {",
    "if (activePortal === 'store_pos' || email === 'store_pos@farmersgate.com') {"
)

with open('src/App.tsx', 'w') as f:
    f.write(content)

