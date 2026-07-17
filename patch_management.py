import re

with open('src/components/ManagementSuite.tsx', 'r') as f:
    content = f.read()

# 1. Add Truck import if missing (it might be there for suppliers)
# It's there: { id: "suppliers", name: "Supply Chain POs", icon: Truck }

# 2. Add TransportModule import
import_statement = "import { AdminPanel } from \"./AdminPanel\";\nimport TransportModule from \"./TransportModule\";"
content = content.replace("import { AdminPanel } from \"./AdminPanel\";", import_statement)

# 3. Add to activeTab union
content = content.replace(
    '    | "customer-directory"',
    '    | "customer-directory"\n    | "transport"'
)

# 4. Add to allTabs
content = content.replace(
    '    { id: "admin", name: "HQ System Admin", icon: Sliders },',
    '    { id: "admin", name: "HQ System Admin", icon: Sliders },\n    { id: "transport", name: "Transport Fleet", icon: Truck },'
)

# 5. Add to default allowedTabs
content = content.replace(
    '    "admin",',
    '    "admin",\n    "transport",'
)

# 6. Add tab description
desc_replacement = """                {activeTab === "customer-directory" &&
                  "HQ Customer Database, CRM profiles, WhatsApp sales totals, and loyalty point balances."}
                {activeTab === "transport" &&
                  "Manage delivery vehicles, driver assignments, and live transit status."}"""
content = content.replace(
    '                {activeTab === "customer-directory" &&\n                  "HQ Customer Database, CRM profiles, WhatsApp sales totals, and loyalty point balances."}',
    desc_replacement
)

# 7. Add rendering case
render_replacement = """          {activeTab === "admin" && (
            <AdminPanel
              stores={stores}
              requirements={requirements}
              dbConfig={dbConfig}
              onAddStore={onAddStore}
              onUpdateStore={onUpdateStore}
              onDeleteStore={onDeleteStore}
            />
          )}

          {activeTab === "transport" && (
            <TransportModule />
          )}"""

content = re.sub(
    r'          \{activeTab === "admin" && \(\n            <AdminPanel\n              stores=\{stores\}\n              requirements=\{requirements\}\n              dbConfig=\{dbConfig\}\n              onAddStore=\{onAddStore\}\n              onUpdateStore=\{onUpdateStore\}\n              onDeleteStore=\{onDeleteStore\}\n            />\n          \)\}',
    render_replacement,
    content
)

with open('src/components/ManagementSuite.tsx', 'w') as f:
    f.write(content)
