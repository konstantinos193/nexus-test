#!/usr/bin/env node

/**
 * Spaghetti Code Detector for React/Next.js Projects
 * Detects common spaghetti code patterns based on 2025-2026 best practices
 */

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

class SpaghettiDetector {
  constructor(options = {}) {
    this.options = {
      rootDir: options.rootDir || process.cwd(),
      maxComponentLines: options.maxComponentLines || 400,
      maxUseEffects: options.maxUseEffects || 4,
      maxProps: options.maxProps || 8,
      maxNesting: options.maxNesting || 4,
      maxBarrelExports: options.maxBarrelExports || 50,
      anyThreshold: options.anyThreshold || 0.15, // 15% of files
      ...options
    };
    
    this.issues = [];
    this.stats = {
      filesScanned: 0,
      totalLines: 0,
      anyCount: 0,
      largeComponents: 0,
      complexHooks: 0
    };
  }

  async scan() {
    console.log('🍝 Starting spaghetti code detection...\n');
    
    const patterns = [
      '**/*.tsx',
      '**/*.ts',
      '**/*.jsx',
      '**/*.js'
    ];
    
    const files = [];
    for (const pattern of patterns) {
      try {
        const matched = await glob(pattern, {
          cwd: this.options.rootDir,
          ignore: [
            '**/node_modules/**',
            '**/.next/**',
            '**/dist/**',
            '**/build/**',
            '**/*.config.*',
            '**/*.test.*',
            '**/*.spec.*'
          ]
        });
        files.push(...matched);
      } catch (error) {
        console.warn(`⚠️  Could not scan pattern ${pattern}: ${error.message}`);
      }
    }
    
    console.log(`📁 Scanning ${files.length} files...\n`);
    
    for (const filePath of files) {
      const fullPath = path.join(this.options.rootDir, filePath);
      await this.analyzeFile(fullPath);
    }
    
    this.generateReport();
    return this.issues.length === 0;
  }

  async analyzeFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      const relativePath = path.relative(this.options.rootDir, filePath);
      
      this.stats.filesScanned++;
      this.stats.totalLines += lines.length;
      
      // Skip very small files
      if (lines.length < 10) return;
      
      const analysis = {
        filePath: relativePath,
        lines: lines.length,
        issues: []
      };
      
      // 1. Giant components detection
      if (this.isComponentFile(filePath)) {
        this.detectGiantComponent(analysis, content, lines);
        this.detectPropsDrilling(analysis, content, lines);
        this.detectUseEffectSoup(analysis, content, lines);
        this.detectNestedTernaries(analysis, content, lines);
      }
      
      // 2. TypeScript any detection
      this.detectAnyUsage(analysis, content, lines);
      
      // 3. Barrel file detection
      this.detectBarrelFiles(analysis, content, lines, filePath);
      
      // 4. Utility file bloat
      this.detectUtilityBloat(analysis, content, lines, filePath);
      
      // 5. ESLint disable detection
      this.detectEslintDisables(analysis, content, lines);
      
      // 6. Magic strings/numbers
      this.detectMagicValues(analysis, content, lines);
      
      // 7. Duplicate patterns
      this.detectDuplicatePatterns(analysis, content, lines);
      
      // 8. NEW: Advanced 2025-2026 patterns
      this.detectAdvancedSpaghettiPatterns(analysis, content, lines, filePath);
      
      if (analysis.issues.length > 0) {
        this.issues.push(analysis);
      }
      
    } catch (error) {
      console.warn(`⚠️  Could not analyze ${filePath}: ${error.message}`);
    }
  }

  isComponentFile(filePath) {
    return /\.(tsx|jsx)$/.test(filePath) && 
           !filePath.includes('.test.') && 
           !filePath.includes('.spec.');
  }

  detectGiantComponent(analysis, content, lines) {
    if (lines.length > this.options.maxComponentLines) {
      this.stats.largeComponents++;
      analysis.issues.push({
        type: 'GIANT_COMPONENT',
        severity: 'HIGH',
        message: `Component is ${lines.length} lines (>${this.options.maxComponentLines})`,
        line: lines.length,
        suggestion: 'Break into smaller components or extract business logic'
      });
    }
  }

  detectPropsDrilling(analysis, content, _lines) {
    const interfaceMatches = content.match(/interface\s+\w+Props\s*{([^}]*)}/gs) || [];
    const typeMatches = content.match(/type\s+\w+Props\s*=\s*{([^}]*)}/gs) || [];
    
    for (const match of [...interfaceMatches, ...typeMatches]) {
      const propCount = (match.match(/^\s*\w+:/gm) || []).length;
      if (propCount > this.options.maxProps) {
        analysis.issues.push({
          type: 'PROPS_DRILLING',
          severity: 'MEDIUM',
          message: `${propCount} props detected (>${this.options.maxProps})`,
          suggestion: 'Consider using context or composition patterns'
        });
      }
    }
  }

  detectUseEffectSoup(analysis, content, _lines) {
    const useEffectMatches = content.match(/useEffect\s*\(/g) || [];
    if (useEffectMatches.length > this.options.maxUseEffects) {
      this.stats.complexHooks++;
      analysis.issues.push({
        type: 'USE_EFFECT_SOUP',
        severity: 'HIGH',
        message: `${useEffectMatches.length} useEffect hooks found (>${this.options.maxUseEffects})`,
        suggestion: 'Extract custom hooks or reduce component complexity'
      });
    }
    
    // Check for large dependency arrays
    const depArrayMatches = content.match(/useEffect\([^,]+,\s*\[([^\]]*)\]/g) || [];
    for (const match of depArrayMatches) {
      const deps = match.match(/\w+/g) || [];
      if (deps.length > 10) {
        analysis.issues.push({
          type: 'LARGE_DEP_ARRAY',
          severity: 'MEDIUM',
          message: `useEffect has ${deps.length} dependencies`,
          suggestion: 'Break into smaller effects or reconsider dependencies'
        });
      }
    }
  }

  detectNestedTernaries(analysis, content, lines) {
    let maxNesting = 0;
    let currentNesting = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const ternaries = (line.match(/\?/g) || []).length;
      currentNesting += ternaries;
      maxNesting = Math.max(maxNesting, currentNesting);
      
      // Reset nesting on new lines without ternaries
      if (ternaries === 0) currentNesting = 0;
    }
    
    if (maxNesting > this.options.maxNesting) {
      analysis.issues.push({
        type: 'NESTED_TERNARIES',
        severity: 'MEDIUM',
        message: `${maxNesting} levels of ternary nesting detected`,
        suggestion: 'Extract to separate components or use early returns'
      });
    }
  }

  detectAnyUsage(analysis, content, lines) {
    const anyMatches = content.match(/:\s*any\b|as\s+any\b|<any>/g) || [];
    if (anyMatches.length > 0) {
      this.stats.anyCount += anyMatches.length;
      const anyPercentage = (anyMatches.length / lines.length) * 100;
      
      if (anyPercentage > 20) { // More than 20% any usage
        analysis.issues.push({
          type: 'EXCESSIVE_ANY',
          severity: 'HIGH',
          message: `${anyMatches.length} 'any' usages (${anyPercentage.toFixed(1)}% of lines)`,
          suggestion: 'Add proper TypeScript types'
        });
      }
    }
  }

  detectBarrelFiles(analysis, content, lines, filePath) {
    const fileName = path.basename(filePath);
    if (fileName === 'index.ts' || fileName === 'index.js') {
      const exportMatches = content.match(/export\s+/g) || [];
      if (exportMatches.length > this.options.maxBarrelExports) {
        analysis.issues.push({
          type: 'MASSIVE_BARREL',
          severity: 'MEDIUM',
          message: `${exportMatches.length} exports in barrel file`,
          suggestion: 'Split barrel files or use explicit imports'
        });
      }
    }
  }

  detectUtilityBloat(analysis, content, lines, filePath) {
    const fileName = path.basename(filePath);
    const isUtilityFile = /utils|helpers|constants|common/i.test(fileName);
    
    if (isUtilityFile && lines.length > 800) {
      analysis.issues.push({
        type: 'UTILITY_BLOAT',
        severity: 'MEDIUM',
        message: `Utility file is ${lines.length} lines (>800)`,
        suggestion: 'Split utilities by domain or feature'
      });
    }
  }

  detectEslintDisables(analysis, content, _lines) {
    const disableMatches = content.match(/\/\/\s*eslint-disable-next-line|\/\*\s*eslint-disable/g) || [];
    if (disableMatches.length > 5) {
      analysis.issues.push({
        type: 'EXCESSIVE_ESLINT_DISABLES',
        severity: 'MEDIUM',
        message: `${disableMatches.length} ESLint disable comments`,
        suggestion: 'Fix linting issues instead of disabling them'
      });
    }
  }

  detectMagicValues(analysis, content, _lines) {
    // Magic numbers (not 0, 1, -1, 2, 100)
    const magicNumbers = content.match(/\b(?!0|1|-1|2|100)\d{2,}\b/g) || [];
    if (magicNumbers.length > 10) {
      analysis.issues.push({
        type: 'MAGIC_NUMBERS',
        severity: 'LOW',
        message: `${magicNumbers.length} magic numbers detected`,
        suggestion: 'Extract to named constants'
      });
    }
    
    // Magic strings (not common words, longer than 10 chars)
    const magicStrings = content.match(/["']([^"']{10,})["']/g) || [];
    if (magicStrings.length > 15) {
      analysis.issues.push({
        type: 'MAGIC_STRINGS',
        severity: 'LOW',
        message: `${magicStrings.length} potential magic strings`,
        suggestion: 'Extract to constants or i18n'
      });
    }
    
    // Optional chaining hell detection
    const chainingPatterns = content.match(/(\w+\?\.){3,}/g) || [];
    if (chainingPatterns.length > 5) {
      analysis.issues.push({
        type: 'OPTIONAL_CHAINING_HELL',
        severity: 'MEDIUM',
        message: `${chainingPatterns.length} deep optional chaining patterns`,
        suggestion: 'Add proper typing or null checks'
      });
    }
    
    // TODO/FIXME comments (old technical debt)
    const todoMatches = content.match(/\/\/\s*(TODO|FIXME|XXX|HACK).*[0-9]{4}/g) || [];
    if (todoMatches.length > 3) {
      analysis.issues.push({
        type: 'OLD_TECHNICAL_DEBT',
        severity: 'LOW',
        message: `${todoMatches.length} old TODO/FIXME comments`,
        suggestion: 'Address technical debt or remove stale comments'
      });
    }
  }

  detectDuplicatePatterns(analysis, content, _lines) {
    // Simple duplicate detection for common patterns
    const patterns = [
      /useState<\w+>/g,
      /fetch\(/g,
      /console\.log/g
    ];
    
    for (const pattern of patterns) {
      const matches = content.match(pattern) || [];
      if (matches.length > 7) {
        const patternName = pattern.toString().replace(/[\\/]/g, '');
        analysis.issues.push({
          type: 'DUPLICATE_PATTERN',
          severity: 'LOW',
          message: `${matches.length} occurrences of ${patternName}`,
          suggestion: 'Extract to custom hook or utility function'
        });
      }
    }
    
    // Multiple state libraries detection
    const stateLibraries = [
      /zustand/g,
      /jotai/g,
      /redux/g,
      /react-query/g,
      /rtk-query/g,
      /swr/g,
      /useContext/g
    ];
    
    const usedLibraries = stateLibraries.filter(lib => content.match(lib)).length;
    if (usedLibraries > 3) {
      analysis.issues.push({
        type: 'TOO_MANY_STATE_LIBRARIES',
        severity: 'HIGH',
        message: `${usedLibraries} different state management libraries detected`,
        suggestion: 'Consolidate to 1-2 state management solutions'
      });
    }
    
    // Boolean flag explosion
    const booleanFlags = content.match(/is[A-Z][a-zA-Z]*\s*:/g) || [];
    if (booleanFlags.length > 8) {
      analysis.issues.push({
        type: 'BOOLEAN_FLAG_EXPLOSION',
        severity: 'MEDIUM',
        message: `${booleanFlags.length} boolean flags detected`,
        suggestion: 'Consider using enums or state machines'
      });
    }
    
    // Console.log in production
    const consoleLogs = content.match(/console\.(log|warn|error|debug|info)/g) || [];
    if (consoleLogs.length > 5 && !content.includes('.test.') && !content.includes('.spec.')) {
      analysis.issues.push({
        type: 'PRODUCTION_CONSOLE_LOGS',
        severity: 'MEDIUM',
        message: `${consoleLogs.length} console statements in production code`,
        suggestion: 'Remove or replace with proper logging'
      });
    }
    
    // Mixed styling approaches
    const styleApproaches = [
      /className=/g,      // Tailwind/CSS modules
      /style={{/g,       // Inline styles
      /styled\./g,       // Styled-components
      /css`/g            // CSS-in-JS
    ];
    
    const usedStyles = styleApproaches.filter(style => content.match(style)).length;
    if (usedStyles > 2) {
      analysis.issues.push({
        type: 'MIXED_STYLING_APPROACHES',
        severity: 'LOW',
        message: `${usedStyles} different styling approaches detected`,
        suggestion: 'Standardize on one styling solution'
      });
    }
    
    // Smart component anti-patterns (components knowing too much)
    const smartPatterns = [
      /useRouter/g,
      /useAuth/g,
      /useTheme/g,
      /useFeatureFlags/g,
      /useI18n/g
    ];
    
    const smartCount = smartPatterns.filter(pattern => content.match(pattern)).length;
    if (smartCount > 3 && this.isComponentFile(filePath)) {
      analysis.issues.push({
        type: 'OVERLY_SMART_COMPONENT',
        severity: 'MEDIUM',
        message: `Component uses ${smartCount} different cross-cutting concerns`,
        suggestion: 'Extract logic to custom hooks or context providers'
      });
    }
  }
  
  detectAdvancedSpaghettiPatterns(analysis, content, lines, filePath) {
    // God Context detection (Context.Provider with many fields)
    const contextProviderMatches = content.match(/Context\.Provider\s+value={{([^}]+)}}/g) || [];
    for (const match of contextProviderMatches) {
      const fieldCount = (match.match(/\w+:/g) || []).length;
      if (fieldCount > 20) {
        analysis.issues.push({
          type: 'GOD_CONTEXT',
          severity: 'HIGH',
          message: `Context Provider with ${fieldCount} fields detected`,
          suggestion: 'Split context or use multiple contexts'
        });
      }
    }
    
    // Deep folder nesting detection (from file path)
    const pathDepth = filePath.split(/[/\\]/).length;
    if (pathDepth > 8) {
      analysis.issues.push({
        type: 'DEEP_FOLDER_NESTING',
        severity: 'LOW',
        message: `File nested ${pathDepth} levels deep`,
        suggestion: 'Flatten folder structure or use feature-based organization'
      });
    }
    
    // Form typing issues (Record<string, any> for forms)
    const formAnyMatches = content.match(/Record<string,\s*any>/g) || [];
    if (formAnyMatches.length > 2) {
      analysis.issues.push({
        type: 'FORM_ANY_TYPING',
        severity: 'MEDIUM',
        message: `${formAnyMatches.length} form values typed as Record<string, any>`,
        suggestion: 'Create proper form interfaces'
      });
    }
    
    // Children as props + render props + HOCs mixed detection
    const renderPatterns = [
      /children:/g,
      /renderProp/g,
      /with[A-Z]/g,  // HOC pattern
      /asChild/g      // Compound component pattern
    ];
    
    const mixedPatterns = renderPatterns.filter(pattern => content.match(pattern)).length;
    if (mixedPatterns > 2) {
      analysis.issues.push({
        type: 'MIXED_RENDER_PATTERNS',
        severity: 'MEDIUM',
        message: `${mixedPatterns} different render patterns mixed`,
        suggestion: 'Standardize on one composition pattern'
      });
    }
    
    // API response typing issues
    const apiAnyMatches = content.match(/as any|<any>/g) || [];
    const fetchCalls = content.match(/fetch\(/g) || [];
    if (apiAnyMatches.length > 0 && fetchCalls.length > 0) {
      analysis.issues.push({
        type: 'API_ANY_TYPING',
        severity: 'HIGH',
        message: `${apiAnyMatches.length} 'any' types with ${fetchCalls.length} API calls`,
        suggestion: 'Add proper API response types'
      });
    }
    
    // Infinite re-render patterns (missing deps + bad memoization)
    const useMemoMatches = content.match(/useMemo/g) || [];
    const useCallbackMatches = content.match(/useCallback/g) || [];
    const disableDepsMatches = content.match(/eslint-disable-next-line.*exhaustive-deps/g) || [];
    
    if ((useMemoMatches.length > 0 || useCallbackMatches.length > 0) && disableDepsMatches.length > 2) {
      analysis.issues.push({
        type: 'POTENTIAL_INFINITE_RENDERS',
        severity: 'HIGH',
        message: `${disableDepsMatches.length} dependency array disables with memoization`,
        suggestion: 'Fix dependency arrays or remove memoization'
      });
    }
    
    // Component naming issues (named after what they render vs purpose)
    if (this.isComponentFile(filePath)) {
      const badComponentNames = content.match(/const (UserCard|PostCard|ItemCard|Button|Icon|Avatar)/g) || [];
      if (badComponentNames.length > 3) {
        analysis.issues.push({
          type: 'PRESENTATION_COMPONENT_NAMES',
          severity: 'LOW',
          message: `${badComponentNames.length} components named after presentation`,
          suggestion: 'Name components by purpose, not what they render'
        });
      }
    }
    
    // State mutation detection
    const mutationPatterns = [
      /\.push\(/,
      /\.pop\(/,
      /\.shift\(/,
      /\.unshift\(/,
      /\.sort\(/,
      /\.reverse\(/
    ];
    
    const mutationCount = mutationPatterns.reduce((count, pattern) => {
      return count + (content.match(pattern) || []).length;
    }, 0);
    
    if (mutationCount > 5) {
      analysis.issues.push({
        type: 'DIRECT_STATE_MUTATION',
        severity: 'HIGH',
        message: `${mutationCount} direct array mutations detected`,
        suggestion: 'Use immutable patterns or spread operator'
      });
    }
  }

  generateReport() {
    console.log('\n🍝 SPAGHETTI CODE DETECTION REPORT\n');
    console.log('=' .repeat(50));
    
    const severityCount = { HIGH: 0, MEDIUM: 0, LOW: 0 };
    const typeCount = {};
    
    for (const issue of this.issues) {
      for (const problem of issue.issues) {
        severityCount[problem.severity]++;
        typeCount[problem.type] = (typeCount[problem.type] || 0) + 1;
      }
    }
    
    // Summary
    console.log(`\n📊 SUMMARY:`);
    console.log(`   Files scanned: ${this.stats.filesScanned}`);
    console.log(`   Total lines: ${this.stats.totalLines.toLocaleString()}`);
    console.log(`   Issues found: ${this.issues.length} files with problems`);
    console.log(`   'any' usage: ${this.stats.anyCount} occurrences`);
    
    // Severity breakdown
    console.log(`\n🚨 SEVERITY BREAKDOWN:`);
    console.log(`   HIGH: ${severityCount.HIGH}`);
    console.log(`   MEDIUM: ${severityCount.MEDIUM}`);
    console.log(`   LOW: ${severityCount.LOW}`);
    
    // Type breakdown
    console.log(`\n📋 ISSUE TYPES:`);
    Object.entries(typeCount)
      .sort(([,a], [,b]) => b - a)
      .forEach(([type, count]) => {
        console.log(`   ${type}: ${count}`);
      });
    
    // Detailed issues
    if (this.issues.length > 0) {
      console.log(`\n🔍 DETAILED ISSUES:`);
      console.log('=' .repeat(50));
      
      for (const fileIssue of this.issues.slice(0, 10)) { // Show first 10 files
        console.log(`\n📁 ${fileIssue.filePath} (${fileIssue.lines} lines)`);
        
        for (const issue of fileIssue.issues) {
          const icon = issue.severity === 'HIGH' ? '🚨' : 
                      issue.severity === 'MEDIUM' ? '⚠️' : '💡';
          console.log(`   ${icon} ${issue.type}: ${issue.message}`);
          if (issue.suggestion) {
            console.log(`      💡 ${issue.suggestion}`);
          }
        }
      }
      
      if (this.issues.length > 10) {
        console.log(`\n... and ${this.issues.length - 10} more files`);
      }
    }
    
    // Spaghetti score
    const score = this.calculateSpaghettiScore();
    console.log(`\n🍝 SPAGHETTI SCORE: ${score}/100`);
    
    if (score >= 70) {
      console.log('   🚨 HIGH SPAGHETTI RISK - Major refactoring needed!');
    } else if (score >= 40) {
      console.log('   ⚠️ MEDIUM SPAGHETTI RISK - Some cleanup recommended');
    } else {
      console.log('   ✅ LOW SPAGHETTI RISK - Code looks relatively clean');
    }
    
    console.log('\n' + '=' .repeat(50));
  }

  calculateSpaghettiScore() {
    let score = 0;
    
    // Base score from issue count
    score += Math.min(this.issues.length * 5, 30);
    
    // Severity weighting
    for (const fileIssue of this.issues) {
      for (const issue of fileIssue.issues) {
        if (issue.severity === 'HIGH') score += 10;
        else if (issue.severity === 'MEDIUM') score += 5;
        else score += 2;
      }
    }
    
    // Specific anti-patterns
    if (this.stats.largeComponents > 0) score += this.stats.largeComponents * 8;
    if (this.stats.complexHooks > 0) score += this.stats.complexHooks * 6;
    if (this.stats.anyCount > 50) score += 15;
    
    return Math.min(score, 100);
  }
}

// CLI interface
if (require.main === module) {
  const options = {};
  
  // Parse command line args
  process.argv.slice(2).forEach(arg => {
    if (arg.startsWith('--max-lines=')) {
      options.maxComponentLines = parseInt(arg.split('=')[1]);
    } else if (arg.startsWith('--max-props=')) {
      options.maxProps = parseInt(arg.split('=')[1]);
    } else if (arg.startsWith('--root=')) {
      options.rootDir = arg.split('=')[1];
    }
  });
  
  const detector = new SpaghettiDetector(options);
  detector.scan().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('❌ Detection failed:', error);
    process.exit(1);
  });
}

module.exports = SpaghettiDetector;
