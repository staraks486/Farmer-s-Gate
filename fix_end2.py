import re

with open('src/components/TransportModule.tsx', 'r') as f:
    content = f.read()

content = content.replace("      </div>\n    </div>\n  );\n}", "      </div>\n    </div>\n    </div>\n  );\n}")

with open('src/components/TransportModule.tsx', 'w') as f:
    f.write(content)
