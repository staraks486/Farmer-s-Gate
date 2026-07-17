import re
with open('src/components/ManagementSuite.tsx', 'r') as f:
    content = f.read()

target1 = r"""  useEffect\(\(\) => \{
    const hash = window\.location\.hash\.toLowerCase\(\);
    if \(\(hash === '#management/admin' \|\| hash === '#admin'\) && allowedTabs\.includes\('admin'\)\) \{
      setActiveTab\('admin'\);
    \} else \{
      setActiveTab\(defaultTab\);
    \}
  \}, \[defaultTab\]\);"""

replacement1 = """  useEffect(() => {
    const hash = window.location.hash.toLowerCase();
    if ((hash === '#management/admin' || hash === '#admin') && allowedTabs.includes('admin')) {
      setActiveTab('admin');
    } else if (hash === '#transport' && allowedTabs.includes('transport')) {
      setActiveTab('transport');
    } else {
      setActiveTab(defaultTab);
    }
  }, [defaultTab, allowedTabs]);"""

content = re.sub(target1, replacement1, content)

with open('src/components/ManagementSuite.tsx', 'w') as f:
    f.write(content)
