with open('src/types.ts', 'r') as f:
    content = f.read()

content = content.replace(
    "allowedTabs: ['dashboard', 'headoffice', 'store', 'suppliers', 'accounts', 'staff', 'admin']",
    "allowedTabs: ['dashboard', 'headoffice', 'store', 'suppliers', 'accounts', 'staff', 'admin', 'transport']"
)
content = content.replace(
    "allowedTabs: ['headoffice']",
    "allowedTabs: ['headoffice', 'transport']"
)

with open('src/types.ts', 'w') as f:
    f.write(content)

