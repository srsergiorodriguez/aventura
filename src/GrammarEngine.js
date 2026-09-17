import { parseAventuraRule } from './parser.js';
import { getRandomPick, applyTransforms } from './utils.js';

/**
 * GrammarEngine
 * Handles the parsing and expansion of Context-Free Grammars. 
 * Supports recursive tag expansion, dynamic variable assignment, and transformation rules.
 */
export default class GrammarEngine {
  constructor() {
    this.grammar = {};
  }

  /**
   * Loads a parsed JSON grammar object into the engine.
   * @param {Object} grammarObj - The grammar dictionary.
   */
  setGrammar(grammarObj) {
    this.grammar = JSON.parse(JSON.stringify(grammarObj));
    return this;
  }

  /**
   * Validates the loaded grammar. Checks for missing non-terminal references
   * and uses a Depth-First Search (DFS) to detect infinite circular dependencies.
   */
  testGrammar() {
    this.grammarReport = { errors: [], warnings: [], passed: true };

    if (!this.grammar || Object.keys(this.grammar).length === 0) {
      this.grammarReport.errors.push({ code: "NO_GRAMMAR" });
      this.grammarReport.passed = false;
      return this;
    }

    // EDGE CASE: The root is an array instead of an object mapping
    if (Array.isArray(this.grammar) || typeof this.grammar !== 'object') {
      this.grammarReport.errors.push({ code: "INVALID_ROOT" });
      this.grammarReport.passed = false;
      return this;
    }

    let grammarError = false;
    let errorCount = 0;
    const dependencyGraph = {};

    for (const [key, rules] of Object.entries(this.grammar)) {
      // EDGE CASE: The rule is a string, number, or object instead of an Array
      if (!Array.isArray(rules)) {
        grammarError = true;
        errorCount++;
        this.grammarReport.errors.push({ code: "INVALID_RULE_TYPE", rule: key });
        continue;
      }
      
      // EDGE CASE: The array is perfectly formatted, but completely empty
      if (rules.length === 0) {
        errorCount++;
        this.grammarReport.warnings.push({ code: "EMPTY_RULE", rule: key });
        continue;
      }

      dependencyGraph[key] = new Set(); 

      for (const ruleString of rules) {
        const parsedState = parseAventuraRule(ruleString);
        if (parsedState.isError) {
          grammarError = true;
          errorCount++;
          
          this.grammarReport.errors.push({ 
            code: "SYNTAX_ERROR", 
            rule: key, 
            details: parsedState.error 
          });
          console.error(`Syntax error in rule "${key}": ${parsedState.error}`);
          continue;
        }

        const deadEnds = [];
        for (const token of parsedState.result) {
          if (token.type === 'non-terminal' && !token.value.includes('.')) {
            if (!this.grammar[token.value]) deadEnds.push(token.value);
            else dependencyGraph[key].add(token.value); 
          } else if (token.type === 'dynamic-rule') {
            for (const assign of token.assignments) {
              if (assign.rule.includes('.')) continue;
              if (!this.grammar[assign.rule]) deadEnds.push(assign.rule);
              else dependencyGraph[key].add(assign.rule); 
            }
          }
        }

        if (deadEnds.length > 0) {
          grammarError = true;
          errorCount++;
          
          this.grammarReport.errors.push({ 
            code: "MISSING_REF", 
            rule: key, 
            missing: deadEnds 
          });
          console.error(`The following rules, referenced in "${key}", do not exist: ${deadEnds.join(", ")}`);
        }
      }
    }

    const visited = new Set();
    const recursionStack = new Set();
    const cycles = [];

    const detectCycle = (node) => {
      visited.add(node);
      recursionStack.add(node);

      if (dependencyGraph[node]) {
        for (const neighbor of dependencyGraph[node]) {
          if (!visited.has(neighbor)) {
            detectCycle(neighbor);
          } else if (recursionStack.has(neighbor)) {
            cycles.push(`${node} -> ${neighbor}`);
          }
        }
      }
      recursionStack.delete(node); 
    };

    for (const key of Object.keys(dependencyGraph)) {
      if (!visited.has(key)) detectCycle(key);
    }

    if (cycles.length > 0) {
      grammarError = true;
      errorCount += cycles.length;
      console.warn(`Warning: Circular dependencies detected! This may cause infinite loops:`);
      cycles.forEach(cycle => {
        this.grammarReport.warnings.push({ code: "CIRCULAR_DEP", cycle: cycle });
        console.warn(`  - ${cycle}`);
      });
    }

    if (!grammarError) {
      console.log("Grammar test passed! No missing references or circular dependencies found.");
    } else {
      this.grammarReport.passed = false;
      console.warn(`Grammar test finished with ${errorCount} error(s)/warning(s).`);
    }

    return this;
  }

  /**
   * Parses raw text, evaluates embedded grammar tags, and resolves variable assignments.
   * @param {string} rawText - The text string containing Aventura syntax.
   * @param {Object} context - The memory object for storing/retrieving dynamic variables.
   * @param {number} depth - Current recursion depth to prevent infinite loops.
   */
  expandText(rawText, context = {}, depth = 0) {
    if (!this.grammar || Object.keys(this.grammar).length === 0) return rawText;

    const parsedState = parseAventuraRule(rawText);
    if (parsedState.isError) return rawText;

    let finalOutput = '';
    
    for (const token of parsedState.result) {
      if (token.type === 'terminal') {
        finalOutput += token.value;
      } else if (token.type === 'dynamic-rule') {
        context[token.variableName] = context[token.variableName] || {};
        for (const assign of token.assignments) {
          context[token.variableName][assign.key] = this.expandGrammar(assign.rule, context, assign.isDestructive, depth + 1);
        }
      } else if (token.type === 'non-terminal') {
        let expanded = this.expandGrammar(token.value, context, false, depth + 1);
        if (token.transforms.length > 0) {
          expanded = applyTransforms(expanded, token.transforms);
        }
        finalOutput += expanded;
      }
    }
    return finalOutput;
  }

  /**
   * Resolves a specific grammar symbol by randomly selecting a valid rule.
   * @param {string} startSymbol - The key to look up in the grammar dictionary.
   * @param {Object} context - The memory object for dynamic variables.
   * @param {boolean} isDestructive - If true, removes the selected rule from the grammar.
   * @param {number} depth - Current recursion depth.
   */
  expandGrammar(startSymbol, context = {}, isDestructive = false, depth = 0) {
    if (depth > 100) {
      console.warn(`Aventura: Maximum recursion depth exceeded at <${startSymbol}>.`);
      return `[MAX_DEPTH_EXCEEDED: ${startSymbol}]`;
    }

    // Attempt to retrieve a saved variable from memory context
    if (startSymbol.includes('.')) {
      const [varName, keyName] = startSymbol.split('.');
      if (context[varName] && context[varName][keyName]) {
        return context[varName][keyName]; 
      }
    }

    const rules = this.grammar[startSymbol];
    if (!rules || rules.length === 0) return `<${startSymbol}>`; 

    const pick = getRandomPick(rules);
    const randomRule = pick.element;
    
    if (isDestructive) {
      rules.splice(pick.index, 1); 
      if (rules.prob) rules.prob.splice(pick.index, 1); 
    }

    return this.expandText(randomRule, context, depth);
  }
}