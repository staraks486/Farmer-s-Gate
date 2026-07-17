const customer = {
  id: 1,
  name: undefined,
  arr: [{ id: 1, val: undefined }, { id: 2, val: 3 }]
};
const stripUndefined = (obj) => {
  if (obj === undefined) return null;
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(stripUndefined);
  return Object.keys(obj).reduce((acc, key) => {
    if (obj[key] !== undefined) acc[key] = stripUndefined(obj[key]);
    return acc;
  }, {});
};
console.log(JSON.stringify(stripUndefined(customer)));
