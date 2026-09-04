import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import ts from 'typescript';

const root = new URL('../', import.meta.url);
const read = (path: string) => readFileSync(new URL(path, root), 'utf8');

function sourceFiles(directory: string): string[] {
  const absolute = new URL(directory, root);
  return readdirSync(absolute, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(`${path}/`);
    return /\.[cm]?[jt]sx?$/.test(entry.name) ? [path] : [];
  });
}

function hasUseClientDirective(path: string): boolean {
  const sourceFile = ts.createSourceFile(
    path,
    read(path),
    ts.ScriptTarget.Latest,
    true,
    path.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  return sourceFile.statements.some(
    (statement) =>
      ts.isExpressionStatement(statement) &&
      ts.isStringLiteral(statement.expression) &&
      statement.expression.text === 'use client',
  );
}

function runtimeImportSpecifiers(path: string): string[] {
  const sourceFile = ts.createSourceFile(
    path,
    read(path),
    ts.ScriptTarget.Latest,
    true,
    path.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );

  const specifiers: string[] = [];
  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;

    const clause = statement.importClause;
    if (clause?.isTypeOnly) continue;

    let hasRuntimeBinding = clause === undefined;
    if (clause?.name) hasRuntimeBinding = true;
    if (clause?.namedBindings && ts.isNamespaceImport(clause.namedBindings)) hasRuntimeBinding = true;
    if (clause?.namedBindings && ts.isNamedImports(clause.namedBindings)) {
      hasRuntimeBinding ||= clause.namedBindings.elements.some((element) => !element.isTypeOnly);
    }

    if (hasRuntimeBinding) specifiers.push(statement.moduleSpecifier.text);
  }
  return specifiers;
}

function assertNoServerImports(path: string, options: { allowAuthEdge?: boolean } = {}): void {
  for (const specifier of runtimeImportSpecifiers(path)) {
    assert.doesNotMatch(specifier, /^@\/lib\/db(?:\/|$)/, `${path} runtime-imports database code`);
    assert.notEqual(specifier, '@/lib/auth', `${path} runtime-imports server auth code`);
    if (!options.allowAuthEdge) {
      assert.notEqual(specifier, '@/lib/auth-edge', `${path} runtime-imports edge auth code`);
    }
    assert.notEqual(specifier, 'server-only', `${path} imports server-only`);
    assert.notEqual(specifier, 'next/headers', `${path} imports next/headers`);
  }
}

test('client modules do not runtime-import server-only database or auth boundaries', () => {
  const clientFiles = [
    ...sourceFiles('app/'),
    ...sourceFiles('components/'),
    ...sourceFiles('lib/'),
  ].filter(hasUseClientDirective);

  for (const path of clientFiles) assertNoServerImports(path);
});

test('the edge proxy stays independent from database and server-header modules', () => {
  assertNoServerImports('proxy.ts', { allowAuthEdge: true });
});
