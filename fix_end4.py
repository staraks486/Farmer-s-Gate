import re

with open('src/components/TransportModule.tsx', 'r') as f:
    content = f.read()

content = content.replace("            );\n          })\n      </div>", "            );\n          })\n        )}\n      </div>")

with open('src/components/TransportModule.tsx', 'w') as f:
    f.write(content)
