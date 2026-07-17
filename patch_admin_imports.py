with open('src/components/AdminPanel.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    'import {\n  Save,\n  Trash2,\n  Plus,\n  Shield,\n  Building2,\n  Settings,\n  Database,\n  Package,\n  Users,\n  Globe,\n  WifiOff,\n  Activity,\n  AlertTriangle,\n  PhoneCall\n} from \'lucide-react\';',
    'import {\n  Save,\n  Trash2,\n  Plus,\n  Shield,\n  Building2,\n  Settings,\n  Database,\n  Package,\n  Users,\n  Globe,\n  WifiOff,\n  Activity,\n  AlertTriangle,\n  PhoneCall,\n  Edit\n} from \'lucide-react\';'
)

with open('src/components/AdminPanel.tsx', 'w') as f:
    f.write(content)

