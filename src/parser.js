const updateParserState = (state, index, result) => ({ ...state, index, result });
const updateParserResult = (state, result) => ({ ...state, result });
const updateParserError = (state, errorMsg) => ({ ...state, isError: true, error: errorMsg });

class dParser {
  constructor(parserStateTransformerFunction) {
    this.parserStateTransformerFunction = parserStateTransformerFunction;
  }
  
  run = (targetString) => {
    const initialState = { targetString, index: 0, result: null, isError: false, error: null };
    return this.parserStateTransformerFunction(initialState);
  }

  map(fn) {
    return new dParser(parserState => {
      const nextState = this.parserStateTransformerFunction(parserState);
      if (nextState.isError) return nextState;
      return updateParserResult(nextState, fn(nextState.result));
    });
  }

  chain(fn) {
    return new dParser(parserState => {
      const nextState = this.parserStateTransformerFunction(parserState);
      if (nextState.isError) return nextState;
      const nextParser = fn(nextState.result);
      return nextParser.parserStateTransformerFunction(nextState);
    });
  }

  errorMap(fn) {
    return new dParser(parserState => {
      const nextState = this.parserStateTransformerFunction(parserState);
      if (!nextState.isError) return nextState;
      return updateParserError(nextState, fn(nextState.result, nextState.index));
    });
  }
}

const str = s => new dParser(parserState => {
  const { targetString, index, isError } = parserState;
  if (isError) return parserState;

  const slicedTarget = targetString.slice(index);
  if (slicedTarget.length === 0) {
    return updateParserError(parserState, `Unexpected end of input`);
  }
  if (slicedTarget.startsWith(s)) {
    return updateParserState(parserState, index + s.length, s);
  }
  return updateParserError(parserState, `Expected '${s}' at index ${index}`);
});

const regexParser = regex => new dParser(parserState => {
  const { targetString, index, isError } = parserState;
  if (isError) return parserState;

  const slicedTarget = targetString.slice(index);
  if (slicedTarget.length === 0) {
    return updateParserError(parserState, `Unexpected end of input`);
  }
  
  const match = slicedTarget.match(regex);
  if (match) {
    return updateParserState(parserState, index + match[0].length, match[0]);
  }
  return updateParserError(parserState, `Regex did not match at index ${index}`);
});

const sequenceOf = parsers => new dParser(parserState => {
  if (parserState.isError) return parserState;
  const results = [];
  let nextState = parserState;
  for (let p of parsers) {
    nextState = p.parserStateTransformerFunction(nextState);
    results.push(nextState.result);
    if (nextState.isError) return nextState; // Fail fast
  }
  return updateParserResult(nextState, results);
});

const choice = parsers => new dParser(parserState => {
  if (parserState.isError) return parserState;
  for (let p of parsers) {
    const nextState = p.parserStateTransformerFunction(parserState);
    if (!nextState.isError) return nextState;
  }
  return updateParserError(parserState, `Choice parser failed to match any options`);
});

const many = parser => new dParser(parserState => {
  if (parserState.isError) return parserState;
  const results = [];
  let nextState = parserState;
  let done = false;
  while (!done) {
    let testState = parser.parserStateTransformerFunction(nextState);
    if (!testState.isError) {
      results.push(testState.result);
      nextState = testState;
    } else {
      done = true;
    }
  }
  return updateParserResult(nextState, results);
});

const optional = parser => new dParser(parserState => {
  if (parserState.isError) return parserState;
  const nextState = parser.parserStateTransformerFunction(parserState);
  if (nextState.isError) {
    // If it fails, return the original state but with a null result
    return updateParserResult(parserState, null);
  }
  return nextState;
});

// --- Aventura Syntax Parsers ---
const leftTag = str('<');
const rightTag = str('>');
const hashTag = str('#');

// 1. Tag names can now include dots (e.g., hero.name)
const tagName = regexParser(/^[a-zA-Z0-9_.]+/); 

const transformList = regexParser(/^[a-zA-Z,]+/); 
const transformsParser = sequenceOf([hashTag, transformList, hashTag]).map(res => res[1].split(','));

const nonTerminalParser = sequenceOf([leftTag, tagName, optional(transformsParser), rightTag]).map(res => ({
  type: 'non-terminal',
  value: res[1],
  transforms: res[2] || [] 
}));

// 2. NEW: Dynamic Rule Parser ($hero$[name:animal,-trait:adjective])
const dollarTag = str('$');
const leftBracket = str('[');
const rightBracket = str(']');
const assignmentInner = regexParser(/^[^\]]+/); // Grabs everything inside [ ]

const dynamicRuleParser = sequenceOf([
  dollarTag,
  regexParser(/^[a-zA-Z0-9_]+/), // variable name (no dots here)
  dollarTag,
  leftBracket,
  assignmentInner,
  rightBracket
]).map(res => {
  // Parse the key:value pairs
  const pairs = res[4].split(',').map(pair => {
    const [k, v] = pair.split(':');
    const cleanKey = k.trim();
    return { 
      key: cleanKey.startsWith('-') ? cleanKey.substring(1) : cleanKey, // Remove the minus for the memory key
      rule: v.trim(),
      isDestructive: cleanKey.startsWith('-')
    };
  });
  
  return {
    type: 'dynamic-rule',
    variableName: res[1],
    assignments: pairs
  };
});

// 3. Terminals: Grab text until we hit a '<' or a '$'
const textChunkParser = regexParser(/^[^<$]+/);
// But also allow literal '$' if they aren't part of a dynamic rule (like "costs $5")
const literalDollar = str('$'); 
const literalLeftAngle = str('<');

const terminalParser = choice([textChunkParser, literalDollar, literalLeftAngle]).map(res => ({
  type: 'terminal',
  value: res
}));

// Add dynamicRuleParser to the choice list! Order matters here.
const aventuraRuleParser = many(choice([dynamicRuleParser, nonTerminalParser, terminalParser]));

export function parseAventuraRule(ruleString) {
  return aventuraRuleParser.run(ruleString);
}