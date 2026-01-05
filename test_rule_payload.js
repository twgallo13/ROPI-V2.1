// Test script to capture rule save payload
const exampleRule = {
  ruleId: "test-guardrail-rule",
  name: "Test Guardrail Rule",
  description: "Test rule for guardrail verification",
  enabled: true,
  priority: 100,
  conditions: [{
    field: "category",
    matchType: "contains",
    value: "footwear",
    options: []
  }],
  conditionLogic: "AND",
  action: {
    targetField: "attributes.gender",
    valueTemplate: "Men's",
    setOnlyIfEmpty: true
  },
  autoApply: false,
  autoApplyConfidence: 0.9,
  tags: []
};

console.log("Example rule save payload:");
console.log(JSON.stringify(exampleRule, null, 2));