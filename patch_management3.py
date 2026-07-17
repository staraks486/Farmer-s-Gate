import re

with open('src/components/ManagementSuite.tsx', 'r') as f:
    content = f.read()

# 1. Add import
if 'TransportModule' not in content:
    content = content.replace(
        'import AdminPanel from "./AdminPanel";',
        'import AdminPanel from "./AdminPanel";\nimport TransportModule from "./TransportModule";'
    )

# 2. Add to allTabs
if '{ id: "transport"' not in content:
    content = content.replace(
        '    { id: "admin", name: "HQ System Admin", icon: Sliders },',
        '    { id: "admin", name: "HQ System Admin", icon: Sliders },\n    { id: "transport", name: "Transport Fleet", icon: Truck },'
    )

# 3. Add to activeTab type 
if '| "transport"' not in content:
    content = content.replace(
        '| "admin"\n    | "errors";',
        '| "admin"\n    | "errors"\n    | "transport";'
    )

# 4. Add to render output
if '{activeTab === "transport" &&' not in content:
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
            <div className="p-4 md:p-6">
              <TransportModule />
            </div>
          )}"""
    content = re.sub(
        r'          \{activeTab === "admin" && \(\n            <AdminPanel\n              stores=\{stores\}\n              requirements=\{requirements\}\n              dbConfig=\{dbConfig\}\n              onAddStore=\{onAddStore\}\n              onUpdateStore=\{onUpdateStore\}\n              onDeleteStore=\{onDeleteStore\}\n            />\n          \)\}',
        render_replacement,
        content
    )

# 5. Add to default allowedTabs (if fallback is used)
content = re.sub(
    r'    "admin",\n    "errors",\n  \];',
    '    "admin",\n    "errors",\n    "transport",\n  ];',
    content
)

with open('src/components/ManagementSuite.tsx', 'w') as f:
    f.write(content)

