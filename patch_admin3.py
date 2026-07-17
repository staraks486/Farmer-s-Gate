import re

with open('src/components/AdminPanel.tsx', 'r') as f:
    content = f.read()

# 1. Remove the activeDirectoryTab and transport states
content = re.sub(
    r"  const \[activeDirectoryTab, setActiveDirectoryTab\] = React.useState\<'officials' \| 'transport'\>\('officials'\);\n",
    "",
    content
)

transport_state_regex = r"  // Transport Module State.*?\n  // Form fields"
content = re.sub(transport_state_regex, "  // Form fields", content, flags=re.DOTALL)

# 2. Remove the JSX tabs and activeDirectoryTab wrappers
jsx_start_regex = r"  return \(\n    <div className=\"space-y-6 animate-fade-in\">\n      <div className=\"flex gap-2 mb-4\">.*?      \{activeDirectoryTab === 'officials' && \(\n        <div className=\"space-y-6 animate-fade-in\">\n          \{\/\* Header Action \*\/\}"
replacement_start = """  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Action */}"""
content = re.sub(jsx_start_regex, replacement_start, content, flags=re.DOTALL)

# 3. Remove the transport JSX at the end of the component
jsx_end_regex = r"        \)\}\n      </div>\n        </div>\n      \)\}\n\n      \{activeDirectoryTab === 'transport' && \(.*?\n      \)\}\n    </div>\n  \);\n\}"
replacement_end = """        )}
      </div>
    </div>
  );
}"""
content = re.sub(jsx_end_regex, replacement_end, content, flags=re.DOTALL)

with open('src/components/AdminPanel.tsx', 'w') as f:
    f.write(content)

