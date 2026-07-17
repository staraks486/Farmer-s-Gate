import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    "const changePortal = (portal: 'customer' | 'partner' | 'management' | 'executive' | 'store_pos', customHash?: string) => {",
    "const changePortal = (portal: 'customer' | 'partner' | 'management' | 'executive' | 'store_pos' | 'transport', customHash?: string) => {"
)

with open('src/App.tsx', 'w') as f:
    f.write(content)

