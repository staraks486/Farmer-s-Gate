import re

with open('src/components/TransportModule.tsx', 'r') as f:
    content = f.read()

target = r"""      \{transportFormOpen && \("""

replacement = """      {activeTab === 'vehicles' ? (
        <>
          <MaintenanceDashboard transports={transports} />
          {transportFormOpen && ("""

# We need to wrap up to the end of the file. Let's find how the file ends first.
content = content.replace("      {transportFormOpen && (", replacement, 1)

with open('src/components/TransportModule.tsx', 'w') as f:
    f.write(content)

