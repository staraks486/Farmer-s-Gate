import re

with open('src/components/TransportModule.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    "      if (saved) {",
    "      const saved = localStorage.getItem('fg_hq_transports');\n      if (saved) {"
)

with open('src/components/TransportModule.tsx', 'w') as f:
    f.write(content)

