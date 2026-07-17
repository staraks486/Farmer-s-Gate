import re
with open('src/components/ManagementSuite.tsx', 'r') as f:
    content = f.read()

target = r"""    "suppliers",
    "accounts",
    "admin","""
replacement = """    "suppliers",
    "accounts",
    "admin",
    "transport","""
content = re.sub(target, replacement, content)

with open('src/components/ManagementSuite.tsx', 'w') as f:
    f.write(content)
