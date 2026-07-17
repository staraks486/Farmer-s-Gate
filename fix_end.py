import re

with open('src/components/TransportModule.tsx', 'r') as f:
    content = f.read()

# The file now ends with:
#       </div>
#     </div>
#     </div>
#   );
# }

# But TransportModule itself only needs 2 divs at the end before `patch_div.py`.

content = content.replace("      </div>\n    </div>\n    </div>\n  );\n}", "      </div>\n    </div>\n  );\n}")

with open('src/components/TransportModule.tsx', 'w') as f:
    f.write(content)
