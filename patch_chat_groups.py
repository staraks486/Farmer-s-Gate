import re
with open('src/components/InternalChatDrawer.tsx', 'r') as f:
    content = f.read()

target = r"""                  \{\/\* Group Chats \*\/\}\n                  \{\[\n                    \{ id: 'Corporate Hub \(Group\)', label: 'Corporate Hub', desc: 'Broadcast to all network partners', bg: 'bg-indigo-100', text: 'text-indigo-600', border: 'border-indigo-200', hoverText: 'group-hover:text-indigo-700' \},\n                    \{ id: 'Supply Chain \(Group\)', label: 'Supply Chain', desc: 'Warehouse & Logistics updates', bg: 'bg-amber-100', text: 'text-amber-600', border: 'border-amber-200', hoverText: 'group-hover:text-amber-700' \},\n                    \{ id: 'Store POS \(Group\)', label: 'Store POS', desc: 'Retail POS operators & managers', bg: 'bg-sky-100', text: 'text-sky-600', border: 'border-sky-200', hoverText: 'group-hover:text-sky-700' \}"""

replacement = """                  {/* Group Chats */}
                  {[
                    { id: 'Corporate Hub (Group)', label: 'Corporate Hub', desc: 'Broadcast to all network partners', bg: 'bg-indigo-100', text: 'text-indigo-600', border: 'border-indigo-200', hoverText: 'group-hover:text-indigo-700' },
                    { id: 'Supply Chain (Group)', label: 'Supply Chain', desc: 'Warehouse & Logistics updates', bg: 'bg-amber-100', text: 'text-amber-600', border: 'border-amber-200', hoverText: 'group-hover:text-amber-700' },
                    { id: 'Store POS (Group)', label: 'Store POS', desc: 'Retail POS operators & managers', bg: 'bg-sky-100', text: 'text-sky-600', border: 'border-sky-200', hoverText: 'group-hover:text-sky-700' },
                    { id: 'Transport Fleet (Group)', label: 'Transport Fleet', desc: 'Drivers, routing & vehicle alerts', bg: 'bg-teal-100', text: 'text-teal-600', border: 'border-teal-200', hoverText: 'group-hover:text-teal-700' }"""

content = re.sub(target, replacement, content)

with open('src/components/InternalChatDrawer.tsx', 'w') as f:
    f.write(content)
