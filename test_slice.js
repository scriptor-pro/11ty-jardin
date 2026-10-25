const nunjucks = require("nunjucks");

// Setup environment
const env = new nunjucks.Environment();

// Test template - does Nunjucks support .slice() method calls?
const template = nunjucks.compile("Result: {% set arr = [10, 20, 30, 40, 50, 60] %}{{ arr.slice(1, 4) | dump }}");

const result = template.render();

console.log("Test: .slice(1, 4) on array");
console.log("Result:", result);
