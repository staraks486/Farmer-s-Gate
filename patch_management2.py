import re

with open('src/components/ManagementSuite.tsx', 'r') as f:
    content = f.read()

# 1. Remove import TransportModule
content = re.sub(r'import TransportModule from "\./TransportModule";\n', '', content)

# 2. Remove from activeTab
content = re.sub(r'    \| "transport"\n', '', content)

# 3. Remove from allTabs
content = re.sub(r'    \{ id: "transport", name: "Transport Fleet", icon: Truck \},\n', '', content)

# 4. Remove from allowedTabs
content = re.sub(r'    "transport",\n', '', content)

# 5. Remove rendering logic
content = re.sub(
    r'          \{activeTab === "transport" && \(\n            <TransportModule />\n          \)\}',
    '',
    content,
    flags=re.DOTALL
)

with open('src/components/ManagementSuite.tsx', 'w') as f:
    f.write(content)

