const fs = require('fs');
let code = fs.readFileSync('src/components/CustomerMilkRegistry.tsx', 'utf-8');

const target = `<div className="flex items-center gap-1.5">
                          <button
                            onClick={() => toggleTakenDaily(c.id)}`;

const newButton = `<div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setShowBillModal(c)}
                            title="Generate Milk Bill"
                            className="p-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-xl cursor-pointer border border-blue-200 transition-colors"
                          >
                            <FileText className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => toggleTakenDaily(c.id)}`;

code = code.replace(target, newButton);
fs.writeFileSync('src/components/CustomerMilkRegistry.tsx', code);
