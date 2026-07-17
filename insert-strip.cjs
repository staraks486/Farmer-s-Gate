const fs = require('fs');
let content = fs.readFileSync('src/lib/firebase.ts', 'utf8');

const stripHelper = `
export const stripUndefined = (obj: any): any => {
  if (obj === undefined) return null;
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(stripUndefined);
  return Object.keys(obj).reduce((acc: any, key) => {
    if (obj[key] !== undefined) acc[key] = stripUndefined(obj[key]);
    return acc;
  }, {});
};
`;

const insertIndex = content.indexOf('export enum OperationType');
if (insertIndex !== -1) {
    content = content.slice(0, insertIndex) + stripHelper + '\n\n' + content.slice(insertIndex);
} else {
    // try finding another place
    content = content + stripHelper; 
}
fs.writeFileSync('src/lib/firebase.ts', content);
