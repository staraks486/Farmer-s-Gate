import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    "const isCurrentSpecific = ['partner', 'management', 'executive', 'store_pos'].includes(hash.replace('#', '')) || ['partner', 'management', 'executive', 'store_pos'].includes(portalParam || '');",
    "const isCurrentSpecific = ['partner', 'management', 'executive', 'store_pos', 'transport'].includes(hash.replace('#', '')) || ['partner', 'management', 'executive', 'store_pos', 'transport'].includes(portalParam || '');"
)

content = content.replace(
    "if (hash === '#partner' || portalParam === 'partner') {",
    "if (hash === '#transport' || portalParam === 'transport') {\n        target = 'transport';\n      } else if (hash === '#partner' || portalParam === 'partner') {"
)

with open('src/App.tsx', 'w') as f:
    f.write(content)

