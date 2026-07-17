import re

with open('src/types.ts', 'r') as f:
    content = f.read()

content = content.replace(
    "allowedPortals: ('customer' | 'partner' | 'management')[];",
    "allowedPortals: ('customer' | 'partner' | 'management' | 'transport')[];"
)
content = content.replace(
    "allowedPortals: ['customer', 'partner', 'management'],",
    "allowedPortals: ['customer', 'partner', 'management', 'transport'],"
)
content = content.replace(
    "allowedPortals: ['management'],\n      allowedTabs: ['headoffice', 'transport']",
    "allowedPortals: ['management', 'transport'],\n      allowedTabs: ['headoffice']"
)
# Make sure to remove 'transport' from admin allowedTabs
content = content.replace(
    "allowedTabs: ['dashboard', 'headoffice', 'store', 'suppliers', 'accounts', 'staff', 'admin', 'transport']",
    "allowedTabs: ['dashboard', 'headoffice', 'store', 'suppliers', 'accounts', 'staff', 'admin']"
)

with open('src/types.ts', 'w') as f:
    f.write(content)

