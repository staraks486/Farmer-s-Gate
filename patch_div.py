import re

with open('src/components/TransportModule.tsx', 'r') as f:
    content = f.read()

target = r"""        \)\}
      </div>
    </div>
  \);
\}"""

replacement = """        )}
      </div>
    </div>
    </div>
  );
}"""

content = re.sub(target, replacement, content)

with open('src/components/TransportModule.tsx', 'w') as f:
    f.write(content)

