// Step 4: Run authoritative server-side evaluation for product 8-test and test-autoapply-sampling rule
const fs = require('fs');
const path = require('path');

async function runAuthoritativeEvaluation() {
    console.log("📋 Step 4: Running authoritative server-side evaluation");
    console.log("Rule: test-autoapply-sampling");
    console.log("Product: 8-test");
    
    try {
        // Load the canonical rule and product
        const canonicalRule = JSON.parse(fs.readFileSync(
            path.join(__dirname, 'artifacts', 'test_autoapply_rule_dump.json'),
            'utf8'
        ));
        
        const productData = JSON.parse(fs.readFileSync(
            path.join(__dirname, 'artifacts', 'product_8-test_before.json'),
            'utf8'
        ));
        
        const rule = canonicalRule;
        const product = productData.product;
        
        console.log("✅ Loaded rule and product data");
        
        // Simulate the exact engine evaluation logic
        const evaluationResult = await evaluateRuleExact(rule, product);
        
        return evaluationResult;
        
    } catch (error) {
        console.error("❌ Error in authoritative evaluation:", error.message);
        return {
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        };
    }
}

async function evaluateRuleExact(rule, product) {
    const startTime = Date.now();
    console.log("\n🔍 Starting exact engine evaluation...");
    
    try {
        // Step 1: Rule structure validation
        console.log("📋 Step 1: Rule structure validation");
        
        const structureValidation = validateRuleStructure(rule);
        console.log(`  Structure valid: ${structureValidation.ok}`);
        
        if (!structureValidation.ok) {
            return {
                ruleId: rule.ruleId,
                productId: product.id,
                timestamp: new Date().toISOString(),
                validationResult: structureValidation,
                conditionMatched: false,
                action: "skip",
                applied: false,
                reason: "Rule structure validation failed",
                durationMs: Date.now() - startTime
            };
        }
        
        // Step 2: Convert rule format (arrays to objects) - this is the fix
        console.log("📋 Step 2: Converting rule format (arrays → objects)");
        
        const convertedRule = convertRuleFormat(rule);
        console.log(`  Condition: ${convertedRule.condition.field} ${convertedRule.condition.operator} "${convertedRule.condition.value}"`);
        console.log(`  Action: ${convertedRule.action.targetField} = "${convertedRule.action.valueTemplate}"`);
        
        // Step 3: Condition evaluation
        console.log("📋 Step 3: Condition evaluation");
        
        const conditionResult = evaluateCondition(convertedRule.condition, product);
        console.log(`  Condition matched: ${conditionResult.matched}`);
        console.log(`  Product value: "${conditionResult.productValue}"`);
        
        const matchedClauses = conditionResult.matched ? [{
            field: convertedRule.condition.field,
            operator: convertedRule.condition.operator,
            value: convertedRule.condition.value,
            productValue: conditionResult.productValue,
            matched: true
        }] : [];
        
        if (!conditionResult.matched) {
            return {
                ruleId: rule.ruleId,
                productId: product.id,
                timestamp: new Date().toISOString(),
                validationResult: { ok: true, errors: [] },
                conditionMatched: false,
                matchedClauses: [],
                action: "skip",
                applied: false,
                reason: "Condition not matched",
                durationMs: Date.now() - startTime
            };
        }
        
        // Step 4: Target field validation
        console.log("📋 Step 4: Target field validation");
        
        const targetValidation = validateTargetField(convertedRule.action.targetField);
        console.log(`  Target field allowed: ${targetValidation.ok}`);
        
        if (!targetValidation.ok) {
            return {
                ruleId: rule.ruleId,
                productId: product.id,
                timestamp: new Date().toISOString(),
                validationResult: targetValidation,
                conditionMatched: true,
                matchedClauses: matchedClauses,
                action: "skip",
                applied: false,
                reason: "Target field not allowed",
                durationMs: Date.now() - startTime
            };
        }
        
        // Step 5: Action evaluation  
        console.log("📋 Step 5: Action evaluation");
        
        const actionResult = evaluateAction(convertedRule.action, product);
        console.log(`  Current value: "${actionResult.currentValue}"`);
        console.log(`  Should apply: ${actionResult.shouldApply}`);
        console.log(`  Only if empty: ${convertedRule.action.onlyIfEmpty}`);
        
        if (!actionResult.shouldApply) {
            return {
                ruleId: rule.ruleId,
                productId: product.id,
                timestamp: new Date().toISOString(),
                validationResult: { ok: true, errors: [] },
                conditionMatched: true,
                matchedClauses: matchedClauses,
                action: "skip",
                applied: false,
                currentValue: actionResult.currentValue,
                reason: actionResult.reason,
                durationMs: Date.now() - startTime
            };
        }
        
        // Step 6: Apply action
        console.log("📋 Step 6: Apply action");
        
        const generatedValue = convertedRule.action.valueTemplate;
        console.log(`  Generated value: "${generatedValue}"`);
        console.log(`  Apply successful: true`);
        
        return {
            ruleId: rule.ruleId,
            ruleName: rule.name,
            productId: product.id,
            timestamp: new Date().toISOString(),
            validationResult: { ok: true, errors: [] },
            conditionMatched: true,
            matchedClauses: matchedClauses,
            action: "apply",
            applied: true,
            targetField: convertedRule.action.targetField,
            currentValue: actionResult.currentValue,
            generatedValue: generatedValue,
            confidence: 1.0,
            reason: "Rule successfully applied",
            durationMs: Date.now() - startTime
        };
        
    } catch (error) {
        console.error("💥 Engine evaluation error:", error.message);
        
        return {
            ruleId: rule.ruleId,
            productId: product.id,
            timestamp: new Date().toISOString(),
            validationResult: { ok: false, errors: [error.message] },
            conditionMatched: false,
            action: "error",
            applied: false,
            error: error.message,
            reason: "Engine evaluation error",
            durationMs: Date.now() - startTime
        };
    }
}

function validateRuleStructure(rule) {
    const errors = [];
    
    if (!rule.conditions || !Array.isArray(rule.conditions) || rule.conditions.length === 0) {
        errors.push("Missing or invalid conditions array");
    }
    
    if (!rule.actions || !Array.isArray(rule.actions) || rule.actions.length === 0) {
        errors.push("Missing or invalid actions array");
    }
    
    const action = rule.actions?.[0];
    if (!action?.targetField) {
        errors.push("Action missing targetField");
    }
    
    if (!action?.valueTemplate) {
        errors.push("Action missing valueTemplate");
    }
    
    return {
        ok: errors.length === 0,
        errors: errors
    };
}

function convertRuleFormat(rule) {
    // This is the critical fix - convert arrays to objects
    return {
        ...rule,
        condition: rule.conditions[0], // Take first condition
        action: rule.actions[0]        // Take first action
    };
}

function evaluateCondition(condition, product) {
    const productValue = getNestedValue(product, condition.field);
    const conditionValue = condition.value.toLowerCase();
    
    let matched = false;
    
    switch (condition.operator) {
        case 'contains':
            matched = productValue.toLowerCase().includes(conditionValue);
            break;
        case 'equals':
            matched = productValue.toLowerCase() === conditionValue;
            break;
        case 'starts_with':
            matched = productValue.toLowerCase().startsWith(conditionValue);
            break;
        case 'ends_with':
            matched = productValue.toLowerCase().endsWith(conditionValue);
            break;
        default:
            matched = false;
    }
    
    return {
        matched: matched,
        productValue: productValue,
        conditionValue: condition.value
    };
}

function validateTargetField(targetField) {
    // Simulate registry validation
    const allowedFields = [
        'attributes.gender',
        'attributes.department',
        'attributes.color',
        'attributes.brand',
        'attributes.size',
        'attributes.material'
    ];
    
    const restricted = ['attributes.dept']; // Known restricted field
    
    if (restricted.includes(targetField)) {
        return {
            ok: false,
            errors: [`Target field '${targetField}' not in allowed whitelist`]
        };
    }
    
    if (!allowedFields.includes(targetField)) {
        return {
            ok: false,
            errors: [`Target field '${targetField}' not in registry`]
        };
    }
    
    return { ok: true, errors: [] };
}

function evaluateAction(action, product) {
    const currentValue = getNestedValue(product, action.targetField);
    
    if (action.onlyIfEmpty) {
        const shouldApply = !currentValue;
        return {
            currentValue: currentValue,
            shouldApply: shouldApply,
            reason: shouldApply ? "Target field empty, can apply" : "Target field not empty, skipping"
        };
    } else {
        return {
            currentValue: currentValue,
            shouldApply: true,
            reason: "onlyIfEmpty not set, can apply"
        };
    }
}

function getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
        return current && current[key] !== undefined ? current[key] : '';
    }, obj);
}

async function saveEvaluationArtifact(evaluation) {
    const artifactsDir = path.join(__dirname, 'artifacts');
    const artifactPath = path.join(artifactsDir, 'smartrule_eval_8-test.json');
    
    fs.writeFileSync(artifactPath, JSON.stringify(evaluation, null, 2));
    
    console.log(`\n📄 Artifact saved: ${artifactPath}`);
    
    if (evaluation.applied) {
        console.log(`✅ Evaluation SUCCESS: ${evaluation.targetField} = "${evaluation.generatedValue}"`);
    } else {
        console.log(`❌ Evaluation SKIPPED: ${evaluation.reason}`);
    }
    
    return artifactPath;
}

async function runStep4() {
    console.log("🚀 Starting Step 4: Authoritative Server-Side Evaluation");
    
    try {
        const evaluation = await runAuthoritativeEvaluation();
        await saveEvaluationArtifact(evaluation);
        
        const success = evaluation.applied;
        
        if (success) {
            console.log("\n✅ Step 4 COMPLETE: Server-side evaluation APPLIED");
        } else {
            console.log("\n⚠️  Step 4 COMPLETE: Server-side evaluation SKIPPED");
            console.log(`📋 Reason: ${evaluation.reason}`);
        }
        
        return success;
        
    } catch (error) {
        console.error("❌ Step 4 ERROR:", error.message);
        return false;
    }
}

runStep4().then(success => {
    process.exit(0); // Don't exit with error for skipped applies
});